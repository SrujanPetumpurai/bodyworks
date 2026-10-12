import Avatar, { TONES, hash } from "./Avatar";
import type { RecipeSummary } from "./RecipesBrowser";

export default function RecipeCard({ recipe, onClick }: { recipe: RecipeSummary; onClick: () => void }) {
  const filled = Math.round(recipe.avgRating);

  return (
    <div
      className="rb-card"
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
            style={{ background: TONES[hash(recipe.name) % TONES.length] }}
            aria-hidden="true"
          >
            {recipe.name.charAt(0)}
          </div>
        )}

        {recipe.cuisine && <span className="rb-card-cuisine">{recipe.cuisine}</span>}
      </div>

      <div className="rb-card-body">
        <h3>{recipe.name}</h3>
        <p>{recipe.description}</p>
      </div>

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