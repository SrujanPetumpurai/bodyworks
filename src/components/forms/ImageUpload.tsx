import { useRef, useState } from "react";

export default function ImageUpload({
  label,
  value,
  onChange,
  shape = "wide",
}: {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  shape?: "wide" | "round";
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.size > 4 * 1024 * 1024) return setError("Image is too large (max 4 MB).");
    setBusy(true);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (!res || !res.ok || !data?.url) return setError(data?.error || "Upload failed.");
    onChange(data.url);
    if (input.current) input.current.value = "";
  }

  return (
    <div className="iu">
      <span className="iu-label">{label}</span>
      <div className={`iu-preview ${shape}`} style={value ? { backgroundImage: `url(${value})` } : undefined}>
        {!value && <span>{busy ? "Uploading…" : "No image"}</span>}
      </div>
      <div className="iu-actions">
        <button type="button" className="rb-btn" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? "Uploading…" : value ? "Replace" : "Upload"}
        </button>
        {value && !busy && (
          <button type="button" className="rb-btn" onClick={() => onChange(null)}>Remove</button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {error && <p className="rb-msg" role="alert">{error}</p>}
    </div>
  );
}
