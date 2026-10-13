import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { relations, sql } from "drizzle-orm";
import { boolean, check, index, integer, numeric, pgEnum, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
//#region src/db/schema.ts
var schema_exports = /* @__PURE__ */ __exportAll({
	account: () => account,
	ageBrackets: () => ageBrackets,
	ageBracketsRelations: () => ageBracketsRelations,
	bodyTypes: () => bodyTypes,
	bodyTypesRelations: () => bodyTypesRelations,
	communities: () => communities,
	communitiesRelations: () => communitiesRelations,
	communityMemberStatusEnum: () => communityMemberStatusEnum,
	communityMembers: () => communityMembers,
	communityMembersRelations: () => communityMembersRelations,
	communityRoleEnum: () => communityRoleEnum,
	communityVisibilityEnum: () => communityVisibilityEnum,
	dishes: () => dishes,
	dishesRelations: () => dishesRelations,
	foods: () => foods,
	foodsRelations: () => foodsRelations,
	nutrientMetricTypeEnum: () => nutrientMetricTypeEnum,
	nutrientPoints: () => nutrientPoints,
	nutrientPointsRelations: () => nutrientPointsRelations,
	nutrientRequirements: () => nutrientRequirements,
	nutrientRequirementsRelations: () => nutrientRequirementsRelations,
	nutrientSourceTypeEnum: () => nutrientSourceTypeEnum,
	nutrientSources: () => nutrientSources,
	nutrientSourcesRelations: () => nutrientSourcesRelations,
	nutrientValueTypeEnum: () => nutrientValueTypeEnum,
	nutrients: () => nutrients,
	nutrientsRelations: () => nutrientsRelations,
	recipeDifficultyEnum: () => recipeDifficultyEnum,
	recipeIngredients: () => recipeIngredients,
	recipeIngredientsRelations: () => recipeIngredientsRelations,
	recipeRatings: () => recipeRatings,
	recipeRatingsRelations: () => recipeRatingsRelations,
	recipeSteps: () => recipeSteps,
	recipeStepsRelations: () => recipeStepsRelations,
	recipeVisibilityEnum: () => recipeVisibilityEnum,
	recipes: () => recipes,
	recipesRelations: () => recipesRelations,
	session: () => session,
	user: () => user,
	verification: () => verification
});
var user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").notNull().default(false),
	image: text("image"),
	banner: text("banner"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expires_at").notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" })
});
var account = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow()
});
var bodyTypes = pgTable("body_types", {
	id: serial("id").primaryKey(),
	slug: text("slug").notNull().unique(),
	label: text("label").notNull(),
	sortOrder: integer("sort_order").notNull().default(0),
	createdAt: timestamp("created_at").notNull().defaultNow()
});
var ageBrackets = pgTable("age_brackets", {
	id: serial("id").primaryKey(),
	slug: text("slug").notNull().unique(),
	label: text("label").notNull(),
	minAge: integer("min_age").notNull(),
	maxAge: integer("max_age").notNull(),
	sortOrder: integer("sort_order").notNull().default(0),
	createdAt: timestamp("created_at").notNull().defaultNow()
});
var nutrientValueTypeEnum = pgEnum("nutrient_value_type", [
	"fixed",
	"range",
	"coefficient_per_kg",
	"coefficient_per_cm"
]);
var nutrientMetricTypeEnum = pgEnum("nutrient_metric_type", ["daily_intake", "body_store"]);
var foods = pgTable("foods", {
	id: serial("id").primaryKey(),
	slug: text("slug").notNull().unique(),
	name: text("name").notNull(),
	caloriesPer100g: numeric("calories_per_100g", {
		precision: 8,
		scale: 2
	}),
	proteinPer100g: numeric("protein_per_100g", {
		precision: 8,
		scale: 2
	}),
	carbsPer100g: numeric("carbs_per_100g", {
		precision: 8,
		scale: 2
	}),
	fatPer100g: numeric("fat_per_100g", {
		precision: 8,
		scale: 2
	}),
	createdAt: timestamp("created_at").notNull().defaultNow()
});
var nutrients = pgTable("nutrients", {
	id: serial("id").primaryKey(),
	slug: text("slug").notNull().unique(),
	name: text("name").notNull(),
	unit: text("unit").notNull(),
	importance: integer("importance").notNull(),
	requiresBodyMetrics: boolean("requires_body_metrics").notNull().default(false),
	usesWeight: boolean("uses_weight").notNull().default(false),
	usesHeight: boolean("uses_height").notNull().default(false),
	sortOrder: integer("sort_order").notNull().default(0),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => [check("importance_range", sql`${table.importance} >= 1 AND ${table.importance} <= 5`)]);
var nutrientPoints = pgTable("nutrient_points", {
	id: serial("id").primaryKey(),
	nutrientId: integer("nutrient_id").notNull().references(() => nutrients.id, { onDelete: "cascade" }),
	point: text("point").notNull(),
	sortOrder: integer("sort_order").notNull().default(0)
});
var nutrientSourceTypeEnum = pgEnum("nutrient_source_type", ["food", "reference"]);
var nutrientSources = pgTable("nutrient_sources", {
	id: serial("id").primaryKey(),
	nutrientId: integer("nutrient_id").notNull().references(() => nutrients.id, { onDelete: "cascade" }),
	sourceType: nutrientSourceTypeEnum("source_type").notNull().default("reference"),
	foodId: integer("food_id").references(() => foods.id, { onDelete: "cascade" }),
	foodAmount: numeric("food_amount", {
		precision: 10,
		scale: 3
	}),
	foodUnit: text("food_unit"),
	nutrientAmount: numeric("nutrient_amount", {
		precision: 10,
		scale: 3
	}),
	nutrientUnit: text("nutrient_unit"),
	name: text("name"),
	description: text("description"),
	url: text("url"),
	sortOrder: integer("sort_order").notNull().default(0),
	createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => [check("food_fields_when_food", sql`${table.sourceType} <> 'food' OR (
        ${table.foodId} IS NOT NULL AND ${table.foodAmount} IS NOT NULL AND
        ${table.foodUnit} IS NOT NULL AND ${table.nutrientAmount} IS NOT NULL AND
        ${table.nutrientUnit} IS NOT NULL
      )`), check("name_when_reference", sql`${table.sourceType} <> 'reference' OR ${table.name} IS NOT NULL`)]);
var nutrientRequirements = pgTable("nutrient_requirements", {
	id: serial("id").primaryKey(),
	nutrientId: integer("nutrient_id").notNull().references(() => nutrients.id, { onDelete: "cascade" }),
	bodyTypeId: integer("body_type_id").notNull().references(() => bodyTypes.id, { onDelete: "cascade" }),
	ageBracketId: integer("age_bracket_id").notNull().references(() => ageBrackets.id, { onDelete: "cascade" }),
	metricType: nutrientMetricTypeEnum("metric_type").notNull().default("daily_intake"),
	valueType: nutrientValueTypeEnum("value_type").notNull().default("fixed"),
	minValue: numeric("min_value", {
		precision: 10,
		scale: 3
	}).notNull(),
	maxValue: numeric("max_value", {
		precision: 10,
		scale: 3
	}),
	metricUnit: text("metric_unit").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => [uniqueIndex("nutrient_requirement_unique").on(table.nutrientId, table.bodyTypeId, table.ageBracketId, table.metricType)]);
var communityVisibilityEnum = pgEnum("community_visibility", ["public", "private"]);
var communityRoleEnum = pgEnum("community_role", ["owner", "member"]);
var communityMemberStatusEnum = pgEnum("community_member_status", ["pending", "active"]);
var communities = pgTable("communities", {
	id: serial("id").primaryKey(),
	slug: text("slug").notNull().unique(),
	name: text("name").notNull(),
	description: text("description"),
	imageUrl: text("image_url"),
	visibility: communityVisibilityEnum("visibility").notNull().default("public"),
	inviteCode: text("invite_code").unique(),
	ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "restrict" }),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => [index("communities_visibility_idx").on(table.visibility)]);
var communityMembers = pgTable("community_members", {
	id: serial("id").primaryKey(),
	communityId: integer("community_id").notNull().references(() => communities.id, { onDelete: "cascade" }),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	role: communityRoleEnum("role").notNull().default("member"),
	status: communityMemberStatusEnum("status").notNull().default("active"),
	joinedAt: timestamp("joined_at").notNull().defaultNow()
}, (table) => [uniqueIndex("community_member_unique").on(table.communityId, table.userId), index("community_members_user_idx").on(table.userId)]);
var dishes = pgTable("dishes", {
	id: serial("id").primaryKey(),
	communityId: integer("community_id").notNull().references(() => communities.id, { onDelete: "cascade" }),
	slug: text("slug").notNull(),
	name: text("name").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => [uniqueIndex("dish_community_slug_unique").on(table.communityId, table.slug)]);
var recipeDifficultyEnum = pgEnum("recipe_difficulty", [
	"easy",
	"medium",
	"hard"
]);
var recipeVisibilityEnum = pgEnum("recipe_visibility", [
	"private",
	"community",
	"public"
]);
var recipes = pgTable("recipes", {
	id: serial("id").primaryKey(),
	slug: text("slug").notNull().unique(),
	authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
	communityId: integer("community_id").references(() => communities.id, { onDelete: "cascade" }),
	dishId: integer("dish_id").references(() => dishes.id, { onDelete: "set null" }),
	visibility: recipeVisibilityEnum("visibility").notNull().default("public"),
	name: text("name").notNull(),
	description: text("description").notNull(),
	imageUrl: text("image_url"),
	videoUrl: text("video_url"),
	externalUrl: text("external_url"),
	prepTimeMinutes: integer("prep_time_minutes"),
	difficulty: recipeDifficultyEnum("difficulty"),
	cuisine: text("cuisine"),
	servings: integer("servings"),
	avgRating: numeric("avg_rating", {
		precision: 3,
		scale: 2
	}).notNull().default("0"),
	ratingCount: integer("rating_count").notNull().default(0),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => [
	index("recipes_community_idx").on(table.communityId),
	index("recipes_dish_idx").on(table.dishId),
	index("recipes_visibility_idx").on(table.visibility),
	check("community_visibility_needs_community", sql`${table.visibility} <> 'community' OR ${table.communityId} IS NOT NULL`)
]);
var recipeIngredients = pgTable("recipe_ingredients", {
	id: serial("id").primaryKey(),
	recipeId: integer("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
	foodId: integer("food_id").notNull().references(() => foods.id, { onDelete: "restrict" }),
	amount: numeric("amount", {
		precision: 8,
		scale: 2
	}).notNull(),
	unit: text("unit").notNull(),
	sortOrder: integer("sort_order").notNull().default(0)
});
var recipeSteps = pgTable("recipe_steps", {
	id: serial("id").primaryKey(),
	recipeId: integer("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
	stepNumber: integer("step_number").notNull(),
	instruction: text("instruction").notNull(),
	imageUrl: text("image_url")
});
var recipeRatings = pgTable("recipe_ratings", {
	id: serial("id").primaryKey(),
	recipeId: integer("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	stars: integer("stars").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => [uniqueIndex("recipe_rating_unique").on(table.recipeId, table.userId), check("stars_range", sql`${table.stars} >= 1 AND ${table.stars} <= 5`)]);
var bodyTypesRelations = relations(bodyTypes, ({ many }) => ({ requirements: many(nutrientRequirements) }));
var ageBracketsRelations = relations(ageBrackets, ({ many }) => ({ requirements: many(nutrientRequirements) }));
var nutrientsRelations = relations(nutrients, ({ many }) => ({
	requirements: many(nutrientRequirements),
	points: many(nutrientPoints),
	sources: many(nutrientSources)
}));
var nutrientRequirementsRelations = relations(nutrientRequirements, ({ one }) => ({
	nutrient: one(nutrients, {
		fields: [nutrientRequirements.nutrientId],
		references: [nutrients.id]
	}),
	bodyType: one(bodyTypes, {
		fields: [nutrientRequirements.bodyTypeId],
		references: [bodyTypes.id]
	}),
	ageBracket: one(ageBrackets, {
		fields: [nutrientRequirements.ageBracketId],
		references: [ageBrackets.id]
	})
}));
var nutrientPointsRelations = relations(nutrientPoints, ({ one }) => ({ nutrient: one(nutrients, {
	fields: [nutrientPoints.nutrientId],
	references: [nutrients.id]
}) }));
var nutrientSourcesRelations = relations(nutrientSources, ({ one }) => ({
	nutrient: one(nutrients, {
		fields: [nutrientSources.nutrientId],
		references: [nutrients.id]
	}),
	food: one(foods, {
		fields: [nutrientSources.foodId],
		references: [foods.id]
	})
}));
var foodsRelations = relations(foods, ({ many }) => ({
	nutrientSources: many(nutrientSources),
	recipeIngredients: many(recipeIngredients)
}));
var communitiesRelations = relations(communities, ({ one, many }) => ({
	owner: one(user, {
		fields: [communities.ownerId],
		references: [user.id]
	}),
	members: many(communityMembers),
	dishes: many(dishes),
	recipes: many(recipes)
}));
var communityMembersRelations = relations(communityMembers, ({ one }) => ({
	community: one(communities, {
		fields: [communityMembers.communityId],
		references: [communities.id]
	}),
	user: one(user, {
		fields: [communityMembers.userId],
		references: [user.id]
	})
}));
var dishesRelations = relations(dishes, ({ one, many }) => ({
	community: one(communities, {
		fields: [dishes.communityId],
		references: [communities.id]
	}),
	recipes: many(recipes)
}));
var recipesRelations = relations(recipes, ({ one, many }) => ({
	author: one(user, {
		fields: [recipes.authorId],
		references: [user.id]
	}),
	community: one(communities, {
		fields: [recipes.communityId],
		references: [communities.id]
	}),
	dish: one(dishes, {
		fields: [recipes.dishId],
		references: [dishes.id]
	}),
	ingredients: many(recipeIngredients),
	steps: many(recipeSteps),
	ratings: many(recipeRatings)
}));
var recipeIngredientsRelations = relations(recipeIngredients, ({ one }) => ({
	recipe: one(recipes, {
		fields: [recipeIngredients.recipeId],
		references: [recipes.id]
	}),
	food: one(foods, {
		fields: [recipeIngredients.foodId],
		references: [foods.id]
	})
}));
var recipeStepsRelations = relations(recipeSteps, ({ one }) => ({ recipe: one(recipes, {
	fields: [recipeSteps.recipeId],
	references: [recipes.id]
}) }));
var recipeRatingsRelations = relations(recipeRatings, ({ one }) => ({
	recipe: one(recipes, {
		fields: [recipeRatings.recipeId],
		references: [recipes.id]
	}),
	user: one(user, {
		fields: [recipeRatings.userId],
		references: [user.id]
	})
}));
//#endregion
//#region src/db/index.ts
var sql$1 = neon("postgres://x:x@localhost/x");
var db = drizzle(sql$1, { schema: schema_exports });
//#endregion
export { communities as a, foods as c, recipeSteps as d, recipes as f, verification as h, bodyTypes as i, recipeIngredients as l, user as m, account as n, communityMembers as o, session as p, ageBrackets as r, dishes as s, db as t, recipeRatings as u };
