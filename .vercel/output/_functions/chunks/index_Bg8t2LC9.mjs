import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { f as resolveRecipePlacement } from "./communities_xVE7pya1.mjs";
import { c as listRecipes, r as createRecipe } from "./recipes_Bev4MUNo.mjs";
import { n as parseRecipeInput, t as json } from "./recipe-input_DJkkYCV-.mjs";
//#region src/pages/api/recipes/index.ts
var recipes_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	POST: () => POST,
	prerender: () => false
});
var GET = async ({ url, locals }) => {
	const ingredientsParam = url.searchParams.get("ingredients");
	const ingredientSlugs = ingredientsParam ? ingredientsParam.split(",").map((s) => s.trim()).filter(Boolean) : void 0;
	const recipes = await listRecipes({
		ingredientSlugs,
		viewerId: locals.user?.id
	});
	return new Response(JSON.stringify(recipes), {
		status: 200,
		headers: { "Content-Type": "application/json" }
	});
};
var POST = async ({ request, locals }) => {
	if (!locals.user) return json({ error: "Sign in to add a recipe." }, 401);
	const body = await request.json().catch(() => null);
	const parsed = parseRecipeInput(body);
	if (!parsed.ok) return json({ error: parsed.error }, 400);
	const placed = await resolveRecipePlacement(locals.user.id, parsed.data);
	if (!placed.ok) return json({ error: placed.error }, placed.status);
	try {
		const created = await createRecipe(locals.user.id, parsed.data, placed.placement);
		return json({ slug: created.slug }, 201);
	} catch (err) {
		console.error("createRecipe failed", err);
		return json({ error: "Couldn't save the recipe. Try again." }, 500);
	}
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/recipes/index@_@ts
var page = () => recipes_exports;
//#endregion
export { page };
