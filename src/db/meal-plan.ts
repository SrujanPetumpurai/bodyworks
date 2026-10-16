import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "./index";
import { mealPlanEntries, mealSlotEnum, recipes } from "./schema";
import { canViewRecipe, recipeVisibleTo } from "./recipe-access";
import { isDateKey } from "./workouts";

export type MealSlot = (typeof mealSlotEnum.enumValues)[number];
export const isMealSlot = (v: unknown): v is MealSlot => (mealSlotEnum.enumValues as readonly unknown[]).includes(v);

// What the planner needs to draw a placed recipe.
const columns = {
  id: mealPlanEntries.id,
  date: mealPlanEntries.date,
  slot: mealPlanEntries.slot,
  slug: recipes.slug,
  name: recipes.name,
  imageUrl: recipes.imageUrl,
};

// Only returns entries whose recipe the user can still see (a recipe made private later drops out).
export async function listMeals(userId: string, from: string, to: string) {
  return db
    .select(columns)
    .from(mealPlanEntries)
    .innerJoin(recipes, eq(recipes.id, mealPlanEntries.recipeId))
    .where(
      and(
        eq(mealPlanEntries.userId, userId),
        gte(mealPlanEntries.date, from),
        lte(mealPlanEntries.date, to),
        recipeVisibleTo(userId),
      ),
    )
    .orderBy(asc(mealPlanEntries.date), asc(mealPlanEntries.id));
}

async function getMeal(userId: string, id: number) {
  const [row] = await db
    .select(columns)
    .from(mealPlanEntries)
    .innerJoin(recipes, eq(recipes.id, mealPlanEntries.recipeId))
    .where(and(eq(mealPlanEntries.id, id), eq(mealPlanEntries.userId, userId)))
    .limit(1);
  return row ?? null;
}

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export type NewMealInput = { slug: string; date: string; slot: MealSlot };

export function parseNewMeal(body: any): Parsed<NewMealInput> {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid body" };
  if (typeof body.slug !== "string" || !body.slug) return { ok: false, error: "slug is required" };
  if (!isDateKey(body.date)) return { ok: false, error: "date must be YYYY-MM-DD" };
  if (!isMealSlot(body.slot)) return { ok: false, error: "Unknown meal slot" };
  return { ok: true, value: { slug: body.slug, date: body.date, slot: body.slot } };
}

export function parseMealChanges(body: any): Parsed<{ date?: string; slot?: MealSlot }> {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid body" };
  const v: { date?: string; slot?: MealSlot } = {};
  if ("date" in body) {
    if (!isDateKey(body.date)) return { ok: false, error: "date must be YYYY-MM-DD" };
    v.date = body.date;
  }
  if ("slot" in body) {
    if (!isMealSlot(body.slot)) return { ok: false, error: "Unknown meal slot" };
    v.slot = body.slot;
  }
  if (Object.keys(v).length === 0) return { ok: false, error: "Nothing to update" };
  return { ok: true, value: v };
}

// null = no such recipe, or the user isn't allowed to see it (callers answer 404)
export async function createMeal(userId: string, input: NewMealInput) {
  const [recipe] = await db
    .select({ id: recipes.id, visibility: recipes.visibility, authorId: recipes.authorId, communityId: recipes.communityId })
    .from(recipes)
    .where(eq(recipes.slug, input.slug))
    .limit(1);
  if (!recipe || !(await canViewRecipe(recipe, userId))) return null;

  const [created] = await db
    .insert(mealPlanEntries)
    .values({ userId, recipeId: recipe.id, date: input.date, slot: input.slot })
    .returning({ id: mealPlanEntries.id });
  return getMeal(userId, created.id);
}

export async function updateMeal(userId: string, id: number, changes: { date?: string; slot?: MealSlot }) {
  const [row] = await db
    .update(mealPlanEntries)
    .set(changes)
    .where(and(eq(mealPlanEntries.id, id), eq(mealPlanEntries.userId, userId)))
    .returning({ id: mealPlanEntries.id });
  return row ? getMeal(userId, row.id) : null;
}

// Removes every meal the user has planned on one day. Returns how many were removed.
export async function clearDay(userId: string, date: string) {
  const rows = await db
    .delete(mealPlanEntries)
    .where(and(eq(mealPlanEntries.userId, userId), eq(mealPlanEntries.date, date)))
    .returning({ id: mealPlanEntries.id });
  return rows.length;
}

export async function deleteMeal(userId: string, id: number) {
  const rows = await db
    .delete(mealPlanEntries)
    .where(and(eq(mealPlanEntries.id, id), eq(mealPlanEntries.userId, userId)))
    .returning({ id: mealPlanEntries.id });
  return rows.length > 0;
}
