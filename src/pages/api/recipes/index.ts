import type { APIRoute } from "astro";
import { listRecipes } from "../../../db/recipes";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const ingredientsParam = url.searchParams.get("ingredients");
  const ingredientSlugs = ingredientsParam
    ? ingredientsParam.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;

  const recipes = await listRecipes(ingredientSlugs);
  return new Response(JSON.stringify(recipes), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};