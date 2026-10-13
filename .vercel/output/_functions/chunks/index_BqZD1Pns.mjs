import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { A as renderTemplate, M as renderHead, w as renderComponent, z as createAstro } from "./sequence_CK-B6CjN.mjs";
import { t as createComponent } from "./compiler_J__uvMUs.mjs";
import { c as listMyCommunities, u as listPublicCommunities } from "./communities_xVE7pya1.mjs";
import "./forms_qss2n2i2.mjs";
import { t as AccountMenu } from "./AccountMenu_D2jBtNE-.mjs";
/* empty css                      */
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/communities/CommunitiesBrowser.tsx
function CommunityCard({ c }) {
	return /* @__PURE__ */ jsxs("a", {
		className: "cm-card",
		href: `/communities/${c.slug}`,
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "cm-card-top",
				children: [/* @__PURE__ */ jsx("h3", { children: c.name }), c.visibility === "private" && /* @__PURE__ */ jsx("span", {
					className: "cm-badge cm-badge-private",
					children: "Private"
				})]
			}),
			c.description && /* @__PURE__ */ jsx("p", { children: c.description }),
			/* @__PURE__ */ jsxs("small", { children: [
				c.memberCount,
				" ",
				c.memberCount === 1 ? "member" : "members",
				" · ",
				c.recipeCount,
				" ",
				c.recipeCount === 1 ? "recipe" : "recipes"
			] })
		]
	});
}
function CommunitiesBrowser({ mine, publicList, signedIn }) {
	const [creating, setCreating] = useState(false);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [visibility, setVisibility] = useState("public");
	const [error, setError] = useState(null);
	const [busy, setBusy] = useState(false);
	const [query, setQuery] = useState("");
	const mineSlugs = new Set(mine.map((c) => c.slug));
	const q = query.trim().toLowerCase();
	const discover = publicList.filter((c) => !mineSlugs.has(c.slug) && (!q || c.name.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q)));
	async function create(e) {
		e.preventDefault();
		setError(null);
		setBusy(true);
		const res = await fetch("/api/communities", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name,
				description,
				visibility
			})
		}).catch(() => null);
		const data = await res?.json().catch(() => null);
		if (!res || !res.ok) {
			setBusy(false);
			return setError(data?.error || "Couldn't create it. Check your connection and try again.");
		}
		location.href = `/communities/${data.slug}`;
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
								children: "Recipes"
							}),
							/* @__PURE__ */ jsx("a", {
								href: "/communities",
								"aria-current": "page",
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
						children: "Communities"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "rb-lede",
						children: "Cook together. Keep a family's recipes in one box, or share a dish with the world."
					}),
					signedIn ? !creating && /* @__PURE__ */ jsx("button", {
						className: "rb-btn rb-btn-solid",
						onClick: () => setCreating(true),
						children: "Start a community"
					}) : /* @__PURE__ */ jsx("a", {
						className: "rb-btn rb-btn-solid",
						href: "/auth?next=/communities",
						children: "Sign in to start one"
					}),
					creating && /* @__PURE__ */ jsxs("form", {
						className: "rf cm-create",
						onSubmit: create,
						children: [
							/* @__PURE__ */ jsxs("label", {
								className: "af-field",
								children: ["Name", /* @__PURE__ */ jsx("input", {
									value: name,
									onChange: (e) => setName(e.target.value),
									required: true,
									maxLength: 60,
									placeholder: "e.g. Rao family kitchen"
								})]
							}),
							/* @__PURE__ */ jsxs("label", {
								className: "af-field",
								children: ["About (optional)", /* @__PURE__ */ jsx("textarea", {
									value: description,
									onChange: (e) => setDescription(e.target.value),
									maxLength: 300,
									rows: 2
								})]
							}),
							/* @__PURE__ */ jsxs("fieldset", {
								className: "cm-choice",
								children: [
									/* @__PURE__ */ jsx("legend", { children: "Who can see it?" }),
									/* @__PURE__ */ jsxs("label", { children: [/* @__PURE__ */ jsx("input", {
										type: "radio",
										name: "vis",
										checked: visibility === "public",
										onChange: () => setVisibility("public")
									}), /* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("strong", { children: "Public" }), " Anyone can find it, read it and join."] })] }),
									/* @__PURE__ */ jsxs("label", { children: [/* @__PURE__ */ jsx("input", {
										type: "radio",
										name: "vis",
										checked: visibility === "private",
										onChange: () => setVisibility("private")
									}), /* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("strong", { children: "Private" }), " Hidden from search. Only people you invite can join and see recipes."] })] })
								]
							}),
							error && /* @__PURE__ */ jsx("p", {
								className: "rb-msg",
								role: "alert",
								children: error
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "rf-actions",
								children: [/* @__PURE__ */ jsx("button", {
									className: "rb-btn rb-btn-solid",
									disabled: busy,
									children: busy ? "Creating…" : "Create community"
								}), /* @__PURE__ */ jsx("button", {
									type: "button",
									className: "rb-btn",
									onClick: () => setCreating(false),
									children: "Cancel"
								})]
							})
						]
					})
				]
			}),
			/* @__PURE__ */ jsxs("main", {
				className: "rb-container",
				children: [mine.length > 0 && /* @__PURE__ */ jsxs("section", {
					className: "cm-section",
					children: [/* @__PURE__ */ jsx("h2", { children: "Your communities" }), /* @__PURE__ */ jsx("div", {
						className: "cm-cards",
						children: mine.map((c) => /* @__PURE__ */ jsx(CommunityCard, { c }, c.slug))
					})]
				}), /* @__PURE__ */ jsxs("section", {
					className: "cm-section",
					children: [
						/* @__PURE__ */ jsx("h2", { children: "Discover" }),
						/* @__PURE__ */ jsx("input", {
							className: "rb-search cm-search",
							placeholder: "Search communities",
							"aria-label": "Search communities",
							value: query,
							onChange: (e) => setQuery(e.target.value)
						}),
						discover.length === 0 ? /* @__PURE__ */ jsx("p", {
							className: "rb-empty",
							children: q ? "No communities match that." : "No public communities yet. Start the first one."
						}) : /* @__PURE__ */ jsx("div", {
							className: "cm-cards",
							children: discover.map((c) => /* @__PURE__ */ jsx(CommunityCard, { c }, c.slug))
						})
					]
				})]
			})
		]
	});
}
//#endregion
//#region src/pages/communities/index.astro
var communities_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Index,
	file: () => $$file,
	prerender: () => false,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Index = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Index;
	const user = Astro.locals.user;
	const [mine, publicList] = await Promise.all([user ? listMyCommunities(user.id) : [], listPublicCommunities()]);
	return renderTemplate`<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Communities — bodyworks</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@600;700;800&display=swap" rel="stylesheet">${renderHead($$result)}</head><body>${renderComponent($$result, "CommunitiesBrowser", CommunitiesBrowser, {
		"mine": mine,
		"publicList": publicList,
		"signedIn": !!user,
		"client:load": true,
		"client:component-hydration": "load",
		"client:component-path": "/home/claude/bodyworks/src/components/communities/CommunitiesBrowser.tsx",
		"client:component-export": "default"
	})}</body></html>`;
}, "/home/claude/bodyworks/src/pages/communities/index.astro", void 0);
var $$file = "/home/claude/bodyworks/src/pages/communities/index.astro";
var $$url = "/communities";
//#endregion
//#region \0virtual:astro:page:src/pages/communities/index@_@astro
var page = () => communities_exports;
//#endregion
export { page };
