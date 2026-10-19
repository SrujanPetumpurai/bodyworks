import Avatar, { tintVars } from "./Avatar";
import type { RecipeSummary } from "./RecipesBrowser";

export default function RecipeCard({
  recipe,
  onClick,
  saveState,
  onToggleSave,
}: {
  recipe: RecipeSummary;
  onClick: () => void;
  // undefined = no bookmark (own recipe or signed out)
  saveState?: "saved" | "unsaved";
  onToggleSave?: () => void;
}) {
  const rated = recipe.ratingCount > 0;
  const label = rated ? `${recipe.avgRating.toFixed(1)} out of 5` : "No ratings yet";

  return (
    <div
      className="rb-card"
      style={tintVars(recipe.name)}
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
          <div className="rb-card-placeholder" aria-hidden="true">
            <span className="rb-card-ring">
              <span className="rb-card-dot" />
            </span>
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

      <div className="rb-card-body">
        <h3>{recipe.name}</h3>
        <p>{recipe.description}</p>
      </div>

      <div className="rb-card-bar">
        <span className="rb-pill" aria-label={label} title={rated ? `${label} (${recipe.ratingCount})` : label}>
          <span aria-hidden="true">
            {rated ? `★ ${recipe.avgRating.toFixed(1)}` : "New"}
            {recipe.prepTimeMinutes != null ? ` · ${recipe.prepTimeMinutes} min` : ""}
          </span>
        </span>

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
