import { useEffect, useRef, useState } from "react";
import { useSession } from "../../lib/auth-client";
import CookLog from "./CookLog";

type Detail = {
  name: string;
  description: string;
  videoUrl: string | null;
  voiceNoteUrl: string | null;
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

const PAGES = ["Ingredients", "Steps", "Cook log", "About"] as const;

export default function RecipeModal({
  slug,
  onClose,
  saved,
  onSavedChange,
}: {
  slug: string;
  onClose: () => void;
  // only passed where saving makes sense (the recipes page); omitted in the meal planner
  saved?: boolean;
  onSavedChange?: (slug: string, saved: boolean) => void;
}) {
  const { data: session } = useSession();
  const [recipe, setRecipe] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const last = PAGES.length - 1;
  const go = (n: number) => setPage(Math.max(0, Math.min(n, last)));

  // each page starts at the top
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [page]);

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
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
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

  async function toggleSave() {
    if (!onSavedChange) return;
    const next = !saved;
    setMsg(null);
    const res = await fetch(`/api/recipes/${slug}/save`, { method: next ? "POST" : "DELETE" }).catch(() => null);
    if (!res || !res.ok) return setMsg("Couldn't update your saved recipes.");
    onSavedChange(slug, next);
  }

  async function removeRecipe() {
    if (!confirm("Delete this recipe? This can't be undone.")) return;
    const res = await fetch(`/api/recipes/${slug}`, { method: "DELETE" }).catch(() => null);
    if (!res || !res.ok) return setMsg("Couldn't delete the recipe.");
    location.reload();
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
              <h2>{recipe.name}</h2>
              <p className="rb-modal-sub">
                {[
                  recipe.prepTimeMinutes != null && `${recipe.prepTimeMinutes} min`,
                  recipe.servings != null && `serves ${recipe.servings}`,
                  recipe.difficulty,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>

            <div className="rb-modal-tabs" role="tablist" aria-label="Recipe sections">
              {PAGES.map((p, i) => (
                <button
                  key={p}
                  type="button"
                  role="tab"
                  aria-selected={i === page}
                  className={i === page ? "on" : ""}
                  onClick={() => setPage(i)}
                >
                  {p}
                </button>
              ))}
            </div>

            <div
              className="rb-modal-content"
              ref={contentRef}
              onTouchStart={(e) => {
                const t = e.touches[0];
                swipe.current = { x: t.clientX, y: t.clientY };
              }}
              onTouchEnd={(e) => {
                const start = swipe.current;
                swipe.current = null;
                if (!start) return;
                const t = e.changedTouches[0];
                const dx = t.clientX - start.x;
                const dy = t.clientY - start.y;
                // a clear sideways swipe turns the page; mostly-vertical drags are just scrolling
                if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(page + (dx < 0 ? 1 : -1));
              }}
            >
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

              {page === 2 && <CookLog slug={slug} signedIn={!!session} />}

              {page === 3 && (
                <div className="rb-rate">
                  <p>{recipe.description}</p>
                  {recipe.voiceNoteUrl && (
                    <audio className="vr-player" controls preload="none" src={recipe.voiceNoteUrl} />
                  )}
                  {recipe.difficulty && <p className="rb-muted">Difficulty: {recipe.difficulty}</p>}
                  {recipe.author && <p className="rb-muted">
                      by <a className="rb-author-name" href={`/profile/${recipe.author.id}`}>{recipe.author.name}</a>
                    </p>}

                  {session && recipe.author && session.user.id !== recipe.author.id && onSavedChange && (
                    <div className="rb-links">
                      <button type="button" className="rb-btn" onClick={toggleSave}>
                        {saved ? "✓ Saved — remove" : "+ Save to my recipes"}
                      </button>
                    </div>
                  )}

                  {session && recipe.author && session.user.id === recipe.author.id && (
                    <div className="rb-links">
                      <a href={`/recipes/${slug}/edit`}>Edit</a>
                      <button type="button" className="rb-link-danger" onClick={removeRecipe}>Delete</button>
                    </div>
                  )}

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

            <div className="rb-modal-nav">
              <button type="button" className="rb-btn" onClick={() => go(page - 1)} style={{ visibility: page === 0 ? "hidden" : "visible" }}>
                ← {PAGES[Math.max(page - 1, 0)]}
              </button>
              <span className="rb-modal-count">{page + 1} / {PAGES.length}</span>
              <button type="button" className="rb-btn rb-btn-solid" onClick={() => go(page + 1)} style={{ visibility: page === last ? "hidden" : "visible" }}>
                {PAGES[Math.min(page + 1, last)]} →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}