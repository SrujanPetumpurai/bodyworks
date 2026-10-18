import { useEffect, useMemo, useState } from "react";
import AccountMenu from "../AccountMenu";
import ImageUpload from "../forms/ImageUpload";
import Avatar, { TONES, hash } from "../recipes/Avatar";
import RecipeCard, { type CardAction } from "../recipes/RecipeCard";
import RecipeModal from "../recipes/RecipeModal";
import type { RecipeSummary } from "../recipes/RecipesBrowser";

type Profile = {
  id: string;
  name: string;
  image: string | null;
  banner: string | null;
  joinedAt: string;
};
type Tab = "home" | "recipes" | "saved";
type Sort = "recent" | "top";

const TABS: { id: Tab; label: string; ownerOnly?: boolean }[] = [
  { id: "home", label: "Home" },
  { id: "recipes", label: "Recipes" },
  { id: "saved", label: "Saved", ownerOnly: true },
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
  viewerId,
  recipes: initialRecipes,
  savedRecipes: initialSaved,
  savedSlugs,
  initialTab,
  initialSort,
}: {
  profile: Profile;
  isOwner: boolean;
  viewerId: string | null;
  recipes: RecipeSummary[];
  savedRecipes: RecipeSummary[];
  savedSlugs: string[];
  initialTab: Tab;
  initialSort: Sort;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [sort, setSort] = useState<Sort>(initialSort);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  // lists live in state so delete / unsave update the page without a reload
  const [recipes, setRecipes] = useState(initialRecipes);
  const [savedList, setSavedList] = useState(initialSaved);
  const [saved, setSaved] = useState<Set<string>>(() => new Set(savedSlugs));
  const [toDelete, setToDelete] = useState<RecipeSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

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
    if (nextTab !== "home") q.set("tab", nextTab);
    if (nextTab === "recipes" && nextSort === "top") q.set("sort", "top");
    const qs = q.toString();
    history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
  }

  useEffect(() => {
    if (!toDelete || busy) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setToDelete(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toDelete, busy]);

  async function toggleSave(r: RecipeSummary) {
    const next = !saved.has(r.slug);
    setNotice(null);
    const res = await fetch(`/api/recipes/${r.slug}/save`, { method: next ? "POST" : "DELETE" }).catch(() => null);
    if (!res || !res.ok) return setNotice("Couldn't update your saved recipes.");
    setSaved((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(r.slug);
      else copy.delete(r.slug);
      return copy;
    });
    // saving from someone else's profile shouldn't need a reload to show up under Saved
    setSavedList((list) => (next ? (list.some((x) => x.slug === r.slug) ? list : [r, ...list]) : list.filter((x) => x.slug !== r.slug)));
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setBusy(true);
    setNotice(null);
    const res = await fetch(`/api/recipes/${toDelete.slug}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      setToDelete(null);
      return setNotice("Couldn't delete the recipe. Try again.");
    }
    const slug = toDelete.slug;
    setRecipes((list) => list.filter((x) => x.slug !== slug));
    setSavedList((list) => list.filter((x) => x.slug !== slug));
    setToDelete(null);
  }

  // what the ⋯ menu offers: your own recipes can be edited or deleted; anyone else's can be saved
  function actionsFor(r: RecipeSummary): CardAction[] {
    if (!viewerId) return [];
    if (r.authorId === viewerId) {
      return [
        { label: "Edit", href: `/recipes/${r.slug}/edit` },
        { label: "Delete", danger: true, onClick: () => setToDelete(r) },
      ];
    }
    return [{ label: saved.has(r.slug) ? "Remove from saved" : "Save", onClick: () => toggleSave(r) }];
  }

  const card = (r: RecipeSummary) => (
    <RecipeCard key={r.slug} recipe={r} onClick={() => setActiveSlug(r.slug)} actions={actionsFor(r)} />
  );

  const c1 = TONES[hash(profile.name) % TONES.length];
  const c2 = TONES[(hash(profile.name) + 1) % TONES.length];
  const bannerStyle = profile.banner
    ? { backgroundImage: `url(${profile.banner})` }
    : { backgroundImage: `linear-gradient(120deg, ${c1}, ${c2})` };

  return (
    <div className="rb-page pf-page">
      <header className="pf-topbar">
        <a href="/recipes" className="rb-logo">
          bodyworks
        </a>
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
          {TABS.filter((t) => !t.ownerOnly || isOwner).map((t) => (
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

        {notice && <p className="rb-msg" role="alert">{notice}</p>}

        {tab === "saved" && isOwner ? (
          savedList.length === 0 ? (
            <p className="rb-empty">
              Nothing saved yet. <a href="/recipes#discover">Discover recipes</a> and choose Save from the ⋯ menu on the ones you like.
            </p>
          ) : (
            <div className="rb-grid pf-grid">{savedList.map(card)}</div>
          )
        ) : recipes.length === 0 ? (
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
              renderCard={card}
              onMore={() => update("recipes", "recent")}
              moreLabel="View all"
            />
            {top.length > 0 && (
              <Shelf
                title="Top rated"
                recipes={top.slice(0, 3)}
                renderCard={card}
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
              {sorted.map(card)}
            </div>
          </>
        )}
      </div>

      {activeSlug && <RecipeModal slug={activeSlug} onClose={() => setActiveSlug(null)} />}

      {toDelete && (
        <div className="rb-overlay open" onClick={(e) => e.target === e.currentTarget && !busy && setToDelete(null)}>
          <div className="rb-confirm" role="alertdialog" aria-modal="true" aria-labelledby="rb-confirm-title" aria-describedby="rb-confirm-text">
            <h2 id="rb-confirm-title">Delete recipe?</h2>
            <p id="rb-confirm-text">
              “{toDelete.name}” will be removed for good, along with its ratings and cook log. This can't be undone.
            </p>
            <div className="rb-confirm-actions">
              <button type="button" className="rb-btn" onClick={() => setToDelete(null)} disabled={busy} autoFocus>Cancel</button>
              <button type="button" className="rb-btn rb-btn-danger" onClick={confirmDelete} disabled={busy}>
                {busy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Shelf({
  title,
  recipes,
  renderCard,
  onMore,
  moreLabel,
}: {
  title: string;
  recipes: RecipeSummary[];
  renderCard: (r: RecipeSummary) => React.ReactNode;
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
        {recipes.map(renderCard)}
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
