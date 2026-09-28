import { useEffect, useState } from "react";
import StarRating from "./StarRating";
import { useSession } from "../../lib/auth-client";

type Props = {
  slug: string;
  onClose: () => void;
};

type RecipeDetail = {
  slug: string;
  name: string;
  description: string;
  imageUrl: string | null;
  videoUrl: string | null;
  externalUrl: string | null;
  prepTimeMinutes: number | null;
  difficulty: "easy" | "medium" | "hard" | null;
  servings: number | null;
  avgRating: string | number;
  ratingCount: number;
  author: { name: string } | null;
  ingredients: { id: number; amount: string; unit: string; food: { name: string } }[];
  steps: { id: number; stepNumber: number; instruction: string }[];
};

export default function RecipeModal({ slug, onClose }: Props) {
  const { data: session } = useSession();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avgRating, setAvgRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [rateMessage, setRateMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/recipes/${slug}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Couldn't load this recipe.");
        return res.json();
      })
      .then((data: RecipeDetail) => {
        if (cancelled) return;
        setRecipe(data);
        setAvgRating(Number(data.avgRating));
        setRatingCount(data.ratingCount);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleRate(stars: number) {
    if (!session) {
      setRateMessage("Sign in to rate recipes.");
      return;
    }
    setRateMessage(null);
    try {
      const res = await fetch(`/api/recipes/${slug}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setRateMessage(body?.error ?? "Couldn't save your rating.");
        return;
      }
      const result: { avgRating: number; ratingCount: number } = await res.json();
      setAvgRating(result.avgRating);
      setRatingCount(result.ratingCount);
      setRateMessage("Thanks for rating!");
    } catch {
      setRateMessage("Couldn't save your rating.");
    }
  }

  return (
    <div
      className="recipe-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="recipe-modal-box" role="dialog" aria-modal="true">
        <button type="button" className="recipe-modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        {loading && <p>Loading…</p>}
        {error && <p>{error}</p>}

        {recipe && (
          <>
            {recipe.imageUrl && (
              <img className="recipe-modal-image" src={recipe.imageUrl} alt={recipe.name} />
            )}

            <h2>{recipe.name}</h2>
            <p className="recipe-modal-desc">{recipe.description}</p>

            <div className="recipe-modal-meta">
              {recipe.prepTimeMinutes != null && <span>{recipe.prepTimeMinutes} min</span>}
              {recipe.difficulty && <span>{recipe.difficulty}</span>}
              {recipe.servings != null && <span>Serves {recipe.servings}</span>}
              {recipe.author && <span>by {recipe.author.name}</span>}
            </div>

            <div className="recipe-modal-rating">
              <StarRating value={Math.round(avgRating)} onRate={handleRate} />
              <span>
                {avgRating.toFixed(1)} ({ratingCount})
              </span>
              {rateMessage && <span className="recipe-modal-rate-msg">{rateMessage}</span>}
            </div>

            <h3>Ingredients</h3>
            <ul className="recipe-modal-ingredients">
              {recipe.ingredients.map((ri) => (
                <li key={ri.id}>
                  {Number(ri.amount)} {ri.unit} {ri.food.name}
                </li>
              ))}
            </ul>

            <h3>Steps</h3>
            <ol className="recipe-modal-steps">
              {recipe.steps.map((s) => (
                <li key={s.id}>{s.instruction}</li>
              ))}
            </ol>

            {(recipe.videoUrl || recipe.externalUrl) && (
              <p className="recipe-modal-links">
                {recipe.videoUrl && (
                  <a href={recipe.videoUrl} target="_blank" rel="noreferrer">
                    Watch video
                  </a>
                )}
                {recipe.externalUrl && (
                  <a href={recipe.externalUrl} target="_blank" rel="noreferrer">
                    Original source
                  </a>
                )}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}