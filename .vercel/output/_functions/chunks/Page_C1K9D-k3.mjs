import { A as renderTemplate, D as renderSlot, M as renderHead, w as renderComponent, z as createAstro } from "./sequence_CK-B6CjN.mjs";
import { t as createComponent } from "./compiler_J__uvMUs.mjs";
import "./forms_qss2n2i2.mjs";
import { t as AccountMenu } from "./AccountMenu_D2jBtNE-.mjs";
/* empty css                      */
/* empty css                  */
//#region src/layouts/Page.astro
createAstro("https://astro.build");
var $$Page = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Page;
	const { title, nav = true } = Astro.props;
	return renderTemplate`<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} — bodyworks</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@600;700;800&display=swap" rel="stylesheet">${renderHead($$result)}</head><body><div class="rb-page">${nav && renderTemplate`<header class="pf-topbar"><a href="/recipes" class="rb-logo">bodyworks</a><nav class="rb-nav" aria-label="Main"><a href="/recipes">Recipes</a><a href="/communities">Communities</a></nav>${renderComponent($$result, "AccountMenu", AccountMenu, {
		"client:load": true,
		"client:component-hydration": "load",
		"client:component-path": "/home/claude/bodyworks/src/components/AccountMenu.tsx",
		"client:component-export": "default"
	})}</header>`}${renderSlot($$result, $$slots["default"])}</div></body></html>`;
}, "/home/claude/bodyworks/src/layouts/Page.astro", void 0);
//#endregion
export { $$Page as t };
