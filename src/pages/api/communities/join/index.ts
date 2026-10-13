import type { APIRoute } from "astro";
import { joinByInvite } from "../../../../db/communities";
import { json } from "../../../../lib/recipe-input";

export const prerender = false;

// Join any community (including private) with a valid invite code.
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return json({ error: "Sign in to join." }, 401);
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim().slice(0, 64) : "";
  const slug = code ? await joinByInvite(code, locals.user.id) : null;
  if (!slug) return json({ error: "That invite link isn't valid any more." }, 404);
  return json({ slug });
};
