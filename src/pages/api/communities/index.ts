import type { APIRoute } from "astro";
import { createCommunity, listMyCommunities, listPublicCommunities } from "../../../db/communities";
import { json } from "../../../lib/recipe-input";

export const prerender = false;

export const GET: APIRoute = async ({ url, locals }) => {
  if (url.searchParams.get("scope") === "mine") {
    if (!locals.user) return json({ error: "Sign in first." }, 401);
    return json(await listMyCommunities(locals.user.id));
  }
  return json(await listPublicCommunities(url.searchParams.get("q") ?? undefined));
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return json({ error: "Sign in to create a community." }, 401);

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";
  const description = typeof body?.description === "string" ? body.description.trim().slice(0, 300) : "";
  const visibility = body?.visibility === "private" ? "private" : body?.visibility === "public" ? "public" : null;
  if (!name) return json({ error: "Give your community a name." }, 400);
  if (!visibility) return json({ error: "Choose public or private." }, 400);

  try {
    const created = await createCommunity(locals.user.id, { name, description: description || null, visibility, imageUrl: null });
    return json({ slug: created.slug }, 201);
  } catch (err) {
    console.error("createCommunity failed", err);
    return json({ error: "Couldn't create the community. Try again." }, 500);
  }
};
