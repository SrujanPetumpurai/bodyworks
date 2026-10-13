import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { A as renderTemplate, j as maybeRenderHead, w as renderComponent, z as createAstro } from "./sequence_CK-B6CjN.mjs";
import { t as createComponent } from "./compiler_J__uvMUs.mjs";
import { l as listPostingTargets } from "./communities_xVE7pya1.mjs";
import { o as getRecipeBySlug, s as listFoods } from "./recipes_Bev4MUNo.mjs";
import { t as $$Page } from "./Page_C1K9D-k3.mjs";
import { n as RecipeForm } from "./RecipeForm_CbVlT5We.mjs";
//#region src/pages/recipes/[slug]/edit.astro
var edit_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Edit,
	file: () => $$file,
	prerender: () => false,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Edit = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Edit;
	const user = Astro.locals.user;
	const { slug } = Astro.params;
	if (!user) return Astro.redirect(`/auth?next=/recipes/${slug}/edit`);
	const recipe = slug ? await getRecipeBySlug(slug, user.id) : null;
	if (!recipe || recipe.author?.id !== user.id) return new Response("Not found", { status: 404 });
	const foods = (await listFoods()).map((f) => f.name);
	const communities = await listPostingTargets(user.id);
	const initial = {
		name: recipe.name,
		description: recipe.description,
		cuisine: recipe.cuisine ?? "",
		prepTimeMinutes: recipe.prepTimeMinutes?.toString() ?? "",
		servings: recipe.servings?.toString() ?? "",
		difficulty: recipe.difficulty ?? "",
		imageUrl: recipe.imageUrl,
		videoUrl: recipe.videoUrl ?? "",
		ingredients: recipe.ingredients.map((i) => ({
			name: i.food.name,
			amount: String(Number(i.amount)),
			unit: i.unit
		})),
		steps: recipe.steps.map((s) => s.instruction),
		communityId: recipe.community ? String(recipe.community.id) : "",
		dishName: recipe.dish?.name ?? "",
		visibility: recipe.visibility
	};
	return renderTemplate`${renderComponent($$result, "Page", $$Page, { "title": `Edit ${recipe.name}` }, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<main class="rf-wrap">${renderComponent($$result, "RecipeForm", RecipeForm, {
		"foods": foods,
		"communities": communities,
		"initial": initial,
		"editSlug": recipe.slug,
		"userId": user.id,
		"client:load": true,
		"client:component-hydration": "load",
		"client:component-path": "/home/claude/bodyworks/src/components/forms/RecipeForm.tsx",
		"client:component-export": "default"
	})}</main>` })}`;
}, "/home/claude/bodyworks/src/pages/recipes/[slug]/edit.astro", void 0);
var $$file = "/home/claude/bodyworks/src/pages/recipes/[slug]/edit.astro";
var $$url = "/recipes/[slug]/edit";
//#endregion
//#region \0virtual:astro:page:src/pages/recipes/[slug]/edit@_@astro
var page = () => edit_exports;
//#endregion
export { page };
