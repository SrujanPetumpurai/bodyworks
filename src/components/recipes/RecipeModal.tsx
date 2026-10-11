import { useEffect, useState } from "react";
import { useSession } from "../../lib/auth-client";

type Detail = {
  name: string;
  description: string;
  videoUrl: string | null;
  externalUrl: string | null;
  prepTimeMinutes: number | null;
  difficulty: string | null;
  servings: number | null;
  avgRating: string | number;
  ratingCount: number;
  author: { id: string; name: string } | null;
  ingredients: { id: number; amount: string; unit: string; food: { name: string } }[];
  steps: { id: number; stepNumber: number; instruction: string }[];
};

const PAGES = ["Ingredients", "Steps", "Rate"] as const;

export default function RecipeModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { data: session } = useSession();
  const [recipe, setRecipe] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/recipes/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Couldn't load this recipe.");
        return res.json();
      })
      .then((d: Detail) => {
        if (cancelled) return;
        setRecipe(d);
        setAvg(Number(d.avgRating));
        setCount(d.ratingCount);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setPage((p) => Math.min(p + 1, PAGES.length - 1));
      if (e.key === "ArrowLeft") setPage((p) => Math.max(p - 1, 0));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function rate(stars: number) {
    if (!session) return setMsg("Sign in to rate recipes.");
    setMsg(null);
    const res = await fetch(`/api/recipes/${slug}/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stars }),
    }).catch(() => null);
    if (!res || !res.ok) return setMsg("Couldn't save your rating.");
    const r: { avgRating: number; ratingCount: number } = await res.json();
    setAvg(r.avgRating);
    setCount(r.ratingCount);
    setMsg("Thanks for rating!");
  }

  const shown = hover ?? Math.round(avg);

  return (
    <div className="rb-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="rb-modal" role="dialog" aria-modal="true" aria-label={recipe?.name ?? "Recipe"}>
        <button type="button" className="rb-modal-close" onClick={onClose} aria-label="Close">×</button>

        {error && <p>{error}</p>}
        {!recipe && !error && <p>Loading…</p>}

        {recipe && (
          <>
            <div className="rb-modal-head">
              <h2>{PAGES[page]}</h2>
              <p className="rb-modal-sub">
                {recipe.name}
                {recipe.prepTimeMinutes != null && ` · ${recipe.prepTimeMinutes} min`}
                {recipe.servings != null && ` · serves ${recipe.servings}`}
              </p>
            </div>

            <div className="rb-modal-content">
              {page === 0 && (
                <ul className="rb-list">
                  {recipe.ingredients.map((ri) => (
                    <li key={ri.id}>
                      <span>{ri.food.name}</span>
                      <span>{Number(ri.amount)} {ri.unit}</span>
                    </li>
                  ))}
                </ul>
              )}

              {page === 1 && (
                <ol className="rb-steps">
                  {recipe.steps.map((s) => (
                    <li key={s.id}>{s.instruction}</li>
                  ))}
                </ol>
              )}

              {page === 2 && (
                <div className="rb-rate">
                  <p>{recipe.description}</p>
                  {recipe.difficulty && <p className="rb-muted">Difficulty: {recipe.difficulty}</p>}
                  {recipe.author && <p className="rb-muted">
                      by <a className="rb-author-name" href={`/profile/${recipe.author.id}`}>{recipe.author.name}</a>
                    </p>}

                  <div className="rb-rate-stars" onMouseLeave={() => setHover(null)}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={n <= shown ? "on" : ""}
                        onMouseEnter={() => setHover(n)}
                        onClick={() => rate(n)}
                        aria-label={`${n} star${n > 1 ? "s" : ""}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <p className="rb-muted">{avg.toFixed(1)} ({count} ratings)</p>
                  {msg && <p className="rb-msg">{msg}</p>}

                  <div className="rb-links">
                    {recipe.videoUrl && <a href={recipe.videoUrl} target="_blank" rel="noreferrer">Watch video</a>}
                    {recipe.externalUrl && <a href={recipe.externalUrl} target="_blank" rel="noreferrer">Original source</a>}
                  </div>
                </div>
              )}
            </div>

            <div className="rb-dots">
              {PAGES.map((p, i) => (
                <button
                  key={p}
                  type="button"
                  className={i === page ? "on" : ""}
                  onClick={() => setPage(i)}
                  aria-label={p}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}