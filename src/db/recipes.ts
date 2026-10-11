import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "./index";
import { foods, recipes, recipeIngredients, recipeRatings, recipeSteps, user } from "./schema";

export type RecipeSummary = {
  slug: string;
  name: string;
  description: string;
  imageUrl: string | null;
  cuisine: string | null;
  authorName: string | null;
  authorImage: string | null;
  avgRating: number;
  authorId: string | null;
  ratingCount: number;
  ingredientNames: string[];
  ingredientSlugs: string[];
  createdAt: string;
};

// Recipes must contain EVERY selected ingredient (the "what can I make
// with X and Y" pattern), not just any of them.
export async function listRecipes(
  ingredientSlugs?: string[],
  authorId?: string,
): Promise<RecipeSummary[]> {
  const rows = await db.query.recipes.findMany({
    where: authorId ? eq(recipes.authorId, authorId) : undefined,
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
    cuisine: r.cuisine,
    authorName: r.author?.name ?? null,
    authorImage: r.author?.image ?? null,
    avgRating: Number(r.avgRating),
    ratingCount: r.ratingCount,
    authorId: r.author?.id ?? null,
    ingredientNames: r.ingredients.slice(0, 4).map((ri) => ri.food.name),
    ingredientSlugs: r.ingredients.map((ri) => ri.food.slug),
    createdAt: r.createdAt.toISOString(),
  }));
}

// Public profile info only — never select email/session data here.
export async function getProfile(id: string) {
  const [row] = await db
    .select({
      id: user.id,
      name: user.name,
      image: user.image,
      banner: user.banner,
      joinedAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);
  return row ?? null;
}

export async function getRecipeBySlug(slug: string) {
  return db.query.recipes.findFirst({
    where: eq(recipes.slug, slug),
    with: {
      author: { columns: { id: true, name: true, image: true } },
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

// =====================================================================
// Create / update / delete
// =====================================================================

export const UNITS = ["g", "ml", "tsp", "tbsp", "cup", "piece"] as const;
export const DIFFICULTIES = ["easy", "medium", "hard"] as const;

export type RecipeInput = {
  name: string;
  description: string;
  imageUrl: string | null;
  videoUrl: string | null;
  cuisine: string | null;
  prepTimeMinutes: number | null;
  servings: number | null;
  difficulty: (typeof DIFFICULTIES)[number] | null;
  ingredients: { name: string; amount: number; unit: (typeof UNITS)[number] }[];
  steps: string[];
};

export function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "recipe"
  );
}

// Existing foods are matched by slug ("Chicken Breast" and "chicken breast"
// are the same food); unknown ones are created with empty macros.
async function resolveFoodIds(names: string[]) {
  const bySlug = new Map<string, string>();
  for (const n of names) {
    const slug = slugify(n);
    if (!bySlug.has(slug)) bySlug.set(slug, n.trim());
  }
  const slugs = [...bySlug.keys()];

  const missingCheck = await db.select({ id: foods.id, slug: foods.slug }).from(foods).where(inArray(foods.slug, slugs));
  const have = new Set(missingCheck.map((f) => f.slug));
  const toCreate = slugs.filter((s) => !have.has(s));
  if (toCreate.length) {
    await db
      .insert(foods)
      .values(toCreate.map((slug) => ({ slug, name: bySlug.get(slug)! })))
      .onConflictDoNothing();
  }

  const all = await db.select({ id: foods.id, slug: foods.slug }).from(foods).where(inArray(foods.slug, slugs));
  return new Map(all.map((f) => [f.slug, f.id]));
}

function ingredientRows(recipeId: number, input: RecipeInput, foodIds: Map<string, number>) {
  return input.ingredients.map((ing, i) => ({
    recipeId,
    foodId: foodIds.get(slugify(ing.name))!,
    amount: ing.amount.toFixed(2),
    unit: ing.unit,
    sortOrder: i,
  }));
}

function stepRows(recipeId: number, input: RecipeInput) {
  return input.steps.map((instruction, i) => ({ recipeId, stepNumber: i + 1, instruction }));
}

async function uniqueSlug(name: string) {
  const base = slugify(name);
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const [hit] = await db.select({ id: recipes.id }).from(recipes).where(eq(recipes.slug, candidate)).limit(1);
    if (!hit) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function createRecipe(authorId: string, input: RecipeInput) {
  const foodIds = await resolveFoodIds(input.ingredients.map((i) => i.name));
  const slug = await uniqueSlug(input.name);

  const [created] = await db
    .insert(recipes)
    .values({
      slug,
      authorId,
      name: input.name,
      description: input.description,
      imageUrl: input.imageUrl,
      videoUrl: input.videoUrl,
      cuisine: input.cuisine,
      prepTimeMinutes: input.prepTimeMinutes,
      servings: input.servings,
      difficulty: input.difficulty,
    })
    .returning({ id: recipes.id, slug: recipes.slug });

  try {
    await db.batch([
      db.insert(recipeIngredients).values(ingredientRows(created.id, input, foodIds)),
      db.insert(recipeSteps).values(stepRows(created.id, input)),
    ]);
  } catch (err) {
    // neon-http has no multi-statement transactions across the insert above,
    // so remove the half-created recipe (children cascade).
    await db.delete(recipes).where(eq(recipes.id, created.id));
    throw err;
  }
  return created;
}

// Returns false if the recipe doesn't exist or isn't owned by this user.
export async function updateRecipe(slug: string, authorId: string, input: RecipeInput) {
  const [existing] = await db
    .select({ id: recipes.id })
    .from(recipes)
    .where(and(eq(recipes.slug, slug), eq(recipes.authorId, authorId)))
    .limit(1);
  if (!existing) return false;

  const foodIds = await resolveFoodIds(input.ingredients.map((i) => i.name));

  // batch() runs as one transaction on neon-http
  await db.batch([
    db
      .update(recipes)
      .set({
        name: input.name,
        description: input.description,
        imageUrl: input.imageUrl,
        videoUrl: input.videoUrl,
        cuisine: input.cuisine,
        prepTimeMinutes: input.prepTimeMinutes,
        servings: input.servings,
        difficulty: input.difficulty,
        updatedAt: new Date(),
      })
      .where(eq(recipes.id, existing.id)),
    db.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, existing.id)),
    db.delete(recipeSteps).where(eq(recipeSteps.recipeId, existing.id)),
    db.insert(recipeIngredients).values(ingredientRows(existing.id, input, foodIds)),
    db.insert(recipeSteps).values(stepRows(existing.id, input)),
  ]);
  return true;
}

export async function deleteRecipe(slug: string, authorId: string) {
  const deleted = await db
    .delete(recipes)
    .where(and(eq(recipes.slug, slug), eq(recipes.authorId, authorId)))
    .returning({ id: recipes.id });
  return deleted.length > 0;
}

export async function updateProfile(
  id: string,
  data: { name?: string; image?: string | null; banner?: string | null },
) {
  await db
    .update(user)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(user.id, id));
}
