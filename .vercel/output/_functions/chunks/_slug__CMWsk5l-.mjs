import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { A as renderTemplate, M as renderHead, w as renderComponent, z as createAstro } from "./sequence_CK-B6CjN.mjs";
import { t as createComponent } from "./compiler_J__uvMUs.mjs";
import { r as getCommunityForViewer } from "./communities_xVE7pya1.mjs";
import { c as listRecipes } from "./recipes_Bev4MUNo.mjs";
import "./forms_qss2n2i2.mjs";
import { n as Avatar, t as AccountMenu } from "./AccountMenu_D2jBtNE-.mjs";
import { n as RecipeCard, t as RecipeModal } from "./RecipeModal_BG7RVYcG.mjs";
/* empty css                      */
import { useMemo, useState } from "react";
import { Fragment as Fragment$1, jsx, jsxs } from "react/jsx-runtime";
//#region src/components/communities/CommunityView.tsx
var UNSORTED = "Not sorted yet";
function Stars({ value, count }) {
	const filled = Math.round(value);
	return /* @__PURE__ */ jsxs("span", {
		className: "rb-stars",
		"aria-label": count ? `${value.toFixed(1)} out of 5` : "No ratings yet",
		children: [[
			1,
			2,
			3,
			4,
			5
		].map((n) => /* @__PURE__ */ jsx("span", {
			className: n <= filled ? "on" : "",
			children: "★"
		}, n)), /* @__PURE__ */ jsx("small", { children: count ? `(${count})` : "" })]
	});
}
function Version({ r, top, onOpen }) {
	return /* @__PURE__ */ jsxs("article", {
		className: "cm-version",
		children: [
			/* @__PURE__ */ jsxs("header", { children: [
				/* @__PURE__ */ jsxs("a", {
					href: `/profile/${r.authorId}`,
					className: "cm-cook",
					children: [/* @__PURE__ */ jsx(Avatar, {
						name: r.authorName ?? "bodyworks",
						image: r.authorImage
					}), /* @__PURE__ */ jsx("span", { children: r.authorName ?? "Unknown cook" })]
				}),
				top && /* @__PURE__ */ jsx("span", {
					className: "cm-badge cm-badge-top",
					children: "Top rated"
				}),
				r.visibility === "private" && /* @__PURE__ */ jsx("span", {
					className: "cm-badge",
					children: "Only you"
				})
			] }),
			/* @__PURE__ */ jsx("h3", { children: r.name }),
			/* @__PURE__ */ jsxs("dl", {
				className: "cm-facts",
				children: [
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: "Time" }), /* @__PURE__ */ jsx("dd", { children: r.prepTimeMinutes ? `${r.prepTimeMinutes} min` : "—" })] }),
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: "Level" }), /* @__PURE__ */ jsx("dd", { children: r.difficulty ?? "—" })] }),
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: "Rating" }), /* @__PURE__ */ jsx("dd", { children: /* @__PURE__ */ jsx(Stars, {
						value: r.avgRating,
						count: r.ratingCount
					}) })] })
				]
			}),
			/* @__PURE__ */ jsx("p", {
				className: "cm-ings",
				children: r.ingredientNames.join(" · ")
			}),
			/* @__PURE__ */ jsx("button", {
				type: "button",
				className: "rb-btn",
				onClick: onOpen,
				children: "Open recipe"
			})
		]
	});
}
function CommunityView({ community, recipes, signedIn }) {
	const [mode, setMode] = useState("dish");
	const [activeSlug, setActiveSlug] = useState(null);
	const [msg, setMsg] = useState(null);
	const [busy, setBusy] = useState(false);
	const [code, setCode] = useState(community.inviteCode);
	const [copied, setCopied] = useState(false);
	const byDish = useMemo(() => {
		const map = /* @__PURE__ */ new Map();
		for (const r of recipes) {
			const key = r.dishName ?? UNSORTED;
			map.set(key, [...map.get(key) ?? [], r]);
		}
		return [...map.entries()].sort(([a, x], [b, y]) => a === UNSORTED ? 1 : b === UNSORTED ? -1 : y.length - x.length || a.localeCompare(b));
	}, [recipes]);
	const byCook = useMemo(() => {
		const map = /* @__PURE__ */ new Map();
		for (const r of recipes) {
			const key = r.authorId ?? "none";
			const entry = map.get(key) ?? {
				id: r.authorId,
				name: r.authorName ?? "Unknown cook",
				image: r.authorImage,
				list: []
			};
			entry.list.push(r);
			map.set(key, entry);
		}
		return [...map.values()].sort((a, b) => b.list.length - a.list.length || a.name.localeCompare(b.name));
	}, [recipes]);
	const [dish, setDish] = useState(null);
	const activeDish = byDish.find(([name]) => name === dish) ?? byDish[0];
	async function call(url, method) {
		setBusy(true);
		setMsg(null);
		const res = await fetch(url, { method }).catch(() => null);
		const data = await res?.json().catch(() => null);
		setBusy(false);
		if (!res || !res.ok) {
			setMsg(data?.error || "Something went wrong. Try again.");
			return null;
		}
		return data;
	}
	async function join() {
		if (!signedIn) return location.href = `/auth?next=/communities/${community.slug}`;
		if (await call(`/api/communities/${community.slug}/join`, "POST")) location.reload();
	}
	async function leave() {
		if (!confirm("Leave this community? You'll lose access to its members-only recipes.")) return;
		if (await call(`/api/communities/${community.slug}/join`, "DELETE")) location.href = "/communities";
	}
	async function newInvite() {
		if (!confirm("Make a new invite link? The old one will stop working.")) return;
		const data = await call(`/api/communities/${community.slug}/invite`, "POST");
		if (data?.code) setCode(data.code);
	}
	async function copyInvite() {
		try {
			await navigator.clipboard.writeText(`${location.origin}/communities/join/${code}`);
			setCopied(true);
			setTimeout(() => setCopied(false), 1800);
		} catch {
			setMsg("Couldn't copy. Select the link and copy it by hand.");
		}
	}
	const topRated = (list) => {
		const rated = list.filter((r) => r.ratingCount > 0);
		if (rated.length < 2) return null;
		return rated.reduce((a, b) => b.avgRating > a.avgRating ? b : a).slug;
	};
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
				className: "rb-hero cm-head",
				children: [
					/* @__PURE__ */ jsx("p", {
						className: "cm-crumb",
						children: /* @__PURE__ */ jsx("a", {
							href: "/communities",
							children: "Communities"
						})
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "cm-title-row",
						children: [/* @__PURE__ */ jsx("h1", {
							className: "rb-title",
							children: community.name
						}), /* @__PURE__ */ jsx("span", {
							className: `cm-badge ${community.visibility === "private" ? "cm-badge-private" : ""}`,
							children: community.visibility === "private" ? "Private" : "Public"
						})]
					}),
					community.description && /* @__PURE__ */ jsx("p", {
						className: "rb-lede",
						children: community.description
					}),
					/* @__PURE__ */ jsxs("p", {
						className: "cm-meta",
						children: [
							community.memberCount,
							" ",
							community.memberCount === 1 ? "member" : "members",
							community.ownerName && /* @__PURE__ */ jsxs(Fragment$1, { children: [" · started by ", community.ownerName] })
						]
					}),
					/* @__PURE__ */ jsx("div", {
						className: "cm-actions",
						children: community.isMember ? /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsx("a", {
							className: "rb-btn rb-btn-solid",
							href: `/recipes/new?community=${community.slug}`,
							children: "Add a recipe"
						}), !community.isOwner && /* @__PURE__ */ jsx("button", {
							className: "rb-btn",
							disabled: busy,
							onClick: leave,
							children: "Leave"
						})] }) : /* @__PURE__ */ jsx("button", {
							className: "rb-btn rb-btn-solid",
							disabled: busy,
							onClick: join,
							children: signedIn ? "Join community" : "Sign in to join"
						})
					}),
					community.isOwner && code && /* @__PURE__ */ jsxs("div", {
						className: "cm-invite",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "rb-field-label",
								children: "Invite link"
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "cm-invite-row",
								children: [
									/* @__PURE__ */ jsx("input", {
										readOnly: true,
										value: `/communities/join/${code}`,
										"aria-label": "Invite link",
										onFocus: (e) => e.currentTarget.select()
									}),
									/* @__PURE__ */ jsx("button", {
										className: "rb-btn",
										onClick: copyInvite,
										children: copied ? "Copied" : "Copy link"
									}),
									/* @__PURE__ */ jsx("button", {
										className: "rb-btn",
										disabled: busy,
										onClick: newInvite,
										children: "New link"
									})
								]
							}),
							/* @__PURE__ */ jsxs("p", {
								className: "rb-hint",
								children: [
									"Anyone with this link can join",
									community.visibility === "private" ? ", so only share it with people you trust" : "",
									"."
								]
							})
						]
					}),
					msg && /* @__PURE__ */ jsx("p", {
						className: "rb-msg",
						role: "alert",
						children: msg
					})
				]
			}),
			/* @__PURE__ */ jsx("main", {
				className: "rb-container",
				children: recipes.length === 0 ? /* @__PURE__ */ jsxs("p", {
					className: "rb-empty",
					children: [
						"No recipes here yet.",
						" ",
						community.isMember ? /* @__PURE__ */ jsx("a", {
							href: `/recipes/new?community=${community.slug}`,
							children: "Add the first one."
						}) : "Join to add the first one."
					]
				}) : /* @__PURE__ */ jsxs(Fragment$1, { children: [
					/* @__PURE__ */ jsxs("div", {
						className: "cm-toggle",
						role: "tablist",
						"aria-label": "Group recipes",
						children: [/* @__PURE__ */ jsx("button", {
							role: "tab",
							"aria-selected": mode === "dish",
							className: mode === "dish" ? "on" : "",
							onClick: () => setMode("dish"),
							children: "By dish"
						}), /* @__PURE__ */ jsx("button", {
							role: "tab",
							"aria-selected": mode === "cook",
							className: mode === "cook" ? "on" : "",
							onClick: () => setMode("cook"),
							children: "By cook"
						})]
					}),
					mode === "dish" && activeDish && /* @__PURE__ */ jsxs("div", {
						className: "cm-box",
						children: [/* @__PURE__ */ jsx("nav", {
							className: "cm-dividers",
							"aria-label": "Dishes",
							children: byDish.map(([name, list]) => /* @__PURE__ */ jsxs("button", {
								className: name === activeDish[0] ? "on" : "",
								"aria-current": name === activeDish[0] ? "true" : void 0,
								onClick: () => setDish(name),
								children: [/* @__PURE__ */ jsx("span", { children: name }), /* @__PURE__ */ jsx("small", { children: list.length })]
							}, name))
						}), /* @__PURE__ */ jsxs("section", {
							className: "cm-drawer",
							"aria-label": activeDish[0],
							children: [
								/* @__PURE__ */ jsx("h2", { children: activeDish[0] }),
								/* @__PURE__ */ jsxs("p", {
									className: "cm-meta",
									children: [
										activeDish[1].length,
										" ",
										activeDish[1].length === 1 ? "version" : "versions"
									]
								}),
								/* @__PURE__ */ jsx("div", {
									className: "cm-versions",
									children: activeDish[1].map((r) => /* @__PURE__ */ jsx(Version, {
										r,
										top: topRated(activeDish[1]) === r.slug,
										onOpen: () => setActiveSlug(r.slug)
									}, r.slug))
								})
							]
						})]
					}),
					mode === "cook" && byCook.map((cook) => /* @__PURE__ */ jsxs("section", {
						className: "cm-cook-section",
						children: [/* @__PURE__ */ jsxs("h2", { children: [
							/* @__PURE__ */ jsx(Avatar, {
								name: cook.name,
								image: cook.image
							}),
							cook.id ? /* @__PURE__ */ jsx("a", {
								href: `/profile/${cook.id}`,
								children: cook.name
							}) : cook.name,
							/* @__PURE__ */ jsxs("small", { children: [
								cook.list.length,
								" ",
								cook.list.length === 1 ? "recipe" : "recipes"
							] })
						] }), /* @__PURE__ */ jsx("div", {
							className: "rb-grid",
							children: cook.list.map((r) => /* @__PURE__ */ jsx(RecipeCard, {
								recipe: r,
								onClick: () => setActiveSlug(r.slug)
							}, r.slug))
						})]
					}, cook.id ?? "none"))
				] })
			}),
			activeSlug && /* @__PURE__ */ jsx(RecipeModal, {
				slug: activeSlug,
				onClose: () => setActiveSlug(null)
			})
		]
	});
}
//#endregion
//#region src/pages/communities/[slug].astro
var _slug__exports = /* @__PURE__ */ __exportAll({
	default: () => $$Slug,
	file: () => $$file,
	prerender: () => false,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Slug = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Slug;
	const user = Astro.locals.user;
	const { slug } = Astro.params;
	const community = slug ? await getCommunityForViewer(slug, user?.id) : null;
	if (!community) return new Response("Community not found", { status: 404 });
	const recipes = await listRecipes({
		communityId: community.id,
		viewerId: user?.id
	});
	const data = {
		slug: community.slug,
		name: community.name,
		description: community.description,
		visibility: community.visibility,
		memberCount: community.memberCount,
		isMember: community.isMember,
		isOwner: community.isOwner,
		inviteCode: community.inviteCode,
		ownerName: community.owner?.name ?? null
	};
	return renderTemplate`<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${community.name} — bodyworks</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@600;700;800&display=swap" rel="stylesheet">${renderHead($$result)}</head><body>${renderComponent($$result, "CommunityView", CommunityView, {
		"community": data,
		"recipes": recipes,
		"signedIn": !!user,
		"client:load": true,
		"client:component-hydration": "load",
		"client:component-path": "/home/claude/bodyworks/src/components/communities/CommunityView.tsx",
		"client:component-export": "default"
	})}</body></html>`;
}, "/home/claude/bodyworks/src/pages/communities/[slug].astro", void 0);
var $$file = "/home/claude/bodyworks/src/pages/communities/[slug].astro";
var $$url = "/communities/[slug]";
//#endregion
//#region \0virtual:astro:page:src/pages/communities/[slug]@_@astro
var page = () => _slug__exports;
//#endregion
export { page };
