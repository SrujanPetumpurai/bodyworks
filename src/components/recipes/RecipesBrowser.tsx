import { useEffect, useMemo, useState } from "react";
import AccountMenu from "../AccountMenu";
import Avatar from "./Avatar";
import MealPlanner from "./MealPlanner";
import RecipeCard from "./RecipeCard";
import RecipeModal from "./RecipeModal";

type Food = { slug: string; name: string };
export type RecipeSummary = {
  slug: string;
  name: string;
  description: string;
  imageUrl: string | null;
  cuisine: string | null;
  authorId: string | null;
  authorName: string | null;
  authorImage: string | null;
  avgRating: number;
  ratingCount: number;
  ingredientSlugs: string[];
  ingredientNames: string[];
  createdAt: string;
  visibility: "private" | "community" | "public";
  prepTimeMinutes: number | null;
  difficulty: "easy" | "medium" | "hard" | null;
  dishId: number | null;
  dishName: string | null;
};

const RATING_OPTIONS = [
  { label: "Any", value: 0 },
  { label: "3★ & up", value: 3 },
  { label: "4★ & up", value: 4 },
];

type Tab = "mine" | "browse" | "plan";
type MineView = "created" | "saved";

export default function RecipesBrowser({
  foods,
  recipes,
  signedIn,
  userId,
  savedSlugs,
}: {
  foods: Food[];
  recipes: RecipeSummary[];
  signedIn: boolean;
  userId: string | null;
  savedSlugs: string[];
}) {
  // signed-in users land on their own recipes; visitors have none, so they land on Discover
  const [tab, setTab] = useState<Tab>(signedIn ? "mine" : "browse");
  const [mineView, setMineView] = useState<MineView>("created");
  const [saved, setSaved] = useState<Set<string>>(() => new Set(savedSlugs));
  const [saveError, setSaveError] = useState<string | null>(null);

  // deep links: /recipes#plan and /recipes#discover (read after mount so server and client render match)
  useEffect(() => {
    if (location.hash === "#plan") setTab("plan");
    else if (location.hash === "#discover") setTab("browse");
  }, []);

  function switchTab(next: Tab) {
    setTab(next);
    const hash = next === "plan" ? "#plan" : next === "browse" && signedIn ? "#discover" : "";
    history.replaceState(null, "", location.pathname + location.search + hash);
  }

  function onSavedChange(slug: string, isSaved: boolean) {
    setSaved((prev) => {
      const next = new Set(prev);
      if (isSaved) next.add(slug);
      else next.delete(slug);
      return next;
    });
  }

  async function toggleSave(slug: string) {
    const next = !saved.has(slug);
    setSaveError(null);
    const res = await fetch(`/api/recipes/${slug}/save`, { method: next ? "POST" : "DELETE" }).catch(() => null);
    if (!res || !res.ok) return setSaveError("Couldn't update your saved recipes.");
    onSavedChange(slug, next);
  }

  const mine = useMemo(() => recipes.filter((r) => userId && r.authorId === userId), [recipes, userId]);
  const savedList = useMemo(() => recipes.filter((r) => saved.has(r.slug)), [recipes, saved]);
  // what the meal plan can draw from: everything the user wrote or saved
  const plannable = useMemo(() => {
    const seen = new Set<string>();
    return [...mine, ...savedList].filter((r) => !seen.has(r.slug) && !!seen.add(r.slug));
  }, [mine, savedList]);

  const base = tab === "mine" ? (mineView === "created" ? mine : savedList) : recipes;

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [ingredientInput, setIngredientInput] = useState("");
  const [authorId, setAuthorId] = useState<string>("all");
  const [minRating, setMinRating] = useState(0);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  // everyone who has posted at least one recipe
  const authors = useMemo(() => {
    const map = new Map<string, { id: string; name: string; image: string | null }>();
    for (const r of recipes) {
      if (r.authorId && r.authorName && !map.has(r.authorId)) {
        map.set(r.authorId, { id: r.authorId, name: r.authorName, image: r.authorImage });
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [recipes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return base.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q)) return false;
      if (selected.length && !selected.every((s) => r.ingredientSlugs.includes(s))) return false;
      if (authorId !== "all" && r.authorId !== authorId) return false;
      if (minRating && r.avgRating < minRating) return false;
      return true;
    });
  }, [base, query, selected, authorId, minRating]);

  const available = foods.filter((f) => !selected.includes(f.slug));

  const [ingredientMsg, setIngredientMsg] = useState<string | null>(null);

  // most-used ingredients across recipes, as one-click suggestions
  const popular = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of recipes) for (const slug of r.ingredientSlugs) counts.set(slug, (counts.get(slug) ?? 0) + 1);
    return foods
      .filter((f) => !selected.includes(f.slug))
      .sort((a, b) => (counts.get(b.slug) ?? 0) - (counts.get(a.slug) ?? 0))
      .slice(0, 8);
  }, [recipes, foods, selected]);

  function addIngredient(raw: string) {
    const q = raw.trim().toLowerCase();
    if (!q) return;
    // exact name first, then the first food whose name contains what was typed
    const match =
      available.find((f) => f.name.toLowerCase() === q) ??
      available.find((f) => f.name.toLowerCase().includes(q));
    if (!match) {
      setIngredientMsg(
        foods.some((f) => f.name.toLowerCase().includes(q))
          ? "Already added."
          : `No ingredient matches "${raw.trim()}".`,
      );
      return;
    }
    setSelected((s) => [...s, match.slug]);
    setIngredientInput("");
    setIngredientMsg(null);
  }

  // picking a suggestion from the datalist fills the exact name: add it straight away
  function onIngredientChange(value: string) {
    setIngredientMsg(null);
    if (available.some((f) => f.name.toLowerCase() === value.trim().toLowerCase())) addIngredient(value);
    else setIngredientInput(value);
  }

  return (
    <div className="rb-page">
      <header className="rb-topbar">
        <a href="/" className="rb-wordmark">bodyworks</a>
        <nav className="rb-nav" aria-label="Main">
          <a href="/workouts">Workouts</a>
          <a href="/recipes" aria-current="page">Recipes</a>
          <a href="/communities">Communities</a>
        </nav>
        <AccountMenu />
      </header>

      <div className="mp-tabbar">
        <div className="mp-tabs" role="tablist" aria-label="Recipes sections">
          {signedIn && (
            <button type="button" role="tab" aria-selected={tab === "mine"} className={tab === "mine" ? "on" : ""} onClick={() => switchTab("mine")}>
              My recipes
            </button>
          )}
          <button type="button" role="tab" aria-selected={tab === "browse"} className={tab === "browse" ? "on" : ""} onClick={() => switchTab("browse")}>
            Discover
          </button>
          <button type="button" role="tab" aria-selected={tab === "plan"} className={tab === "plan" ? "on" : ""} onClick={() => switchTab("plan")}>
            Meal plan
          </button>
        </div>
      </div>

      {tab === "plan" ? (
        <MealPlanner recipes={plannable} signedIn={signedIn} />
      ) : (
        <>
      <section className="rb-hero">
        <h1 className="rb-title">{tab === "mine" ? "My recipes" : "Discover"}</h1>
        <p className="rb-lede">
          {tab === "mine"
            ? "Everything you've written or saved. Saved recipes show up in your meal plan too."
            : "High-protein meals from other cooks. Save the ones you like to plan with them."}
        </p>
        {tab === "mine" && (
          <div className="rb-subtabs" role="group" aria-label="Which recipes">
            <button type="button" className={mineView === "created" ? "on" : ""} onClick={() => setMineView("created")}>
              Created by me ({mine.length})
            </button>
            <button type="button" className={mineView === "saved" ? "on" : ""} onClick={() => setMineView("saved")}>
              Saved ({savedList.length})
            </button>
          </div>
        )}

        <div className="rb-controls">
          <div>
            <label className="rb-field-label" htmlFor="rb-search">Search</label>
            <input
              id="rb-search"
              className="rb-search"
              type="search"
              placeholder="Search recipes"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div>
            <label className="rb-field-label" htmlFor="rb-ing">Ingredients you have</label>
            <div className="rb-ing-field">
              {selected.map((slug) => {
                const name = foods.find((f) => f.slug === slug)?.name ?? slug;
                return (
                  <button
                    key={slug}
                    type="button"
                    className="rb-chip"
                    onClick={() => setSelected((s) => s.filter((x) => x !== slug))}
                    aria-label={`Remove ${name}`}
                  >
                    {name} ×
                  </button>
                );
              })}
              <input
                id="rb-ing"
                className="rb-ing-input"
                list="rb-food-list"
                placeholder={selected.length ? "Add another…" : "Type an ingredient, press Enter"}
                value={ingredientInput}
                onChange={(e) => onIngredientChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addIngredient(ingredientInput);
                  } else if (e.key === "Backspace" && !ingredientInput && selected.length) {
                    setSelected((s) => s.slice(0, -1));
                  }
                }}
              />
              <datalist id="rb-food-list">
                {available.map((f) => (
                  <option key={f.slug} value={f.name} />
                ))}
              </datalist>
              <button type="button" className="rb-add-btn" onClick={() => addIngredient(ingredientInput)}>
                Add
              </button>
            </div>
            {ingredientMsg ? (
              <p className="rb-hint warn" role="status">{ingredientMsg}</p>
            ) : selected.length > 0 ? (
              <p className="rb-hint">Showing recipes that use all {selected.length} of these.</p>
            ) : null}
            {popular.length > 0 && (
              <div className="rb-suggest">
                <span>Popular:</span>
                {popular.map((f) => (
                  <button key={f.slug} type="button" onClick={() => addIngredient(f.name)}>
                    + {f.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="rb-container">
        <div className="rb-body">
          <aside className="rb-filter">
            <h2>Filter</h2>

            {!(tab === "mine" && mineView === "created") && (
              <>
                <h3>Profile</h3>
                <button
                  type="button"
                  className={`rb-profile ${authorId === "all" ? "on" : ""}`}
                  onClick={() => setAuthorId("all")}
                >
                  <span className="rb-profile-all">All</span>
                  Everyone
                </button>
                {authors.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={`rb-profile ${authorId === a.id ? "on" : ""}`}
                    onClick={() => setAuthorId(authorId === a.id ? "all" : a.id)}
                  >
                    <Avatar name={a.name} image={a.image} size={28} />
                    {a.name}
                  </button>
                ))}
              </>
            )}

            <h3>Rating</h3>
            {RATING_OPTIONS.map((o) => (
              <label key={o.value} className="rb-radio">
                <input
                  type="radio"
                  name="rating"
                  checked={minRating === o.value}
                  onChange={() => setMinRating(o.value)}
                />
                {o.label}
              </label>
            ))}
          </aside>

          <section>
            <div className="rb-results-head">
              <span>{filtered.length} {filtered.length === 1 ? "recipe" : "recipes"}</span>
              {tab === "mine" && <a className="rb-btn rb-btn-solid" href="/recipes/new">+ Add recipe</a>}
            </div>
            {saveError && <p className="rb-msg" role="alert">{saveError}</p>}
            {filtered.length === 0 ? (
              base.length === 0 && tab === "mine" ? (
                <p className="rb-empty">
                  {mineView === "created" ? (
                    <>You haven't added any recipes yet. <a href="/recipes/new">Add your first one</a> or <button type="button" className="rb-linkbtn" onClick={() => switchTab("browse")}>discover recipes from others</button>.</>
                  ) : (
                    <>Nothing saved yet. <button type="button" className="rb-linkbtn" onClick={() => switchTab("browse")}>Discover recipes</button> and tap the bookmark on the ones you like.</>
                  )}
                </p>
              ) : (
                <p className="rb-empty">No recipes match. Try removing a filter.</p>
              )
            ) : (
              <div className="rb-grid">
                {filtered.map((r) => (
                  <RecipeCard
                    key={r.slug}
                    recipe={r}
                    onClick={() => setActiveSlug(r.slug)}
                    saveState={signedIn && r.authorId !== userId ? (saved.has(r.slug) ? "saved" : "unsaved") : undefined}
                    onToggleSave={() => toggleSave(r.slug)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {activeSlug && (
        <RecipeModal
          slug={activeSlug}
          onClose={() => setActiveSlug(null)}
          saved={saved.has(activeSlug)}
          onSavedChange={onSavedChange}
        />
      )}
        </>
      )}
    </div>
  );
}