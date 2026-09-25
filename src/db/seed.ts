import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";
import {
  bodyTypes,
  ageBrackets,
  nutrients,
  nutrientPoints,
  nutrientSources,
  nutrientRequirements,
} from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set (check your .env file)");
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

// ---------- lookup seed data ----------

const bodyTypeSeed = [
  { slug: "male", label: "Male", sortOrder: 0 },
  { slug: "female", label: "Female", sortOrder: 1 },
  { slug: "pregnant", label: "Pregnant Women", sortOrder: 2 },
] as const;

const ageBracketSeed = [
  { slug: "child", label: "4–8", minAge: 4, maxAge: 8, sortOrder: 0 },
  { slug: "teenager", label: "9–18", minAge: 9, maxAge: 18, sortOrder: 1 },
  { slug: "adult", label: "19–50", minAge: 19, maxAge: 50, sortOrder: 2 },
  { slug: "older_adult", label: "51–70", minAge: 51, maxAge: 70, sortOrder: 3 },
  { slug: "elderly", label: "70+", minAge: 71, maxAge: 120, sortOrder: 4 },
] as const;

// ---------- nutrient definitions ----------

const nutrientSeed = [
  {
    slug: "sleep",
    name: "Sleep",
    unit: "hrs",
    importance: 5,
    requiresBodyMetrics: false,
    usesWeight: false,
    usesHeight: false,
    points: [
      "Growth hormone release and memory consolidation both peak during deep sleep.",
      "Chronic short sleep is linked to impaired glucose regulation and slower recovery.",
    ],
    sources: [
      { name: "Consistent sleep schedule", description: "Same bed/wake time daily improves sleep quality more than total hours alone." },
      { name: "National Sleep Foundation", description: "General sleep-duration guidelines by age." },
    ],
  },
  {
    slug: "protein",
    name: "Protein",
    unit: "g",
    importance: 5,
    requiresBodyMetrics: false,
    usesWeight: false,
    usesHeight: false,
    points: [
      "Supports muscle growth and tissue repair.",
      "Needs increase with age to counter natural muscle loss (sarcopenia).",
    ],
    sources: [
      { name: "Eggs", description: "Complete protein, ~6g per large egg." },
      { name: "Chicken breast", description: "~31g protein per 100g cooked." },
      { name: "Lentils", description: "~9g protein per 100g cooked, plant-based option." },
    ],
  },
  {
    slug: "iron",
    name: "Iron",
    unit: "mg",
    importance: 4,
    requiresBodyMetrics: false,
    usesWeight: false,
    usesHeight: false,
    points: [
      "Needed for red blood cell production and oxygen transport.",
      "Requirements are notably higher during menstruation and pregnancy.",
    ],
    sources: [
      { name: "Red meat", description: "Heme iron, more readily absorbed than plant sources." },
      { name: "Spinach", description: "Non-heme iron; pair with vitamin C for better absorption." },
    ],
  },
  {
    slug: "calcium",
    name: "Calcium",
    unit: "mg",
    importance: 5,
    requiresBodyMetrics: false,
    usesWeight: false,
    usesHeight: false,
    points: [
      "Builds and maintains bone density.",
      "Also involved in muscle contraction and nerve signaling.",
    ],
    sources: [
      { name: "Dairy (milk, yogurt, cheese)", description: "Most bioavailable common source." },
      { name: "Fortified plant milks", description: "Check label — fortification levels vary by brand." },
    ],
  },
  {
    slug: "water",
    name: "Water",
    unit: "L",
    importance: 4,
    requiresBodyMetrics: false,
    usesWeight: false,
    usesHeight: false,
    points: [
      "Covers fluid lost through normal activity, temperature regulation, and exercise.",
      "Needs rise significantly with heat, altitude, and physical activity.",
    ],
    sources: [
      { name: "Plain water", description: "The default source; no calories, no additives." },
      { name: "Water-rich foods", description: "Fruits and vegetables (cucumber, watermelon) contribute meaningfully." },
    ],
  },
  {
    slug: "vitaminD",
    name: "Vitamin D",
    unit: "mcg",
    importance: 3,
    requiresBodyMetrics: false,
    usesWeight: false,
    usesHeight: false,
    points: [
      "Helps the body absorb calcium properly.",
      "Sunlight exposure lets the body synthesize its own supply.",
    ],
    sources: [
      { name: "Sunlight", description: "10–30 minutes midday exposure, several times a week, for most people." },
      { name: "Fatty fish", description: "Salmon, mackerel, sardines are naturally rich sources." },
    ],
  },
  {
    slug: "fiber",
    name: "Fiber",
    unit: "g",
    importance: 3,
    requiresBodyMetrics: false,
    usesWeight: false,
    usesHeight: false,
    points: [
      "Supports digestion and keeps blood sugar steady.",
      "Feeds beneficial gut bacteria and supports satiety.",
    ],
    sources: [
      { name: "Whole grains", description: "Oats, whole wheat, brown rice." },
      { name: "Legumes", description: "Beans, lentils, chickpeas — also a protein source." },
    ],
  },
  {
    slug: "calories",
    name: "Calories",
    unit: "kcal",
    importance: 4,
    // demo nutrient for the weight-gated reveal: only appears once weight is entered
    requiresBodyMetrics: true,
    usesWeight: true,
    usesHeight: false,
    points: [
      "Baseline energy needs scale with body weight, not just age and sex.",
      "Placeholder coefficient below — swap for a real Mifflin-St Jeor / activity-adjusted formula before shipping.",
    ],
    sources: [
      { name: "Whole-food, calorie-dense meals", description: "Combine with the protein/fiber targets above rather than tracking in isolation." },
    ],
  },
] as const;

// ---------- requirement rows ----------
// carried over from the original daily-requirements.astro placeholder data,
// mapped onto the new age-bracket slugs.

type ReqRow = {
  nutrientSlug: string;
  bodyTypeSlug: string;
  ageBracketSlug: string;
  metricType: "daily_intake" | "body_store";
  valueType: "fixed" | "range" | "coefficient_per_kg" | "coefficient_per_cm";
  minValue: number;
  maxValue?: number;
  metricUnit: string;
};

const dailyIntakeSeed: ReqRow[] = [];

const demographicData: Record<
  string,
  Record<string, { sleep: [number, number]; protein: number; iron: number; calcium: number; water: number; vitaminD: number; fiber: number }>
> = {
  male: {
    child: { sleep: [10, 13], protein: 19, iron: 10, calcium: 1000, water: 1.7, vitaminD: 15, fiber: 25 },
    teenager: { sleep: [8, 10], protein: 52, iron: 11, calcium: 1300, water: 3.3, vitaminD: 15, fiber: 31 },
    adult: { sleep: [7, 9], protein: 56, iron: 8, calcium: 1000, water: 3.7, vitaminD: 15, fiber: 38 },
    older_adult: { sleep: [7, 9], protein: 56, iron: 8, calcium: 1000, water: 3.7, vitaminD: 15, fiber: 30 },
    elderly: { sleep: [7, 8], protein: 56, iron: 8, calcium: 1200, water: 3.7, vitaminD: 20, fiber: 28 },
  },
  female: {
    child: { sleep: [10, 13], protein: 19, iron: 10, calcium: 1000, water: 1.7, vitaminD: 15, fiber: 25 },
    teenager: { sleep: [8, 10], protein: 46, iron: 15, calcium: 1300, water: 2.3, vitaminD: 15, fiber: 26 },
    adult: { sleep: [7, 9], protein: 46, iron: 18, calcium: 1000, water: 2.7, vitaminD: 15, fiber: 25 },
    older_adult: { sleep: [7, 9], protein: 46, iron: 8, calcium: 1200, water: 2.7, vitaminD: 15, fiber: 21 },
    elderly: { sleep: [7, 8], protein: 46, iron: 8, calcium: 1200, water: 2.7, vitaminD: 20, fiber: 22 },
  },
  pregnant: {
    // pregnancy is only realistic for teenager/adult brackets — see chat note
    teenager: { sleep: [8, 10], protein: 71, iron: 27, calcium: 1000, water: 3.0, vitaminD: 15, fiber: 28 },
    adult: { sleep: [8, 10], protein: 71, iron: 27, calcium: 1000, water: 3.0, vitaminD: 15, fiber: 28 },
  },
};

for (const [bodyTypeSlug, ageMap] of Object.entries(demographicData)) {
  for (const [ageBracketSlug, d] of Object.entries(ageMap)) {
    dailyIntakeSeed.push(
      { nutrientSlug: "sleep", bodyTypeSlug, ageBracketSlug, metricType: "daily_intake", valueType: "range", minValue: d.sleep[0], maxValue: d.sleep[1], metricUnit: "hrs" },
      { nutrientSlug: "protein", bodyTypeSlug, ageBracketSlug, metricType: "daily_intake", valueType: "fixed", minValue: d.protein, metricUnit: "g" },
      { nutrientSlug: "iron", bodyTypeSlug, ageBracketSlug, metricType: "daily_intake", valueType: "fixed", minValue: d.iron, metricUnit: "mg" },
      { nutrientSlug: "calcium", bodyTypeSlug, ageBracketSlug, metricType: "daily_intake", valueType: "fixed", minValue: d.calcium, metricUnit: "mg" },
      { nutrientSlug: "water", bodyTypeSlug, ageBracketSlug, metricType: "daily_intake", valueType: "fixed", minValue: d.water, metricUnit: "L" },
      { nutrientSlug: "vitaminD", bodyTypeSlug, ageBracketSlug, metricType: "daily_intake", valueType: "fixed", minValue: d.vitaminD, metricUnit: "mcg" },
      { nutrientSlug: "fiber", bodyTypeSlug, ageBracketSlug, metricType: "daily_intake", valueType: "fixed", minValue: d.fiber, metricUnit: "g" }
    );
  }
}

// body_store demo rows — illustrative placeholders, not clinically verified.
// shows how the same nutrient carries both a daily_intake and a body_store figure.
const bodyStoreSeed: ReqRow[] = [
  { nutrientSlug: "iron", bodyTypeSlug: "male", ageBracketSlug: "adult", metricType: "body_store", valueType: "fixed", minValue: 1000, metricUnit: "mg" },
  { nutrientSlug: "iron", bodyTypeSlug: "female", ageBracketSlug: "adult", metricType: "body_store", valueType: "fixed", minValue: 300, metricUnit: "mg" },
  { nutrientSlug: "calcium", bodyTypeSlug: "male", ageBracketSlug: "adult", metricType: "body_store", valueType: "fixed", minValue: 1200, metricUnit: "g" },
  { nutrientSlug: "calcium", bodyTypeSlug: "female", ageBracketSlug: "adult", metricType: "body_store", valueType: "fixed", minValue: 1000, metricUnit: "g" },
];

// calories demo rows — coefficient_per_kg, requires weight to resolve.
// flat illustrative coefficients; replace with a real formula before shipping.
const caloriesSeed: ReqRow[] = [
  { nutrientSlug: "calories", bodyTypeSlug: "male", ageBracketSlug: "teenager", metricType: "daily_intake", valueType: "coefficient_per_kg", minValue: 35, metricUnit: "kcal/kg" },
  { nutrientSlug: "calories", bodyTypeSlug: "male", ageBracketSlug: "adult", metricType: "daily_intake", valueType: "coefficient_per_kg", minValue: 30, metricUnit: "kcal/kg" },
  { nutrientSlug: "calories", bodyTypeSlug: "male", ageBracketSlug: "older_adult", metricType: "daily_intake", valueType: "coefficient_per_kg", minValue: 28, metricUnit: "kcal/kg" },
  { nutrientSlug: "calories", bodyTypeSlug: "male", ageBracketSlug: "elderly", metricType: "daily_intake", valueType: "coefficient_per_kg", minValue: 26, metricUnit: "kcal/kg" },
  { nutrientSlug: "calories", bodyTypeSlug: "female", ageBracketSlug: "teenager", metricType: "daily_intake", valueType: "coefficient_per_kg", minValue: 32, metricUnit: "kcal/kg" },
  { nutrientSlug: "calories", bodyTypeSlug: "female", ageBracketSlug: "adult", metricType: "daily_intake", valueType: "coefficient_per_kg", minValue: 28, metricUnit: "kcal/kg" },
  { nutrientSlug: "calories", bodyTypeSlug: "female", ageBracketSlug: "older_adult", metricType: "daily_intake", valueType: "coefficient_per_kg", minValue: 26, metricUnit: "kcal/kg" },
  { nutrientSlug: "calories", bodyTypeSlug: "female", ageBracketSlug: "elderly", metricType: "daily_intake", valueType: "coefficient_per_kg", minValue: 24, metricUnit: "kcal/kg" },
  { nutrientSlug: "calories", bodyTypeSlug: "pregnant", ageBracketSlug: "teenager", metricType: "daily_intake", valueType: "coefficient_per_kg", minValue: 33, metricUnit: "kcal/kg" },
  { nutrientSlug: "calories", bodyTypeSlug: "pregnant", ageBracketSlug: "adult", metricType: "daily_intake", valueType: "coefficient_per_kg", minValue: 33, metricUnit: "kcal/kg" },
];

const allRequirementSeed = [...dailyIntakeSeed, ...bodyStoreSeed, ...caloriesSeed];

// ---------- run ----------

async function main() {
  console.log("Clearing existing rows...");
  await db.delete(nutrientRequirements);
  await db.delete(nutrientPoints);
  await db.delete(nutrientSources);
  await db.delete(nutrients);
  await db.delete(ageBrackets);
  await db.delete(bodyTypes);

  console.log("Inserting body types...");
const insertedBodyTypes = await db.insert(bodyTypes).values([...bodyTypeSeed]).returning();
  const bodyTypeIdBySlug = new Map(insertedBodyTypes.map((b) => [b.slug, b.id]));

  console.log("Inserting age brackets...");
  const insertedAgeBrackets = await db.insert(ageBrackets).values([...ageBracketSeed]).returning();
  const ageBracketIdBySlug = new Map(insertedAgeBrackets.map((a) => [a.slug, a.id]));

  console.log("Inserting nutrients...");
  const insertedNutrients = await db
    .insert(nutrients)
    .values(
      nutrientSeed.map((n, i) => ({
        slug: n.slug,
        name: n.name,
        unit: n.unit,
        importance: n.importance,
        requiresBodyMetrics: n.requiresBodyMetrics,
        usesWeight: n.usesWeight,
        usesHeight: n.usesHeight,
        sortOrder: i,
      }))
    )
    .returning();
  const nutrientIdBySlug = new Map(insertedNutrients.map((n) => [n.slug, n.id]));

  console.log("Inserting nutrient points and sources...");
  for (const n of nutrientSeed) {
    const nutrientId = nutrientIdBySlug.get(n.slug)!;

    if (n.points.length) {
      await db.insert(nutrientPoints).values(
        n.points.map((point, i) => ({ nutrientId, point, sortOrder: i }))
      );
    }

    if (n.sources.length) {
      await db.insert(nutrientSources).values(
        n.sources.map((s, i) => ({
          nutrientId,
          name: s.name,
          description: s.description ?? null,
          sortOrder: i,
        }))
      );
    }
  }

  console.log("Inserting nutrient requirements...");
  const missing: string[] = [];
  const requirementRows = allRequirementSeed
    .map((r) => {
      const nutrientId = nutrientIdBySlug.get(r.nutrientSlug);
      const bodyTypeId = bodyTypeIdBySlug.get(r.bodyTypeSlug);
      const ageBracketId = ageBracketIdBySlug.get(r.ageBracketSlug);
      if (!nutrientId || !bodyTypeId || !ageBracketId) {
        missing.push(`${r.nutrientSlug}/${r.bodyTypeSlug}/${r.ageBracketSlug}`);
        return null;
      }
      return {
        nutrientId,
        bodyTypeId,
        ageBracketId,
        metricType: r.metricType,
        valueType: r.valueType,
        minValue: String(r.minValue),
        maxValue: r.maxValue !== undefined ? String(r.maxValue) : null,
        metricUnit: r.metricUnit,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (missing.length) {
    console.warn("Skipped rows with unresolved slugs:", missing);
  }

  await db.insert(nutrientRequirements).values(requirementRows);

  console.log(
    `Done. ${insertedBodyTypes.length} body types, ${insertedAgeBrackets.length} age brackets, ${insertedNutrients.length} nutrients, ${requirementRows.length} requirement rows.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });