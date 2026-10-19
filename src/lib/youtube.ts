// Reads a YouTube video's public text (title, description, and comments) through the official Data API.
// Needs YOUTUBE_API_KEY (a free key from Google Cloud with "YouTube Data API v3" enabled).
// Each import costs ~2 of the 10,000 free daily quota units.

export type VideoContext = {
  videoId: string;
  title: string;
  channelTitle: string;
  description: string;
  // comments written by the channel owner (this is where pinned recipe comments live), then other long comments
  ownerComments: string[];
  otherComments: string[];
  thumbnailUrl: string | null;
};

export class YouTubeError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

const ID_RE = /^[\w-]{11}$/;

// accepts watch?v=, youtu.be/, /shorts/, /embed/, /live/ and m. / music. hosts
export function parseVideoId(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const m = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{11})/);
      id = m ? m[1] : null;
    }
  }
  return id && ID_RE.test(id) ? id : null;
}

async function api<T>(path: string, params: Record<string, string>, key: string): Promise<T> {
  const qs = new URLSearchParams({ ...params, key });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${qs}`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) {
    const body: any = await res.json().catch(() => null);
    const reason: string | undefined = body?.error?.errors?.[0]?.reason;
    throw Object.assign(new YouTubeError(body?.error?.message ?? `YouTube returned ${res.status}`, res.status), { reason });
  }
  return res.json() as Promise<T>;
}

export async function fetchVideoContext(videoId: string, key: string): Promise<VideoContext> {
  const videos = await api<any>("videos", { part: "snippet", id: videoId }, key).catch((e) => {
    if (e instanceof YouTubeError && (e.status === 400 || e.status === 403)) {
      throw new YouTubeError("The YouTube key was rejected or its daily quota is used up.", 502);
    }
    throw new YouTubeError("Couldn't reach YouTube. Try again.");
  });
  const item = videos.items?.[0];
  if (!item) throw new YouTubeError("That video wasn't found. It may be private or deleted.", 404);

  const sn = item.snippet;
  const channelId: string = sn.channelId;

  // Comments are optional: they can be switched off, and a failure here shouldn't block the description.
  // order=relevance lists a pinned comment first; the channel owner is who pins it, so we keep owner comments.
  let ownerComments: string[] = [];
  let otherComments: string[] = [];
  try {
    const threads = await api<any>(
      "commentThreads",
      { part: "snippet", videoId, order: "relevance", maxResults: "50", textFormat: "plainText" },
      key,
    );
    const tops = (threads.items ?? []).map((t: any) => t.snippet?.topLevelComment?.snippet).filter(Boolean);
    ownerComments = tops
      .filter((c: any) => c.authorChannelId?.value === channelId)
      .map((c: any) => String(c.textDisplay))
      .slice(0, 3);
    otherComments = tops
      .filter((c: any) => c.authorChannelId?.value !== channelId && String(c.textDisplay).length >= 200)
      .map((c: any) => String(c.textDisplay))
      .slice(0, 3);
  } catch {
    /* comments off or unavailable */
  }

  const thumbs = sn.thumbnails ?? {};
  const thumb = thumbs.maxres?.url ?? thumbs.standard?.url ?? thumbs.high?.url ?? thumbs.medium?.url ?? null;

  return {
    videoId,
    title: String(sn.title ?? ""),
    channelTitle: String(sn.channelTitle ?? ""),
    description: String(sn.description ?? ""),
    ownerComments,
    otherComments,
    thumbnailUrl: typeof thumb === "string" && thumb.startsWith("https://") ? thumb : null,
  };
}
