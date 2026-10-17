import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

// <html data-theme> is set before first paint by the inline script in each page <head>
// (saved choice, else the system setting). This flips it and remembers the choice.
export default function ThemeToggle() {
  // unknown until mounted, so server and client markup match
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("bw-theme", next);
    } catch {
      /* private mode: the choice just won't persist */
    }
    setTheme(next);
  }

  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button type="button" className="rb-theme-btn" onClick={toggle} aria-label={label} title={label}>
      {theme === "dark" ? <Sun size={18} aria-hidden="true" /> : theme === "light" ? <Moon size={18} aria-hidden="true" /> : null}
    </button>
  );
}
