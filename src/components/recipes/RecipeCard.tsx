import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import Avatar, { TONES, hash } from "./Avatar";
import type { RecipeSummary } from "./RecipesBrowser";

// soft tints for the light theme; the darker TONES are used in dark mode
const PASTELS = ["#f6c453", "#f4878a", "#f9b8a3", "#ee6a4f", "#fbe3a6", "#cfe3b5"];

export type CardAction = { label: string; href?: string; onClick?: () => void; danger?: boolean };

// the "⋯" button in a card's top-right corner; its list holds whatever actions apply to this viewer
function CardMenu({ name, actions }: { name: string; actions: CardAction[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div
      className="rb-cardmenu"
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation(); // keep Enter/Space from opening the card behind
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        className="rb-cardmenu-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${name}`}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {open && (
        <div className="rb-cardmenu-list" role="menu">
          {actions.map((a) =>
            a.href ? (
              <a key={a.label} role="menuitem" href={a.href}>{a.label}</a>
            ) : (
              <button
                key={a.label}
                type="button"
                role="menuitem"
                className={a.danger ? "danger" : ""}
                onClick={() => {
                  setOpen(false);
                  a.onClick?.();
                }}
              >
                {a.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

export default function RecipeCard({
  recipe,
  onClick,
  saveState,
  onToggleSave,
  actions,
}: {
  recipe: RecipeSummary;
  onClick: () => void;
  // undefined = no bookmark (own recipe or signed out)
  saveState?: "saved" | "unsaved";
  onToggleSave?: () => void;
  // when given (and non-empty) the card shows a ⋯ menu with these actions
  actions?: CardAction[];
}) {
  const filled = Math.round(recipe.avgRating);

  return (
    <div
      className={`rb-card ${actions && actions.length > 0 ? "has-menu" : ""}`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="rb-card-media">
        {recipe.imageUrl ? (
          <img src={recipe.imageUrl} alt={recipe.name} loading="lazy" />
        ) : (
          <div
            className="rb-card-placeholder"
            style={{ "--tone": TONES[hash(recipe.name) % TONES.length], "--tone-soft": PASTELS[hash(recipe.name) % PASTELS.length] } as React.CSSProperties}
            aria-hidden="true"
          >
            <svg viewBox="0 0 96 96" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 46h68c0 18-14 30-34 30S14 64 14 46Z" fill="rgba(255,246,223,.6)" />
              <path d="M34 22c-4 5 4 8 0 13M48 18c-4 5 4 9 0 14M62 22c-4 5 4 8 0 13" />
            </svg>
          </div>
        )}

        {recipe.cuisine && <span className="rb-card-cuisine">{recipe.cuisine}</span>}

        {saveState && onToggleSave && (
          <button
            type="button"
            className={`rb-save ${saveState === "saved" ? "on" : ""}`}
            aria-pressed={saveState === "saved"}
            aria-label={saveState === "saved" ? `Remove ${recipe.name} from saved` : `Save ${recipe.name}`}
            title={saveState === "saved" ? "Saved — click to remove" : "Save to my recipes"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave();
            }}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {saveState === "saved" ? "★" : "☆"}
          </button>
        )}
      </div>

      {actions && actions.length > 0 && <CardMenu name={recipe.name} actions={actions} />}

      <div className="rb-card-body">
        <h3>{recipe.name}</h3>
        <p>{recipe.description}</p>
      </div>

      {(recipe.prepTimeMinutes || recipe.difficulty) && (
        <div className="sr-meta">
          {recipe.prepTimeMinutes ? (
            <span className="sr-chip"><Clock size={12} aria-hidden="true" />{recipe.prepTimeMinutes} min</span>
          ) : null}
          {recipe.difficulty && (
            <span className="sr-chip" data-level={recipe.difficulty}><i aria-hidden="true" />{recipe.difficulty}</span>
          )}
        </div>
      )}

      <div className="rb-card-bar">
        <div
          className="rb-stars"
          aria-label={recipe.ratingCount ? `${recipe.avgRating.toFixed(1)} out of 5` : "No ratings yet"}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={n <= filled ? "on" : ""}>★</span>
          ))}
          <small>{recipe.ratingCount ? `(${recipe.ratingCount})` : ""}</small>
        </div>

        {recipe.authorId ? (
          <a
            href={`/profile/${recipe.authorId}`}
            className="rb-author-link"
            title={`${recipe.authorName ?? "Profile"} — view profile`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Avatar name={recipe.authorName ?? "bodyworks"} image={recipe.authorImage} />
          </a>
        ) : (
          <Avatar name={recipe.authorName ?? "bodyworks"} image={recipe.authorImage} />
        )}
      </div>
    </div>
  );
}