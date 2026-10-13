import { i as useSession } from "./forms_qss2n2i2.mjs";
import { i as hash, n as Avatar, r as TONES } from "./AccountMenu_D2jBtNE-.mjs";
import { useEffect, useState } from "react";
import { Fragment as Fragment$1, jsx, jsxs } from "react/jsx-runtime";
//#region src/components/recipes/RecipeCard.tsx
function RecipeCard({ recipe, onClick }) {
	const filled = Math.round(recipe.avgRating);
	return /* @__PURE__ */ jsxs("div", {
		className: "rb-card",
		role: "button",
		tabIndex: 0,
		onClick,
		onKeyDown: (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				onClick();
			}
		},
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "rb-card-media",
				children: [recipe.imageUrl ? /* @__PURE__ */ jsx("img", {
					src: recipe.imageUrl,
					alt: recipe.name,
					loading: "lazy"
				}) : /* @__PURE__ */ jsx("div", {
					className: "rb-card-placeholder",
					style: { background: TONES[hash(recipe.name) % TONES.length] },
					"aria-hidden": "true",
					children: recipe.name.charAt(0)
				}), recipe.cuisine && /* @__PURE__ */ jsx("span", {
					className: "rb-card-cuisine",
					children: recipe.cuisine
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "rb-card-body",
				children: [/* @__PURE__ */ jsx("h3", { children: recipe.name }), /* @__PURE__ */ jsx("p", { children: recipe.description })]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "rb-card-bar",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "rb-stars",
					"aria-label": recipe.ratingCount ? `${recipe.avgRating.toFixed(1)} out of 5` : "No ratings yet",
					children: [[
						1,
						2,
						3,
						4,
						5
					].map((n) => /* @__PURE__ */ jsx("span", {
						className: n <= filled ? "on" : "",
						children: "★"
					}, n)), /* @__PURE__ */ jsx("small", { children: recipe.ratingCount ? `(${recipe.ratingCount})` : "" })]
				}), recipe.authorId ? /* @__PURE__ */ jsx("a", {
					href: `/profile/${recipe.authorId}`,
					className: "rb-author-link",
					title: `${recipe.authorName ?? "Profile"} — view profile`,
					onClick: (e) => e.stopPropagation(),
					onKeyDown: (e) => e.stopPropagation(),
					children: /* @__PURE__ */ jsx(Avatar, {
						name: recipe.authorName ?? "bodyworks",
						image: recipe.authorImage
					})
				}) : /* @__PURE__ */ jsx(Avatar, {
					name: recipe.authorName ?? "bodyworks",
					image: recipe.authorImage
				})]
			})
		]
	});
}
//#endregion
//#region src/components/recipes/RecipeModal.tsx
var PAGES = [
	"Ingredients",
	"Steps",
	"Rate"
];
function RecipeModal({ slug, onClose }) {
	const { data: session } = useSession();
	const [recipe, setRecipe] = useState(null);
	const [error, setError] = useState(null);
	const [page, setPage] = useState(0);
	const [avg, setAvg] = useState(0);
	const [count, setCount] = useState(0);
	const [hover, setHover] = useState(null);
	const [msg, setMsg] = useState(null);
	useEffect(() => {
		let cancelled = false;
		fetch(`/api/recipes/${slug}`).then((res) => {
			if (!res.ok) throw new Error("Couldn't load this recipe.");
			return res.json();
		}).then((d) => {
			if (cancelled) return;
			setRecipe(d);
			setAvg(Number(d.avgRating));
			setCount(d.ratingCount);
		}).catch((e) => !cancelled && setError(e.message));
		return () => {
			cancelled = true;
		};
	}, [slug]);
	useEffect(() => {
		const onKey = (e) => {
			if (e.key === "Escape") onClose();
			if (e.key === "ArrowRight") setPage((p) => Math.min(p + 1, PAGES.length - 1));
			if (e.key === "ArrowLeft") setPage((p) => Math.max(p - 1, 0));
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [onClose]);
	async function rate(stars) {
		if (!session) return setMsg("Sign in to rate recipes.");
		setMsg(null);
		const res = await fetch(`/api/recipes/${slug}/rate`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ stars })
		}).catch(() => null);
		if (!res || !res.ok) return setMsg("Couldn't save your rating.");
		const r = await res.json();
		setAvg(r.avgRating);
		setCount(r.ratingCount);
		setMsg("Thanks for rating!");
	}
	async function removeRecipe() {
		if (!confirm("Delete this recipe? This can't be undone.")) return;
		const res = await fetch(`/api/recipes/${slug}`, { method: "DELETE" }).catch(() => null);
		if (!res || !res.ok) return setMsg("Couldn't delete the recipe.");
		location.reload();
	}
	const shown = hover ?? Math.round(avg);
	return /* @__PURE__ */ jsx("div", {
		className: "rb-overlay open",
		onClick: (e) => e.target === e.currentTarget && onClose(),
		children: /* @__PURE__ */ jsxs("div", {
			className: "rb-modal",
			role: "dialog",
			"aria-modal": "true",
			"aria-label": recipe?.name ?? "Recipe",
			children: [
				/* @__PURE__ */ jsx("button", {
					type: "button",
					className: "rb-modal-close",
					onClick: onClose,
					"aria-label": "Close",
					children: "×"
				}),
				error && /* @__PURE__ */ jsx("p", { children: error }),
				!recipe && !error && /* @__PURE__ */ jsx("p", { children: "Loading…" }),
				recipe && /* @__PURE__ */ jsxs(Fragment$1, { children: [
					/* @__PURE__ */ jsxs("div", {
						className: "rb-modal-head",
						children: [/* @__PURE__ */ jsx("h2", { children: PAGES[page] }), /* @__PURE__ */ jsxs("p", {
							className: "rb-modal-sub",
							children: [
								recipe.name,
								recipe.prepTimeMinutes != null && ` · ${recipe.prepTimeMinutes} min`,
								recipe.servings != null && ` · serves ${recipe.servings}`
							]
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "rb-modal-content",
						children: [
							page === 0 && /* @__PURE__ */ jsx("ul", {
								className: "rb-list",
								children: recipe.ingredients.map((ri) => /* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("span", { children: ri.food.name }), /* @__PURE__ */ jsxs("span", { children: [
									Number(ri.amount),
									" ",
									ri.unit
								] })] }, ri.id))
							}),
							page === 1 && /* @__PURE__ */ jsx("ol", {
								className: "rb-steps",
								children: recipe.steps.map((s) => /* @__PURE__ */ jsx("li", { children: s.instruction }, s.id))
							}),
							page === 2 && /* @__PURE__ */ jsxs("div", {
								className: "rb-rate",
								children: [
									/* @__PURE__ */ jsx("p", { children: recipe.description }),
									recipe.difficulty && /* @__PURE__ */ jsxs("p", {
										className: "rb-muted",
										children: ["Difficulty: ", recipe.difficulty]
									}),
									recipe.author && /* @__PURE__ */ jsxs("p", {
										className: "rb-muted",
										children: ["by ", /* @__PURE__ */ jsx("a", {
											className: "rb-author-name",
											href: `/profile/${recipe.author.id}`,
											children: recipe.author.name
										})]
									}),
									session && recipe.author && session.user.id === recipe.author.id && /* @__PURE__ */ jsxs("div", {
										className: "rb-links",
										children: [/* @__PURE__ */ jsx("a", {
											href: `/recipes/${slug}/edit`,
											children: "Edit"
										}), /* @__PURE__ */ jsx("button", {
											type: "button",
											className: "rb-link-danger",
											onClick: removeRecipe,
											children: "Delete"
										})]
									}),
									/* @__PURE__ */ jsx("div", {
										className: "rb-rate-stars",
										onMouseLeave: () => setHover(null),
										children: [
											1,
											2,
											3,
											4,
											5
										].map((n) => /* @__PURE__ */ jsx("button", {
											type: "button",
											className: n <= shown ? "on" : "",
											onMouseEnter: () => setHover(n),
											onClick: () => rate(n),
											"aria-label": `${n} star${n > 1 ? "s" : ""}`,
											children: "★"
										}, n))
									}),
									/* @__PURE__ */ jsxs("p", {
										className: "rb-muted",
										children: [
											avg.toFixed(1),
											" (",
											count,
											" ratings)"
										]
									}),
									msg && /* @__PURE__ */ jsx("p", {
										className: "rb-msg",
										children: msg
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "rb-links",
										children: [recipe.videoUrl && /* @__PURE__ */ jsx("a", {
											href: recipe.videoUrl,
											target: "_blank",
											rel: "noreferrer",
											children: "Watch video"
										}), recipe.externalUrl && /* @__PURE__ */ jsx("a", {
											href: recipe.externalUrl,
											target: "_blank",
											rel: "noreferrer",
											children: "Original source"
										})]
									})
								]
							})
						]
					}),
					/* @__PURE__ */ jsx("div", {
						className: "rb-dots",
						children: PAGES.map((p, i) => /* @__PURE__ */ jsx("button", {
							type: "button",
							className: i === page ? "on" : "",
							onClick: () => setPage(i),
							"aria-label": p
						}, p))
					})
				] })
			]
		})
	});
}
//#endregion
export { RecipeCard as n, RecipeModal as t };
