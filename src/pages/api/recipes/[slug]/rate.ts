import type { APIRoute } from "astro";
import { getRecipeBySlug, rateRecipe } from "../../../../db/recipes";

export const prerender = false;

export const POST: APIRoute = async ({ params, request, locals }) => {
  const currentUser = locals.user;
  if (!currentUser) {
    return new Response(JSON.stringify({ error: "Sign in to rate recipes" }), { status: 401 });
  }

  const slug = params.slug;
  if (!slug) {
    return new Response(JSON.stringify({ error: "slug is required" }), { status: 400 });
  }

  const recipe = await getRecipeBySlug(slug);
  if (!recipe) {
    return new Response(JSON.stringify({ error: "Recipe not found" }), { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const stars = Number(body?.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return new Response(JSON.stringify({ error: "stars must be an integer 1-5" }), { status: 400 });
  }

  const result = await rateRecipe(recipe.id, currentUser.id, stars);
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};