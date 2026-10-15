import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "./index";
import { workoutEntries, workoutCategoryEnum } from "./schema";
import { MAX_OCCURRENCES, occurrenceDates, validateRule } from "../lib/workout-repeat";

export type WorkoutCategory = (typeof workoutCategoryEnum.enumValues)[number];

export type WorkoutEntryInput = {
  date: string; // YYYY-MM-DD
  category: WorkoutCategory | null; // built-in icon, or…
  typeId: number | null; // …a custom icon (exactly one is set)
  title: string | null;
  notes: string | null;
  startMinutes: number | null; // minutes from midnight, null = no set time
  durationMinutes: number;
  completed: boolean;
};

type Parsed = { ok: true; value: Partial<WorkoutEntryInput> } | { ok: false; error: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const isDateKey = (v: unknown): v is string => typeof v === "string" && DATE_RE.test(v);

const fail = (error: string): Parsed => ({ ok: false, error });

// partial = true for PATCH (only validate the fields that are present)
export function parseEntryInput(body: any, partial: boolean): Parsed {
  if (!body || typeof body !== "object") return fail("Invalid body");
  const v: Partial<WorkoutEntryInput> = {};

  if (!partial || "date" in body) {
    if (!isDateKey(body.date)) return fail("date must be YYYY-MM-DD");
    v.date = body.date;
  }
  // The icon is chosen when an entry is created and can't be swapped afterwards,
  // so PATCH ignores category/typeId.
  if (!partial) {
    const hasCategory = body.category !== undefined && body.category !== null;
    const hasType = body.typeId !== undefined && body.typeId !== null;
    if (hasCategory === hasType) return fail("Choose one workout icon");
    if (hasCategory) {
      if (!workoutCategoryEnum.enumValues.includes(body.category)) return fail("Unknown category");
      v.category = body.category;
      v.typeId = null;
    } else {
      if (!Number.isInteger(body.typeId) || body.typeId < 1) return fail("Unknown icon");
      v.typeId = body.typeId;
      v.category = null;
    }
  }
  if ("title" in body) {
    if (body.title !== null && (typeof body.title !== "string" || body.title.length > 80)) {
      return fail("title must be a string up to 80 chars");
    }
    v.title = body.title?.trim() || null;
  }
  if ("notes" in body) {
    if (body.notes !== null && (typeof body.notes !== "string" || body.notes.length > 500)) {
      return fail("notes must be a string up to 500 chars");
    }
    v.notes = body.notes?.trim() || null;
  }
  if ("startMinutes" in body) {
    const s = body.startMinutes;
    if (s !== null && (!Number.isInteger(s) || s < 0 || s > 1439)) return fail("startMinutes must be 0-1439 or null");
    v.startMinutes = s;
  }
  if ("durationMinutes" in body) {
    const d = body.durationMinutes;
    if (!Number.isInteger(d) || d < 5 || d > 720) return fail("durationMinutes must be 5-720");
    v.durationMinutes = d;
  }
  if ("completed" in body) {
    if (typeof body.completed !== "boolean") return fail("completed must be true or false");
    v.completed = body.completed;
  }
  return { ok: true, value: v };
}

const columns = {
  id: workoutEntries.id,
  date: workoutEntries.date,
  category: workoutEntries.category,
  typeId: workoutEntries.typeId,
  title: workoutEntries.title,
  notes: workoutEntries.notes,
  startMinutes: workoutEntries.startMinutes,
  durationMinutes: workoutEntries.durationMinutes,
  completed: workoutEntries.completed,
  seriesId: workoutEntries.seriesId,
};

export async function listWorkouts(userId: string, from: string, to: string) {
  return db
    .select(columns)
    .from(workoutEntries)
    .where(and(eq(workoutEntries.userId, userId), gte(workoutEntries.date, from), lte(workoutEntries.date, to)))
    .orderBy(asc(workoutEntries.date), asc(workoutEntries.startMinutes));
}

export async function createWorkout(userId: string, input: WorkoutEntryInput) {
  const [row] = await db
    .insert(workoutEntries)
    .values({ ...input, userId })
    .returning(columns);
  return row;
}

export async function updateWorkout(userId: string, id: number, changes: Partial<WorkoutEntryInput>) {
  const [row] = await db
    .update(workoutEntries)
    .set(changes)
    .where(and(eq(workoutEntries.id, id), eq(workoutEntries.userId, userId)))
    .returning(columns);
  return row ?? null;
}

export type DeleteScope = "this" | "following" | "all";

// "following" / "all" only matter for workouts that belong to a repeat series.
export async function deleteWorkout(userId: string, id: number, scope: DeleteScope = "this") {
  const [src] = await db
    .select({ date: workoutEntries.date, seriesId: workoutEntries.seriesId })
    .from(workoutEntries)
    .where(and(eq(workoutEntries.id, id), eq(workoutEntries.userId, userId)))
    .limit(1);
  if (!src) return false;

  const mine = and(eq(workoutEntries.userId, userId));
  const where =
    scope === "this" || !src.seriesId
      ? and(mine, eq(workoutEntries.id, id))
      : scope === "all"
        ? and(mine, eq(workoutEntries.seriesId, src.seriesId))
        : and(mine, eq(workoutEntries.seriesId, src.seriesId), gte(workoutEntries.date, src.date));

  await db.delete(workoutEntries).where(where);
  return true;
}

export type RepeatResult =
  | { ok: true; seriesId: string; created: Awaited<ReturnType<typeof listWorkouts>> }
  | { ok: false; status: 400 | 404; error: string };

// Turns one workout into a series: copies it onto every date the rule produces.
// The copies start un-done; each one can then be moved, ticked or edited on its own.
export async function repeatWorkout(userId: string, id: number, rawRule: unknown): Promise<RepeatResult> {
  const [src] = await db
    .select()
    .from(workoutEntries)
    .where(and(eq(workoutEntries.id, id), eq(workoutEntries.userId, userId)))
    .limit(1);
  if (!src) return { ok: false, status: 404, error: "Not found" };
  if (src.seriesId) return { ok: false, status: 400, error: "This workout already repeats. Delete the series to start over." };

  const checked = validateRule(src.date, rawRule);
  if (!checked.ok) return { ok: false, status: 400, error: checked.error };

  const dates = occurrenceDates(src.date, checked.rule);
  if (dates.length === 0) return { ok: false, status: 400, error: "That rule doesn't produce any new dates." };
  if (dates.length > MAX_OCCURRENCES) {
    return { ok: false, status: 400, error: `That would add more than ${MAX_OCCURRENCES} workouts. Shorten the end date.` };
  }

  const seriesId = crypto.randomUUID();
  const rows = dates.map((date) => ({
    userId,
    date,
    category: src.category,
    typeId: src.typeId,
    title: src.title,
    notes: src.notes,
    startMinutes: src.startMinutes,
    durationMinutes: src.durationMinutes,
    completed: false,
    seriesId,
  }));

  // one HTTP round-trip, applied atomically: either the whole series exists or none of it does
  const [, created] = await db.batch([
    db.update(workoutEntries).set({ seriesId }).where(and(eq(workoutEntries.id, id), eq(workoutEntries.userId, userId))),
    db.insert(workoutEntries).values(rows).returning(columns),
  ]);
  return { ok: true, seriesId, created };
}
