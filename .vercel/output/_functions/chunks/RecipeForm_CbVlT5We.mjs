import { t as ImageUpload } from "./ImageUpload_D2y_azHP.mjs";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/forms/RecipeForm.tsx
var UNITS = [
	"g",
	"ml",
	"tsp",
	"tbsp",
	"cup",
	"piece"
];
function allowedVisibilities(target) {
	if (!target) return ["private", "public"];
	return target.visibility === "private" ? ["private", "community"] : [
		"private",
		"community",
		"public"
	];
}
var defaultVisibility = (target) => target ? "community" : "public";
var VIS_LABELS = {
	private: ["Only me", "A draft or personal copy. Nobody else can see it."],
	community: ["Community members", "Everyone in the community can see it."],
	public: ["Anyone", "Visible to everyone, and shown on the main recipes page."]
};
var EMPTY_RECIPE = {
	name: "",
	description: "",
	cuisine: "",
	prepTimeMinutes: "",
	servings: "",
	difficulty: "",
	imageUrl: null,
	videoUrl: "",
	ingredients: [{
		name: "",
		amount: "",
		unit: "g"
	}],
	steps: [""],
	communityId: "",
	dishName: "",
	visibility: "public"
};
function RecipeForm({ foods, communities = [], initial = EMPTY_RECIPE, editSlug, userId }) {
	const [v, setV] = useState(initial);
	const [error, setError] = useState(null);
	const [busy, setBusy] = useState(false);
	const set = (key, value) => setV((s) => ({
		...s,
		[key]: value
	}));
	const target = communities.find((c) => String(c.id) === v.communityId);
	const allowed = allowedVisibilities(target);
	function pickCommunity(id) {
		const next = communities.find((c) => String(c.id) === id);
		const visibility = allowedVisibilities(next).includes(v.visibility) ? v.visibility : defaultVisibility(next);
		setV((s) => ({
			...s,
			communityId: id,
			dishName: id === s.communityId ? s.dishName : "",
			visibility
		}));
	}
	const setIng = (i, patch) => set("ingredients", v.ingredients.map((x, j) => j === i ? {
		...x,
		...patch
	} : x));
	const setStep = (i, text) => set("steps", v.steps.map((x, j) => j === i ? text : x));
	async function submit(e) {
		e.preventDefault();
		setError(null);
		setBusy(true);
		const res = await fetch(editSlug ? `/api/recipes/${editSlug}` : "/api/recipes", {
			method: editSlug ? "PUT" : "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				...v,
				ingredients: v.ingredients.map((i) => ({
					...i,
					amount: Number(i.amount)
				}))
			})
		}).catch(() => null);
		const data = await res?.json().catch(() => null);
		if (!res || !res.ok) {
			setBusy(false);
			return setError(data?.error || "Couldn't save. Check your connection and try again.");
		}
		location.href = target ? `/communities/${target.slug}` : `/profile/${userId}?tab=recipes`;
	}
	return /* @__PURE__ */ jsxs("form", {
		className: "rf",
		onSubmit: submit,
		children: [
			/* @__PURE__ */ jsx("h1", { children: editSlug ? "Edit recipe" : "Add a recipe" }),
			/* @__PURE__ */ jsxs("label", {
				className: "af-field",
				children: ["Name", /* @__PURE__ */ jsx("input", {
					value: v.name,
					onChange: (e) => set("name", e.target.value),
					required: true,
					maxLength: 100
				})]
			}),
			/* @__PURE__ */ jsxs("label", {
				className: "af-field",
				children: ["Description", /* @__PURE__ */ jsx("textarea", {
					value: v.description,
					onChange: (e) => set("description", e.target.value),
					required: true,
					maxLength: 1e3,
					rows: 3
				})]
			}),
			/* @__PURE__ */ jsxs("fieldset", {
				className: "rf-group rf-place",
				children: [
					/* @__PURE__ */ jsx("legend", { children: "Who can see it" }),
					communities.length > 0 && /* @__PURE__ */ jsxs("label", {
						className: "af-field",
						children: ["Post to", /* @__PURE__ */ jsxs("select", {
							value: v.communityId,
							onChange: (e) => pickCommunity(e.target.value),
							children: [/* @__PURE__ */ jsx("option", {
								value: "",
								children: "My profile only (not in a community)"
							}), communities.map((c) => /* @__PURE__ */ jsxs("option", {
								value: c.id,
								children: [c.name, c.visibility === "private" ? " (private)" : ""]
							}, c.id))]
						})]
					}),
					target && /* @__PURE__ */ jsxs("label", {
						className: "af-field",
						children: [
							"Dish (optional)",
							/* @__PURE__ */ jsx("input", {
								list: "rf-dishes",
								value: v.dishName,
								onChange: (e) => set("dishName", e.target.value),
								maxLength: 60,
								placeholder: "e.g. Chicken Biryani — groups versions of the same dish"
							}),
							/* @__PURE__ */ jsx("datalist", {
								id: "rf-dishes",
								children: target.dishes.map((d) => /* @__PURE__ */ jsx("option", { value: d }, d))
							})
						]
					}),
					/* @__PURE__ */ jsx("div", {
						className: "rf-vis",
						role: "radiogroup",
						"aria-label": "Visibility",
						children: [
							"private",
							"community",
							"public"
						].filter((o) => o !== "community" || target).map((o) => {
							const ok = allowed.includes(o);
							return /* @__PURE__ */ jsxs("label", {
								className: ok ? "" : "off",
								children: [/* @__PURE__ */ jsx("input", {
									type: "radio",
									name: "visibility",
									value: o,
									checked: v.visibility === o,
									disabled: !ok,
									onChange: () => set("visibility", o)
								}), /* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("strong", { children: VIS_LABELS[o][0] }), ok ? VIS_LABELS[o][1] : "Not available: this community is private, so recipes in it can't be public."] })]
							}, o);
						})
					})
				]
			}),
			/* @__PURE__ */ jsx(ImageUpload, {
				label: "Photo",
				value: v.imageUrl,
				onChange: (url) => set("imageUrl", url)
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "rf-row",
				children: [
					/* @__PURE__ */ jsxs("label", {
						className: "af-field",
						children: ["Cuisine", /* @__PURE__ */ jsx("input", {
							value: v.cuisine,
							onChange: (e) => set("cuisine", e.target.value),
							maxLength: 40,
							placeholder: "e.g. Indian"
						})]
					}),
					/* @__PURE__ */ jsxs("label", {
						className: "af-field",
						children: ["Prep time (min)", /* @__PURE__ */ jsx("input", {
							type: "number",
							min: 1,
							value: v.prepTimeMinutes,
							onChange: (e) => set("prepTimeMinutes", e.target.value)
						})]
					}),
					/* @__PURE__ */ jsxs("label", {
						className: "af-field",
						children: ["Servings", /* @__PURE__ */ jsx("input", {
							type: "number",
							min: 1,
							value: v.servings,
							onChange: (e) => set("servings", e.target.value)
						})]
					}),
					/* @__PURE__ */ jsxs("label", {
						className: "af-field",
						children: ["Difficulty", /* @__PURE__ */ jsxs("select", {
							value: v.difficulty,
							onChange: (e) => set("difficulty", e.target.value),
							children: [
								/* @__PURE__ */ jsx("option", {
									value: "",
									children: "—"
								}),
								/* @__PURE__ */ jsx("option", {
									value: "easy",
									children: "Easy"
								}),
								/* @__PURE__ */ jsx("option", {
									value: "medium",
									children: "Medium"
								}),
								/* @__PURE__ */ jsx("option", {
									value: "hard",
									children: "Hard"
								})
							]
						})]
					})
				]
			}),
			/* @__PURE__ */ jsxs("label", {
				className: "af-field",
				children: ["Video link (optional)", /* @__PURE__ */ jsx("input", {
					type: "url",
					value: v.videoUrl,
					onChange: (e) => set("videoUrl", e.target.value),
					placeholder: "https://youtube.com/…"
				})]
			}),
			/* @__PURE__ */ jsxs("fieldset", {
				className: "rf-group",
				children: [
					/* @__PURE__ */ jsx("legend", { children: "Ingredients" }),
					/* @__PURE__ */ jsx("datalist", {
						id: "rf-foods",
						children: foods.map((f) => /* @__PURE__ */ jsx("option", { value: f }, f))
					}),
					v.ingredients.map((ing, i) => /* @__PURE__ */ jsxs("div", {
						className: "rf-ing",
						children: [
							/* @__PURE__ */ jsx("input", {
								list: "rf-foods",
								placeholder: "Ingredient (pick or type a new one)",
								"aria-label": `Ingredient ${i + 1} name`,
								value: ing.name,
								onChange: (e) => setIng(i, { name: e.target.value }),
								maxLength: 60
							}),
							/* @__PURE__ */ jsx("input", {
								type: "number",
								min: "0",
								step: "any",
								placeholder: "Amount",
								"aria-label": `Ingredient ${i + 1} amount`,
								value: ing.amount,
								onChange: (e) => setIng(i, { amount: e.target.value })
							}),
							/* @__PURE__ */ jsx("select", {
								"aria-label": `Ingredient ${i + 1} unit`,
								value: ing.unit,
								onChange: (e) => setIng(i, { unit: e.target.value }),
								children: UNITS.map((u) => /* @__PURE__ */ jsx("option", { children: u }, u))
							}),
							/* @__PURE__ */ jsx("button", {
								type: "button",
								className: "rf-x",
								"aria-label": `Remove ingredient ${i + 1}`,
								disabled: v.ingredients.length === 1,
								onClick: () => set("ingredients", v.ingredients.filter((_, j) => j !== i)),
								children: "×"
							})
						]
					}, i)),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "rb-btn",
						onClick: () => set("ingredients", [...v.ingredients, {
							name: "",
							amount: "",
							unit: "g"
						}]),
						children: "+ Add ingredient"
					})
				]
			}),
			/* @__PURE__ */ jsxs("fieldset", {
				className: "rf-group",
				children: [
					/* @__PURE__ */ jsx("legend", { children: "Steps" }),
					v.steps.map((s, i) => /* @__PURE__ */ jsxs("div", {
						className: "rf-step",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "rf-num",
								children: i + 1
							}),
							/* @__PURE__ */ jsx("textarea", {
								rows: 2,
								"aria-label": `Step ${i + 1}`,
								value: s,
								maxLength: 1e3,
								onChange: (e) => setStep(i, e.target.value)
							}),
							/* @__PURE__ */ jsx("button", {
								type: "button",
								className: "rf-x",
								"aria-label": `Remove step ${i + 1}`,
								disabled: v.steps.length === 1,
								onClick: () => set("steps", v.steps.filter((_, j) => j !== i)),
								children: "×"
							})
						]
					}, i)),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "rb-btn",
						onClick: () => set("steps", [...v.steps, ""]),
						children: "+ Add step"
					})
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
					children: busy ? "Saving…" : editSlug ? "Save changes" : "Publish recipe"
				}), /* @__PURE__ */ jsx("a", {
					className: "rb-btn",
					href: `/profile/${userId}?tab=recipes`,
					children: "Cancel"
				})]
			})
		]
	});
}
//#endregion
export { RecipeForm as n, EMPTY_RECIPE as t };
