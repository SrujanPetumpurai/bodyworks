import type { APIRoute } from "astro";
import { joinPublicCommunity, leaveCommunity } from "../../../../db/communities";
import { json } from "../../../../lib/recipe-input";

export const prerender = false;

// Join a PUBLIC community. Private ones are joined through an invite link.
export const POST: APIRoute = async ({ params, locals }) => {
  if (!locals.user) return json({ error: "Sign in to join." }, 401);
  const ok = params.slug ? await joinPublicCommunity(params.slug, locals.user.id) : false;
  // private communities answer exactly like missing ones
  if (!ok) return json({ error: "Community not found." }, 404);
  return json({ joined: true });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.user) return json({ error: "Sign in first." }, 401);
  const result = params.slug ? await leaveCommunity(params.slug, locals.user.id) : "not_found";
  if (result === "owner") return json({ error: "Owners can't leave their own community." }, 400);
  if (result !== "left") return json({ error: "You're not in that community." }, 404);
  return json({ left: true });
};
