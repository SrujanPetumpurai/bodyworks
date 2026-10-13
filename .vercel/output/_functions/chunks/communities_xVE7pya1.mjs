import { a as communities, f as recipes, m as user, o as communityMembers, s as dishes, t as db } from "./db_Dofvrqwd.mjs";
import { t as slugify } from "./slug_rs9Vn4o7.mjs";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
//#region src/db/communities.ts
var newInviteCode = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);
async function getMembership(communityId, userId) {
	const [row] = await db.select({
		role: communityMembers.role,
		status: communityMembers.status
	}).from(communityMembers).where(and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, userId))).limit(1);
	return row ?? null;
}
async function uniqueCommunitySlug(name) {
	const base = slugify(name, "community");
	for (let i = 0; i < 20; i++) {
		const candidate = i === 0 ? base : `${base}-${i + 1}`;
		const [hit] = await db.select({ id: communities.id }).from(communities).where(eq(communities.slug, candidate)).limit(1);
		if (!hit) return candidate;
	}
	return `${base}-${Date.now().toString(36)}`;
}
async function createCommunity(ownerId, input) {
	const slug = await uniqueCommunitySlug(input.name);
	const [created] = await db.insert(communities).values({
		slug,
		name: input.name,
		description: input.description,
		imageUrl: input.imageUrl,
		visibility: input.visibility,
		inviteCode: newInviteCode(),
		ownerId
	}).returning({
		id: communities.id,
		slug: communities.slug
	});
	try {
		await db.insert(communityMembers).values({
			communityId: created.id,
			userId: ownerId,
			role: "owner",
			status: "active"
		});
	} catch (err) {
		await db.delete(communities).where(eq(communities.id, created.id));
		throw err;
	}
	return created;
}
var counts = {
	memberCount: sql`(select count(*) from ${communityMembers} where ${communityMembers.communityId} = ${communities.id} and ${communityMembers.status} = 'active')`.mapWith(Number),
	recipeCount: sql`(select count(*) from ${recipes} where ${recipes.communityId} = ${communities.id} and ${recipes.visibility} <> 'private')`.mapWith(Number)
};
var summaryCols = {
	slug: communities.slug,
	name: communities.name,
	description: communities.description,
	imageUrl: communities.imageUrl,
	visibility: communities.visibility,
	...counts
};
async function listPublicCommunities(search) {
	const q = search?.trim();
	return db.select(summaryCols).from(communities).where(and(eq(communities.visibility, "public"), q ? ilike(communities.name, `%${q.replace(/[%_]/g, "")}%`) : void 0)).orderBy(desc(counts.memberCount), desc(communities.createdAt)).limit(60);
}
async function listMyCommunities(userId) {
	return db.select(summaryCols).from(communities).innerJoin(communityMembers, and(eq(communityMembers.communityId, communities.id), eq(communityMembers.userId, userId), eq(communityMembers.status, "active"))).orderBy(communities.name);
}
async function getCommunityForViewer(slug, viewerId) {
	const [c] = await db.select().from(communities).where(eq(communities.slug, slug)).limit(1);
	if (!c) return null;
	const membership = viewerId ? await getMembership(c.id, viewerId) : null;
	const isMember = membership?.status === "active";
	if (c.visibility === "private" && !isMember) return null;
	const [owner] = await db.select({
		id: user.id,
		name: user.name
	}).from(user).where(eq(user.id, c.ownerId)).limit(1);
	const [{ n }] = await db.select({ n: sql`count(*)`.mapWith(Number) }).from(communityMembers).where(and(eq(communityMembers.communityId, c.id), eq(communityMembers.status, "active")));
	return {
		id: c.id,
		slug: c.slug,
		name: c.name,
		description: c.description,
		imageUrl: c.imageUrl,
		visibility: c.visibility,
		owner: owner ?? null,
		memberCount: n,
		isMember,
		isOwner: membership?.role === "owner" && isMember,
		inviteCode: membership?.role === "owner" && isMember ? c.inviteCode : null
	};
}
async function getCommunityByInvite(code) {
	const [c] = await db.select({
		id: communities.id,
		slug: communities.slug,
		name: communities.name,
		description: communities.description,
		visibility: communities.visibility
	}).from(communities).where(eq(communities.inviteCode, code)).limit(1);
	return c ?? null;
}
async function addMember(communityId, userId) {
	await db.insert(communityMembers).values({
		communityId,
		userId,
		role: "member",
		status: "active"
	}).onConflictDoUpdate({
		target: [communityMembers.communityId, communityMembers.userId],
		set: { status: "active" },
		setWhere: eq(communityMembers.role, "member")
	});
}
async function joinPublicCommunity(slug, userId) {
	const [c] = await db.select({
		id: communities.id,
		visibility: communities.visibility
	}).from(communities).where(eq(communities.slug, slug)).limit(1);
	if (!c || c.visibility !== "public") return false;
	await addMember(c.id, userId);
	return true;
}
async function joinByInvite(code, userId) {
	const c = await getCommunityByInvite(code);
	if (!c) return null;
	await addMember(c.id, userId);
	return c.slug;
}
async function leaveCommunity(slug, userId) {
	const [c] = await db.select({ id: communities.id }).from(communities).where(eq(communities.slug, slug)).limit(1);
	if (!c) return "not_found";
	const m = await getMembership(c.id, userId);
	if (!m) return "not_member";
	if (m.role === "owner") return "owner";
	await db.delete(communityMembers).where(and(eq(communityMembers.communityId, c.id), eq(communityMembers.userId, userId)));
	return "left";
}
async function regenerateInvite(slug, userId) {
	const code = newInviteCode();
	return (await db.update(communities).set({
		inviteCode: code,
		updatedAt: /* @__PURE__ */ new Date()
	}).where(and(eq(communities.slug, slug), eq(communities.ownerId, userId))).returning({ id: communities.id })).length ? code : null;
}
async function listDishes(communityId) {
	return db.select({
		id: dishes.id,
		slug: dishes.slug,
		name: dishes.name
	}).from(dishes).where(eq(dishes.communityId, communityId)).orderBy(dishes.name);
}
async function getOrCreateDish(communityId, rawName) {
	const name = rawName.trim().slice(0, 60);
	const slug = slugify(name, "dish");
	const [existing] = await db.select({ id: dishes.id }).from(dishes).where(and(eq(dishes.communityId, communityId), eq(dishes.slug, slug))).limit(1);
	if (existing) return existing.id;
	const [created] = await db.insert(dishes).values({
		communityId,
		slug,
		name
	}).onConflictDoNothing().returning({ id: dishes.id });
	if (created) return created.id;
	const [again] = await db.select({ id: dishes.id }).from(dishes).where(and(eq(dishes.communityId, communityId), eq(dishes.slug, slug))).limit(1);
	return again.id;
}
async function resolveRecipePlacement(userId, input) {
	if (input.communityId === null) {
		if (input.visibility === "community") return {
			ok: false,
			status: 400,
			error: "Pick a community, or choose private or public."
		};
		return {
			ok: true,
			placement: {
				communityId: null,
				dishId: null,
				visibility: input.visibility
			}
		};
	}
	const [c] = await db.select({
		id: communities.id,
		visibility: communities.visibility
	}).from(communities).where(eq(communities.id, input.communityId)).limit(1);
	const membership = c ? await getMembership(c.id, userId) : null;
	if (!c || membership?.status !== "active") return {
		ok: false,
		status: 403,
		error: "You can only post to communities you're a member of."
	};
	if (c.visibility === "private" && input.visibility === "public") return {
		ok: false,
		status: 400,
		error: "Recipes in a private community can't be public."
	};
	const dishId = input.dishName?.trim() ? await getOrCreateDish(c.id, input.dishName) : null;
	return {
		ok: true,
		placement: {
			communityId: c.id,
			dishId,
			visibility: input.visibility
		}
	};
}
async function listPostingTargets(userId) {
	const mine = await db.select({
		id: communities.id,
		slug: communities.slug,
		name: communities.name,
		visibility: communities.visibility
	}).from(communities).innerJoin(communityMembers, and(eq(communityMembers.communityId, communities.id), eq(communityMembers.userId, userId), eq(communityMembers.status, "active"))).orderBy(communities.name);
	return Promise.all(mine.map(async (c) => ({
		...c,
		dishes: (await listDishes(c.id)).map((d) => d.name)
	})));
}
//#endregion
export { joinByInvite as a, listMyCommunities as c, regenerateInvite as d, resolveRecipePlacement as f, getMembership as i, listPostingTargets as l, getCommunityByInvite as n, joinPublicCommunity as o, getCommunityForViewer as r, leaveCommunity as s, createCommunity as t, listPublicCommunities as u };
