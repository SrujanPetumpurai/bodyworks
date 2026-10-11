import type { APIRoute } from "astro";
import { deleteRecipe, getRecipeBySlug, updateRecipe } from "../../../../db/recipes";
import { json, parseRecipeInput } from "../../../../lib/recipe-input";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug;
  if (!slug) {
    return new Response(JSON.stringify({ error: "slug is required" }), { status: 400 });
  }

  const recipe = await getRecipeBySlug(slug);
  if (!recipe) {
    return new Response(JSON.stringify({ error: "Recipe not found" }), { status: 404 });
  }

  return new Response(JSON.stringify(recipe), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
  if (!locals.user) return json({ error: "Sign in first." }, 401);
  if (!params.slug) return json({ error: "slug is required" }, 400);

  const body = await request.json().catch(() => null);
  const parsed = parseRecipeInput(body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);

  try {
    const ok = await updateRecipe(params.slug, locals.user.id, parsed.data);
    if (!ok) return json({ error: "Recipe not found, or it isn't yours." }, 404);
    return json({ slug: params.slug });
  } catch (err) {
    console.error("updateRecipe failed", err);
    return json({ error: "Couldn't save changes. Try again." }, 500);
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.user) return json({ error: "Sign in first." }, 401);
  if (!params.slug) return json({ error: "slug is required" }, 400);

  const ok = await deleteRecipe(params.slug, locals.user.id);
  if (!ok) return json({ error: "Recipe not found, or it isn't yours." }, 404);
  return json({ deleted: true });
};
