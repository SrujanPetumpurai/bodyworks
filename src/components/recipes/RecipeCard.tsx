type Props = {
  name: string;
  description: string;
  imageUrl: string | null;
  cuisine: string | null;
  authorName: string | null;
  authorImage: string | null;
  avgRating: number;
  ratingCount: number;
  ingredientNames: string[];
  onClick: () => void;
};

const TONES = ["#1f6f5c", "#ff6b5b", "#f4a300", "#3f7cac"];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function initials(name: string): string {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export default function RecipeCard({
  name,
  description,
  imageUrl,
  cuisine,
  authorName,
  authorImage,
  avgRating,
  ratingCount,
  ingredientNames,
  onClick,
}: Props) {
  const filled = Math.round(avgRating);

  return (
    <div
      className="recipe-card"
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
      <div className="recipe-card-media">
        {imageUrl ? (
          <img src={imageUrl} alt={name} loading="lazy" />
        ) : (
          <div
            className="recipe-card-placeholder"
            style={{ background: TONES[hash(name) % TONES.length] }}
            aria-hidden="true"
          >
            {name.charAt(0)}
          </div>
        )}
        {cuisine && <span className="recipe-card-cuisine">{cuisine}</span>}
      </div>

      <div className="recipe-card-body">
        <h3>{name}</h3>
        <p className="recipe-card-desc">{description}</p>

        <div className="recipe-card-ingredients">
          {ingredientNames.map((n) => (
            <span key={n} className="ingredient-tag">
              {n}
            </span>
          ))}
        </div>

        <div className="recipe-card-footer">
          <div
            className="recipe-card-rating"
            aria-label={ratingCount ? `${avgRating.toFixed(1)} out of 5, ${ratingCount} ratings` : "No ratings yet"}
          >
            <span className="recipe-card-stars" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={n <= filled ? "on" : ""}>
                  ★
                </span>
              ))}
            </span>
            <span className="recipe-card-rating-text">
              {ratingCount ? `${avgRating.toFixed(1)} (${ratingCount})` : "No ratings yet"}
            </span>
          </div>

          {authorName && (
            <div className="recipe-card-author">
              {authorImage ? (
                <img className="avatar" src={authorImage} alt="" />
              ) : (
                <span className="avatar" style={{ background: TONES[hash(authorName) % TONES.length] }}>
                  {initials(authorName)}
                </span>
              )}
              <span className="recipe-card-author-name">{authorName}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}