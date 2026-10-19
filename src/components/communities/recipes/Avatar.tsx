import type { CSSProperties } from "react";

// One soft palette shared by avatars, recipe cards and the meal planner.
// Light mode uses the pastels; dark mode swaps in the muted deep tints (see recipes.css).
// Warm family (butter, apricot, peach, sand, sage, blush) to echo the landing page's gold and wood tones.
const PASTELS = ["#ffeec2", "#fde0b5", "#ffdccb", "#f3e3c7", "#dcebd2", "#fbd9d3"];
const TONES = ["#43391f", "#4a3b25", "#47342c", "#40372a", "#2c4535", "#46322e"];
const DOTS = ["#edb843", "#f0a24a", "#ee917a", "#c99a5b", "#8fc08a", "#e58f8f"];
// which strip of the kitchen photo shows behind a card without its own picture
const POSITIONS = ["50% 15%", "50% 40%", "50% 65%", "50% 88%", "50% 30%", "50% 55%"];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// CSS custom properties for a name's tint: --tone-soft (light), --tone (dark), --dot (accent)
function tintVars(name: string): CSSProperties {
  const i = hash(name) % PASTELS.length;
  return { "--tone-soft": PASTELS[i], "--tone": TONES[i], "--dot": DOTS[i], "--pos": POSITIONS[i] } as CSSProperties;
}

function initials(name: string) {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export { PASTELS, TONES, DOTS, hash, tintVars };

export default function Avatar({
  name,
  image,
  size = 32,
}: {
  name: string;
  image: string | null;
  size?: number;
}) {
  const style = { width: size, height: size };
  return image ? (
    <img className="rb-avatar" src={image} alt={name} title={name} style={style} />
  ) : (
    <span
      className="rb-avatar"
      title={name}
      style={{ ...style, ...tintVars(name), fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}
