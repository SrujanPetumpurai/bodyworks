import { useState } from "react";

export default function JoinInvite({ code, name, signedIn }: { code: string; name: string; signedIn: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/communities/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res || !res.ok) {
      setBusy(false);
      return setError(data?.error || "Couldn't join. Try again.");
    }
    location.href = `/communities/${data.slug}`;
  }

  return signedIn ? (
    <>
      <button className="rb-btn rb-btn-solid af-submit" disabled={busy} onClick={join}>
        {busy ? "Joining…" : `Join ${name}`}
      </button>
      {error && <p className="rb-msg" role="alert">{error}</p>}
    </>
  ) : (
    <a className="rb-btn rb-btn-solid af-submit" href={`/auth?next=/communities/join/${code}`}>
      Sign in to join
    </a>
  );
}
