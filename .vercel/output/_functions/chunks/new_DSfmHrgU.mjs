import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { A as renderTemplate, j as maybeRenderHead, w as renderComponent, z as createAstro } from "./sequence_CK-B6CjN.mjs";
import { t as createComponent } from "./compiler_J__uvMUs.mjs";
import { l as listPostingTargets } from "./communities_xVE7pya1.mjs";
import { s as listFoods } from "./recipes_Bev4MUNo.mjs";
import { t as $$Page } from "./Page_C1K9D-k3.mjs";
import { n as RecipeForm, t as EMPTY_RECIPE } from "./RecipeForm_CbVlT5We.mjs";
//#region src/pages/recipes/new.astro
var new_exports = /* @__PURE__ */ __exportAll({
	default: () => $$New,
	file: () => $$file,
	prerender: () => false,
	url: () => $$url
});
createAstro("https://astro.build");
var $$New = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$New;
	const user = Astro.locals.user;
	if (!user) return Astro.redirect("/auth?next=/recipes/new");
	const foods = (await listFoods()).map((f) => f.name);
	const communities = await listPostingTargets(user.id);
	const wanted = Astro.url.searchParams.get("community");
	const preset = communities.find((c) => c.slug === wanted);
	const initial = preset ? {
		...EMPTY_RECIPE,
		communityId: String(preset.id),
		visibility: "community"
	} : EMPTY_RECIPE;
	return renderTemplate`${renderComponent($$result, "Page", $$Page, { "title": "Add recipe" }, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<main class="rf-wrap">${renderComponent($$result, "RecipeForm", RecipeForm, {
		"foods": foods,
		"communities": communities,
		"initial": initial,
		"userId": user.id,
		"client:load": true,
		"client:component-hydration": "load",
		"client:component-path": "/home/claude/bodyworks/src/components/forms/RecipeForm.tsx",
		"client:component-export": "default"
	})}</main>` })}`;
}, "/home/claude/bodyworks/src/pages/recipes/new.astro", void 0);
var $$file = "/home/claude/bodyworks/src/pages/recipes/new.astro";
var $$url = "/recipes/new";
//#endregion
//#region \0virtual:astro:page:src/pages/recipes/new@_@astro
var page = () => new_exports;
//#endregion
export { page };
