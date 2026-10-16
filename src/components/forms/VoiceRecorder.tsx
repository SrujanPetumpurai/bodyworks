import { useEffect, useRef, useState } from "react";

// Records a short voice clip in the browser, uploads it, and reports the URL.
// Safari records audio/mp4, Chrome/Firefox record audio/webm or ogg: pick whatever this browser supports.
const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

function pickMime() {
  if (typeof MediaRecorder === "undefined") return null;
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function VoiceRecorder({
  label,
  value,
  onChange,
  maxSeconds = 120,
}: {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  maxSeconds?: number;
}) {
  const [state, setState] = useState<"idle" | "recording" | "uploading">("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSupported(pickMime() !== null && !!navigator.mediaDevices?.getUserMedia);
    return () => cleanup();
  }, []);

  function cleanup() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }

  async function start() {
    setError(null);
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = mic;
      const mime = pickMime() || undefined;
      const rec = new MediaRecorder(mic, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => upload(new Blob(chunks.current, { type: rec.mimeType || mime || "audio/webm" }));
      recorder.current = rec;
      rec.start();
      setSeconds(0);
      setState("recording");
      timer.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= maxSeconds) stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      cleanup();
      setError("Couldn't access the microphone. Check your browser's permission and try again.");
    }
  }

  function stop() {
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
    cleanup();
  }

  async function upload(blob: Blob) {
    if (blob.size === 0) return setState("idle");
    setState("uploading");
    const body = new FormData();
    body.append("kind", "audio");
    body.append("file", new File([blob], "voice", { type: blob.type }));
    const res = await fetch("/api/upload", { method: "POST", body }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setState("idle");
    if (!res || !res.ok || !data?.url) return setError(data?.error || "Upload failed. Try recording again.");
    onChange(data.url);
  }

  if (!supported) {
    return (
      <div className="vr">
        <span className="iu-label">{label}</span>
        <p className="rb-muted">Voice recording isn't supported in this browser.</p>
      </div>
    );
  }

  return (
    <div className="vr">
      <span className="iu-label">{label}</span>

      {value && state === "idle" && <audio className="vr-player" controls preload="none" src={value} />}

      <div className="iu-actions">
        {state === "idle" && (
          <button type="button" className="rb-btn" onClick={start}>
            {value ? "Re-record" : "● Record"}
          </button>
        )}
        {state === "recording" && (
          <>
            <span className="vr-live" role="status">● {fmt(seconds)} / {fmt(maxSeconds)}</span>
            <button type="button" className="rb-btn rb-btn-solid" onClick={stop}>Stop</button>
          </>
        )}
        {state === "uploading" && <span className="rb-muted">Saving…</span>}
        {value && state === "idle" && (
          <button type="button" className="rb-btn" onClick={() => onChange(null)}>Remove</button>
        )}
      </div>

      {error && <p className="rb-msg" role="alert">{error}</p>}
    </div>
  );
}
