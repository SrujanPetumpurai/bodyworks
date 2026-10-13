import type { APIRoute } from "astro";
import { regenerateInvite } from "../../../../db/communities";
import { json } from "../../../../lib/recipe-input";

export const prerender = false;

// Owner-only: issue a fresh invite link (the old one stops working).
export const POST: APIRoute = async ({ params, locals }) => {
  if (!locals.user) return json({ error: "Sign in first." }, 401);
  const code = params.slug ? await regenerateInvite(params.slug, locals.user.id) : null;
  if (!code) return json({ error: "Community not found, or it isn't yours." }, 404);
  return json({ code });
};
