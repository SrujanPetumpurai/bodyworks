import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { A as renderTemplate, M as renderHead, w as renderComponent, z as createAstro } from "./sequence_CK-B6CjN.mjs";
import { t as createComponent } from "./compiler_J__uvMUs.mjs";
import { c as listRecipes, s as listFoods } from "./recipes_Bev4MUNo.mjs";
import "./forms_qss2n2i2.mjs";
import { n as Avatar, t as AccountMenu } from "./AccountMenu_D2jBtNE-.mjs";
import { n as RecipeCard, t as RecipeModal } from "./RecipeModal_BG7RVYcG.mjs";
import { useMemo, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/recipes/RecipesBrowser.tsx
var RATING_OPTIONS = [
	{
		label: "Any",
		value: 0
	},
	{
		label: "3★ & up",
		value: 3
	},
	{
		label: "4★ & up",
		value: 4
	}
];
function RecipesBrowser({ foods, recipes }) {
	const [query, setQuery] = useState("");
	const [selected, setSelected] = useState([]);
	const [ingredientInput, setIngredientInput] = useState("");
	const [authorId, setAuthorId] = useState("all");
	const [minRating, setMinRating] = useState(0);
	const [activeSlug, setActiveSlug] = useState(null);
	const authors = useMemo(() => {
		const map = /* @__PURE__ */ new Map();
		for (const r of recipes) if (r.authorId && r.authorName && !map.has(r.authorId)) map.set(r.authorId, {
			id: r.authorId,
			name: r.authorName,
			image: r.authorImage
		});
		return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
	}, [recipes]);
	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return recipes.filter((r) => {
			if (q && !r.name.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q)) return false;
			if (selected.length && !selected.every((s) => r.ingredientSlugs.includes(s))) return false;
			if (authorId !== "all" && r.authorId !== authorId) return false;
			if (minRating && r.avgRating < minRating) return false;
			return true;
		});
	}, [
		recipes,
		query,
		selected,
		authorId,
		minRating
	]);
	const available = foods.filter((f) => !selected.includes(f.slug));
	const [ingredientMsg, setIngredientMsg] = useState(null);
	const popular = useMemo(() => {
		const counts = /* @__PURE__ */ new Map();
		for (const r of recipes) for (const slug of r.ingredientSlugs) counts.set(slug, (counts.get(slug) ?? 0) + 1);
		return foods.filter((f) => !selected.includes(f.slug)).sort((a, b) => (counts.get(b.slug) ?? 0) - (counts.get(a.slug) ?? 0)).slice(0, 8);
	}, [
		recipes,
		foods,
		selected
	]);
	function addIngredient(raw) {
		const q = raw.trim().toLowerCase();
		if (!q) return;
		const match = available.find((f) => f.name.toLowerCase() === q) ?? available.find((f) => f.name.toLowerCase().includes(q));
		if (!match) {
			setIngredientMsg(foods.some((f) => f.name.toLowerCase().includes(q)) ? "Already added." : `No ingredient matches "${raw.trim()}".`);
			return;
		}
		setSelected((s) => [...s, match.slug]);
		setIngredientInput("");
		setIngredientMsg(null);
	}
	function onIngredientChange(value) {
		setIngredientMsg(null);
		if (available.some((f) => f.name.toLowerCase() === value.trim().toLowerCase())) addIngredient(value);
		else setIngredientInput(value);
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "rb-page",
		children: [
			/* @__PURE__ */ jsxs("header", {
				className: "rb-topbar",
				children: [
					/* @__PURE__ */ jsx("a", {
						href: "/",
						className: "rb-wordmark",
						children: "bodyworks"
					}),
					/* @__PURE__ */ jsxs("nav", {
						className: "rb-nav",
						"aria-label": "Main",
						children: [
							/* @__PURE__ */ jsx("a", {
								href: "/daily-requirements",
								children: "Daily needs"
							}),
							/* @__PURE__ */ jsx("a", {
								href: "/recipes",
								"aria-current": "page",
								children: "Recipes"
							}),
							/* @__PURE__ */ jsx("a", {
								href: "/communities",
								children: "Communities"
							})
						]
					}),
					/* @__PURE__ */ jsx(AccountMenu, {})
				]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "rb-hero",
				children: [
					/* @__PURE__ */ jsx("h1", {
						className: "rb-title",
						children: "Recipes"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "rb-lede",
						children: "High-protein meals. Add what you have and see what you can cook."
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "rb-controls",
						children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
							className: "rb-field-label",
							htmlFor: "rb-search",
							children: "Search"
						}), /* @__PURE__ */ jsx("input", {
							id: "rb-search",
							className: "rb-search",
							type: "search",
							placeholder: "Search recipes",
							value: query,
							onChange: (e) => setQuery(e.target.value)
						})] }), /* @__PURE__ */ jsxs("div", { children: [
							/* @__PURE__ */ jsx("label", {
								className: "rb-field-label",
								htmlFor: "rb-ing",
								children: "Ingredients you have"
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "rb-ing-field",
								children: [
									selected.map((slug) => {
										const name = foods.find((f) => f.slug === slug)?.name ?? slug;
										return /* @__PURE__ */ jsxs("button", {
											type: "button",
											className: "rb-chip",
											onClick: () => setSelected((s) => s.filter((x) => x !== slug)),
											"aria-label": `Remove ${name}`,
											children: [name, " ×"]
										}, slug);
									}),
									/* @__PURE__ */ jsx("input", {
										id: "rb-ing",
										className: "rb-ing-input",
										list: "rb-food-list",
										placeholder: selected.length ? "Add another…" : "Type an ingredient, press Enter",
										value: ingredientInput,
										onChange: (e) => onIngredientChange(e.target.value),
										onKeyDown: (e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												addIngredient(ingredientInput);
											} else if (e.key === "Backspace" && !ingredientInput && selected.length) setSelected((s) => s.slice(0, -1));
										}
									}),
									/* @__PURE__ */ jsx("datalist", {
										id: "rb-food-list",
										children: available.map((f) => /* @__PURE__ */ jsx("option", { value: f.name }, f.slug))
									}),
									/* @__PURE__ */ jsx("button", {
										type: "button",
										className: "rb-add-btn",
										onClick: () => addIngredient(ingredientInput),
										children: "Add"
									})
								]
							}),
							ingredientMsg ? /* @__PURE__ */ jsx("p", {
								className: "rb-hint warn",
								role: "status",
								children: ingredientMsg
							}) : selected.length > 0 ? /* @__PURE__ */ jsxs("p", {
								className: "rb-hint",
								children: [
									"Showing recipes that use all ",
									selected.length,
									" of these."
								]
							}) : null,
							popular.length > 0 && /* @__PURE__ */ jsxs("div", {
								className: "rb-suggest",
								children: [/* @__PURE__ */ jsx("span", { children: "Popular:" }), popular.map((f) => /* @__PURE__ */ jsxs("button", {
									type: "button",
									onClick: () => addIngredient(f.name),
									children: ["+ ", f.name]
								}, f.slug))]
							})
						] })]
					})
				]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "rb-container",
				children: /* @__PURE__ */ jsxs("div", {
					className: "rb-body",
					children: [/* @__PURE__ */ jsxs("aside", {
						className: "rb-filter",
						children: [
							/* @__PURE__ */ jsx("h2", { children: "Filter" }),
							/* @__PURE__ */ jsx("h3", { children: "Profile" }),
							/* @__PURE__ */ jsxs("button", {
								type: "button",
								className: `rb-profile ${authorId === "all" ? "on" : ""}`,
								onClick: () => setAuthorId("all"),
								children: [/* @__PURE__ */ jsx("span", {
									className: "rb-profile-all",
									children: "All"
								}), "Everyone"]
							}),
							authors.map((a) => /* @__PURE__ */ jsxs("button", {
								type: "button",
								className: `rb-profile ${authorId === a.id ? "on" : ""}`,
								onClick: () => setAuthorId(authorId === a.id ? "all" : a.id),
								children: [/* @__PURE__ */ jsx(Avatar, {
									name: a.name,
									image: a.image,
									size: 28
								}), a.name]
							}, a.id)),
							/* @__PURE__ */ jsx("h3", { children: "Rating" }),
							RATING_OPTIONS.map((o) => /* @__PURE__ */ jsxs("label", {
								className: "rb-radio",
								children: [/* @__PURE__ */ jsx("input", {
									type: "radio",
									name: "rating",
									checked: minRating === o.value,
									onChange: () => setMinRating(o.value)
								}), o.label]
							}, o.value))
						]
					}), /* @__PURE__ */ jsxs("section", { children: [/* @__PURE__ */ jsx("div", {
						className: "rb-results-head",
						children: /* @__PURE__ */ jsxs("span", { children: [
							filtered.length,
							" ",
							filtered.length === 1 ? "recipe" : "recipes"
						] })
					}), filtered.length === 0 ? /* @__PURE__ */ jsx("p", {
						className: "rb-empty",
						children: "No recipes match. Try removing a filter."
					}) : /* @__PURE__ */ jsx("div", {
						className: "rb-grid",
						children: filtered.map((r) => /* @__PURE__ */ jsx(RecipeCard, {
							recipe: r,
							onClick: () => setActiveSlug(r.slug)
						}, r.slug))
					})] })]
				})
			}),
			activeSlug && /* @__PURE__ */ jsx(RecipeModal, {
				slug: activeSlug,
				onClose: () => setActiveSlug(null)
			})
		]
	});
}
//#endregion
//#region src/pages/recipes.astro
var recipes_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Recipes,
	file: () => $$file,
	prerender: () => false,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Recipes = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Recipes;
	const [foods, recipes] = await Promise.all([listFoods(), listRecipes({ viewerId: Astro.locals.user?.id })]);
	const foodOptions = foods.map((f) => ({
		slug: f.slug,
		name: f.name
	}));
	return renderTemplate`<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Recipes — bodyworks</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@600;700;800&display=swap" rel="stylesheet">${renderHead($$result)}</head><body>${renderComponent($$result, "RecipesBrowser", RecipesBrowser, {
		"foods": foodOptions,
		"recipes": recipes,
		"client:load": true,
		"client:component-hydration": "load",
		"client:component-path": "/home/claude/bodyworks/src/components/recipes/RecipesBrowser.tsx",
		"client:component-export": "default"
	})}</body></html>`;
}, "/home/claude/bodyworks/src/pages/recipes.astro", void 0);
var $$file = "/home/claude/bodyworks/src/pages/recipes.astro";
var $$url = "/recipes";
//#endregion
//#region \0virtual:astro:page:src/pages/recipes@_@astro
var page = () => recipes_exports;
//#endregion
export { page };
