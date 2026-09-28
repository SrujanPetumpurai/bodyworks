import { useEffect, useRef, useState } from "react";
import IngredientFilter from "./IngredientFilter";
import RecipeCard from "./RecipeCard";
import RecipeModal from "./RecipeModal";

type Food = { slug: string; name: string };
type RecipeSummary = {
  slug: string;
  name: string;
  description: string;
  imageUrl: string | null;
  cuisine: string | null;
  authorName: string | null;
  authorImage: string | null;
  avgRating: number;
  ratingCount: number;
  ingredientNames: string[];
};

type Props = {
  foods: Food[];
  recipes: RecipeSummary[]; // initial list, loaded by recipes.astro
};

export default function RecipesBrowser({ foods, recipes: initialRecipes }: Props) {
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<RecipeSummary[]>(initialRecipes);
  const [loading, setLoading] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const isFirstRun = useRef(true);

  useEffect(() => {
    // First run: recipes.astro already gave us the full list, don't fetch again.
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    let cancelled = false;
    setLoading(true);

    const params = selectedIngredients.length
      ? `?ingredients=${encodeURIComponent(selectedIngredients.join(","))}`
      : "";

    fetch(`/api/recipes${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setRecipes(data);
      })
      .catch(() => {
        if (!cancelled) setRecipes([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // ignore out-of-date responses if the user clicks chips quickly
    return () => {
      cancelled = true;
    };
  }, [selectedIngredients]);

  return (
    <div className="recipes-browser">
      <IngredientFilter
        foods={foods}
        selected={selectedIngredients}
        onChange={setSelectedIngredients}
      />

      {loading && <p className="recipes-loading">Loading recipes…</p>}
      {!loading && recipes.length === 0 && (
        <p className="recipes-empty">No recipes match those ingredients. Try removing one.</p>
      )}

      <div className="recipes-list">
        {recipes.map((r) => (
          <RecipeCard
            key={r.slug}
            name={r.name}
            description={r.description}
            imageUrl={r.imageUrl}
            cuisine={r.cuisine}
            authorName={r.authorName}
            authorImage={r.authorImage}
            avgRating={r.avgRating}
            ratingCount={r.ratingCount}
            ingredientNames={r.ingredientNames}
            onClick={() => setActiveSlug(r.slug)}
          />
        ))}
      </div>

      {activeSlug && <RecipeModal slug={activeSlug} onClose={() => setActiveSlug(null)} />}
    </div>
  );
}