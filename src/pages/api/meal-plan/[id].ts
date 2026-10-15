import type { APIRoute } from "astro";
import { deleteMeal, parseMealChanges, updateMeal } from "../../../db/meal-plan";
import { json } from "../../../lib/recipe-input";

export const prerender = false;

function parseId(raw: string | undefined) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user) return json({ error: "Sign in to edit your meal plan" }, 401);

  const id = parseId(params.id);
  if (!id) return json({ error: "Invalid id" }, 400);

  const parsed = parseMealChanges(await request.json().catch(() => null));
  if (!parsed.ok) return json({ error: parsed.error }, 400);

  const row = await updateMeal(user.id, id, parsed.value);
  return row ? json(row) : json({ error: "Not found" }, 404);
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user) return json({ error: "Sign in to edit your meal plan" }, 401);

  const id = parseId(params.id);
  if (!id) return json({ error: "Invalid id" }, 400);

  return (await deleteMeal(user.id, id)) ? json({ ok: true }) : json({ error: "Not found" }, 404);
};
