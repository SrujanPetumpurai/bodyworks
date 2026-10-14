import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "./index";
import { workoutEntries, workoutCategoryEnum } from "./schema";

export type WorkoutCategory = (typeof workoutCategoryEnum.enumValues)[number];

export type WorkoutEntryInput = {
  date: string; // YYYY-MM-DD
  category: WorkoutCategory;
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
  if (!partial || "category" in body) {
    if (!workoutCategoryEnum.enumValues.includes(body.category)) return fail("Unknown category");
    v.category = body.category;
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
  title: workoutEntries.title,
  notes: workoutEntries.notes,
  startMinutes: workoutEntries.startMinutes,
  durationMinutes: workoutEntries.durationMinutes,
  completed: workoutEntries.completed,
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

export async function deleteWorkout(userId: string, id: number) {
  const rows = await db
    .delete(workoutEntries)
    .where(and(eq(workoutEntries.id, id), eq(workoutEntries.userId, userId)))
    .returning({ id: workoutEntries.id });
  return rows.length > 0;
}
