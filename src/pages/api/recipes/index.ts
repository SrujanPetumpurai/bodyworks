import type { APIRoute } from "astro";
import { createRecipe, listRecipes } from "../../../db/recipes";
import { json, parseRecipeInput } from "../../../lib/recipe-input";

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

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return json({ error: "Sign in to add a recipe." }, 401);

  const body = await request.json().catch(() => null);
  const parsed = parseRecipeInput(body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);

  try {
    const created = await createRecipe(locals.user.id, parsed.data);
    return json({ slug: created.slug }, 201);
  } catch (err) {
    console.error("createRecipe failed", err);
    return json({ error: "Couldn't save the recipe. Try again." }, 500);
  }
};
