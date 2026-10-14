import type { APIRoute } from "astro";
import { createWorkout, isDateKey, listWorkouts, parseEntryInput } from "../../../db/workouts";
import type { WorkoutEntryInput } from "../../../db/workouts";

import { json } from "../../../lib/recipe-input";

export const prerender = false;

export const GET: APIRoute = async ({ url, locals }) => {
  const user = locals.user;
  if (!user) return json({ error: "Sign in to view your plan" }, 401);

  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!isDateKey(from) || !isDateKey(to)) return json({ error: "from and to must be YYYY-MM-DD" }, 400);

  return json(await listWorkouts(user.id, from, to));
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return json({ error: "Sign in to plan workouts" }, 401);

  const body = await request.json().catch(() => null);
  const parsed = parseEntryInput(body, false);
  if (!parsed.ok) return json({ error: parsed.error }, 400);

  const v = parsed.value;
  const entry: WorkoutEntryInput = {
    date: v.date!,
    category: v.category!,
    title: v.title ?? null,
    notes: v.notes ?? null,
    startMinutes: v.startMinutes ?? null,
    durationMinutes: v.durationMinutes ?? 60,
  };
  return json(await createWorkout(user.id, entry), 201);
};
