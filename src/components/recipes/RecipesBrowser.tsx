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
  createdAt: string;
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

  function onIngredientChange(value: string) {
    const match = available.find((f) => f.name.toLowerCase() === value.trim().toLowerCase());
    if (match) {
      setSelected((s) => [...s, match.slug]);
      setIngredientInput("");
    } else {
      setIngredientInput(value);
    }
  }

  return (
    <div className="rb-page">
      <header className="rb-header">
        <div className="rb-header-inner">
          <div className="rb-header-left">
            <a href="/" className="rb-logo">
              <img src="/logo.png" alt="bodyworks" />
            </a>
            <AccountMenu />
          </div>

          <div className="rb-header-right">
            <input
              className="rb-search"
              type="search"
              placeholder="Search recipes"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            <div className="rb-ingredients">
              <span className="rb-ingredients-label">Ingredients:</span>
              <input
                className="rb-ingredient-input"
                list="rb-food-list"
                placeholder="Add one…"
                value={ingredientInput}
                onChange={(e) => onIngredientChange(e.target.value)}
              />
              <datalist id="rb-food-list">
                {available.map((f) => (
                  <option key={f.slug} value={f.name} />
                ))}
              </datalist>
              {selected.map((slug) => (
                <button
                  key={slug}
                  type="button"
                  className="rb-chip"
                  onClick={() => setSelected((s) => s.filter((x) => x !== slug))}
                  aria-label={`Remove ${slug}`}
                >
                  {foods.find((f) => f.slug === slug)?.name ?? slug} ×
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

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
            <h1 className="rb-title">Recipes</h1>
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