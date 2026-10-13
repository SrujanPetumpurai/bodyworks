import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { l as rateRecipe, o as getRecipeBySlug } from "./recipes_Bev4MUNo.mjs";
//#region src/pages/api/recipes/[slug]/rate.ts
var rate_exports = /* @__PURE__ */ __exportAll({
	POST: () => POST,
	prerender: () => false
});
var POST = async ({ params, request, locals }) => {
	const currentUser = locals.user;
	if (!currentUser) return new Response(JSON.stringify({ error: "Sign in to rate recipes" }), { status: 401 });
	const slug = params.slug;
	if (!slug) return new Response(JSON.stringify({ error: "slug is required" }), { status: 400 });
	const recipe = await getRecipeBySlug(slug, currentUser.id);
	if (!recipe) return new Response(JSON.stringify({ error: "Recipe not found" }), { status: 404 });
	if (recipe.visibility === "private") return new Response(JSON.stringify({ error: "Private recipes can't be rated" }), { status: 403 });
	const body = await request.json().catch(() => null);
	const stars = Number(body?.stars);
	if (!Number.isInteger(stars) || stars < 1 || stars > 5) return new Response(JSON.stringify({ error: "stars must be an integer 1-5" }), { status: 400 });
	const result = await rateRecipe(recipe.id, currentUser.id, stars);
	return new Response(JSON.stringify(result), {
		status: 200,
		headers: { "Content-Type": "application/json" }
	});
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/recipes/[slug]/rate@_@ts
var page = () => rate_exports;
//#endregion
export { page };
