import type { APIRoute } from "astro";
import { createCookLog, listCookLogs, parseCookLog } from "../../../../db/cook-logs";
import { json } from "../../../../lib/recipe-input";

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  if (!locals.user) return json({ error: "Sign in to see your cook log." }, 401);
  if (!params.slug) return json({ error: "slug is required" }, 400);

  const logs = await listCookLogs(locals.user.id, params.slug);
  if (!logs) return json({ error: "Recipe not found" }, 404);
  return json(logs);
};

export const POST: APIRoute = async ({ params, request, locals }) => {
  if (!locals.user) return json({ error: "Sign in to log a cook." }, 401);
  if (!params.slug) return json({ error: "slug is required" }, 400);

  const parsed = parseCookLog(await request.json().catch(() => null));
  if (!parsed.ok) return json({ error: parsed.error }, 400);

  const created = await createCookLog(locals.user.id, params.slug, parsed.value);
  if (!created) return json({ error: "Recipe not found" }, 404);
  return json(created, 201);
};
