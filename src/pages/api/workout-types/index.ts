import type { APIRoute } from "astro";
import { createType, listTypes, parseTypeInput } from "../../../db/workout-types";
import { MAX_CUSTOM_TYPES } from "../../../lib/workout-glyphs";
import { json } from "../../../lib/recipe-input";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) return json({ error: "Sign in to see your icons" }, 401);
  return json(await listTypes(locals.user.id));
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return json({ error: "Sign in to create icons" }, 401);

  const parsed = parseTypeInput(await request.json().catch(() => null));
  if (!parsed.ok) return json({ error: parsed.error }, 400);

  const row = await createType(locals.user.id, parsed.value);
  if (!row) return json({ error: `You can have up to ${MAX_CUSTOM_TYPES} custom icons. Delete one first.` }, 400);
  return json(row, 201);
};
