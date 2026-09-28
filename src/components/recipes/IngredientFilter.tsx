type Food = { slug: string; name: string };

type Props = {
  foods: Food[];
  selected: string[];
  onChange: (slugs: string[]) => void;
};

export default function IngredientFilter({ foods, selected, onChange }: Props) {
  function toggle(slug: string) {
    if (selected.includes(slug)) {
      onChange(selected.filter((s) => s !== slug));
    } else {
      onChange([...selected, slug]);
    }
  }

  return (
    <div className="ingredient-filter">
      <span className="filter-label">Filter by ingredients:</span>
      <div className="ingredient-chips">
        {foods.map((f) => (
          <button
            key={f.slug}
            type="button"
            className={`chip ${selected.includes(f.slug) ? "active" : ""}`}
            onClick={() => toggle(f.slug)}
          >
            {f.name}
          </button>
        ))}
      </div>
      {selected.length > 0 && (
        <button type="button" className="clear-btn" onClick={() => onChange([])}>
          Clear
        </button>
      )}
    </div>
  );
}