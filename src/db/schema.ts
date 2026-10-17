import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  date,
  pgEnum,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";

// =====================================================================
// AUTH (user / session / account / verification)
// =====================================================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  banner: text("banner"), // profile page banner image URL; falls back to a generated gradient
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =====================================================================
// DAILY REQUIREMENTS — lookups
// =====================================================================

export const bodyTypes = pgTable("body_types", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(), // 'male' | 'female' | 'pregnant'
  label: text("label").notNull(), // "Male", "Female", "Pregnant Women"
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const ageBrackets = pgTable("age_brackets", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(), // 'child' | 'teenager' | 'adult' | 'older_adult' | 'elderly'
  label: text("label").notNull(), // "4–8", "9–18", ...
  minAge: integer("min_age").notNull(),
  maxAge: integer("max_age").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// how a requirement's value should be interpreted
export const nutrientValueTypeEnum = pgEnum("nutrient_value_type", [
  "fixed", // single number, e.g. 1000 mg calcium
  "range", // min–max, e.g. 7–9 hrs sleep
  "coefficient_per_kg", // multiply by user's weight in kg
  "coefficient_per_cm", // multiply by user's height in cm
]);

// whether a requirement row is a daily intake target or a total-body-store reference
export const nutrientMetricTypeEnum = pgEnum("nutrient_metric_type", [
  "daily_intake",
  "body_store",
]);

// =====================================================================
// FOODS — shared by nutrient sources AND recipe ingredients
// =====================================================================

export const foods = pgTable("foods", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(), // 'chicken-breast', 'eggs', 'soya-chunks'
  name: text("name").notNull(), // "Chicken Breast", "Eggs", "Soya Chunks"
  // macros are nullable so existing foods (seeded for nutrient sources) stay valid
  caloriesPer100g: numeric("calories_per_100g", { precision: 8, scale: 2 }),
  proteinPer100g: numeric("protein_per_100g", { precision: 8, scale: 2 }),
  carbsPer100g: numeric("carbs_per_100g", { precision: 8, scale: 2 }),
  fatPer100g: numeric("fat_per_100g", { precision: 8, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// =====================================================================
// DAILY REQUIREMENTS — nutrients
// =====================================================================

export const nutrients = pgTable(
  "nutrients",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(), // 'protein', 'vitamin-d', ...
    name: text("name").notNull(),
    unit: text("unit").notNull(), // 'g', 'mg', 'mcg', 'L', 'hrs', 'kcal'
    importance: integer("importance").notNull(), // 1–5 stars
    requiresBodyMetrics: boolean("requires_body_metrics").notNull().default(false),
    usesWeight: boolean("uses_weight").notNull().default(false),
    usesHeight: boolean("uses_height").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    check("importance_range", sql`${table.importance} >= 1 AND ${table.importance} <= 5`),
  ]
);

// what it does — bullet points, ordered
export const nutrientPoints = pgTable("nutrient_points", {
  id: serial("id").primaryKey(),
  nutrientId: integer("nutrient_id")
    .notNull()
    .references(() => nutrients.id, { onDelete: "cascade" }),
  point: text("point").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const nutrientSourceTypeEnum = pgEnum("nutrient_source_type", ["food", "reference"]);

// where to get it — food sources / reference links, ordered
export const nutrientSources = pgTable(
  "nutrient_sources",
  {
    id: serial("id").primaryKey(),
    nutrientId: integer("nutrient_id")
      .notNull()
      .references(() => nutrients.id, { onDelete: "cascade" }),
    sourceType: nutrientSourceTypeEnum("source_type").notNull().default("reference"),

    // populated when sourceType = 'food' — the "Chicken, 1kg → 200g protein" case
    foodId: integer("food_id").references(() => foods.id, { onDelete: "cascade" }),
    foodAmount: numeric("food_amount", { precision: 10, scale: 3 }), // e.g. 1
    foodUnit: text("food_unit"), // e.g. "kg", "piece"
    nutrientAmount: numeric("nutrient_amount", { precision: 10, scale: 3 }), // e.g. 200
    nutrientUnit: text("nutrient_unit"), // e.g. "g"

    // populated when sourceType = 'reference' — the "Consistent sleep schedule" case
    name: text("name"),
    description: text("description"),
    url: text("url"),

    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    check(
      "food_fields_when_food",
      sql`${table.sourceType} <> 'food' OR (
        ${table.foodId} IS NOT NULL AND ${table.foodAmount} IS NOT NULL AND
        ${table.foodUnit} IS NOT NULL AND ${table.nutrientAmount} IS NOT NULL AND
        ${table.nutrientUnit} IS NOT NULL
      )`
    ),
    check(
      "name_when_reference",
      sql`${table.sourceType} <> 'reference' OR ${table.name} IS NOT NULL`
    ),
  ]
);

// the actual requirement value per (nutrient, body type, age bracket, metric type)
export const nutrientRequirements = pgTable(
  "nutrient_requirements",
  {
    id: serial("id").primaryKey(),
    nutrientId: integer("nutrient_id")
      .notNull()
      .references(() => nutrients.id, { onDelete: "cascade" }),
    bodyTypeId: integer("body_type_id")
      .notNull()
      .references(() => bodyTypes.id, { onDelete: "cascade" }),
    ageBracketId: integer("age_bracket_id")
      .notNull()
      .references(() => ageBrackets.id, { onDelete: "cascade" }),
    metricType: nutrientMetricTypeEnum("metric_type").notNull().default("daily_intake"),
    valueType: nutrientValueTypeEnum("value_type").notNull().default("fixed"),
    // for 'fixed'/'range': the value (or range lower bound) in metricUnit
    // for 'coefficient_per_kg'/'coefficient_per_cm': the multiplier
    minValue: numeric("min_value", { precision: 10, scale: 3 }).notNull(),
    // only used for 'range' (e.g. sleep 7–9 hrs)
    maxValue: numeric("max_value", { precision: 10, scale: 3 }),
    // usually same as nutrients.unit, but body-store can differ from daily_intake's unit
    metricUnit: text("metric_unit").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("nutrient_requirement_unique").on(
      table.nutrientId,
      table.bodyTypeId,
      table.ageBracketId,
      table.metricType
    ),
  ]
);

// =====================================================================
// COMMUNITIES — groups that post recipes together (e.g. a family)
// =====================================================================

// public: anyone can view and join. private: hidden from browse/search,
// only active members can see anything inside; join by invite or approval.
export const communityVisibilityEnum = pgEnum("community_visibility", ["public", "private"]);

export const communityRoleEnum = pgEnum("community_role", ["owner", "member"]);

// 'pending' = asked to join a private community, waiting on the owner
export const communityMemberStatusEnum = pgEnum("community_member_status", ["pending", "active"]);

export const communities = pgTable(
  "communities",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    visibility: communityVisibilityEnum("visibility").notNull().default("public"),
    // shareable invite link token; null = invites off
    inviteCode: text("invite_code").unique(),
    // the owner also gets a community_members row with role 'owner'
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("communities_visibility_idx").on(table.visibility)]
);

export const communityMembers = pgTable(
  "community_members",
  {
    id: serial("id").primaryKey(),
    communityId: integer("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: communityRoleEnum("role").notNull().default("member"),
    status: communityMemberStatusEnum("status").notNull().default("active"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("community_member_unique").on(table.communityId, table.userId),
    index("community_members_user_idx").on(table.userId),
  ]
);

// "Chicken Biryani", "Dal", "Pickles" — scoped to one community so private
// groups never share (or leak) dish names. Recipes group under these.
export const dishes = pgTable(
  "dishes",
  {
    id: serial("id").primaryKey(),
    communityId: integer("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("dish_community_slug_unique").on(table.communityId, table.slug)]
);

// =====================================================================
// RECIPES
// =====================================================================

export const recipeDifficultyEnum = pgEnum("recipe_difficulty", ["easy", "medium", "hard"]);

// private: author only. community: active members of recipes.communityId.
// public: anyone. (A private community caps its recipes at 'community' —
// enforced in app code, since it depends on the community's visibility.)
export const recipeVisibilityEnum = pgEnum("recipe_visibility", ["private", "community", "public"]);

export const recipes = pgTable(
  "recipes",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    // null = standalone recipe (only 'private' or 'public')
    communityId: integer("community_id").references(() => communities.id, { onDelete: "cascade" }),
    // optional grouping inside the community; a dish only ever belongs to one community
    dishId: integer("dish_id").references(() => dishes.id, { onDelete: "set null" }),
    // existing recipes are backfilled as 'public' via the default
    visibility: recipeVisibilityEnum("visibility").notNull().default("public"),
    name: text("name").notNull(),
    description: text("description").notNull(),
    imageUrl: text("image_url"),
    videoUrl: text("video_url"), // e.g. a YouTube link
    voiceNoteUrl: text("voice_note_url"), // optional spoken walkthrough recorded by the author
    externalUrl: text("external_url"), // e.g. original source link
    prepTimeMinutes: integer("prep_time_minutes"),
    difficulty: recipeDifficultyEnum("difficulty"),
    cuisine: text("cuisine"),
    servings: integer("servings"),
    // denormalized so sorting/displaying rating doesn't need a join+aggregate
    // on every list request — recomputed in db/recipes.ts whenever a rating changes
    avgRating: numeric("avg_rating", { precision: 3, scale: 2 }).notNull().default("0"),
    ratingCount: integer("rating_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("recipes_community_idx").on(table.communityId),
    index("recipes_dish_idx").on(table.dishId),
    index("recipes_visibility_idx").on(table.visibility),
    // a 'community' recipe with no community would be visible to nobody
    check(
      "community_visibility_needs_community",
      sql`${table.visibility} <> 'community' OR ${table.communityId} IS NOT NULL`
    ),
  ]
);

export const recipeIngredients = pgTable("recipe_ingredients", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  foodId: integer("food_id")
    .notNull()
    .references(() => foods.id, { onDelete: "restrict" }),
  amount: numeric("amount", { precision: 8, scale: 2 }).notNull(),
  unit: text("unit").notNull(), // 'g', 'ml', 'tsp', 'tbsp', 'cup', 'piece'
  sortOrder: integer("sort_order").notNull().default(0),
});

export const recipeSteps = pgTable("recipe_steps", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  stepNumber: integer("step_number").notNull(),
  instruction: text("instruction").notNull(),
  imageUrl: text("image_url"),
});

export const recipeRatings = pgTable(
  "recipe_ratings",
  {
    id: serial("id").primaryKey(),
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    stars: integer("stars").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("recipe_rating_unique").on(table.recipeId, table.userId),
    check("stars_range", sql`${table.stars} >= 1 AND ${table.stars} <= 5`),
  ]
);

// =====================================================================
// WORKOUT PLANNER — per-user calendar entries
// =====================================================================

export const workoutCategoryEnum = pgEnum("workout_category", [
  "exercise",
  "martial_arts",
  "cardio",
  "mobility",
]);

// Icons a user creates themselves (name + symbol + red shade). The four built-in
// icons are not rows here — they live in the app and are referenced by `category`.
export const workoutTypes = pgTable(
  "workout_types",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    glyph: text("glyph").notNull(), // key into src/lib/workout-glyphs.ts
    shade: text("shade").notNull(), // key into src/lib/workout-glyphs.ts
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("workout_types_user_idx").on(table.userId)]
);

export const workoutEntries = pgTable(
  "workout_entries",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // plain "YYYY-MM-DD" string — a calendar day, no timezone shifting
    date: date("date", { mode: "string" }).notNull(),
    // exactly one of category (built-in icon) / typeId (custom icon) is set
    category: workoutCategoryEnum("category"),
    typeId: integer("type_id").references(() => workoutTypes.id, { onDelete: "cascade" }),
    title: text("title"),
    notes: text("notes"),
    // minutes from midnight (0–1439); null = planned for the day with no set time
    startMinutes: integer("start_minutes"),
    durationMinutes: integer("duration_minutes").notNull().default(60),
    // ticked off once the workout has been done
    completed: boolean("completed").notNull().default(false),
    // workouts created by "Repeat" share a series id (a random UUID); null = a one-off
    seriesId: text("series_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("workout_entries_user_date_idx").on(table.userId, table.date),
    index("workout_entries_type_idx").on(table.typeId),
    index("workout_entries_series_idx").on(table.seriesId),
    check("workout_one_icon", sql`(${table.category} IS NULL) <> (${table.typeId} IS NULL)`),
    check(
      "workout_start_minutes_range",
      sql`${table.startMinutes} IS NULL OR (${table.startMinutes} >= 0 AND ${table.startMinutes} < 1440)`
    ),
    check(
      "workout_duration_range",
      sql`${table.durationMinutes} >= 5 AND ${table.durationMinutes} <= 720`
    ),
  ]
);

// =====================================================================
// MEAL PLANNER — recipes a user has placed on their weekly calendar
// =====================================================================

export const mealSlotEnum = pgEnum("meal_slot", ["breakfast", "lunch", "dinner", "snack"]);

export const mealPlanEntries = pgTable(
  "meal_plan_entries",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // deleting a recipe removes it from everyone's plan
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    // plain "YYYY-MM-DD" string — a calendar day, no timezone shifting
    date: date("date", { mode: "string" }).notNull(),
    slot: mealSlotEnum("slot").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("meal_plan_user_date_idx").on(table.userId, table.date),
    index("meal_plan_recipe_idx").on(table.recipeId),
  ]
);

// A user's bookmarks of other people's recipes: shown in "My recipes -> Saved"
// and offered in the meal planner. Losing access to a recipe hides it, not the bookmark.
export const savedRecipes = pgTable(
  "saved_recipes",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("saved_recipe_unique").on(table.userId, table.recipeId),
    index("saved_recipes_user_idx").on(table.userId),
  ]
);

// "Cook log": one row each time a user makes a dish. Private to the user who wrote it,
// so someone who saved another author's recipe keeps their own history of it.
export const recipeCookLogs = pgTable(
  "recipe_cook_logs",
  {
    id: serial("id").primaryKey(),
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // the day it was cooked (plain YYYY-MM-DD), separate from when the row was written
    cookedOn: date("cooked_on", { mode: "string" }).notNull(),
    photoUrl: text("photo_url"),
    notes: text("notes"),
    audioUrl: text("audio_url"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("cook_logs_user_recipe_idx").on(table.userId, table.recipeId, table.cookedOn),
    // a log needs at least something in it
    check(
      "cook_log_not_empty",
      sql`${table.photoUrl} IS NOT NULL OR ${table.notes} IS NOT NULL OR ${table.audioUrl} IS NOT NULL`
    ),
  ]
);

// =====================================================================
// RELATIONS
// =====================================================================

// ---------- daily requirements ----------

export const bodyTypesRelations = relations(bodyTypes, ({ many }) => ({
  requirements: many(nutrientRequirements),
}));

export const ageBracketsRelations = relations(ageBrackets, ({ many }) => ({
  requirements: many(nutrientRequirements),
}));

export const nutrientsRelations = relations(nutrients, ({ many }) => ({
  requirements: many(nutrientRequirements),
  points: many(nutrientPoints),
  sources: many(nutrientSources),
}));

export const nutrientRequirementsRelations = relations(nutrientRequirements, ({ one }) => ({
  nutrient: one(nutrients, {
    fields: [nutrientRequirements.nutrientId],
    references: [nutrients.id],
  }),
  bodyType: one(bodyTypes, {
    fields: [nutrientRequirements.bodyTypeId],
    references: [bodyTypes.id],
  }),
  ageBracket: one(ageBrackets, {
    fields: [nutrientRequirements.ageBracketId],
    references: [ageBrackets.id],
  }),
}));

export const nutrientPointsRelations = relations(nutrientPoints, ({ one }) => ({
  nutrient: one(nutrients, {
    fields: [nutrientPoints.nutrientId],
    references: [nutrients.id],
  }),
}));

export const nutrientSourcesRelations = relations(nutrientSources, ({ one }) => ({
  nutrient: one(nutrients, {
    fields: [nutrientSources.nutrientId],
    references: [nutrients.id],
  }),
  food: one(foods, {
    fields: [nutrientSources.foodId],
    references: [foods.id],
  }),
}));

// ---------- foods (used by both features) ----------

export const foodsRelations = relations(foods, ({ many }) => ({
  nutrientSources: many(nutrientSources),
  recipeIngredients: many(recipeIngredients),
}));

// ---------- communities ----------

export const communitiesRelations = relations(communities, ({ one, many }) => ({
  owner: one(user, { fields: [communities.ownerId], references: [user.id] }),
  members: many(communityMembers),
  dishes: many(dishes),
  recipes: many(recipes),
}));

export const communityMembersRelations = relations(communityMembers, ({ one }) => ({
  community: one(communities, {
    fields: [communityMembers.communityId],
    references: [communities.id],
  }),
  user: one(user, { fields: [communityMembers.userId], references: [user.id] }),
}));

export const dishesRelations = relations(dishes, ({ one, many }) => ({
  community: one(communities, { fields: [dishes.communityId], references: [communities.id] }),
  recipes: many(recipes),
}));

// ---------- recipes ----------

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  author: one(user, { fields: [recipes.authorId], references: [user.id] }),
  community: one(communities, { fields: [recipes.communityId], references: [communities.id] }),
  dish: one(dishes, { fields: [recipes.dishId], references: [dishes.id] }),
  ingredients: many(recipeIngredients),
  steps: many(recipeSteps),
  ratings: many(recipeRatings),
}));

export const recipeIngredientsRelations = relations(recipeIngredients, ({ one }) => ({
  recipe: one(recipes, { fields: [recipeIngredients.recipeId], references: [recipes.id] }),
  food: one(foods, { fields: [recipeIngredients.foodId], references: [foods.id] }),
}));

export const recipeStepsRelations = relations(recipeSteps, ({ one }) => ({
  recipe: one(recipes, { fields: [recipeSteps.recipeId], references: [recipes.id] }),
}));

export const recipeRatingsRelations = relations(recipeRatings, ({ one }) => ({
  recipe: one(recipes, { fields: [recipeRatings.recipeId], references: [recipes.id] }),
  user: one(user, { fields: [recipeRatings.userId], references: [user.id] }),
}));

export const savedRecipesRelations = relations(savedRecipes, ({ one }) => ({
  recipe: one(recipes, { fields: [savedRecipes.recipeId], references: [recipes.id] }),
  user: one(user, { fields: [savedRecipes.userId], references: [user.id] }),
}));

export const recipeCookLogsRelations = relations(recipeCookLogs, ({ one }) => ({
  recipe: one(recipes, { fields: [recipeCookLogs.recipeId], references: [recipes.id] }),
  user: one(user, { fields: [recipeCookLogs.userId], references: [user.id] }),
}));
