import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "../lib/auth-client";
import Avatar from "./recipes/Avatar";
import ThemeToggle from "./ThemeToggle";

// Sign-in link when logged out; avatar dropdown when logged in.
export default function AccountMenu({
  light = true,
  showAddRecipe = true,
  showThemeToggle = false,
}: {
  light?: boolean;
  showAddRecipe?: boolean;
  showThemeToggle?: boolean;
}) {
  const { data: session, isPending } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (isPending) return <div className="rb-account">{showThemeToggle && <ThemeToggle />}</div>;

  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search);
    return (
      <div className={`rb-account ${light ? "light" : ""}`}>
        {showThemeToggle && <ThemeToggle />}
        <a className="rb-btn" href={`/auth?next=${next}`}>Sign in</a>
      </div>
    );
  }

  const u = session.user;
  return (
    <div className={`rb-account ${light ? "light" : ""}`} ref={ref}>
      {showThemeToggle && <ThemeToggle />}
      {showAddRecipe && <a className="rb-btn rb-btn-solid" href="/recipes/new">+ Add recipe</a>}
      <button
        type="button"
        className="rb-account-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((o) => !o)}
      >
        <Avatar name={u.name} image={u.image ?? null} size={36} />
      </button>
      {open && (
        <div className="rb-menu" role="menu">
          <p className="rb-menu-name">{u.name}</p>
          <a role="menuitem" href={`/profile/${u.id}`}>My profile</a>
          <a role="menuitem" href={`/profile/${u.id}?tab=recipes`}>My recipes</a>
          {showAddRecipe && <a role="menuitem" href="/recipes/new">Add recipe</a>}
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              await signOut();
              location.href = "/recipes";
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
