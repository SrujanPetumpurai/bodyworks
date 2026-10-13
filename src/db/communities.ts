import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { db } from "./index";
import { communities, communityMembers, dishes, recipes, user } from "./schema";
import { slugify } from "../lib/slug";

export type Visibility = "private" | "community" | "public";
export type CommunityVisibility = "public" | "private";

export type CommunitySummary = {
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  visibility: CommunityVisibility;
  memberCount: number;
  recipeCount: number;
};

const newInviteCode = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);

// ---------------------------------------------------------------------
// membership
// ---------------------------------------------------------------------

export async function getMembership(communityId: number, userId: string) {
  const [row] = await db
    .select({ role: communityMembers.role, status: communityMembers.status })
    .from(communityMembers)
    .where(and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, userId)))
    .limit(1);
  return row ?? null;
}

// ---------------------------------------------------------------------
// create / read
// ---------------------------------------------------------------------

async function uniqueCommunitySlug(name: string) {
  const base = slugify(name, "community");
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const [hit] = await db.select({ id: communities.id }).from(communities).where(eq(communities.slug, candidate)).limit(1);
    if (!hit) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function createCommunity(
  ownerId: string,
  input: { name: string; description: string | null; visibility: CommunityVisibility; imageUrl: string | null },
) {
  const slug = await uniqueCommunitySlug(input.name);
  const [created] = await db
    .insert(communities)
    .values({
      slug,
      name: input.name,
      description: input.description,
      imageUrl: input.imageUrl,
      visibility: input.visibility,
      // every community gets an invite link; it's the way into a private one
      inviteCode: newInviteCode(),
      ownerId,
    })
    .returning({ id: communities.id, slug: communities.slug });

  try {
    await db.insert(communityMembers).values({ communityId: created.id, userId: ownerId, role: "owner", status: "active" });
  } catch (err) {
    await db.delete(communities).where(eq(communities.id, created.id));
    throw err;
  }
  return created;
}

const counts = {
  memberCount: sql<number>`(select count(*) from ${communityMembers} where ${communityMembers.communityId} = ${communities.id} and ${communityMembers.status} = 'active')`.mapWith(Number),
  recipeCount: sql<number>`(select count(*) from ${recipes} where ${recipes.communityId} = ${communities.id} and ${recipes.visibility} <> 'private')`.mapWith(Number),
};

const summaryCols = {
  slug: communities.slug,
  name: communities.name,
  description: communities.description,
  imageUrl: communities.imageUrl,
  visibility: communities.visibility,
  ...counts,
};

// Public communities only — private ones never appear in browse or search.
export async function listPublicCommunities(search?: string): Promise<CommunitySummary[]> {
  const q = search?.trim();
  return db
    .select(summaryCols)
    .from(communities)
    .where(and(eq(communities.visibility, "public"), q ? ilike(communities.name, `%${q.replace(/[%_]/g, "")}%`) : undefined))
    .orderBy(desc(counts.memberCount), desc(communities.createdAt))
    .limit(60);
}

export async function listMyCommunities(userId: string): Promise<CommunitySummary[]> {
  return db
    .select(summaryCols)
    .from(communities)
    .innerJoin(
      communityMembers,
      and(
        eq(communityMembers.communityId, communities.id),
        eq(communityMembers.userId, userId),
        eq(communityMembers.status, "active"),
      ),
    )
    .orderBy(communities.name);
}

// Returns null when the community doesn't exist OR the viewer isn't allowed to
// see it (private + not an active member), so private communities stay hidden.
export async function getCommunityForViewer(slug: string, viewerId: string | null | undefined) {
  const [c] = await db.select().from(communities).where(eq(communities.slug, slug)).limit(1);
  if (!c) return null;

  const membership = viewerId ? await getMembership(c.id, viewerId) : null;
  const isMember = membership?.status === "active";
  if (c.visibility === "private" && !isMember) return null;

  const [owner] = await db.select({ id: user.id, name: user.name }).from(user).where(eq(user.id, c.ownerId)).limit(1);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(communityMembers)
    .where(and(eq(communityMembers.communityId, c.id), eq(communityMembers.status, "active")));

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
    // only the owner ever sees the invite code
    inviteCode: membership?.role === "owner" && isMember ? c.inviteCode : null,
  };
}

// For the /communities/join/[code] page: lets a signed-in or logged-out visitor
// see just the name of the community an invite link points to.
export async function getCommunityByInvite(code: string) {
  const [c] = await db
    .select({ id: communities.id, slug: communities.slug, name: communities.name, description: communities.description, visibility: communities.visibility })
    .from(communities)
    .where(eq(communities.inviteCode, code))
    .limit(1);
  return c ?? null;
}

// ---------------------------------------------------------------------
// join / leave / invite
// ---------------------------------------------------------------------

async function addMember(communityId: number, userId: string) {
  await db
    .insert(communityMembers)
    .values({ communityId, userId, role: "member", status: "active" })
    .onConflictDoUpdate({
      target: [communityMembers.communityId, communityMembers.userId],
      set: { status: "active" },
      // never downgrade an owner
      setWhere: eq(communityMembers.role, "member"),
    });
}

// Anyone signed in can join a PUBLIC community. Private ones need an invite.
export async function joinPublicCommunity(slug: string, userId: string) {
  const [c] = await db.select({ id: communities.id, visibility: communities.visibility }).from(communities).where(eq(communities.slug, slug)).limit(1);
  if (!c || c.visibility !== "public") return false;
  await addMember(c.id, userId);
  return true;
}

export async function joinByInvite(code: string, userId: string) {
  const c = await getCommunityByInvite(code);
  if (!c) return null;
  await addMember(c.id, userId);
  return c.slug;
}

// The owner can't leave (they'd orphan the community).
export async function leaveCommunity(slug: string, userId: string) {
  const [c] = await db.select({ id: communities.id }).from(communities).where(eq(communities.slug, slug)).limit(1);
  if (!c) return "not_found" as const;
  const m = await getMembership(c.id, userId);
  if (!m) return "not_member" as const;
  if (m.role === "owner") return "owner" as const;
  await db
    .delete(communityMembers)
    .where(and(eq(communityMembers.communityId, c.id), eq(communityMembers.userId, userId)));
  return "left" as const;
}

// Owner-only: replaces the invite link so the old one stops working.
export async function regenerateInvite(slug: string, userId: string) {
  const code = newInviteCode();
  const updated = await db
    .update(communities)
    .set({ inviteCode: code, updatedAt: new Date() })
    .where(and(eq(communities.slug, slug), eq(communities.ownerId, userId)))
    .returning({ id: communities.id });
  return updated.length ? code : null;
}

// ---------------------------------------------------------------------
// dishes + where a recipe is allowed to live
// ---------------------------------------------------------------------

export async function listDishes(communityId: number) {
  return db
    .select({ id: dishes.id, slug: dishes.slug, name: dishes.name })
    .from(dishes)
    .where(eq(dishes.communityId, communityId))
    .orderBy(dishes.name);
}

async function getOrCreateDish(communityId: number, rawName: string) {
  const name = rawName.trim().slice(0, 60);
  const slug = slugify(name, "dish");
  const [existing] = await db
    .select({ id: dishes.id })
    .from(dishes)
    .where(and(eq(dishes.communityId, communityId), eq(dishes.slug, slug)))
    .limit(1);
  if (existing) return existing.id;

  const [created] = await db
    .insert(dishes)
    .values({ communityId, slug, name })
    .onConflictDoNothing()
    .returning({ id: dishes.id });
  if (created) return created.id;

  // lost a race with another insert of the same dish
  const [again] = await db
    .select({ id: dishes.id })
    .from(dishes)
    .where(and(eq(dishes.communityId, communityId), eq(dishes.slug, slug)))
    .limit(1);
  return again.id;
}

export type RecipePlacementInput = {
  communityId: number | null;
  dishName: string | null;
  visibility: Visibility;
};
export type RecipePlacement = { communityId: number | null; dishId: number | null; visibility: Visibility };

// The visibility rules, enforced on the server (the form only mirrors them):
//   standalone recipe        -> 'private' or 'public'
//   recipe in a community    -> author must be an active member
//   private community        -> capped at 'community' (never 'public')
//   public community         -> any of the three
export async function resolveRecipePlacement(
  userId: string,
  input: RecipePlacementInput,
): Promise<{ ok: true; placement: RecipePlacement } | { ok: false; status: number; error: string }> {
  if (input.communityId === null) {
    if (input.visibility === "community") {
      return { ok: false, status: 400, error: "Pick a community, or choose private or public." };
    }
    return { ok: true, placement: { communityId: null, dishId: null, visibility: input.visibility } };
  }

  const [c] = await db
    .select({ id: communities.id, visibility: communities.visibility })
    .from(communities)
    .where(eq(communities.id, input.communityId))
    .limit(1);
  const membership = c ? await getMembership(c.id, userId) : null;
  // same message for "doesn't exist" and "not yours" so private communities aren't probeable
  if (!c || membership?.status !== "active") {
    return { ok: false, status: 403, error: "You can only post to communities you're a member of." };
  }
  if (c.visibility === "private" && input.visibility === "public") {
    return { ok: false, status: 400, error: "Recipes in a private community can't be public." };
  }

  const dishId = input.dishName?.trim() ? await getOrCreateDish(c.id, input.dishName) : null;
  return { ok: true, placement: { communityId: c.id, dishId, visibility: input.visibility } };
}

// What the recipe form needs: my communities, each with its dishes and its cap.
export async function listPostingTargets(userId: string) {
  const mine = await db
    .select({ id: communities.id, slug: communities.slug, name: communities.name, visibility: communities.visibility })
    .from(communities)
    .innerJoin(
      communityMembers,
      and(eq(communityMembers.communityId, communities.id), eq(communityMembers.userId, userId), eq(communityMembers.status, "active")),
    )
    .orderBy(communities.name);

  return Promise.all(mine.map(async (c) => ({ ...c, dishes: (await listDishes(c.id)).map((d) => d.name) })));
}
