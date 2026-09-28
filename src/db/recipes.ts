import { eq, sql } from "drizzle-orm";
import { db } from "./index";
import { recipes, recipeRatings, foods } from "./schema";

export type RecipeSummary = {
  slug: string;
  name: string;
  description: string;
  imageUrl: string | null;
  authorName: string | null;
  avgRating: number;
  ratingCount: number;
  ingredientNames: string[];
};

// Recipes must contain EVERY selected ingredient (the "what can I make
// with X and Y" pattern), not just any of them.
export async function listRecipes(ingredientSlugs?: string[]): Promise<RecipeSummary[]> {
  const rows = await db.query.recipes.findMany({
    orderBy: (r, { desc }) => desc(r.createdAt),
    with: {
      author: true,
      ingredients: {
        with: { food: true },
        orderBy: (ri, { asc }) => asc(ri.sortOrder),
      },
    },
  });

  const wanted = ingredientSlugs?.filter(Boolean) ?? [];
  const filtered =
    wanted.length === 0
      ? rows
      : rows.filter((r) => {
          const have = new Set(r.ingredients.map((ri) => ri.food.slug));
          return wanted.every((slug) => have.has(slug));
        });

  return filtered.map((r) => ({
    slug: r.slug,
    name: r.name,
    description: r.description,
    imageUrl: r.imageUrl,
    authorName: r.author?.name ?? null,
    avgRating: Number(r.avgRating),
    ratingCount: r.ratingCount,
    ingredientNames: r.ingredients.slice(0, 4).map((ri) => ri.food.name),
  }));
}

export async function getRecipeBySlug(slug: string) {
  return db.query.recipes.findFirst({
    where: eq(recipes.slug, slug),
    with: {
      author: true,
      ingredients: {
        with: { food: true },
        orderBy: (ri, { asc }) => asc(ri.sortOrder),
      },
      steps: { orderBy: (s, { asc }) => asc(s.stepNumber) },
    },
  });
}

export async function rateRecipe(recipeId: number, userId: string, stars: number) {
  await db
    .insert(recipeRatings)
    .values({ recipeId, userId, stars })
    .onConflictDoUpdate({
      target: [recipeRatings.recipeId, recipeRatings.userId],
      set: { stars },
    });

  const [agg] = await db
    .select({
      avg: sql<number>`avg(${recipeRatings.stars})`,
      count: sql<number>`count(*)`,
    })
    .from(recipeRatings)
    .where(eq(recipeRatings.recipeId, recipeId));

  const avgRating = Number(agg?.avg ?? 0);
  const ratingCount = Number(agg?.count ?? 0);

  await db
    .update(recipes)
    .set({ avgRating: avgRating.toFixed(2), ratingCount })
    .where(eq(recipes.id, recipeId));

  return { avgRating, ratingCount };
}

export async function listFoods() {
  return db.query.foods.findMany({ orderBy: (f, { asc }) => asc(f.name) });
}