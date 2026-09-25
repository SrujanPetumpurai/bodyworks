import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  pgEnum,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";

// ---------- lookups ----------

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

// ---------- nutrients ----------

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

// where to get it — food sources / reference links, ordered
export const nutrientSources = pgTable("nutrient_sources", {
  id: serial("id").primaryKey(),
  nutrientId: integer("nutrient_id")
    .notNull()
    .references(() => nutrients.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g. "Salmon", "USDA FoodData Central"
  description: text("description"),
  url: text("url"),
  sortOrder: integer("sort_order").notNull().default(0),
});

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

// ---------- relations ----------

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
}));