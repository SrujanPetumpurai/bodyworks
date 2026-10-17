import { useMemo, useState } from "react";
import AccountMenu from "../AccountMenu";
import Avatar from "../recipes/Avatar";
import RecipeCard from "../recipes/RecipeCard";
import RecipeModal from "../recipes/RecipeModal";
import type { RecipeSummary } from "../recipes/RecipesBrowser";

export type CommunityData = {
  slug: string;
  name: string;
  description: string | null;
  visibility: "public" | "private";
  memberCount: number;
  isMember: boolean;
  isOwner: boolean;
  inviteCode: string | null;
  ownerName: string | null;
};

const UNSORTED = "Not sorted yet";

function Stars({ value, count }: { value: number; count: number }) {
  const filled = Math.round(value);
  return (
    <span className="rb-stars" aria-label={count ? `${value.toFixed(1)} out of 5` : "No ratings yet"}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= filled ? "on" : ""}>★</span>
      ))}
      <small>{count ? `(${count})` : ""}</small>
    </span>
  );
}

// one cook's take on a dish, laid out so versions can be compared at a glance
function Version({ r, top, onOpen }: { r: RecipeSummary; top: boolean; onOpen: () => void }) {
  return (
    <article className="cm-version">
      <header>
        <a href={`/profile/${r.authorId}`} className="cm-cook">
          <Avatar name={r.authorName ?? "bodyworks"} image={r.authorImage} />
          <span>{r.authorName ?? "Unknown cook"}</span>
        </a>
        {top && <span className="cm-badge cm-badge-top">Top rated</span>}
        {r.visibility === "private" && <span className="cm-badge">Only you</span>}
      </header>
      <h3>{r.name}</h3>
      <dl className="cm-facts">
        <div><dt>Time</dt><dd>{r.prepTimeMinutes ? `${r.prepTimeMinutes} min` : "—"}</dd></div>
        <div><dt>Level</dt><dd>{r.difficulty ?? "—"}</dd></div>
        <div><dt>Rating</dt><dd><Stars value={r.avgRating} count={r.ratingCount} /></dd></div>
      </dl>
      <p className="cm-ings">{r.ingredientNames.join(" · ")}</p>
      <button type="button" className="rb-btn" onClick={onOpen}>Open recipe</button>
    </article>
  );
}

export default function CommunityView({
  community,
  recipes,
  signedIn,
}: {
  community: CommunityData;
  recipes: RecipeSummary[];
  signedIn: boolean;
}) {
  const [mode, setMode] = useState<"dish" | "cook">("dish");
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState(community.inviteCode);
  const [copied, setCopied] = useState(false);

  const byDish = useMemo(() => {
    const map = new Map<string, RecipeSummary[]>();
    for (const r of recipes) {
      const key = r.dishName ?? UNSORTED;
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    // biggest dishes first, "not sorted" always last
    return [...map.entries()].sort(([a, x], [b, y]) =>
      a === UNSORTED ? 1 : b === UNSORTED ? -1 : y.length - x.length || a.localeCompare(b),
    );
  }, [recipes]);

  const byCook = useMemo(() => {
    const map = new Map<string, { id: string | null; name: string; image: string | null; list: RecipeSummary[] }>();
    for (const r of recipes) {
      const key = r.authorId ?? "none";
      const entry = map.get(key) ?? { id: r.authorId, name: r.authorName ?? "Unknown cook", image: r.authorImage, list: [] };
      entry.list.push(r);
      map.set(key, entry);
    }
    return [...map.values()].sort((a, b) => b.list.length - a.list.length || a.name.localeCompare(b.name));
  }, [recipes]);

  const [dish, setDish] = useState<string | null>(null);
  const activeDish = byDish.find(([name]) => name === dish) ?? byDish[0];

  async function call(url: string, method: string) {
    setBusy(true);
    setMsg(null);
    const res = await fetch(url, { method }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      setMsg(data?.error || "Something went wrong. Try again.");
      return null;
    }
    return data;
  }

  async function join() {
    if (!signedIn) return (location.href = `/auth?next=/communities/${community.slug}`);
    if (await call(`/api/communities/${community.slug}/join`, "POST")) location.reload();
  }
  async function leave() {
    if (!confirm("Leave this community? You'll lose access to its members-only recipes.")) return;
    if (await call(`/api/communities/${community.slug}/join`, "DELETE")) {
      location.href = "/communities";
    }
  }
  async function newInvite() {
    if (!confirm("Make a new invite link? The old one will stop working.")) return;
    const data = await call(`/api/communities/${community.slug}/invite`, "POST");
    if (data?.code) setCode(data.code);
  }
  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(`${location.origin}/communities/join/${code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setMsg("Couldn't copy. Select the link and copy it by hand.");
    }
  }

  const topRated = (list: RecipeSummary[]) => {
    const rated = list.filter((r) => r.ratingCount > 0);
    if (rated.length < 2) return null;
    return rated.reduce((a, b) => (b.avgRating > a.avgRating ? b : a)).slug;
  };

  return (
    <div className="rb-page">
      <header className="rb-topbar">
        <a href="/" className="rb-wordmark">BODYWORKS<span>.</span></a>
        <nav className="rb-nav" aria-label="Main">
          <a href="/workouts">Workouts</a>
          <a href="/recipes" aria-current="page">Recipes</a>
        </nav>
        <AccountMenu />
      </header>

      <section className="rb-hero cm-head">
        <p className="cm-crumb"><a href="/communities">Communities</a></p>
        <div className="cm-title-row">
          <h1 className="rb-title">{community.name}</h1>
          <span className={`cm-badge ${community.visibility === "private" ? "cm-badge-private" : ""}`}>
            {community.visibility === "private" ? "Private" : "Public"}
          </span>
        </div>
        {community.description && <p className="rb-lede">{community.description}</p>}
        <p className="cm-meta">
          {community.memberCount} {community.memberCount === 1 ? "member" : "members"}
          {community.ownerName && <> · started by {community.ownerName}</>}
        </p>

        <div className="cm-actions">
          {community.isMember ? (
            <>
              <a className="rb-btn rb-btn-solid" href={`/recipes/new?community=${community.slug}`}>Add a recipe</a>
              {!community.isOwner && (
                <button className="rb-btn" disabled={busy} onClick={leave}>Leave</button>
              )}
            </>
          ) : (
            <button className="rb-btn rb-btn-solid" disabled={busy} onClick={join}>
              {signedIn ? "Join community" : "Sign in to join"}
            </button>
          )}
        </div>

        {community.isOwner && code && (
          <div className="cm-invite">
            <span className="rb-field-label">Invite link</span>
            <div className="cm-invite-row">
              <input readOnly value={`/communities/join/${code}`} aria-label="Invite link" onFocus={(e) => e.currentTarget.select()} />
              <button className="rb-btn" onClick={copyInvite}>{copied ? "Copied" : "Copy link"}</button>
              <button className="rb-btn" disabled={busy} onClick={newInvite}>New link</button>
            </div>
            <p className="rb-hint">Anyone with this link can join{community.visibility === "private" ? ", so only share it with people you trust" : ""}.</p>
          </div>
        )}
        {msg && <p className="rb-msg" role="alert">{msg}</p>}
      </section>

      <main className="rb-container">
        {recipes.length === 0 ? (
          <p className="rb-empty">
            No recipes here yet.{" "}
            {community.isMember ? <a href={`/recipes/new?community=${community.slug}`}>Add the first one.</a> : "Join to add the first one."}
          </p>
        ) : (
          <>
            <div className="cm-toggle" role="tablist" aria-label="Group recipes">
              <button role="tab" aria-selected={mode === "dish"} className={mode === "dish" ? "on" : ""} onClick={() => setMode("dish")}>
                By dish
              </button>
              <button role="tab" aria-selected={mode === "cook"} className={mode === "cook" ? "on" : ""} onClick={() => setMode("cook")}>
                By cook
              </button>
            </div>

            {mode === "dish" && activeDish && (
              <div className="cm-box">
                <nav className="cm-dividers" aria-label="Dishes">
                  {byDish.map(([name, list]) => (
                    <button
                      key={name}
                      className={name === activeDish[0] ? "on" : ""}
                      aria-current={name === activeDish[0] ? "true" : undefined}
                      onClick={() => setDish(name)}
                    >
                      <span>{name}</span>
                      <small>{list.length}</small>
                    </button>
                  ))}
                </nav>
                <section className="cm-drawer" aria-label={activeDish[0]}>
                  <h2>{activeDish[0]}</h2>
                  <p className="cm-meta">
                    {activeDish[1].length} {activeDish[1].length === 1 ? "version" : "versions"}
                  </p>
                  <div className="cm-versions">
                    {activeDish[1].map((r) => (
                      <Version key={r.slug} r={r} top={topRated(activeDish[1]) === r.slug} onOpen={() => setActiveSlug(r.slug)} />
                    ))}
                  </div>
                </section>
              </div>
            )}

            {mode === "cook" &&
              byCook.map((cook) => (
                <section className="cm-cook-section" key={cook.id ?? "none"}>
                  <h2>
                    <Avatar name={cook.name} image={cook.image} />
                    {cook.id ? <a href={`/profile/${cook.id}`}>{cook.name}</a> : cook.name}
                    <small>{cook.list.length} {cook.list.length === 1 ? "recipe" : "recipes"}</small>
                  </h2>
                  <div className="rb-grid">
                    {cook.list.map((r) => (
                      <RecipeCard key={r.slug} recipe={r} onClick={() => setActiveSlug(r.slug)} />
                    ))}
                  </div>
                </section>
              ))}
          </>
        )}
      </main>

      {activeSlug && <RecipeModal slug={activeSlug} onClose={() => setActiveSlug(null)} />}
    </div>
  );
}
