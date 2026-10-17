import { and, desc, eq } from "drizzle-orm";
import { db } from "./index";
import { recipeCookLogs, recipes } from "./schema";
import { canViewRecipe } from "./recipe-access";
import { isDateKey } from "./workouts";

export type CookLogInput = {
  cookedOn: string;
  photoUrl: string | null;
  notes: string | null;
  audioUrl: string | null;
};

type Parsed = { ok: true; value: CookLogInput } | { ok: false; error: string };

function httpsUrl(v: unknown): string | null | "invalid" {
  if (typeof v !== "string" || !v.trim()) return null;
  try {
    return new URL(v.trim()).protocol === "https:" ? v.trim().slice(0, 2000) : "invalid";
  } catch {
    return "invalid";
  }
}

export function parseCookLog(body: any): Parsed {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid body" };
  if (!isDateKey(body.cookedOn)) return { ok: false, error: "cookedOn must be YYYY-MM-DD" };

  const photoUrl = httpsUrl(body.photoUrl);
  const audioUrl = httpsUrl(body.audioUrl);
  if (photoUrl === "invalid") return { ok: false, error: "Photo must be an upload." };
  if (audioUrl === "invalid") return { ok: false, error: "Voice note must be an upload." };

  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) || null : null;
  if (!photoUrl && !notes && !audioUrl) return { ok: false, error: "Add a photo, a note or a voice note." };

  return { ok: true, value: { cookedOn: body.cookedOn, photoUrl, notes, audioUrl } };
}

async function findViewable(userId: string, slug: string) {
  const [recipe] = await db
    .select({
      id: recipes.id,
      visibility: recipes.visibility,
      authorId: recipes.authorId,
      communityId: recipes.communityId,
    })
    .from(recipes)
    .where(eq(recipes.slug, slug))
    .limit(1);
  return recipe && (await canViewRecipe(recipe, userId)) ? recipe : null;
}

// Newest first. `attempt` is 1 for the first time the user cooked it, 2 for the second, ...
// null = no such recipe or not visible to this user (callers answer 404).
export async function listCookLogs(userId: string, slug: string) {
  const recipe = await findViewable(userId, slug);
  if (!recipe) return null;

  const rows = await db
    .select({
      id: recipeCookLogs.id,
      cookedOn: recipeCookLogs.cookedOn,
      photoUrl: recipeCookLogs.photoUrl,
      notes: recipeCookLogs.notes,
      audioUrl: recipeCookLogs.audioUrl,
    })
    .from(recipeCookLogs)
    .where(and(eq(recipeCookLogs.userId, userId), eq(recipeCookLogs.recipeId, recipe.id)))
    .orderBy(desc(recipeCookLogs.cookedOn), desc(recipeCookLogs.id));

  return rows.map((r, i) => ({ ...r, attempt: rows.length - i }));
}

export async function createCookLog(userId: string, slug: string, input: CookLogInput) {
  const recipe = await findViewable(userId, slug);
  if (!recipe) return null;
  const [created] = await db
    .insert(recipeCookLogs)
    .values({ recipeId: recipe.id, userId, ...input })
    .returning({ id: recipeCookLogs.id });
  return created;
}

export async function deleteCookLog(userId: string, id: number) {
  const rows = await db
    .delete(recipeCookLogs)
    .where(and(eq(recipeCookLogs.id, id), eq(recipeCookLogs.userId, userId)))
    .returning({ id: recipeCookLogs.id });
  return rows.length > 0;
}
