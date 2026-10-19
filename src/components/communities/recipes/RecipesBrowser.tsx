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

type View = "recipes" | "discover";
type Show = "all" | "created" | "saved";

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
  // signed-in users land on their own recipes (meal plan underneath); visitors have none, so they land on Discover
  const [view, setView] = useState<View>(signedIn ? "recipes" : "discover");
  const [planInView, setPlanInView] = useState(false);
  const [scrollToPlan, setScrollToPlan] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(() => new Set(savedSlugs));
  const [saveError, setSaveError] = useState<string | null>(null);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [ingredientInput, setIngredientInput] = useState("");
  const [ingredientMsg, setIngredientMsg] = useState<string | null>(null);
  const [authorId, setAuthorId] = useState<string>("all");
  const [minRating, setMinRating] = useState(0);
  const [show, setShow] = useState<Show>("all");
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  // deep links: /recipes#plan and /recipes#discover (read after mount so server and client render match)
  useEffect(() => {
    if (location.hash === "#plan" && signedIn) setScrollToPlan(true);
    else if (location.hash === "#discover") setView("discover");
  }, [signedIn]);

  // scroll to the meal plan once it is on screen (it isn't while Discover is showing)
  useEffect(() => {
    if (!scrollToPlan || view !== "recipes") return;
    document.getElementById("meal-plan")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setScrollToPlan(false);
  }, [scrollToPlan, view]);

  // highlight the "Meal plan" tab while the planner is what you're looking at
  useEffect(() => {
    if (view !== "recipes") return setPlanInView(false);
    const el = document.getElementById("meal-plan");
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setPlanInView(entry.isIntersecting), {
      rootMargin: "-45% 0px -45% 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [view, signedIn]);

  useEffect(() => {
    if (!filtersOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFiltersOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [filtersOpen]);

  function goRecipes() {
    setView("recipes");
    history.replaceState(null, "", location.pathname + location.search);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function goPlan() {
    setView("recipes");
    setScrollToPlan(true);
    history.replaceState(null, "", location.pathname + location.search + "#plan");
  }
  function goDiscover() {
    setView("discover");
    history.replaceState(null, "", location.pathname + location.search + "#discover");
    window.scrollTo({ top: 0 });
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
  // everything the user wrote or saved: shown on the Recipes view and offered to the meal plan
  const library = useMemo(() => {
    const seen = new Set<string>();
    return [...mine, ...savedList].filter((r) => !seen.has(r.slug) && !!seen.add(r.slug));
  }, [mine, savedList]);

  const base = view === "discover" ? recipes : show === "created" ? mine : show === "saved" ? savedList : library;

  // everyone who has posted at least one recipe (Discover's profile filter)
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
      if (view === "discover" && authorId !== "all" && r.authorId !== authorId) return false;
      if (minRating && r.avgRating < minRating) return false;
      return true;
    });
  }, [base, query, selected, authorId, minRating, view]);

  const activeFilters =
    (query.trim() ? 1 : 0) +
    (selected.length ? 1 : 0) +
    (minRating ? 1 : 0) +
    (view === "discover" && authorId !== "all" ? 1 : 0) +
    (view === "recipes" && show !== "all" ? 1 : 0);

  function clearFilters() {
    setQuery("");
    setSelected([]);
    setIngredientInput("");
    setIngredientMsg(null);
    setAuthorId("all");
    setMinRating(0);
    setShow("all");
  }

  const available = foods.filter((f) => !selected.includes(f.slug));

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

  const tabClass = (on: boolean) => (on ? "on" : "");

  return (
    <div className="rb-page">
      <header className="rb-topbar">
        <a href="/" className="rb-wordmark">bodyworks</a>
        <nav className="rb-nav" aria-label="Main">
          <a href="/workouts">Workouts</a>
          <a href="/recipes" aria-current="page">Recipes</a>
        </nav>
        <AccountMenu showAddRecipe={false} />
      </header>

      <section className="rb-head-wrap">
        <div className="rb-photo-head rb-photo-head--kitchen">
          <p className="rb-eyebrow">Make good food happen</p>
          <h1 className="rb-title">Recipes</h1>
          <p className="rb-lede">Save what you love. Plan your meals. Keep your kitchen notes.</p>
        </div>
      </section>

      <div className="mp-tabbar">
        <div className="mp-tabs" role="tablist" aria-label="Recipes sections">
          {signedIn && (
            <>
              <button type="button" role="tab" aria-selected={view === "recipes" && !planInView} className={tabClass(view === "recipes" && !planInView)} onClick={goRecipes}>
                Recipes
              </button>
              <button type="button" role="tab" aria-selected={view === "recipes" && planInView} className={tabClass(view === "recipes" && planInView)} onClick={goPlan}>
                Meal plan
              </button>
            </>
          )}
          <button type="button" role="tab" aria-selected={view === "discover"} className={tabClass(view === "discover")} onClick={goDiscover}>
            Discover
          </button>
        </div>

        <div className="mp-tabbar-actions">
          {view === "discover" && <a className="rb-btn" href="/communities">Communities</a>}
          {signedIn && <a className="rb-btn rb-btn-peach" href="/recipes/new">+ Add recipe</a>}
          <button type="button" className="rb-btn rb-filter-btn" onClick={() => setFiltersOpen(true)} aria-haspopup="dialog">
            Filters{activeFilters > 0 && <span className="rb-filter-count">{activeFilters}</span>}
          </button>
        </div>
      </div>

      <div className="rb-container">
        {saveError && <p className="rb-msg" role="alert">{saveError}</p>}
        {filtered.length === 0 ? (
          base.length === 0 && view === "recipes" ? (
            <p className="rb-empty">
              {show === "all" ? (
                <>You haven't added any recipes yet. <a href="/recipes/new">Add your first one</a> or <button type="button" className="rb-linkbtn" onClick={goDiscover}>discover recipes from others</button>.</>
              ) : show === "saved" ? (
                <>Nothing saved yet. <button type="button" className="rb-linkbtn" onClick={goDiscover}>Discover recipes</button> and tap ☆ on the ones you like.</>
              ) : (
                <>You haven't added any recipes yet. <a href="/recipes/new">Add your first one</a>.</>
              )}
            </p>
          ) : (
            <p className="rb-empty">
              No recipes match.{" "}
              {activeFilters > 0 && <button type="button" className="rb-linkbtn" onClick={clearFilters}>Clear filters</button>}
            </p>
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
      </div>

      {view === "recipes" && signedIn && (
        <section id="meal-plan" className="rb-plan-section" aria-label="Meal plan">
          <MealPlanner recipes={library} signedIn={signedIn} />
        </section>
      )}

      {filtersOpen && (
        <div className="rb-overlay open" onClick={(e) => e.target === e.currentTarget && setFiltersOpen(false)}>
          <div className="rb-fmodal" role="dialog" aria-modal="true" aria-label="Filters">
            <div className="rb-fmodal-head">
              <h2>Filters</h2>
              <button type="button" className="rb-modal-close" onClick={() => setFiltersOpen(false)} aria-label="Close">×</button>
            </div>

            <div className="rb-fmodal-body">
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

              <div>
                <span className="rb-field-label">Rating</span>
                <div className="rb-fmodal-row">
                  {RATING_OPTIONS.map((o) => (
                    <label key={o.value} className="rb-radio">
                      <input type="radio" name="rating" checked={minRating === o.value} onChange={() => setMinRating(o.value)} />
                      {o.label}
                    </label>
                  ))}
                </div>
              </div>

              {view === "recipes" && (
                <div>
                  <span className="rb-field-label">Show</span>
                  <div className="rb-fmodal-row">
                    {([["all", "All"], ["created", "Created by me"], ["saved", "Saved"]] as const).map(([v, label]) => (
                      <label key={v} className="rb-radio">
                        <input type="radio" name="show" checked={show === v} onChange={() => setShow(v)} />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {view === "discover" && authors.length > 0 && (
                <div>
                  <span className="rb-field-label">Cook</span>
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
                </div>
              )}
            </div>

            <div className="rb-fmodal-foot">
              <button type="button" className="rb-btn" onClick={clearFilters} disabled={activeFilters === 0}>Clear all</button>
              <button type="button" className="rb-btn rb-btn-solid" onClick={() => setFiltersOpen(false)}>
                Show {filtered.length} {filtered.length === 1 ? "recipe" : "recipes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSlug && (
        <RecipeModal
          slug={activeSlug}
          onClose={() => setActiveSlug(null)}
          saved={saved.has(activeSlug)}
          onSavedChange={onSavedChange}
        />
      )}
    </div>
  );
}
