import { useState } from "react";

type Props = {
  value: number;
  onRate?: (stars: number) => void;
  readOnly?: boolean;
};

export default function StarRating({ value, onRate, readOnly }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? value;

  return (
    <div className="star-rating" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onMouseEnter={() => !readOnly && setHovered(n)}
          onMouseLeave={() => !readOnly && setHovered(null)}
          onClick={() => !readOnly && onRate?.(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className={`star ${n <= display ? "filled" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}