import type { APIRoute } from "astro";
import { put } from "@vercel/blob";
import { json } from "../../lib/recipe-input";

export const prerender = false;

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
// Vercel functions cap request bodies at ~4.5 MB, so stay under that.
const MAX_BYTES = 4 * 1024 * 1024;

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return json({ error: "Sign in to upload images." }, 401);

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return json({ error: "No file received." }, 400);

  const ext = TYPES[file.type];
  if (!ext) return json({ error: "Use a JPG, PNG, WebP or GIF image." }, 400);
  if (file.size > MAX_BYTES) return json({ error: "Image is too large (max 4 MB)." }, 400);

  try {
    const blob = await put(`uploads/${locals.user.id}/${crypto.randomUUID()}.${ext}`, file, {
      access: "public",
      contentType: file.type,
      token: import.meta.env.BLOB_READ_WRITE_TOKEN,
    });
    return json({ url: blob.url });
  } catch (err) {
    console.error("upload failed", err);
    return json({ error: "Upload failed. Check the Blob token is configured." }, 500);
  }
};
