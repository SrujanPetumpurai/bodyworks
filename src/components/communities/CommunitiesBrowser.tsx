import { useState } from "react";
import AccountMenu from "../AccountMenu";
import type { CommunitySummary } from "../../db/communities";

function CommunityCard({ c }: { c: CommunitySummary }) {
  return (
    <a className="cm-card" href={`/communities/${c.slug}`}>
      <div className="cm-card-top">
        <h3>{c.name}</h3>
        {c.visibility === "private" && <span className="cm-badge cm-badge-private">Private</span>}
      </div>
      {c.description && <p>{c.description}</p>}
      <small>
        {c.memberCount} {c.memberCount === 1 ? "member" : "members"} · {c.recipeCount} {c.recipeCount === 1 ? "recipe" : "recipes"}
      </small>
    </a>
  );
}

export default function CommunitiesBrowser({
  mine,
  publicList,
  signedIn,
}: {
  mine: CommunitySummary[];
  publicList: CommunitySummary[];
  signedIn: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  const mineSlugs = new Set(mine.map((c) => c.slug));
  const q = query.trim().toLowerCase();
  const discover = publicList.filter(
    (c) => !mineSlugs.has(c.slug) && (!q || c.name.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q)),
  );

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/communities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, visibility }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res || !res.ok) {
      setBusy(false);
      return setError(data?.error || "Couldn't create it. Check your connection and try again.");
    }
    location.href = `/communities/${data.slug}`;
  }

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

      <section className="rb-hero">
        <h1 className="rb-title">Communities</h1>
        <p className="rb-lede">Cook together. Keep a family's recipes in one box, or share a dish with the world.</p>
        {signedIn ? (
          !creating && <button className="rb-btn rb-btn-solid" onClick={() => setCreating(true)}>Start a community</button>
        ) : (
          <a className="rb-btn rb-btn-solid" href="/auth?next=/communities">Sign in to start one</a>
        )}

        {creating && (
          <form className="rf cm-create" onSubmit={create}>
            <label className="af-field">
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} placeholder="e.g. Rao family kitchen" />
            </label>
            <label className="af-field">
              About (optional)
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} rows={2} />
            </label>
            <fieldset className="cm-choice">
              <legend>Who can see it?</legend>
              <label>
                <input type="radio" name="vis" checked={visibility === "public"} onChange={() => setVisibility("public")} />
                <span><strong>Public</strong> Anyone can find it, read it and join.</span>
              </label>
              <label>
                <input type="radio" name="vis" checked={visibility === "private"} onChange={() => setVisibility("private")} />
                <span><strong>Private</strong> Hidden from search. Only people you invite can join and see recipes.</span>
              </label>
            </fieldset>
            {error && <p className="rb-msg" role="alert">{error}</p>}
            <div className="rf-actions">
              <button className="rb-btn rb-btn-solid" disabled={busy}>{busy ? "Creating…" : "Create community"}</button>
              <button type="button" className="rb-btn" onClick={() => setCreating(false)}>Cancel</button>
            </div>
          </form>
        )}
      </section>

      <main className="rb-container">
        {mine.length > 0 && (
          <section className="cm-section">
            <h2>Your communities</h2>
            <div className="cm-cards">{mine.map((c) => <CommunityCard key={c.slug} c={c} />)}</div>
          </section>
        )}

        <section className="cm-section">
          <h2>Discover</h2>
          <input
            className="rb-search cm-search"
            placeholder="Search communities"
            aria-label="Search communities"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {discover.length === 0 ? (
            <p className="rb-empty">{q ? "No communities match that." : "No public communities yet. Start the first one."}</p>
          ) : (
            <div className="cm-cards">{discover.map((c) => <CommunityCard key={c.slug} c={c} />)}</div>
          )}
        </section>
      </main>
    </div>
  );
}
