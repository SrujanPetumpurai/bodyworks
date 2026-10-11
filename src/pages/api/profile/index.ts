import type { APIRoute } from "astro";
import { updateProfile } from "../../../db/recipes";
import { json } from "../../../lib/recipe-input";

export const prerender = false;

function httpsOrNull(v: unknown): string | null | "invalid" {
  if (v === null || v === "") return null;
  if (typeof v !== "string") return "invalid";
  try {
    return new URL(v).protocol === "https:" ? v : "invalid";
  } catch {
    return "invalid";
  }
}

// Edits the signed-in user's own public profile only.
export const PATCH: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return json({ error: "Sign in first." }, 401);

  const body = await request.json().catch(() => null);
  const data: { name?: string; image?: string | null; banner?: string | null } = {};

  if (body && "name" in body) {
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 60) : "";
    if (!name) return json({ error: "Name can't be empty." }, 400);
    data.name = name;
  }
  for (const key of ["image", "banner"] as const) {
    if (body && key in body) {
      const v = httpsOrNull(body[key]);
      if (v === "invalid") return json({ error: `${key} must be an https link or an upload.` }, 400);
      data[key] = v;
    }
  }
  if (Object.keys(data).length === 0) return json({ error: "Nothing to update." }, 400);

  await updateProfile(locals.user.id, data);
  return json({ ok: true });
};
