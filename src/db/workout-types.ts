import { and, asc, count, eq } from "drizzle-orm";
import { db } from "./index";
import { workoutTypes } from "./schema";
import { GLYPH_KEYS, MAX_CUSTOM_TYPES, MAX_TYPE_NAME, SHADE_KEYS } from "../lib/workout-glyphs";

export type WorkoutTypeInput = { name: string; glyph: string; shade: string };
type Parsed = { ok: true; value: WorkoutTypeInput } | { ok: false; error: string };

export function parseTypeInput(body: any): Parsed {
  const name = typeof body?.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  if (!name) return { ok: false, error: "Give your icon a name." };
  if (name.length > MAX_TYPE_NAME) return { ok: false, error: `Names can be up to ${MAX_TYPE_NAME} characters.` };
  if (!(GLYPH_KEYS as readonly string[]).includes(body?.glyph)) return { ok: false, error: "Pick a symbol from the list." };
  if (!(SHADE_KEYS as readonly string[]).includes(body?.shade)) return { ok: false, error: "Pick a colour from the list." };
  return { ok: true, value: { name, glyph: body.glyph, shade: body.shade } };
}

const columns = {
  id: workoutTypes.id,
  name: workoutTypes.name,
  glyph: workoutTypes.glyph,
  shade: workoutTypes.shade,
};

export async function listTypes(userId: string) {
  return db.select(columns).from(workoutTypes).where(eq(workoutTypes.userId, userId)).orderBy(asc(workoutTypes.id));
}

// returns null when the user is already at the limit
export async function createType(userId: string, input: WorkoutTypeInput) {
  const [{ n }] = await db.select({ n: count() }).from(workoutTypes).where(eq(workoutTypes.userId, userId));
  if (n >= MAX_CUSTOM_TYPES) return null;
  const [row] = await db
    .insert(workoutTypes)
    .values({ ...input, userId })
    .returning(columns);
  return row;
}

// also removes the planned workouts that use it (FK cascade)
export async function deleteType(userId: string, id: number) {
  const rows = await db
    .delete(workoutTypes)
    .where(and(eq(workoutTypes.id, id), eq(workoutTypes.userId, userId)))
    .returning({ id: workoutTypes.id });
  return rows.length > 0;
}

export async function ownsType(userId: string, id: number) {
  const rows = await db
    .select({ id: workoutTypes.id })
    .from(workoutTypes)
    .where(and(eq(workoutTypes.id, id), eq(workoutTypes.userId, userId)))
    .limit(1);
  return rows.length > 0;
}
