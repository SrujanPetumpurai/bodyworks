import type { APIRoute } from "astro";
import { deleteType } from "../../../db/workout-types";
import { json } from "../../../lib/recipe-input";

export const prerender = false;

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.user) return json({ error: "Sign in first" }, 401);

  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) return json({ error: "Invalid id" }, 400);

  return (await deleteType(locals.user.id, id)) ? json({ ok: true }) : json({ error: "Not found" }, 404);
};
