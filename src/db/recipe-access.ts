import { and, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "./index";
import { communityMembers, recipes } from "./schema";

// The single source of truth for "who can see a recipe":
//   public    -> anyone, including logged-out visitors
//   community -> active members of recipe.communityId (and the author)
//   private   -> the author only
// Authors always see their own recipes.

type Visibility = "private" | "community" | "public";

export type RecipeAccessFields = {
  visibility: Visibility;
  authorId: string | null;
  communityId: number | null;
};

export async function isActiveMember(communityId: number, userId: string) {
  const [row] = await db
    .select({ id: communityMembers.id })
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.communityId, communityId),
        eq(communityMembers.userId, userId),
        eq(communityMembers.status, "active"),
      ),
    )
    .limit(1);
  return !!row;
}

// Use for ONE already-loaded recipe. Callers should answer 404 (not 403)
// when this is false, so private recipes don't reveal that they exist.
export async function canViewRecipe(
  recipe: RecipeAccessFields,
  viewerId: string | null | undefined,
): Promise<boolean> {
  if (recipe.visibility === "public") return true;
  if (!viewerId) return false;
  if (recipe.authorId === viewerId) return true;
  if (recipe.visibility === "community" && recipe.communityId !== null) {
    return isActiveMember(recipe.communityId, viewerId);
  }
  return false;
}

// Same rule as canViewRecipe, as a SQL condition for LIST queries, so rows the
// viewer may not see are never fetched from the database at all.
export function recipeVisibleTo(viewerId: string | null | undefined): SQL {
  if (!viewerId) return eq(recipes.visibility, "public");

  const activeCommunityIds = db
    .select({ id: communityMembers.communityId })
    .from(communityMembers)
    .where(and(eq(communityMembers.userId, viewerId), eq(communityMembers.status, "active")));

  return or(
    eq(recipes.visibility, "public"),
    eq(recipes.authorId, viewerId),
    and(eq(recipes.visibility, "community"), inArray(recipes.communityId, activeCommunityIds)),
  ) ?? sql`false`;
}
