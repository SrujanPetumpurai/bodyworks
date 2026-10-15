import type { APIRoute } from "astro";
import { deleteWorkout, parseEntryInput, updateWorkout, type DeleteScope } from "../../../db/workouts";

import { json } from "../../../lib/recipe-input";

export const prerender = false;

function parseId(raw: string | undefined) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user) return json({ error: "Sign in to edit your plan" }, 401);

  const id = parseId(params.id);
  if (!id) return json({ error: "Invalid id" }, 400);

  const body = await request.json().catch(() => null);
  const parsed = parseEntryInput(body, true);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  if (Object.keys(parsed.value).length === 0) return json({ error: "Nothing to update" }, 400);

  const row = await updateWorkout(user.id, id, parsed.value);
  return row ? json(row) : json({ error: "Not found" }, 404);
};

// ?scope=this (default) | following | all — the last two remove the rest of a repeat series too
export const DELETE: APIRoute = async ({ params, url, locals }) => {
  const user = locals.user;
  if (!user) return json({ error: "Sign in to edit your plan" }, 401);

  const id = parseId(params.id);
  if (!id) return json({ error: "Invalid id" }, 400);

  const scope = (url.searchParams.get("scope") ?? "this") as DeleteScope;
  if (!["this", "following", "all"].includes(scope)) return json({ error: "Invalid scope" }, 400);

  const ok = await deleteWorkout(user.id, id, scope);
  return ok ? json({ ok: true }) : json({ error: "Not found" }, 404);
};
