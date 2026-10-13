import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { f as resolveRecipePlacement } from "./communities_xVE7pya1.mjs";
import { d as updateRecipe, i as deleteRecipe, o as getRecipeBySlug } from "./recipes_Bev4MUNo.mjs";
import { n as parseRecipeInput, t as json } from "./recipe-input_DJkkYCV-.mjs";
//#region src/pages/api/recipes/[slug]/index.ts
var _slug__exports = /* @__PURE__ */ __exportAll({
	DELETE: () => DELETE,
	GET: () => GET,
	PUT: () => PUT,
	prerender: () => false
});
var GET = async ({ params, locals }) => {
	const slug = params.slug;
	if (!slug) return new Response(JSON.stringify({ error: "slug is required" }), { status: 400 });
	const recipe = await getRecipeBySlug(slug, locals.user?.id);
	if (!recipe) return new Response(JSON.stringify({ error: "Recipe not found" }), { status: 404 });
	return new Response(JSON.stringify(recipe), {
		status: 200,
		headers: { "Content-Type": "application/json" }
	});
};
var PUT = async ({ params, request, locals }) => {
	if (!locals.user) return json({ error: "Sign in first." }, 401);
	if (!params.slug) return json({ error: "slug is required" }, 400);
	const body = await request.json().catch(() => null);
	const parsed = parseRecipeInput(body);
	if (!parsed.ok) return json({ error: parsed.error }, 400);
	const placed = await resolveRecipePlacement(locals.user.id, parsed.data);
	if (!placed.ok) return json({ error: placed.error }, placed.status);
	try {
		if (!await updateRecipe(params.slug, locals.user.id, parsed.data, placed.placement)) return json({ error: "Recipe not found, or it isn't yours." }, 404);
		return json({ slug: params.slug });
	} catch (err) {
		console.error("updateRecipe failed", err);
		return json({ error: "Couldn't save changes. Try again." }, 500);
	}
};
var DELETE = async ({ params, locals }) => {
	if (!locals.user) return json({ error: "Sign in first." }, 401);
	if (!params.slug) return json({ error: "slug is required" }, 400);
	if (!await deleteRecipe(params.slug, locals.user.id)) return json({ error: "Recipe not found, or it isn't yours." }, 404);
	return json({ deleted: true });
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/recipes/[slug]/index@_@ts
var page = () => _slug__exports;
//#endregion
export { page };
