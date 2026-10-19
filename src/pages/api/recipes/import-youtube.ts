import type { APIRoute } from "astro";
import { listFoods } from "../../../db/recipes";
import { ExtractError, extractRecipe } from "../../../lib/recipe-extract";
import { json } from "../../../lib/recipe-input";
import { YouTubeError, fetchVideoContext, parseVideoId } from "../../../lib/youtube";

export const prerender = false;

// Every import costs AI credits, so it needs a signed-in user and is limited per user.
// (In-memory: each serverless instance counts separately, which is enough to stop runaway clicking.)
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, number[]>();

function allowed(userId: string) {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(userId, recent);
    return false;
  }
  recent.push(now);
  hits.set(userId, recent);
  return true;
}

// POST { url } -> { recipe, source } to pre-fill the Add recipe form (nothing is saved here)
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return json({ error: "Sign in to import a recipe." }, 401);

  const youtubeKey = import.meta.env.YOUTUBE_API_KEY as string | undefined;
  const aiKey = import.meta.env.AICREDITS_API_KEY as string | undefined;
  if (!youtubeKey || !aiKey) return json({ error: "YouTube import isn't set up on this site yet." }, 503);

  const body = await request.json().catch(() => null);
  const videoId = typeof body?.url === "string" ? parseVideoId(body.url) : null;
  if (!videoId) return json({ error: "That doesn't look like a YouTube video link." }, 400);

  if (!allowed(user.id)) return json({ error: "You've imported a lot of recipes just now. Try again in an hour." }, 429);

  try {
    const video = await fetchVideoContext(videoId, youtubeKey);
    const foods = (await listFoods()).map((f) => f.name);
    const recipe = await extractRecipe(video, foods, aiKey);
    if (!recipe) {
      return json(
        { error: "Couldn't find a recipe in that video's description or the channel's comments. You can still add it by hand." },
        422,
      );
    }
    return json({
      recipe: { ...recipe, imageUrl: video.thumbnailUrl, videoUrl: `https://www.youtube.com/watch?v=${videoId}` },
      source: { title: video.title, channel: video.channelTitle, fromComments: video.ownerComments.length > 0 },
    });
  } catch (err) {
    if (err instanceof YouTubeError || err instanceof ExtractError) return json({ error: err.message }, err.status);
    console.error("youtube import failed", err);
    return json({ error: "Something went wrong importing that video." }, 500);
  }
};
