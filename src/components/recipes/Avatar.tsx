const TONES = ["#5a3d12", "#6b2f1a", "#4a4418", "#3a4a28", "#5a2c2a", "#4a3a22"];

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