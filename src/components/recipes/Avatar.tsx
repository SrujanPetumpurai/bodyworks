const TONES = ["#2d5a43", "#7a4a24", "#254f70", "#53406e", "#6b5612", "#2e4d47"];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function initials(name: string) {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export { TONES, hash };

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
      style={{ ...style, background: TONES[hash(name) % TONES.length], fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}