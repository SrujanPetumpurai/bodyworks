import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { A as renderTemplate, M as renderHead, w as renderComponent, z as createAstro } from "./sequence_CK-B6CjN.mjs";
import { t as createComponent } from "./compiler_J__uvMUs.mjs";
import { a as getProfile, c as listRecipes } from "./recipes_Bev4MUNo.mjs";
import "./forms_qss2n2i2.mjs";
import { i as hash, n as Avatar, r as TONES, t as AccountMenu } from "./AccountMenu_D2jBtNE-.mjs";
import { n as RecipeCard, t as RecipeModal } from "./RecipeModal_BG7RVYcG.mjs";
/* empty css                  */
import { t as ImageUpload } from "./ImageUpload_D2y_azHP.mjs";
import { useMemo, useState } from "react";
import { Fragment as Fragment$1, jsx, jsxs } from "react/jsx-runtime";
//#region src/components/profile/ProfileView.tsx
var TABS = [{
	id: "home",
	label: "Home"
}, {
	id: "recipes",
	label: "Recipes"
}];
var SORTS = [{
	id: "recent",
	label: "Recent"
}, {
	id: "top",
	label: "Top rated"
}];
var byRecent = (a, b) => b.createdAt.localeCompare(a.createdAt);
var byTop = (a, b) => b.avgRating - a.avgRating || b.ratingCount - a.ratingCount || byRecent(a, b);
function ProfileView({ profile, isOwner, recipes, initialTab, initialSort }) {
	const [tab, setTab] = useState(initialTab);
	const [sort, setSort] = useState(initialSort);
	const [activeSlug, setActiveSlug] = useState(null);
	const [editing, setEditing] = useState(false);
	const recent = useMemo(() => [...recipes].sort(byRecent), [recipes]);
	const top = useMemo(() => [...recipes].filter((r) => r.ratingCount > 0).sort(byTop), [recipes]);
	const sorted = sort === "top" ? [...recipes].sort(byTop) : recent;
	const rated = recipes.filter((r) => r.ratingCount > 0);
	const overall = rated.length ? rated.reduce((sum, r) => sum + r.avgRating, 0) / rated.length : 0;
	const joined = new Date(profile.joinedAt).toLocaleDateString("en", {
		month: "short",
		year: "numeric"
	});
	function update(nextTab, nextSort) {
		setTab(nextTab);
		setSort(nextSort);
		const q = new URLSearchParams();
		if (nextTab === "recipes") q.set("tab", "recipes");
		if (nextTab === "recipes" && nextSort === "top") q.set("sort", "top");
		const qs = q.toString();
		history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
	}
	const c1 = TONES[hash(profile.name) % TONES.length];
	const c2 = TONES[(hash(profile.name) + 1) % TONES.length];
	const bannerStyle = profile.banner ? { backgroundImage: `url(${profile.banner})` } : { backgroundImage: `linear-gradient(120deg, ${c1}, ${c2})` };
	return /* @__PURE__ */ jsxs("div", {
		className: "rb-page pf-page",
		children: [
			/* @__PURE__ */ jsxs("header", {
				className: "pf-topbar",
				children: [
					/* @__PURE__ */ jsx("a", {
						href: "/recipes",
						className: "rb-logo",
						children: "bodyworks"
					}),
					/* @__PURE__ */ jsx("a", {
						href: "/recipes",
						className: "pf-back",
						children: "← All recipes"
					}),
					/* @__PURE__ */ jsx(AccountMenu, {})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "pf-wrap",
				children: [
					/* @__PURE__ */ jsx("div", {
						className: "pf-banner",
						style: bannerStyle,
						role: "img",
						"aria-label": `${profile.name}'s banner`
					}),
					/* @__PURE__ */ jsxs("section", {
						className: "pf-head",
						children: [
							/* @__PURE__ */ jsx(Avatar, {
								name: profile.name,
								image: profile.image,
								size: 128
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "pf-meta",
								children: [/* @__PURE__ */ jsx("h1", { children: profile.name }), /* @__PURE__ */ jsxs("p", {
									className: "pf-stats",
									children: [
										recipes.length,
										" ",
										recipes.length === 1 ? "recipe" : "recipes",
										rated.length > 0 && /* @__PURE__ */ jsxs(Fragment$1, { children: [
											" · ★ ",
											overall.toFixed(1),
											" average"
										] }),
										" · ",
										"Joined ",
										joined
									]
								})]
							}),
							isOwner && /* @__PURE__ */ jsxs("div", {
								className: "pf-owner-actions",
								children: [/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "rb-btn",
									onClick: () => setEditing((e) => !e),
									children: editing ? "Close" : "Customize profile"
								}), /* @__PURE__ */ jsx("a", {
									className: "rb-btn rb-btn-solid",
									href: "/recipes/new",
									children: "+ Add recipe"
								})]
							})
						]
					}),
					isOwner && editing && /* @__PURE__ */ jsx(ProfileEditor, {
						profile,
						onDone: () => location.reload()
					}),
					/* @__PURE__ */ jsx("nav", {
						className: "pf-tabs",
						role: "tablist",
						"aria-label": "Profile sections",
						children: TABS.map((t) => /* @__PURE__ */ jsx("button", {
							type: "button",
							role: "tab",
							"aria-selected": tab === t.id,
							className: tab === t.id ? "on" : "",
							onClick: () => update(t.id, sort),
							children: t.label
						}, t.id))
					}),
					recipes.length === 0 ? /* @__PURE__ */ jsx("p", {
						className: "rb-empty",
						children: isOwner ? /* @__PURE__ */ jsxs(Fragment$1, { children: [
							"You haven't posted any recipes yet. ",
							/* @__PURE__ */ jsx("a", {
								href: "/recipes/new",
								children: "Add your first one"
							}),
							"."
						] }) : /* @__PURE__ */ jsxs(Fragment$1, { children: [profile.name, " hasn't posted any recipes yet."] })
					}) : tab === "home" ? /* @__PURE__ */ jsxs("div", {
						className: "pf-home",
						children: [/* @__PURE__ */ jsx(Shelf, {
							title: "Latest",
							recipes: recent.slice(0, 3),
							onOpen: setActiveSlug,
							onMore: () => update("recipes", "recent"),
							moreLabel: "View all"
						}), top.length > 0 && /* @__PURE__ */ jsx(Shelf, {
							title: "Top rated",
							recipes: top.slice(0, 3),
							onOpen: setActiveSlug,
							onMore: () => update("recipes", "top"),
							moreLabel: "See more"
						})]
					}) : /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsx("div", {
						className: "pf-sorts",
						role: "group",
						"aria-label": "Sort recipes",
						children: SORTS.map((s) => /* @__PURE__ */ jsx("button", {
							type: "button",
							className: sort === s.id ? "on" : "",
							"aria-pressed": sort === s.id,
							onClick: () => update("recipes", s.id),
							children: s.label
						}, s.id))
					}), /* @__PURE__ */ jsx("div", {
						className: "rb-grid pf-grid",
						children: sorted.map((r) => /* @__PURE__ */ jsx(RecipeCard, {
							recipe: r,
							onClick: () => setActiveSlug(r.slug)
						}, r.slug))
					})] })
				]
			}),
			activeSlug && /* @__PURE__ */ jsx(RecipeModal, {
				slug: activeSlug,
				onClose: () => setActiveSlug(null)
			})
		]
	});
}
function Shelf({ title, recipes, onOpen, onMore, moreLabel }) {
	return /* @__PURE__ */ jsxs("section", {
		className: "pf-shelf",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "pf-shelf-head",
			children: [/* @__PURE__ */ jsx("h2", { children: title }), /* @__PURE__ */ jsxs("button", {
				type: "button",
				onClick: onMore,
				children: [moreLabel, " →"]
			})]
		}), /* @__PURE__ */ jsx("div", {
			className: "rb-grid pf-grid",
			children: recipes.map((r) => /* @__PURE__ */ jsx(RecipeCard, {
				recipe: r,
				onClick: () => onOpen(r.slug)
			}, r.slug))
		})]
	});
}
function ProfileEditor({ profile, onDone }) {
	const [name, setName] = useState(profile.name);
	const [image, setImage] = useState(profile.image);
	const [banner, setBanner] = useState(profile.banner);
	const [error, setError] = useState(null);
	const [busy, setBusy] = useState(false);
	async function save() {
		setError(null);
		setBusy(true);
		const res = await fetch("/api/profile", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name,
				image,
				banner
			})
		}).catch(() => null);
		const data = await res?.json().catch(() => null);
		if (!res || !res.ok) {
			setBusy(false);
			return setError(data?.error || "Couldn't save. Try again.");
		}
		onDone();
	}
	return /* @__PURE__ */ jsxs("section", {
		className: "pe",
		"aria-label": "Customize profile",
		children: [
			/* @__PURE__ */ jsxs("label", {
				className: "af-field",
				children: ["Display name", /* @__PURE__ */ jsx("input", {
					value: name,
					onChange: (e) => setName(e.target.value),
					maxLength: 60
				})]
			}),
			/* @__PURE__ */ jsx(ImageUpload, {
				label: "Profile picture",
				shape: "round",
				value: image,
				onChange: setImage
			}),
			/* @__PURE__ */ jsx(ImageUpload, {
				label: "Banner (wide image works best)",
				value: banner,
				onChange: setBanner
			}),
			error && /* @__PURE__ */ jsx("p", {
				className: "rb-msg",
				role: "alert",
				children: error
			}),
			/* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx("button", {
				type: "button",
				className: "rb-btn rb-btn-solid",
				disabled: busy || !name.trim(),
				onClick: save,
				children: busy ? "Saving…" : "Save changes"
			}) })
		]
	});
}
//#endregion
//#region src/pages/profile/[id].astro
var _id__exports = /* @__PURE__ */ __exportAll({
	default: () => $$Id,
	file: () => $$file,
	prerender: () => false,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Id = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Id;
	const { id } = Astro.params;
	const profile = id ? await getProfile(id) : null;
	if (!profile) return new Response("Profile not found", { status: 404 });
	const recipes = await listRecipes({
		authorId: profile.id,
		viewerId: Astro.locals.user?.id
	});
	const tab = Astro.url.searchParams.get("tab") === "recipes" ? "recipes" : "home";
	const sort = Astro.url.searchParams.get("sort") === "top" ? "top" : "recent";
	const data = {
		id: profile.id,
		name: profile.name,
		image: profile.image,
		banner: profile.banner,
		joinedAt: profile.joinedAt.toISOString()
	};
	return renderTemplate`<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${profile.name} — bodyworks</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@600;700;800&display=swap" rel="stylesheet">${renderHead($$result)}</head><body>${renderComponent($$result, "ProfileView", ProfileView, {
		"profile": data,
		"isOwner": Astro.locals.user?.id === profile.id,
		"recipes": recipes,
		"initialTab": tab,
		"initialSort": sort,
		"client:load": true,
		"client:component-hydration": "load",
		"client:component-path": "/home/claude/bodyworks/src/components/profile/ProfileView.tsx",
		"client:component-export": "default"
	})}</body></html>`;
}, "/home/claude/bodyworks/src/pages/profile/[id].astro", void 0);
var $$file = "/home/claude/bodyworks/src/pages/profile/[id].astro";
var $$url = "/profile/[id]";
//#endregion
//#region \0virtual:astro:page:src/pages/profile/[id]@_@astro
var page = () => _id__exports;
//#endregion
export { page };
