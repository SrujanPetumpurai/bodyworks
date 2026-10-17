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
const AUDIO_TYPES: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
};
// Vercel functions cap request bodies at ~4.5 MB, so stay under that.
const MAX_BYTES = 4 * 1024 * 1024;

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return json({ error: "Sign in to upload images." }, 401);

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return json({ error: "No file received." }, 400);

  // recorders label clips like "audio/webm;codecs=opus"; keep just the media type
  const mime = file.type.split(";")[0].trim();
  const isAudio = form?.get("kind") === "audio";
  const ext = isAudio ? AUDIO_TYPES[mime] : TYPES[mime];
  if (!ext) {
    return json({ error: isAudio ? "Unsupported audio format." : "Use a JPG, PNG, WebP or GIF image." }, 400);
  }
  if (file.size > MAX_BYTES) return json({ error: `${isAudio ? "Recording" : "Image"} is too large (max 4 MB).` }, 400);

  try {
    const blob = await put(`${isAudio ? "audio" : "uploads"}/${locals.user.id}/${crypto.randomUUID()}.${ext}`, file, {
      access: "public",
      contentType: mime,
      token: import.meta.env.BLOB_READ_WRITE_TOKEN,
    });
    return json({ url: blob.url });
  } catch (err) {
    console.error("upload failed", err);
    return json({ error: "Upload failed. Check the Blob token is configured." }, 500);
  }
};
