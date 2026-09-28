import type { APIRoute } from "astro";
import { getRecipeBySlug } from "../../../db/recipes";

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