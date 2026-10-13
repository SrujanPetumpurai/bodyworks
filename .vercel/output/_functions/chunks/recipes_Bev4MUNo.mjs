import { c as foods, d as recipeSteps, f as recipes, l as recipeIngredients, m as user, o as communityMembers, t as db, u as recipeRatings } from "./db_Dofvrqwd.mjs";
import { t as slugify } from "./slug_rs9Vn4o7.mjs";
import { and, eq, inArray, or, sql } from "drizzle-orm";
//#region src/db/recipe-access.ts
async function isActiveMember(communityId, userId) {
	const [row] = await db.select({ id: communityMembers.id }).from(communityMembers).where(and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, userId), eq(communityMembers.status, "active"))).limit(1);
	return !!row;
}
async function canViewRecipe(recipe, viewerId) {
	if (recipe.visibility === "public") return true;
	if (!viewerId) return false;
	if (recipe.authorId === viewerId) return true;
	if (recipe.visibility === "community" && recipe.communityId !== null) return isActiveMember(recipe.communityId, viewerId);
	return false;
}
function recipeVisibleTo(viewerId) {
	if (!viewerId) return eq(recipes.visibility, "public");
	const activeCommunityIds = db.select({ id: communityMembers.communityId }).from(communityMembers).where(and(eq(communityMembers.userId, viewerId), eq(communityMembers.status, "active")));
	return or(eq(recipes.visibility, "public"), eq(recipes.authorId, viewerId), and(eq(recipes.visibility, "community"), inArray(recipes.communityId, activeCommunityIds))) ?? sql`false`;
}
//#endregion
//#region src/db/recipes.ts
async function listRecipes(opts = {}) {
	const { viewerId, ingredientSlugs, authorId, communityId } = opts;
	const rows = await db.query.recipes.findMany({
		where: and(recipeVisibleTo(viewerId), authorId ? eq(recipes.authorId, authorId) : void 0, communityId !== void 0 ? eq(recipes.communityId, communityId) : void 0),
		orderBy: (r, { desc }) => desc(r.createdAt),
		with: {
			author: true,
			dish: true,
			ingredients: {
				with: { food: true },
				orderBy: (ri, { asc }) => asc(ri.sortOrder)
			}
		}
	});
	const wanted = ingredientSlugs?.filter(Boolean) ?? [];
	return (wanted.length === 0 ? rows : rows.filter((r) => {
		const have = new Set(r.ingredients.map((ri) => ri.food.slug));
		return wanted.every((slug) => have.has(slug));
	})).map((r) => ({
		slug: r.slug,
		name: r.name,
		description: r.description,
		imageUrl: r.imageUrl,
		cuisine: r.cuisine,
		authorName: r.author?.name ?? null,
		authorImage: r.author?.image ?? null,
		avgRating: Number(r.avgRating),
		ratingCount: r.ratingCount,
		authorId: r.author?.id ?? null,
		ingredientNames: r.ingredients.slice(0, 4).map((ri) => ri.food.name),
		ingredientSlugs: r.ingredients.map((ri) => ri.food.slug),
		createdAt: r.createdAt.toISOString(),
		visibility: r.visibility,
		prepTimeMinutes: r.prepTimeMinutes,
		difficulty: r.difficulty,
		dishId: r.dish?.id ?? null,
		dishName: r.dish?.name ?? null
	}));
}
async function getProfile(id) {
	const [row] = await db.select({
		id: user.id,
		name: user.name,
		image: user.image,
		banner: user.banner,
		joinedAt: user.createdAt
	}).from(user).where(eq(user.id, id)).limit(1);
	return row ?? null;
}
async function getRecipeBySlug(slug, viewerId) {
	const recipe = await db.query.recipes.findFirst({
		where: eq(recipes.slug, slug),
		with: {
			author: { columns: {
				id: true,
				name: true,
				image: true
			} },
			dish: { columns: {
				id: true,
				name: true
			} },
			community: { columns: {
				id: true,
				slug: true,
				name: true
			} },
			ingredients: {
				with: { food: true },
				orderBy: (ri, { asc }) => asc(ri.sortOrder)
			},
			steps: { orderBy: (s, { asc }) => asc(s.stepNumber) }
		}
	});
	if (!recipe || !await canViewRecipe(recipe, viewerId)) return null;
	return recipe;
}
async function rateRecipe(recipeId, userId, stars) {
	await db.insert(recipeRatings).values({
		recipeId,
		userId,
		stars
	}).onConflictDoUpdate({
		target: [recipeRatings.recipeId, recipeRatings.userId],
		set: { stars }
	});
	const [agg] = await db.select({
		avg: sql`avg(${recipeRatings.stars})`,
		count: sql`count(*)`
	}).from(recipeRatings).where(eq(recipeRatings.recipeId, recipeId));
	const avgRating = Number(agg?.avg ?? 0);
	const ratingCount = Number(agg?.count ?? 0);
	await db.update(recipes).set({
		avgRating: avgRating.toFixed(2),
		ratingCount
	}).where(eq(recipes.id, recipeId));
	return {
		avgRating,
		ratingCount
	};
}
async function listFoods() {
	return db.query.foods.findMany({ orderBy: (f, { asc }) => asc(f.name) });
}
var UNITS = [
	"g",
	"ml",
	"tsp",
	"tbsp",
	"cup",
	"piece"
];
var DIFFICULTIES = [
	"easy",
	"medium",
	"hard"
];
async function resolveFoodIds(names) {
	const bySlug = /* @__PURE__ */ new Map();
	for (const n of names) {
		const slug = slugify(n);
		if (!bySlug.has(slug)) bySlug.set(slug, n.trim());
	}
	const slugs = [...bySlug.keys()];
	const missingCheck = await db.select({
		id: foods.id,
		slug: foods.slug
	}).from(foods).where(inArray(foods.slug, slugs));
	const have = new Set(missingCheck.map((f) => f.slug));
	const toCreate = slugs.filter((s) => !have.has(s));
	if (toCreate.length) await db.insert(foods).values(toCreate.map((slug) => ({
		slug,
		name: bySlug.get(slug)
	}))).onConflictDoNothing();
	const all = await db.select({
		id: foods.id,
		slug: foods.slug
	}).from(foods).where(inArray(foods.slug, slugs));
	return new Map(all.map((f) => [f.slug, f.id]));
}
function ingredientRows(recipeId, input, foodIds) {
	return input.ingredients.map((ing, i) => ({
		recipeId,
		foodId: foodIds.get(slugify(ing.name)),
		amount: ing.amount.toFixed(2),
		unit: ing.unit,
		sortOrder: i
	}));
}
function stepRows(recipeId, input) {
	return input.steps.map((instruction, i) => ({
		recipeId,
		stepNumber: i + 1,
		instruction
	}));
}
async function uniqueSlug(name) {
	const base = slugify(name);
	for (let i = 0; i < 20; i++) {
		const candidate = i === 0 ? base : `${base}-${i + 1}`;
		const [hit] = await db.select({ id: recipes.id }).from(recipes).where(eq(recipes.slug, candidate)).limit(1);
		if (!hit) return candidate;
	}
	return `${base}-${Date.now().toString(36)}`;
}
async function createRecipe(authorId, input, placement) {
	const foodIds = await resolveFoodIds(input.ingredients.map((i) => i.name));
	const slug = await uniqueSlug(input.name);
	const [created] = await db.insert(recipes).values({
		slug,
		authorId,
		communityId: placement.communityId,
		dishId: placement.dishId,
		visibility: placement.visibility,
		name: input.name,
		description: input.description,
		imageUrl: input.imageUrl,
		videoUrl: input.videoUrl,
		cuisine: input.cuisine,
		prepTimeMinutes: input.prepTimeMinutes,
		servings: input.servings,
		difficulty: input.difficulty
	}).returning({
		id: recipes.id,
		slug: recipes.slug
	});
	try {
		await db.batch([db.insert(recipeIngredients).values(ingredientRows(created.id, input, foodIds)), db.insert(recipeSteps).values(stepRows(created.id, input))]);
	} catch (err) {
		await db.delete(recipes).where(eq(recipes.id, created.id));
		throw err;
	}
	return created;
}
async function updateRecipe(slug, authorId, input, placement) {
	const [existing] = await db.select({ id: recipes.id }).from(recipes).where(and(eq(recipes.slug, slug), eq(recipes.authorId, authorId))).limit(1);
	if (!existing) return false;
	const foodIds = await resolveFoodIds(input.ingredients.map((i) => i.name));
	await db.batch([
		db.update(recipes).set({
			communityId: placement.communityId,
			dishId: placement.dishId,
			visibility: placement.visibility,
			name: input.name,
			description: input.description,
			imageUrl: input.imageUrl,
			videoUrl: input.videoUrl,
			cuisine: input.cuisine,
			prepTimeMinutes: input.prepTimeMinutes,
			servings: input.servings,
			difficulty: input.difficulty,
			updatedAt: /* @__PURE__ */ new Date()
		}).where(eq(recipes.id, existing.id)),
		db.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, existing.id)),
		db.delete(recipeSteps).where(eq(recipeSteps.recipeId, existing.id)),
		db.insert(recipeIngredients).values(ingredientRows(existing.id, input, foodIds)),
		db.insert(recipeSteps).values(stepRows(existing.id, input))
	]);
	return true;
}
async function deleteRecipe(slug, authorId) {
	return (await db.delete(recipes).where(and(eq(recipes.slug, slug), eq(recipes.authorId, authorId))).returning({ id: recipes.id })).length > 0;
}
async function updateProfile(id, data) {
	await db.update(user).set({
		...data,
		updatedAt: /* @__PURE__ */ new Date()
	}).where(eq(user.id, id));
}
//#endregion
export { getProfile as a, listRecipes as c, updateRecipe as d, deleteRecipe as i, rateRecipe as l, UNITS as n, getRecipeBySlug as o, createRecipe as r, listFoods as s, DIFFICULTIES as t, updateProfile as u };
