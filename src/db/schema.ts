import { pgTable, serial, text, integer, varchar, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------- WORKOUTS ----------
export const muscleGroups = pgTable("muscle_groups", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // e.g. "Chest", "Back"
  slug: varchar("slug", { length: 100 }).notNull().unique(),
});

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  slug: varchar("slug", { length: 150 }).notNull().unique(),
  muscleGroupId: integer("muscle_group_id").references(() => muscleGroups.id).notNull(),
  description: text("description"),
  videoLink: text("video_link"),
  recommendedSets: integer("recommended_sets"),
  recommendedReps: varchar("recommended_reps", { length: 50 }), // "8-12" as a range
});

export const workoutPlans = pgTable("workout_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  slug: varchar("slug", { length: 150 }).notNull().unique(),
  goal: varchar("goal", { length: 100 }), // "Muscle Gain", "Fat Loss", "Strength"
  description: text("description"),
});

export const planExercises = pgTable("plan_exercises", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").references(() => workoutPlans.id).notNull(),
  exerciseId: integer("exercise_id").references(() => exercises.id).notNull(),
  dayNumber: integer("day_number"), // which day in the plan
  order: integer("order"), // order within that day
});

// ---------- DAILY BODY REQUIREMENTS ----------
export const nutrients = pgTable("nutrients", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // "Vitamin D", "Protein"
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  whyNeeded: text("why_needed"),
  dailyRequirement: varchar("daily_requirement", { length: 100 }), // "600 IU/day"
  foodSources: text("food_sources"), // could normalize later if needed
});

// ---------- RECIPES ----------
export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 150 }).notNull(),
  slug: varchar("slug", { length: 150 }).notNull().unique(),
  ingredients: text("ingredients").notNull(), // store as JSON string or newline-separated
  steps: text("steps").notNull(),
  imageUrl: text("image_url"),
  prepTimeMinutes: integer("prep_time_minutes"),
  tags: varchar("tags", { length: 255 }), // comma-separated: "high-protein,vegan"
  createdAt: timestamp("created_at").defaultNow(),
});

// ---------- RELATIONS ----------
export const muscleGroupsRelations = relations(muscleGroups, ({ many }) => ({
  exercises: many(exercises),
}));

export const exercisesRelations = relations(exercises, ({ one, many }) => ({
  muscleGroup: one(muscleGroups, { fields: [exercises.muscleGroupId], references: [muscleGroups.id] }),
  planExercises: many(planExercises),
}));

export const workoutPlansRelations = relations(workoutPlans, ({ many }) => ({
  planExercises: many(planExercises),
}));

export const planExercisesRelations = relations(planExercises, ({ one }) => ({
  plan: one(workoutPlans, { fields: [planExercises.planId], references: [workoutPlans.id] }),
  exercise: one(exercises, { fields: [planExercises.exerciseId], references: [exercises.id] }),
}));