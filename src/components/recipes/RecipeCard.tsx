type Props = {
  name: string;
  description: string;
  imageUrl: string | null;
  authorName: string | null;
  avgRating: number;
  ratingCount: number;
  ingredientNames: string[];
  onClick: () => void;
};

export default function RecipeCard({
  name,
  description,
  imageUrl,
  authorName,
  avgRating,
  ratingCount,
  ingredientNames,
  onClick,
}: Props) {
  return (
    <button type="button" className="recipe-card" onClick={onClick}>
      <div className="recipe-card-media">
        {imageUrl ? <img src={imageUrl} alt={name} /> : <div className="recipe-card-placeholder" />}
      </div>
      <div className="recipe-card-body">
        <div className="recipe-card-header">
          <h3>{name}</h3>
          <span className="recipe-card-rating">
            ★ {avgRating.toFixed(1)} ({ratingCount})
          </span>
        </div>
        <p className="recipe-card-desc">{description}</p>
        <div className="recipe-card-ingredients">
          {ingredientNames.map((n) => (
            <span key={n} className="ingredient-tag">
              {n}
            </span>
          ))}
        </div>
        {authorName && <span className="recipe-card-author">by {authorName}</span>}
      </div>
    </button>
  );
}