import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { recipes, savedRecipes } from "./schema";
import { canViewRecipe } from "./recipe-access";

export async function listSavedSlugs(userId: string): Promise<string[]> {
  const rows = await db
    .select({ slug: recipes.slug })
    .from(savedRecipes)
    .innerJoin(recipes, eq(recipes.id, savedRecipes.recipeId))
    .where(eq(savedRecipes.userId, userId));
  return rows.map((r) => r.slug);
}

// "not-found" covers both "no such recipe" and "you can't see it", so private recipes stay hidden.
// "own" = it's the user's own recipe, which never needs saving.
export async function setSaved(
  userId: string,
  slug: string,
  saved: boolean,
): Promise<"ok" | "not-found" | "own"> {
  const [recipe] = await db
    .select({
      id: recipes.id,
      visibility: recipes.visibility,
      authorId: recipes.authorId,
      communityId: recipes.communityId,
    })
    .from(recipes)
    .where(eq(recipes.slug, slug))
    .limit(1);
  if (!recipe || !(await canViewRecipe(recipe, userId))) return "not-found";
  if (recipe.authorId === userId) return "own";

  if (saved) {
    await db.insert(savedRecipes).values({ userId, recipeId: recipe.id }).onConflictDoNothing();
  } else {
    await db
      .delete(savedRecipes)
      .where(and(eq(savedRecipes.userId, userId), eq(savedRecipes.recipeId, recipe.id)));
  }
  return "ok";
}
