import { useEffect, useState } from "react";
import { Moon, MoonStar, Sun } from "lucide-react";

type Theme = "light" | "dark" | "night";

// "night" is a dark-family theme: <html data-theme="dark" data-palette="night">, so every existing
// dark style still applies and the night palette only overrides colours and backgrounds.
// The inline script in each page <head> sets this before first paint (saved choice, else system).
const NEXT: Record<Theme, Theme> = { light: "dark", dark: "night", night: "light" };
const LABEL: Record<Theme, string> = {
  light: "Switch to dark mode",
  dark: "Switch to night theme",
  night: "Switch to light mode",
};

function apply(t: Theme) {
  const h = document.documentElement;
  h.dataset.theme = t === "night" ? "dark" : t;
  if (t === "night") h.dataset.palette = "night";
  else delete h.dataset.palette;
}

export default function ThemeToggle() {
  // unknown until mounted, so server and client markup match
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const h = document.documentElement;
    setTheme(h.dataset.palette === "night" ? "night" : h.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    if (!theme) return;
    const next = NEXT[theme];
    apply(next);
    try {
      localStorage.setItem("bw-theme", next);
    } catch {
      /* private mode: the choice just won't persist */
    }
    setTheme(next);
  }

  const label = theme ? LABEL[theme] : "Change theme";
  return (
    <button type="button" className="rb-theme-btn" onClick={toggle} aria-label={label} title={label}>
      {theme === "light" ? <Moon size={18} aria-hidden="true" /> : theme === "dark" ? <MoonStar size={18} aria-hidden="true" /> : theme === "night" ? <Sun size={18} aria-hidden="true" /> : null}
    </button>
  );
}
