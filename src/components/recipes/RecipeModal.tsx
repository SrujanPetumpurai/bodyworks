import { useEffect, useState } from "react";
import IngredientFilter from "./IngredientFilter";
import RecipeCard from "./RecipeCard";
import RecipeModal from "./RecipeModal";

type Food = { slug: string; name: string };
type RecipeSummary = {
  slug: string;
  name: string;
  description: string;
  imageUrl: string | null;
  authorName: string | null;
  avgRating: number;
  ratingCount: number;
  ingredientNames: string[];
};

type Props = {
  foods: Food[];
};

export default function RecipesBrowser({ foods }: Props) {
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = selectedIngredients.length
      ? `?ingredients=${selectedIngredients.join(",")}`
      : "";
    fetch(`/api/recipes${params}`)
      .then((res) => res.json())
      .then(setRecipes)
      .finally(() => setLoading(false));
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
        <p className="recipes-empty">No recipes match those ingredients.</p>
      )}

      <div className="recipes-list">
        {recipes.map((r) => (
          <RecipeCard
            key={r.slug}
            name={r.name}
            description={r.description}
            imageUrl={r.imageUrl}
            authorName={r.authorName}
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