import type { APIRoute } from "astro";
import { createMeal, listMeals, parseNewMeal } from "../../../db/meal-plan";
import { isDateKey } from "../../../db/workouts";
import { json } from "../../../lib/recipe-input";

export const prerender = false;

export const GET: APIRoute = async ({ url, locals }) => {
  const user = locals.user;
  if (!user) return json({ error: "Sign in to view your meal plan" }, 401);

  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!isDateKey(from) || !isDateKey(to)) return json({ error: "from and to must be YYYY-MM-DD" }, 400);

  return json(await listMeals(user.id, from, to));
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return json({ error: "Sign in to plan meals" }, 401);

  const parsed = parseNewMeal(await request.json().catch(() => null));
  if (!parsed.ok) return json({ error: parsed.error }, 400);

  const row = await createMeal(user.id, parsed.value);
  return row ? json(row, 201) : json({ error: "Recipe not found" }, 404);
};
