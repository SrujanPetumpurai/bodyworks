import type { APIRoute } from "astro";
import { setSaved } from "../../../../db/saved-recipes";
import { json } from "../../../../lib/recipe-input";

export const prerender = false;

const handle = (saved: boolean): APIRoute => async ({ params, locals }) => {
  if (!locals.user) return json({ error: "Sign in to save recipes." }, 401);
  if (!params.slug) return json({ error: "slug is required" }, 400);

  const result = await setSaved(locals.user.id, params.slug, saved);
  if (result === "not-found") return json({ error: "Recipe not found" }, 404);
  if (result === "own") return json({ error: "That's already your recipe." }, 400);
  return json({ saved });
};

export const POST = handle(true);
export const DELETE = handle(false);
