import { useMemo, useState } from "react";
import AccountMenu from "../AccountMenu";
import Avatar from "./Avatar";
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

export default function RecipesBrowser({ foods, recipes }: { foods: Food[]; recipes: RecipeSummary[] }) {
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
    return recipes.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q)) return false;
      if (selected.length && !selected.every((s) => r.ingredientSlugs.includes(s))) return false;
      if (authorId !== "all" && r.authorId !== authorId) return false;
      if (minRating && r.avgRating < minRating) return false;
      return true;
    });
  }, [recipes, query, selected, authorId, minRating]);

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
          <a href="/daily-requirements">Daily needs</a>
          <a href="/recipes" aria-current="page">Recipes</a>
          <a href="/communities">Communities</a>
        </nav>
        <AccountMenu />
      </header>

      <section className="rb-hero">
        <h1 className="rb-title">Recipes</h1>
        <p className="rb-lede">High-protein meals. Add what you have and see what you can cook.</p>

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
            </div>
            {filtered.length === 0 ? (
              <p className="rb-empty">No recipes match. Try removing a filter.</p>
            ) : (
              <div className="rb-grid">
                {filtered.map((r) => (
                  <RecipeCard key={r.slug} recipe={r} onClick={() => setActiveSlug(r.slug)} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {activeSlug && <RecipeModal slug={activeSlug} onClose={() => setActiveSlug(null)} />}
    </div>
  );
}