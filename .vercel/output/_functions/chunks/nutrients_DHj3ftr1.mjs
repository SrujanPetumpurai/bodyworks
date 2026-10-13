import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { i as bodyTypes, r as ageBrackets, t as db } from "./db_Dofvrqwd.mjs";
import { eq } from "drizzle-orm";
//#region src/db/nutrient-profile.ts
function resolveValue(valueType, min, weightKg, heightCm) {
	switch (valueType) {
		case "fixed":
		case "range": return min;
		case "coefficient_per_kg": return weightKg != null ? min * weightKg : null;
		case "coefficient_per_cm": return heightCm != null ? min * heightCm : null;
	}
}
function num(value) {
	return String(Number(value));
}
async function getNutrientProfiles({ bodyTypeSlug, ageBracketSlug, weightKg, heightCm }) {
	const bodyType = await db.query.bodyTypes.findFirst({ where: eq(bodyTypes.slug, bodyTypeSlug) });
	const ageBracket = await db.query.ageBrackets.findFirst({ where: eq(ageBrackets.slug, ageBracketSlug) });
	if (!bodyType || !ageBracket) throw new Error(`Unknown bodyType "${bodyTypeSlug}" or ageBracket "${ageBracketSlug}"`);
	return (await db.query.nutrients.findMany({
		orderBy: (n, { asc }) => asc(n.sortOrder),
		with: {
			points: { orderBy: (p, { asc }) => asc(p.sortOrder) },
			sources: {
				orderBy: (s, { asc }) => asc(s.sortOrder),
				with: { food: true }
			},
			requirements: { where: (req, { and, eq }) => and(eq(req.bodyTypeId, bodyType.id), eq(req.ageBracketId, ageBracket.id)) }
		}
	})).map((n) => {
		const dailyReq = n.requirements.find((r) => r.metricType === "daily_intake") ?? null;
		const storeReq = n.requirements.find((r) => r.metricType === "body_store") ?? null;
		const toResolved = (req) => {
			if (!req) return null;
			const min = Number(req.minValue);
			const max = req.maxValue != null ? Number(req.maxValue) : null;
			return {
				valueType: req.valueType,
				min,
				max,
				unit: req.metricUnit,
				resolved: resolveValue(req.valueType, min, weightKg, heightCm)
			};
		};
		const dailyIntake = toResolved(dailyReq);
		const bodyStore = toResolved(storeReq);
		const missingWeight = n.usesWeight && weightKg == null;
		const missingHeight = n.usesHeight && heightCm == null;
		const ready = !n.requiresBodyMetrics || !missingWeight && !missingHeight;
		const sources = n.sources.map((s) => {
			if (s.sourceType === "food" && s.food && s.foodAmount != null && s.foodUnit != null && s.nutrientAmount != null && s.nutrientUnit != null) return {
				type: "food",
				name: s.food.name,
				description: s.description ?? `${num(s.foodAmount)} ${s.foodUnit} → ${num(s.nutrientAmount)} ${s.nutrientUnit} ${n.name.toLowerCase()}`,
				url: s.url,
				food: {
					slug: s.food.slug,
					name: s.food.name,
					amount: Number(s.foodAmount),
					unit: s.foodUnit,
					nutrientAmount: Number(s.nutrientAmount),
					nutrientUnit: s.nutrientUnit
				}
			};
			return {
				type: "reference",
				name: s.name ?? "Source",
				description: s.description,
				url: s.url,
				food: null
			};
		});
		return {
			slug: n.slug,
			name: n.name,
			unit: n.unit,
			importance: n.importance,
			requiresBodyMetrics: n.requiresBodyMetrics,
			usesWeight: n.usesWeight,
			usesHeight: n.usesHeight,
			ready,
			points: n.points.map((p) => p.point),
			sources,
			dailyIntake,
			bodyStore
		};
	});
}
//#endregion
//#region src/pages/api/nutrients.ts
var nutrients_exports = /* @__PURE__ */ __exportAll({ GET: () => GET });
var GET = async ({ url }) => {
	const bodyTypeSlug = url.searchParams.get("bodyType");
	const ageBracketSlug = url.searchParams.get("ageBracket");
	const weightKgParam = url.searchParams.get("weightKg");
	const heightCmParam = url.searchParams.get("heightCm");
	if (!bodyTypeSlug || !ageBracketSlug) return new Response(JSON.stringify({ error: "bodyType and ageBracket query params are required" }), {
		status: 400,
		headers: { "Content-Type": "application/json" }
	});
	const weightKg = weightKgParam !== null ? Number(weightKgParam) : void 0;
	const heightCm = heightCmParam !== null ? Number(heightCmParam) : void 0;
	if (weightKg !== void 0 && Number.isNaN(weightKg) || heightCm !== void 0 && Number.isNaN(heightCm)) return new Response(JSON.stringify({ error: "weightKg and heightCm must be numbers" }), {
		status: 400,
		headers: { "Content-Type": "application/json" }
	});
	try {
		const profiles = await getNutrientProfiles({
			bodyTypeSlug,
			ageBracketSlug,
			weightKg,
			heightCm
		});
		return new Response(JSON.stringify(profiles), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} catch (err) {
		return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
			status: 400,
			headers: { "Content-Type": "application/json" }
		});
	}
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/nutrients@_@ts
var page = () => nutrients_exports;
//#endregion
export { page };
