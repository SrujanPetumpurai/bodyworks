import type { APIRoute } from "astro";
import { deleteCookLog } from "../../../db/cook-logs";
import { json } from "../../../lib/recipe-input";

export const prerender = false;

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.user) return json({ error: "Sign in first." }, 401);
  const id = Number(params.id);
  if (!Number.isInteger(id)) return json({ error: "Invalid id" }, 400);

  const ok = await deleteCookLog(locals.user.id, id);
  if (!ok) return json({ error: "Log not found" }, 404);
  return json({ deleted: true });
};
