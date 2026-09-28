import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { inArray, sql } from "drizzle-orm";
import * as schema from "./schema";
import {
  bodyTypes,
  ageBrackets,
  foods,
  nutrients,
  nutrientPoints,
  nutrientSources,
  nutrientRequirements,
  recipes,
  recipeIngredients,
  recipeSteps,
} from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set (check your .env file)");
}

const client = neon(process.env.DATABASE_URL);
const db = drizzle(client, { schema });

// ---------- lookup seed data ----------

const bodyTypeSeed = [
  { slug: "male", label: "Male", sortOrder: 0 },
  { slug: "female", label: "Female", sortOrder: 1 },
  { slug: "pregnant", label: "Pregnant Women", sortOrder: 2 },
];

const ageBracketSeed = [
  { slug: "child", label: "4–8", minAge: 4, maxAge: 8, sortOrder: 0 },
  { slug: "teenager", label: "9–18", minAge: 9, maxAge: 18, sortOrder: 1 },
  { slug: "adult", label: "19–50", minAge: 19, maxAge: 50, sortOrder: 2 },
  { slug: "older_adult", label: "51–70", minAge: 51, maxAge: 70, sortOrder: 3 },
  { slug: "elderly", label: "70+", minAge: 71, maxAge: 120, sortOrder: 4 },
];

// ---------- foods ----------
// Macros are approximate per-100g values (cooked where that's how the food is
// normally eaten). Shared by nutrient sources AND recipe ingredients.
// Foods are UPSERTED by slug — never deleted — so recipe_ingredients that point
// at them (onDelete: restrict) are never broken by re-seeding.

type FoodSeed = {
  slug: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

const foodSeed: FoodSeed[] = [
  { slug: "egg", name: "Eggs", calories: 143, protein: 12.6, carbs: 0.7, fat: 9.5 },
  { slug: "chicken-breast", name: "Chicken breast", calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { slug: "lentils", name: "Lentils", calories: 116, protein: 9, carbs: 20, fat: 0.4 },
  { slug: "beef", name: "Red meat (beef)", calories: 250, protein: 26, carbs: 0, fat: 15 },
  { slug: "spinach", name: "Spinach", calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
  { slug: "milk", name: "Milk", calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3 },
  { slug: "yogurt", name: "Yogurt", calories: 61, protein: 3.5, carbs: 4.7, fat: 3.3 },
  { slug: "cheddar-cheese", name: "Cheese (cheddar)", calories: 403, protein: 25, carbs: 1.3, fat: 33 },
  { slug: "salmon", name: "Salmon", calories: 208, protein: 20, carbs: 0, fat: 13 },
  { slug: "oats", name: "Oats", calories: 389, protein: 16.9, carbs: 66, fat: 6.9 },
  { slug: "chickpeas", name: "Chickpeas", calories: 164, protein: 8.9, carbs: 27, fat: 2.6 },
  // added for recipes
  { slug: "rice", name: "Rice (cooked)", calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { slug: "banana", name: "Banana", calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  { slug: "olive-oil", name: "Olive oil", calories: 884, protein: 0, carbs: 0, fat: 100 },
  { slug: "tomato", name: "Tomato", calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
  { slug: "onion", name: "Onion", calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1 },
  { slug: "garlic", name: "Garlic", calories: 149, protein: 6.4, carbs: 33, fat: 0.5 },
];

// ---------- nutrient definitions ----------

type SourceSeed =
  | { type: "reference"; name: string; description?: string; url?: string }
  | {
      type: "food";
      foodSlug: string;
      foodAmount: number;
      foodUnit: string;
      nutrientAmount: number;
      nutrientUnit: string;
      description?: string;
    };

type NutrientSeed = {
  slug: string;
  name: string;
  unit: string;
  importance: number;
  requiresBodyMetrics: boolean;
  usesWeight: boolean;
  usesHeight: boolean;
  points: string[];
  sources: SourceSeed[];
};

const nutrientSeed: NutrientSeed[] = [
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
      { type: "reference", name: "Consistent sleep schedule", description: "Same bed/wake time daily improves sleep quality more than total hours alone." },
      { type: "reference", name: "National Sleep Foundation", description: "General sleep-duration guidelines by age." },
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
      { type: "food", foodSlug: "egg", foodAmount: 1, foodUnit: "piece", nutrientAmount: 6, nutrientUnit: "g", description: "Complete protein." },
      { type: "food", foodSlug: "chicken-breast", foodAmount: 100, foodUnit: "g", nutrientAmount: 31, nutrientUnit: "g", description: "Cooked weight." },
      { type: "food", foodSlug: "lentils", foodAmount: 100, foodUnit: "g", nutrientAmount: 9, nutrientUnit: "g", description: "Cooked; a plant-based option." },
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
      { type: "food", foodSlug: "beef", foodAmount: 100, foodUnit: "g", nutrientAmount: 2.6, nutrientUnit: "mg", description: "Heme iron, more readily absorbed than plant sources." },
      { type: "food", foodSlug: "spinach", foodAmount: 100, foodUnit: "g", nutrientAmount: 2.7, nutrientUnit: "mg", description: "Non-heme iron; pair with vitamin C for better absorption." },
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
      { type: "food", foodSlug: "milk", foodAmount: 250, foodUnit: "ml", nutrientAmount: 300, nutrientUnit: "mg" },
      { type: "food", foodSlug: "yogurt", foodAmount: 100, foodUnit: "g", nutrientAmount: 120, nutrientUnit: "mg" },
      { type: "food", foodSlug: "cheddar-cheese", foodAmount: 30, foodUnit: "g", nutrientAmount: 215, nutrientUnit: "mg" },
      { type: "reference", name: "Fortified plant milks", description: "Check label — fortification levels vary by brand." },
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
      { type: "reference", name: "Plain water", description: "The default source; no calories, no additives." },
      { type: "reference", name: "Water-rich foods", description: "Fruits and vegetables (cucumber, watermelon) contribute meaningfully." },
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
      { type: "reference", name: "Sunlight", description: "10–30 minutes midday exposure, several times a week, for most people." },
      { type: "food", foodSlug: "salmon", foodAmount: 100, foodUnit: "g", nutrientAmount: 11, nutrientUnit: "mcg", description: "Fatty fish are naturally rich sources." },
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
      { type: "food", foodSlug: "oats", foodAmount: 100, foodUnit: "g", nutrientAmount: 10, nutrientUnit: "g", description: "Dry weight; whole grain." },
      { type: "food", foodSlug: "chickpeas", foodAmount: 100, foodUnit: "g", nutrientAmount: 7.6, nutrientUnit: "g", description: "Cooked; also a protein source." },
      { type: "food", foodSlug: "lentils", foodAmount: 100, foodUnit: "g", nutrientAmount: 7.9, nutrientUnit: "g", description: "Cooked." },
    ],
  },
  {
    slug: "calories",
    name: "Calories",
    unit: "kcal",
    importance: 4,
    // only appears once weight is entered
    requiresBodyMetrics: true,
    usesWeight: true,
    usesHeight: false,
    points: [
      "Baseline energy needs scale with body weight, not just age and sex.",
      // TODO: swap the flat coefficients below for a real Mifflin-St Jeor /
      // activity-adjusted formula before shipping (this text is user-facing too).
      "Estimate based on body weight; individual needs vary with activity level.",
    ],
    sources: [
      { type: "reference", name: "Whole-food, calorie-dense meals", description: "Combine with the protein/fiber targets above rather than tracking in isolation." },
    ],
  },
];

// ---------- requirement rows ----------

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
    // pregnancy is only realistic for teenager/adult brackets
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

// ---------- recipes ----------
// Recipes are upserted by slug. Their ingredients and steps are wiped and
// re-inserted on each run, but ratings are left alone, so re-seeding never
// erases user ratings or the avgRating / ratingCount on a recipe.

type RecipeSeed = {
  slug: string;
  name: string;
  description: string;
  prepTimeMinutes: number;
  difficulty: "easy" | "medium" | "hard";
  servings: number;
  ingredients: { foodSlug: string; amount: number; unit: string }[];
  steps: string[];
};

const recipeSeed: RecipeSeed[] = [
  {
    slug: "spinach-cheese-scramble",
    name: "Spinach & Cheese Scramble",
    description: "A fast, high-protein breakfast: fluffy eggs with wilted spinach and melted cheddar.",
    prepTimeMinutes: 10,
    difficulty: "easy",
    servings: 1,
    ingredients: [
      { foodSlug: "egg", amount: 3, unit: "piece" },
      { foodSlug: "spinach", amount: 60, unit: "g" },
      { foodSlug: "cheddar-cheese", amount: 20, unit: "g" },
      { foodSlug: "olive-oil", amount: 1, unit: "tsp" },
    ],
    steps: [
      "Crack the eggs into a bowl and whisk with a pinch of salt and pepper.",
      "Heat the olive oil in a non-stick pan over medium heat and add the spinach. Stir for about a minute until wilted.",
      "Pour in the eggs and stir gently with a spatula until they start to set.",
      "Sprinkle over the grated cheddar, stir once more and take the pan off the heat while the eggs are still slightly soft.",
    ],
  },
  {
    slug: "creamy-overnight-oats",
    name: "Creamy Overnight Oats",
    description: "No-cook oats soaked in milk and yogurt overnight, topped with banana. Grab and go.",
    prepTimeMinutes: 5,
    difficulty: "easy",
    servings: 1,
    ingredients: [
      { foodSlug: "oats", amount: 50, unit: "g" },
      { foodSlug: "milk", amount: 150, unit: "ml" },
      { foodSlug: "yogurt", amount: 80, unit: "g" },
      { foodSlug: "banana", amount: 1, unit: "piece" },
    ],
    steps: [
      "Add the oats, milk and yogurt to a jar and stir until combined.",
      "Cover and refrigerate for at least 6 hours, or overnight.",
      "In the morning, slice the banana over the top and eat cold, or warm it for a minute in the microwave.",
    ],
  },
  {
    slug: "garlic-chicken-rice-bowl",
    name: "Garlic Chicken Rice Bowl",
    description: "Seared garlic chicken breast over rice with wilted spinach. A solid post-workout dinner.",
    prepTimeMinutes: 25,
    difficulty: "easy",
    servings: 2,
    ingredients: [
      { foodSlug: "chicken-breast", amount: 300, unit: "g" },
      { foodSlug: "rice", amount: 300, unit: "g" },
      { foodSlug: "spinach", amount: 100, unit: "g" },
      { foodSlug: "garlic", amount: 3, unit: "piece" },
      { foodSlug: "olive-oil", amount: 1, unit: "tbsp" },
    ],
    steps: [
      "Slice the chicken breast into strips and season with salt and pepper. Mince the garlic.",
      "Heat the olive oil in a large pan over medium-high heat. Cook the chicken for 5–6 minutes, turning, until golden and cooked through.",
      "Add the garlic and stir for 30 seconds, then add the spinach and cook until wilted.",
      "Warm the rice, divide between two bowls and top with the chicken and spinach.",
    ],
  },
  {
    slug: "baked-salmon-and-rice",
    name: "Baked Salmon & Rice",
    description: "Oven-baked salmon fillets with olive oil and tomato, served over rice.",
    prepTimeMinutes: 25,
    difficulty: "medium",
    servings: 2,
    ingredients: [
      { foodSlug: "salmon", amount: 300, unit: "g" },
      { foodSlug: "rice", amount: 300, unit: "g" },
      { foodSlug: "tomato", amount: 2, unit: "piece" },
      { foodSlug: "olive-oil", amount: 1, unit: "tbsp" },
      { foodSlug: "garlic", amount: 2, unit: "piece" },
    ],
    steps: [
      "Preheat the oven to 200°C (390°F). Slice the tomatoes and mince the garlic.",
      "Place the salmon on a lined tray, drizzle with the olive oil and top with the garlic and tomato slices. Season with salt and pepper.",
      "Bake for 12–15 minutes, until the salmon flakes easily with a fork.",
      "Serve over warm rice with the roasted tomato and any juices from the tray.",
    ],
  },
  {
    slug: "chickpea-lentil-stew",
    name: "Chickpea & Lentil Stew",
    description: "A hearty plant-based stew, high in fiber and protein, that reheats well for meal prep.",
    prepTimeMinutes: 35,
    difficulty: "medium",
    servings: 4,
    ingredients: [
      { foodSlug: "chickpeas", amount: 400, unit: "g" },
      { foodSlug: "lentils", amount: 300, unit: "g" },
      { foodSlug: "tomato", amount: 4, unit: "piece" },
      { foodSlug: "onion", amount: 1, unit: "piece" },
      { foodSlug: "garlic", amount: 3, unit: "piece" },
      { foodSlug: "spinach", amount: 100, unit: "g" },
      { foodSlug: "olive-oil", amount: 2, unit: "tbsp" },
    ],
    steps: [
      "Dice the onion and tomatoes and mince the garlic.",
      "Heat the olive oil in a large pot over medium heat. Cook the onion for 5 minutes until soft, then add the garlic for 30 seconds.",
      "Add the tomatoes and cook for 5 minutes, until they break down into a sauce.",
      "Stir in the cooked chickpeas and lentils with a cup of water. Simmer for 15 minutes.",
      "Add the spinach, stir until wilted, and season to taste before serving.",
    ],
  },
  {
    slug: "beef-and-spinach-stir-fry",
    name: "Beef & Spinach Stir-Fry",
    description: "Quick, iron-rich stir-fry with beef strips, onion and spinach over rice.",
    prepTimeMinutes: 20,
    difficulty: "medium",
    servings: 2,
    ingredients: [
      { foodSlug: "beef", amount: 250, unit: "g" },
      { foodSlug: "spinach", amount: 120, unit: "g" },
      { foodSlug: "onion", amount: 1, unit: "piece" },
      { foodSlug: "garlic", amount: 2, unit: "piece" },
      { foodSlug: "rice", amount: 300, unit: "g" },
      { foodSlug: "olive-oil", amount: 1, unit: "tbsp" },
    ],
    steps: [
      "Slice the beef into thin strips and the onion into half-moons. Mince the garlic.",
      "Heat the olive oil in a wok or large pan over high heat. Sear the beef for 2–3 minutes until browned, then remove it from the pan.",
      "In the same pan, cook the onion for 3 minutes, add the garlic, then the spinach until just wilted.",
      "Return the beef to the pan, toss everything together for a minute and serve over warm rice.",
    ],
  },
];

// ---------- run ----------

async function main() {
  // NOTE: foods, recipes and their ratings are intentionally NOT cleared here.
  // Deleting nutrients cascades to points, sources and requirements.
  console.log("Clearing nutrient tables...");
  await db.delete(nutrientRequirements);
  await db.delete(nutrientPoints);
  await db.delete(nutrientSources);
  await db.delete(nutrients);
  await db.delete(ageBrackets);
  await db.delete(bodyTypes);

  console.log("Inserting body types...");
  const insertedBodyTypes = await db.insert(bodyTypes).values(bodyTypeSeed).returning();
  const bodyTypeIdBySlug = new Map(insertedBodyTypes.map((b) => [b.slug, b.id]));

  console.log("Inserting age brackets...");
  const insertedAgeBrackets = await db.insert(ageBrackets).values(ageBracketSeed).returning();
  const ageBracketIdBySlug = new Map(insertedAgeBrackets.map((a) => [a.slug, a.id]));

  console.log("Upserting foods...");
  const upsertedFoods = await db
    .insert(foods)
    .values(
      foodSeed.map((f) => ({
        slug: f.slug,
        name: f.name,
        caloriesPer100g: String(f.calories),
        proteinPer100g: String(f.protein),
        carbsPer100g: String(f.carbs),
        fatPer100g: String(f.fat),
      }))
    )
    .onConflictDoUpdate({
      target: foods.slug,
      set: {
        name: sql`excluded.name`,
        caloriesPer100g: sql`excluded.calories_per_100g`,
        proteinPer100g: sql`excluded.protein_per_100g`,
        carbsPer100g: sql`excluded.carbs_per_100g`,
        fatPer100g: sql`excluded.fat_per_100g`,
      },
    })
    .returning();
  const foodIdBySlug = new Map(upsertedFoods.map((f) => [f.slug, f.id]));

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
      const sourceRows = n.sources.map((s, i) => {
        if (s.type === "food") {
          const foodId = foodIdBySlug.get(s.foodSlug);
          if (!foodId) {
            throw new Error(`Unknown food slug "${s.foodSlug}" in nutrient "${n.slug}"`);
          }
          return {
            nutrientId,
            sourceType: "food" as const,
            foodId,
            foodAmount: String(s.foodAmount),
            foodUnit: s.foodUnit,
            nutrientAmount: String(s.nutrientAmount),
            nutrientUnit: s.nutrientUnit,
            name: null,
            description: s.description ?? null,
            url: null,
            sortOrder: i,
          };
        }
        return {
          nutrientId,
          sourceType: "reference" as const,
          foodId: null,
          foodAmount: null,
          foodUnit: null,
          nutrientAmount: null,
          nutrientUnit: null,
          name: s.name,
          description: s.description ?? null,
          url: s.url ?? null,
          sortOrder: i,
        };
      });

      await db.insert(nutrientSources).values(sourceRows);
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

  // ---------- recipes ----------

  console.log("Upserting recipes...");
  const upsertedRecipes = await db
    .insert(recipes)
    .values(
      recipeSeed.map((r) => ({
        slug: r.slug,
        name: r.name,
        description: r.description,
        prepTimeMinutes: r.prepTimeMinutes,
        difficulty: r.difficulty,
        servings: r.servings,
      }))
    )
    .onConflictDoUpdate({
      target: recipes.slug,
      set: {
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        prepTimeMinutes: sql`excluded.prep_time_minutes`,
        difficulty: sql`excluded.difficulty`,
        servings: sql`excluded.servings`,
        updatedAt: sql`now()`,
      },
    })
    .returning();
  const recipeIdBySlug = new Map(upsertedRecipes.map((r) => [r.slug, r.id]));
  const recipeIds = upsertedRecipes.map((r) => r.id);

  // wipe old ingredients + steps for these recipes, then re-insert fresh
  console.log("Replacing recipe ingredients and steps...");
  await db.delete(recipeIngredients).where(inArray(recipeIngredients.recipeId, recipeIds));
  await db.delete(recipeSteps).where(inArray(recipeSteps.recipeId, recipeIds));

  const ingredientRows: (typeof recipeIngredients.$inferInsert)[] = [];
  const stepRows: (typeof recipeSteps.$inferInsert)[] = [];

  for (const r of recipeSeed) {
    const recipeId = recipeIdBySlug.get(r.slug)!;

    r.ingredients.forEach((ing, i) => {
      const foodId = foodIdBySlug.get(ing.foodSlug);
      if (!foodId) {
        throw new Error(`Unknown food slug "${ing.foodSlug}" in recipe "${r.slug}"`);
      }
      ingredientRows.push({
        recipeId,
        foodId,
        amount: String(ing.amount),
        unit: ing.unit,
        sortOrder: i,
      });
    });

    r.steps.forEach((instruction, i) => {
      stepRows.push({ recipeId, stepNumber: i + 1, instruction });
    });
  }

  await db.insert(recipeIngredients).values(ingredientRows);
  await db.insert(recipeSteps).values(stepRows);

  console.log(
    `Done. ${insertedBodyTypes.length} body types, ${insertedAgeBrackets.length} age brackets, ${upsertedFoods.length} foods, ${insertedNutrients.length} nutrients, ${requirementRows.length} requirement rows, ${upsertedRecipes.length} recipes (${ingredientRows.length} ingredient rows, ${stepRows.length} steps).`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });