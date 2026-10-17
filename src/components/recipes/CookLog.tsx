import { useEffect, useState } from "react";
import ImageUpload from "../forms/ImageUpload";
import VoiceRecorder from "../forms/VoiceRecorder";

type Log = {
  id: number;
  attempt: number;
  cookedOn: string; // YYYY-MM-DD
  photoUrl: string | null;
  notes: string | null;
  audioUrl: string | null;
};

const pad = (n: number) => String(n).padStart(2, "0");
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};
const niceDate = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

// Per-user history of cooking one recipe: photo + notes (+ optional voice note) for each attempt.
export default function CookLog({ slug, signedIn }: { slug: string; signedIn: boolean }) {
  const [logs, setLogs] = useState<Log[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  const [cookedOn, setCookedOn] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    fetch(`/api/recipes/${slug}/cook-logs`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((rows: Log[]) => !cancelled && setLogs(rows))
      .catch(() => !cancelled && setError("Couldn't load your cook log."));
    return () => {
      cancelled = true;
    };
  }, [slug, signedIn]);

  if (!signedIn) {
    return (
      <p>
        <a href={`/auth?next=${encodeURIComponent("/recipes")}`}>Sign in</a> to keep notes and photos each time you cook this.
      </p>
    );
  }

  function openForm() {
    setCookedOn(todayKey()); // local date: the server runs in UTC
    setPhotoUrl(null);
    setAudioUrl(null);
    setNotes("");
    setError(null);
    setAdding(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/recipes/${slug}/cook-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cookedOn, photoUrl, audioUrl, notes }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res || !res.ok) {
      setBusy(false);
      return setError(data?.error || "Couldn't save. Try again.");
    }
    const fresh = await fetch(`/api/recipes/${slug}/cook-logs`).then((r) => r.json()).catch(() => null);
    setBusy(false);
    if (fresh) setLogs(fresh);
    setAdding(false);
  }

  async function remove(id: number) {
    if (!confirm("Delete this entry?")) return;
    const res = await fetch(`/api/cook-logs/${id}`, { method: "DELETE" }).catch(() => null);
    if (!res || !res.ok) return setError("Couldn't delete that entry.");
    const fresh = await fetch(`/api/recipes/${slug}/cook-logs`).then((r) => r.json()).catch(() => null);
    if (fresh) setLogs(fresh);
  }

  if (adding) {
    return (
      <form className="cl-form" onSubmit={save}>
        <label className="cl-field">
          Cooked on
          <input type="date" value={cookedOn} max={todayKey()} onChange={(e) => setCookedOn(e.target.value)} required />
        </label>
        <ImageUpload label="Photo" value={photoUrl} onChange={setPhotoUrl} />
        <label className="cl-field">
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Too salty? Needed more time? What would you change?"
          />
        </label>
        <VoiceRecorder label="Voice note" value={audioUrl} onChange={setAudioUrl} />
        {error && <p className="rb-msg" role="alert">{error}</p>}
        <div className="iu-actions">
          <button type="submit" className="rb-btn rb-btn-solid" disabled={busy}>{busy ? "Saving…" : "Save entry"}</button>
          <button type="button" className="rb-btn" onClick={() => setAdding(false)} disabled={busy}>Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <div className="cl">
      <button type="button" className="rb-btn rb-btn-solid" onClick={openForm}>+ I made this today</button>
      {error && <p className="rb-msg" role="alert">{error}</p>}
      {logs === null && !error && <p className="rb-muted">Loading…</p>}
      {logs?.length === 0 && <p className="rb-muted">Nothing yet. Log your first attempt to remember how it turned out.</p>}

      <ol className="cl-list">
        {logs?.map((l, i) => (
          <li key={l.id} className="cl-entry">
            <div className="cl-head">
              <strong>{i === 0 && logs.length > 1 ? "Last time" : `${ordinal(l.attempt)} time`}</strong>
              <span className="rb-muted">{niceDate(l.cookedOn)}</span>
              <button type="button" className="rb-link-danger" onClick={() => remove(l.id)} aria-label="Delete entry">Delete</button>
            </div>
            {l.photoUrl && <img className="cl-photo" src={l.photoUrl} alt={`Attempt ${l.attempt}`} loading="lazy" />}
            {l.notes && <p className="cl-notes">{l.notes}</p>}
            {l.audioUrl && <audio className="vr-player" controls preload="none" src={l.audioUrl} />}
          </li>
        ))}
      </ol>
    </div>
  );
}
