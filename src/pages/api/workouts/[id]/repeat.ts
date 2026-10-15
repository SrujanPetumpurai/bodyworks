import type { APIRoute } from "astro";
import { repeatWorkout } from "../../../../db/workouts";
import { json } from "../../../../lib/recipe-input";

export const prerender = false;

// body: { frequency: "daily" | "weekly", interval: 1-4, days: number[] (0 = Mon … 6 = Sun), until: "YYYY-MM-DD" }
export const POST: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user) return json({ error: "Sign in to edit your plan" }, 401);

  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) return json({ error: "Invalid id" }, 400);

  const result = await repeatWorkout(user.id, id, await request.json().catch(() => null));
  if (!result.ok) return json({ error: result.error }, result.status);
  return json({ seriesId: result.seriesId, created: result.created }, 201);
};
