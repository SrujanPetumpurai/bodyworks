import { useState } from "react";
import { signIn, signUp } from "../../lib/auth-client";

// only allow same-site relative redirects
function safeNext(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/recipes";
}

export default function AuthForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res =
      mode === "up"
        ? await signUp.email({ name: name.trim(), email: email.trim(), password })
        : await signIn.email({ email: email.trim(), password });
    setBusy(false);
    if (res.error) {
      setError(res.error.message || "Something went wrong. Try again.");
      return;
    }
    location.href = safeNext(next);
  }

  return (
    <div className="rb-page af-page">
      <a href="/recipes" className="af-logo rb-wordmark">BODYWORKS<span>.</span></a>
      <form className="af-card" onSubmit={submit}>
        <h1>{mode === "in" ? "Sign in" : "Create account"}</h1>
        <p className="rb-muted">
          {mode === "in" ? "Welcome back — sign in to post and rate recipes." : "Join to post your own recipes."}
        </p>

        {mode === "up" && (
          <label className="af-field">
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} autoComplete="name" />
          </label>
        )}
        <label className="af-field">
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label className="af-field">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={mode === "in" ? "current-password" : "new-password"}
          />
          {mode === "up" && <small>At least 8 characters.</small>}
        </label>

        {error && <p className="rb-msg" role="alert">{error}</p>}

        <button className="rb-btn rb-btn-solid af-submit" disabled={busy}>
          {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
        </button>

        <button
          type="button"
          className="af-switch"
          onClick={() => {
            setMode(mode === "in" ? "up" : "in");
            setError(null);
          }}
        >
          {mode === "in" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
