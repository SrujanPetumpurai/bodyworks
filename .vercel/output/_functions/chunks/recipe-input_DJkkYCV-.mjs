import { n as UNITS, t as DIFFICULTIES } from "./recipes_Bev4MUNo.mjs";
//#region src/lib/recipe-input.ts
var VISIBILITIES = [
	"private",
	"community",
	"public"
];
var str = (v, max) => typeof v === "string" ? v.trim().slice(0, max) : "";
function optionalUrl(v) {
	const s = str(v, 2e3);
	if (!s) return null;
	try {
		return new URL(s).protocol === "https:" ? s : "invalid";
	} catch {
		return "invalid";
	}
}
function optionalInt(v, max) {
	if (v === null || v === void 0 || v === "") return null;
	const n = Number(v);
	return Number.isInteger(n) && n >= 1 && n <= max ? n : "invalid";
}
function parseRecipeInput(body) {
	const name = str(body?.name, 100);
	const description = str(body?.description, 1e3);
	if (!name) return {
		ok: false,
		error: "Give your recipe a name."
	};
	if (!description) return {
		ok: false,
		error: "Add a short description."
	};
	const imageUrl = optionalUrl(body?.imageUrl);
	const videoUrl = optionalUrl(body?.videoUrl);
	if (imageUrl === "invalid") return {
		ok: false,
		error: "Image must be an https link or an upload."
	};
	if (videoUrl === "invalid") return {
		ok: false,
		error: "Video link must start with https://"
	};
	const prep = optionalInt(body?.prepTimeMinutes, 1440);
	const servings = optionalInt(body?.servings, 100);
	if (prep === "invalid") return {
		ok: false,
		error: "Prep time must be a whole number of minutes."
	};
	if (servings === "invalid") return {
		ok: false,
		error: "Servings must be a whole number."
	};
	const difficulty = body?.difficulty || null;
	if (difficulty !== null && !DIFFICULTIES.includes(difficulty)) return {
		ok: false,
		error: "Pick easy, medium or hard."
	};
	const rawIngredients = Array.isArray(body?.ingredients) ? body.ingredients : [];
	const ingredients = [];
	for (const raw of rawIngredients) {
		const r = raw;
		const ingName = str(r?.name, 60);
		const amount = Number(r?.amount);
		if (!ingName) continue;
		if (!Number.isFinite(amount) || amount <= 0 || amount > 1e5) return {
			ok: false,
			error: `Enter a valid amount for "${ingName}".`
		};
		if (!UNITS.includes(r?.unit)) return {
			ok: false,
			error: `Pick a unit for "${ingName}".`
		};
		ingredients.push({
			name: ingName,
			amount,
			unit: r.unit
		});
	}
	if (ingredients.length === 0) return {
		ok: false,
		error: "Add at least one ingredient."
	};
	if (ingredients.length > 40) return {
		ok: false,
		error: "Too many ingredients (max 40)."
	};
	const steps = (Array.isArray(body?.steps) ? body.steps : []).map((s) => str(s, 1e3)).filter(Boolean);
	if (steps.length === 0) return {
		ok: false,
		error: "Add at least one step."
	};
	if (steps.length > 40) return {
		ok: false,
		error: "Too many steps (max 40)."
	};
	const visibility = body?.visibility ?? "public";
	if (!VISIBILITIES.includes(visibility)) return {
		ok: false,
		error: "Pick private, community or public."
	};
	const communityId = optionalInt(body?.communityId, 2e9);
	if (communityId === "invalid") return {
		ok: false,
		error: "That community isn't valid."
	};
	return {
		ok: true,
		data: {
			communityId,
			dishName: str(body?.dishName, 60) || null,
			visibility,
			name,
			description,
			imageUrl,
			videoUrl,
			cuisine: str(body?.cuisine, 40) || null,
			prepTimeMinutes: prep,
			servings,
			difficulty,
			ingredients,
			steps
		}
	};
}
var json = (data, status = 200) => new Response(JSON.stringify(data), {
	status,
	headers: { "Content-Type": "application/json" }
});
//#endregion
export { parseRecipeInput as n, json as t };
