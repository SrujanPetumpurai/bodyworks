import { eq } from "drizzle-orm";
import { db } from "./index";
import { bodyTypes, ageBrackets } from "./schema";

export type ResolvedRequirement = {
  valueType: "fixed" | "range" | "coefficient_per_kg" | "coefficient_per_cm";
  min: number;
  max: number | null;
  unit: string;
  // final computed number for this user, or null if the inputs needed to
  // resolve it (weight/height) haven't been provided yet
  resolved: number | null;
};

export type NutrientProfile = {
  slug: string;
  name: string;
  unit: string;
  importance: number;
  requiresBodyMetrics: boolean;
  usesWeight: boolean;
  usesHeight: boolean;
  // true once every input this nutrient needs has been provided — drives
  // the progressive reveal (gender+age nutrients are ready immediately,
  // weight/height-gated ones flip to ready once those are entered)
  ready: boolean;
  points: string[];
  sources: { name: string; description: string | null; url: string | null }[];
  dailyIntake: ResolvedRequirement | null;
  bodyStore: ResolvedRequirement | null;
};

export type GetNutrientProfilesInput = {
  bodyTypeSlug: string;
  ageBracketSlug: string;
  weightKg?: number;
  heightCm?: number;
};

function resolveValue(
  valueType: ResolvedRequirement["valueType"],
  min: number,
  weightKg?: number,
  heightCm?: number
): number | null {
  switch (valueType) {
    case "fixed":
    case "range":
      return min;
    case "coefficient_per_kg":
      return weightKg != null ? min * weightKg : null;
    case "coefficient_per_cm":
      return heightCm != null ? min * heightCm : null;
  }
}

export async function getNutrientProfiles({
  bodyTypeSlug,
  ageBracketSlug,
  weightKg,
  heightCm,
}: GetNutrientProfilesInput): Promise<NutrientProfile[]> {
  const bodyType = await db.query.bodyTypes.findFirst({
    where: eq(bodyTypes.slug, bodyTypeSlug),
  });
  const ageBracket = await db.query.ageBrackets.findFirst({
    where: eq(ageBrackets.slug, ageBracketSlug),
  });

  if (!bodyType || !ageBracket) {
    throw new Error(`Unknown bodyType "${bodyTypeSlug}" or ageBracket "${ageBracketSlug}"`);
  }

  const rows = await db.query.nutrients.findMany({
    orderBy: (n, { asc }) => asc(n.sortOrder),
    with: {
      points: { orderBy: (p, { asc }) => asc(p.sortOrder) },
      sources: { orderBy: (s, { asc }) => asc(s.sortOrder) },
      requirements: {
        where: (req, { and, eq }) =>
          and(eq(req.bodyTypeId, bodyType.id), eq(req.ageBracketId, ageBracket.id)),
      },
    },
  });

  return rows.map((n) => {
    const dailyReq = n.requirements.find((r) => r.metricType === "daily_intake") ?? null;
    const storeReq = n.requirements.find((r) => r.metricType === "body_store") ?? null;

    const toResolved = (
      req: (typeof n.requirements)[number] | null
    ): ResolvedRequirement | null => {
      if (!req) return null;
      const min = Number(req.minValue);
      const max = req.maxValue != null ? Number(req.maxValue) : null;
      return {
        valueType: req.valueType,
        min,
        max,
        unit: req.metricUnit,
        resolved: resolveValue(req.valueType, min, weightKg, heightCm),
      };
    };

    const dailyIntake = toResolved(dailyReq);
    const bodyStore = toResolved(storeReq);

    const missingWeight = n.usesWeight && weightKg == null;
    const missingHeight = n.usesHeight && heightCm == null;
    const ready = !n.requiresBodyMetrics || (!missingWeight && !missingHeight);

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
      sources: n.sources.map((s) => ({ name: s.name, description: s.description, url: s.url })),
      dailyIntake,
      bodyStore,
    };
  });
}

// formats a resolved requirement for display, e.g. "56 g" or "7–9 hrs"
export function formatRequirement(req: ResolvedRequirement | null): string {
  if (!req || req.resolved == null) return "—";
  if (req.valueType === "range" && req.max != null) {
    return `${req.min}–${req.max} ${req.unit}`;
  }
  const value = Number.isInteger(req.resolved) ? req.resolved : req.resolved.toFixed(1);
  return `${value} ${req.unit}`;
}