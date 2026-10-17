import { useMemo, useState } from "react";
import AccountMenu from "../AccountMenu";
import ImageUpload from "../forms/ImageUpload";
import Avatar, { TONES, hash } from "../recipes/Avatar";
import RecipeCard from "../recipes/RecipeCard";
import RecipeModal from "../recipes/RecipeModal";
import type { RecipeSummary } from "../recipes/RecipesBrowser";

type Profile = {
  id: string;
  name: string;
  image: string | null;
  banner: string | null;
  joinedAt: string;
};
type Tab = "home" | "recipes";
type Sort = "recent" | "top";

const TABS: { id: Tab; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "recipes", label: "Recipes" },
];
const SORTS: { id: Sort; label: string }[] = [
  { id: "recent", label: "Recent" },
  { id: "top", label: "Top rated" },
];

const byRecent = (a: RecipeSummary, b: RecipeSummary) => b.createdAt.localeCompare(a.createdAt);
const byTop = (a: RecipeSummary, b: RecipeSummary) =>
  b.avgRating - a.avgRating || b.ratingCount - a.ratingCount || byRecent(a, b);

export default function ProfileView({
  profile,
  isOwner,
  recipes,
  initialTab,
  initialSort,
}: {
  profile: Profile;
  isOwner: boolean;
  recipes: RecipeSummary[];
  initialTab: Tab;
  initialSort: Sort;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [sort, setSort] = useState<Sort>(initialSort);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const recent = useMemo(() => [...recipes].sort(byRecent), [recipes]);
  const top = useMemo(() => [...recipes].filter((r) => r.ratingCount > 0).sort(byTop), [recipes]);
  const sorted = sort === "top" ? [...recipes].sort(byTop) : recent;

  const rated = recipes.filter((r) => r.ratingCount > 0);
  const overall = rated.length ? rated.reduce((sum, r) => sum + r.avgRating, 0) / rated.length : 0;
  const joined = new Date(profile.joinedAt).toLocaleDateString("en", { month: "short", year: "numeric" });

  function update(nextTab: Tab, nextSort: Sort) {
    setTab(nextTab);
    setSort(nextSort);
    const q = new URLSearchParams();
    if (nextTab === "recipes") q.set("tab", "recipes");
    if (nextTab === "recipes" && nextSort === "top") q.set("sort", "top");
    const qs = q.toString();
    history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
  }

  const c1 = TONES[hash(profile.name) % TONES.length];
  const c2 = TONES[(hash(profile.name) + 1) % TONES.length];
  const bannerStyle = profile.banner
    ? { backgroundImage: `url(${profile.banner})` }
    : { backgroundImage: `linear-gradient(120deg, ${c1}, ${c2})` };

  return (
    <div className="rb-page pf-page">
      <header className="pf-topbar">
        <a href="/recipes" className="rb-logo">BODYWORKS<span>.</span></a>
        <a href="/recipes" className="pf-back">← All recipes</a>
        <AccountMenu />
      </header>

      <div className="pf-wrap">
        <div className="pf-banner" style={bannerStyle} role="img" aria-label={`${profile.name}'s banner`} />

        <section className="pf-head">
          <Avatar name={profile.name} image={profile.image} size={128} />
          <div className="pf-meta">
            <h1>{profile.name}</h1>
            <p className="pf-stats">
              {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}
              {rated.length > 0 && <> · ★ {overall.toFixed(1)} average</>}
              {" · "}Joined {joined}
            </p>
          </div>
          {isOwner && (
            <div className="pf-owner-actions">
              <button type="button" className="rb-btn" onClick={() => setEditing((e) => !e)}>
                {editing ? "Close" : "Customize profile"}
              </button>
              <a className="rb-btn rb-btn-solid" href="/recipes/new">+ Add recipe</a>
            </div>
          )}
        </section>

        {isOwner && editing && <ProfileEditor profile={profile} onDone={() => location.reload()} />}

        <nav className="pf-tabs" role="tablist" aria-label="Profile sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? "on" : ""}
              onClick={() => update(t.id, sort)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {recipes.length === 0 ? (
          <p className="rb-empty">
            {isOwner ? (
              <>You haven't posted any recipes yet. <a href="/recipes/new">Add your first one</a>.</>
            ) : (
              <>{profile.name} hasn't posted any recipes yet.</>
            )}
          </p>
        ) : tab === "home" ? (
          <div className="pf-home">
            <Shelf
              title="Latest"
              recipes={recent.slice(0, 3)}
              onOpen={setActiveSlug}
              onMore={() => update("recipes", "recent")}
              moreLabel="View all"
            />
            {top.length > 0 && (
              <Shelf
                title="Top rated"
                recipes={top.slice(0, 3)}
                onOpen={setActiveSlug}
                onMore={() => update("recipes", "top")}
                moreLabel="See more"
              />
            )}
          </div>
        ) : (
          <>
            <div className="pf-sorts" role="group" aria-label="Sort recipes">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={sort === s.id ? "on" : ""}
                  aria-pressed={sort === s.id}
                  onClick={() => update("recipes", s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="rb-grid pf-grid">
              {sorted.map((r) => (
                <RecipeCard key={r.slug} recipe={r} onClick={() => setActiveSlug(r.slug)} />
              ))}
            </div>
          </>
        )}
      </div>

      {activeSlug && <RecipeModal slug={activeSlug} onClose={() => setActiveSlug(null)} />}
    </div>
  );
}

function Shelf({
  title,
  recipes,
  onOpen,
  onMore,
  moreLabel,
}: {
  title: string;
  recipes: RecipeSummary[];
  onOpen: (slug: string) => void;
  onMore: () => void;
  moreLabel: string;
}) {
  return (
    <section className="pf-shelf">
      <div className="pf-shelf-head">
        <h2>{title}</h2>
        <button type="button" onClick={onMore}>{moreLabel} →</button>
      </div>
      <div className="rb-grid pf-grid">
        {recipes.map((r) => (
          <RecipeCard key={r.slug} recipe={r} onClick={() => onOpen(r.slug)} />
        ))}
      </div>
    </section>
  );
}


function ProfileEditor({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const [name, setName] = useState(profile.name);
  const [image, setImage] = useState<string | null>(profile.image);
  const [banner, setBanner] = useState<string | null>(profile.banner);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setError(null);
    setBusy(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, image, banner }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res || !res.ok) {
      setBusy(false);
      return setError(data?.error || "Couldn't save. Try again.");
    }
    onDone();
  }

  return (
    <section className="pe" aria-label="Customize profile">
      <label className="af-field">
        Display name
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      </label>
      <ImageUpload label="Profile picture" shape="round" value={image} onChange={setImage} />
      <ImageUpload label="Banner (wide image works best)" value={banner} onChange={setBanner} />
      {error && <p className="rb-msg" role="alert">{error}</p>}
      <div>
        <button type="button" className="rb-btn rb-btn-solid" disabled={busy || !name.trim()} onClick={save}>
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </section>
  );
}
