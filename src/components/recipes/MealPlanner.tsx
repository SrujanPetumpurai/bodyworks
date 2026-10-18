import { useEffect, useMemo, useRef, useState } from "react";
import { TONES, hash } from "./Avatar";
import RecipeModal from "./RecipeModal";
import type { RecipeSummary } from "./RecipesBrowser";
import { GUEST_MEALS_KEY, readGuest, writeGuest } from "../../lib/guest-store";

/* ---------- types ---------- */

type Slot = "breakfast" | "lunch" | "dinner" | "snack";

type Meal = {
  id: number;
  date: string; // YYYY-MM-DD
  slot: Slot;
  slug: string;
  name: string;
  imageUrl: string | null;
};

type Drag = { kind: "new"; slug: string } | { kind: "move"; id: number };

const SLOTS: { key: Slot; label: string }[] = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack", label: "Snack" },
];

/* ---------- date helpers (local time, "YYYY-MM-DD" keys) ---------- */

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Monday of the week containing `key`
function weekStartOf(key: string) {
  const d = fromKey(key);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return keyOf(d);
}

function weekDays(start: string) {
  const s = fromKey(start);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(s.getFullYear(), s.getMonth(), s.getDate() + i);
    return { key: keyOf(d), dow: DOW[i], day: d.getDate() };
  });
}

function rangeTitle(days: { key: string }[]) {
  const a = fromKey(days[0].key);
  const b = fromKey(days[6].key);
  const mon = (d: Date) => d.toLocaleDateString("en-IN", { month: "short" });
  const left = a.getMonth() === b.getMonth() ? `${a.getDate()}` : `${a.getDate()} ${mon(a)}`;
  return `${left} – ${b.getDate()} ${mon(b)} ${b.getFullYear()}`;
}

/* ---------- small pieces ---------- */

function Thumb({ name, imageUrl, size }: { name: string; imageUrl: string | null; size: number }) {
  const style = { width: size, height: size, fontSize: size * 0.46 };
  return imageUrl ? (
    <img className="mp-thumb" src={imageUrl} alt="" style={style} draggable={false} loading="lazy" />
  ) : (
    <span
      className="mp-thumb mp-thumb--ph"
      style={{ ...style, background: TONES[hash(name) % TONES.length] }}
      aria-hidden="true"
    >
      {name.charAt(0)}
    </span>
  );
}

/* ---------- component ---------- */

export default function MealPlanner({ recipes, signedIn }: { recipes: RecipeSummary[]; signedIn: boolean }) {
  // "today" is only known in the browser (the server runs in UTC), so it's set after mount
  const [todayKey, setTodayKey] = useState("");
  const [weekStart, setWeekStart] = useState("");
  const ready = weekStart !== "";

  const [meals, setMeals] = useState<Meal[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [armed, setArmed] = useState<string | null>(null); // recipe slug armed for tap-to-place (touch fallback)
  const [overKey, setOverKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const dragRef = useRef<Drag | null>(null);

  // Visitors who aren't signed in keep their plan in this browser (localStorage) instead of the database.
  // `meals` then holds every planned meal, not just the visible week (the grid only reads the days it shows).
  const guestNext = useRef(1);
  const [guestLoaded, setGuestLoaded] = useState(false);

  useEffect(() => {
    const k = keyOf(new Date());
    setTodayKey(k);
    setWeekStart(weekStartOf(k));
  }, []);

  const days = useMemo(() => (ready ? weekDays(weekStart) : []), [ready, weekStart]);

  /* ----- load the visible week ----- */
  useEffect(() => {
    if (!ready) return;
    if (!signedIn) {
      if (!guestLoaded) {
        const blob = readGuest<Meal>(GUEST_MEALS_KEY);
        guestNext.current = blob.nextId;
        setMeals(blob.items);
        setGuestLoaded(true);
      }
      return;
    }
    let cancelled = false;
    const end = weekDays(weekStart)[6].key;
    fetch(`/api/meal-plan?from=${weekStart}&to=${end}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((rows: Meal[]) => !cancelled && setMeals(rows))
      .catch(() => !cancelled && setError("Couldn't load your meal plan."));
    return () => {
      cancelled = true;
    };
  }, [ready, signedIn, weekStart, guestLoaded]);

  // save guest changes (only after the first load, so an empty initial state never overwrites a saved plan)
  useEffect(() => {
    if (signedIn || !guestLoaded) return;
    if (!writeGuest(GUEST_MEALS_KEY, { nextId: guestNext.current, items: meals })) {
      setError("Your browser wouldn't save the plan, so it will be lost when you leave.");
    }
  }, [meals, signedIn, guestLoaded]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setArmed(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const bySlot = useMemo(() => {
    const map = new Map<string, Meal[]>();
    for (const m of meals) {
      const k = `${m.date}|${m.slot}`;
      const list = map.get(k);
      if (list) list.push(m);
      else map.set(k, [m]);
    }
    return map;
  }, [meals]);

  const bySlug = useMemo(() => new Map(recipes.map((r) => [r.slug, r])), [recipes]);

  const shelf = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? recipes.filter((r) => r.name.toLowerCase().includes(q)) : recipes;
  }, [recipes, query]);

  /* ----- mutations (optimistic) ----- */
  async function create(slug: string, date: string, slot: Slot) {
    const recipe = bySlug.get(slug);
    if (!recipe) return;
    if (!signedIn) {
      setMeals((ms) => [...ms, { id: guestNext.current++, date, slot, slug, name: recipe.name, imageUrl: recipe.imageUrl }]);
      return;
    }
    const tempId = -Date.now();
    setMeals((ms) => [...ms, { id: tempId, date, slot, slug, name: recipe.name, imageUrl: recipe.imageUrl }]);
    try {
      const res = await fetch("/api/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, date, slot }),
      });
      if (!res.ok) throw new Error();
      const saved: Meal = await res.json();
      setMeals((ms) => ms.map((m) => (m.id === tempId ? saved : m)));
    } catch {
      setMeals((ms) => ms.filter((m) => m.id !== tempId));
      setError("Couldn't save that meal.");
    }
  }

  function move(id: number, date: string, slot: Slot) {
    if (id < 0) return;
    const prev = meals.find((m) => m.id === id);
    if (!prev || (prev.date === date && prev.slot === slot)) return;
    setMeals((ms) => ms.map((m) => (m.id === id ? { ...m, date, slot } : m)));
    if (!signedIn) return;
    fetch(`/api/meal-plan/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, slot }),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
      })
      .catch(() => {
        setMeals((ms) => ms.map((m) => (m.id === id ? prev : m)));
        setError("Couldn't move that meal.");
      });
  }

  async function remove(meal: Meal) {
    if (meal.id < 0) return;
    setMeals((ms) => ms.filter((m) => m.id !== meal.id));
    if (!signedIn) return;
    try {
      const res = await fetch(`/api/meal-plan/${meal.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setMeals((ms) => [...ms, meal]);
      setError("Couldn't remove that meal.");
    }
  }

  async function clearDay(date: string, label: string) {
    const removed = meals.filter((m) => m.date === date);
    if (removed.length === 0) return;
    if (!confirm(`Remove all ${removed.length} planned ${removed.length === 1 ? "meal" : "meals"} on ${label}?`)) return;
    setMeals((ms) => ms.filter((m) => m.date !== date));
    if (!signedIn) return;
    try {
      const res = await fetch(`/api/meal-plan?date=${date}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setMeals((ms) => [...ms, ...removed]);
      setError("Couldn't clear that day.");
    }
  }

  /* ----- placing things ----- */
  function place(slug: string, date: string, slot: Slot) {
    create(slug, date, slot);
  }

  function handleDrop(date: string, slot: Slot) {
    const d = dragRef.current;
    dragRef.current = null;
    setOverKey(null);
    if (!d) return;
    if (d.kind === "new") place(d.slug, date, slot);
    else move(d.id, date, slot);
  }

  function dropProps(date: string, slot: Slot) {
    const id = `${date}|${slot}`;
    return {
      onDragOver: (e: React.DragEvent) => {
        if (!dragRef.current) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = dragRef.current.kind === "new" ? "copy" : "move";
        if (overKey !== id) setOverKey(id);
      },
      onDragLeave: (e: React.DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverKey((k) => (k === id ? null : k));
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        handleDrop(date, slot);
      },
    };
  }

  function shift(dir: 1 | -1) {
    const d = fromKey(weekStart);
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(keyOf(d));
  }

  /* ---------- render ---------- */

  const mealChip = (m: Meal) => (
    <div
      key={m.id}
      className="mp-chip"
      role="button"
      tabIndex={0}
      draggable={m.id > 0}
      title={m.name}
      onDragStart={(e) => {
        dragRef.current = { kind: "move", id: m.id };
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(m.id));
      }}
      onDragEnd={() => {
        dragRef.current = null;
        setOverKey(null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        setActiveSlug(m.slug);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setActiveSlug(m.slug);
        }
      }}
    >
      <Thumb name={m.name} imageUrl={m.imageUrl} size={22} />
      <span className="mp-chip-text">{m.name}</span>
      <button
        type="button"
        className="mp-chip-x"
        aria-label={`Remove ${m.name}`}
        onClick={(e) => {
          e.stopPropagation();
          remove(m);
        }}
        onKeyDown={(e) => e.stopPropagation()}
      >
        ×
      </button>
    </div>
  );

  const armedName = armed ? bySlug.get(armed)?.name : null;

  return (
    <div className="mp-wrap">
      <h2 className="mp-section-title">Meal plan</h2>
      <p className="rb-hint">Drag a recipe onto a day and meal. Click a planned recipe to open it.</p>

      {!signedIn && (
        <p className="mp-banner">
          Your plan is saved in this browser only. <a href="/auth?next=%2Frecipes">Sign in</a> to keep it on your account and use it on any device.
        </p>
      )}
      {error && <p className="mp-banner mp-banner--error" role="alert">{error}</p>}
      {armed && (
        <p className="mp-banner" role="status">
          Placing <b>{armedName ?? "recipe"}</b> — tap a meal slot. Tap the recipe again, or press Esc, to cancel.
        </p>
      )}

      <div className="mp-body">
        <section className="mp-card">
          <div className="mp-toolbar">
            <div className="mp-nav">
              <button type="button" onClick={() => shift(-1)} aria-label="Previous week">‹</button>
              <button type="button" className="mp-today" onClick={() => setWeekStart(weekStartOf(todayKey))}>This week</button>
              <button type="button" onClick={() => shift(1)} aria-label="Next week">›</button>
            </div>
            <h2 className="mp-range">{ready ? rangeTitle(days) : ""}</h2>
          </div>

          {ready ? (
            <div className="mp-scroll">
              <div className="mp-grid" role="grid" aria-label="Weekly meal plan">
                <div className="mp-corner" />
                {days.map((d) => (
                  <div
                    key={d.key}
                    className={`mp-dayhead ${d.key === todayKey ? "today" : ""} ${d.key < todayKey ? "past" : ""}`}
                    aria-current={d.key === todayKey ? "date" : undefined}
                  >
                    <span>{d.dow}</span>
                    <b>{d.day}</b>
                    {meals.some((m) => m.date === d.key) && (
                      <button
                        type="button"
                        className="mp-clearday"
                        onClick={() => clearDay(d.key, `${d.dow} ${d.day}`)}
                        aria-label={`Clear all meals on ${d.dow} ${d.day}`}
                      >
                        Clear day
                      </button>
                    )}
                  </div>
                ))}

                {SLOTS.map((s) => (
                  <Row key={s.key}>
                    <div className="mp-slotlabel" data-slot={s.key}>{s.label}</div>
                    {days.map((d) => {
                      const id = `${d.key}|${s.key}`;
                      const list = bySlot.get(id) ?? [];
                      return (
                        <div
                          key={id}
                          role="gridcell"
                          data-slot={s.key}
                          className={`mp-cell ${d.key === todayKey ? "today" : ""} ${d.key < todayKey ? "past" : ""} ${overKey === id ? "over" : ""} ${armed ? "armed" : ""}`}
                          onClick={() => armed && place(armed, d.key, s.key)}
                          aria-label={`${s.label}, ${d.dow} ${d.day}`}
                          {...dropProps(d.key, s.key)}
                        >
                          {list.map((m) => mealChip(m))}
                        </div>
                      );
                    })}
                  </Row>
                ))}
              </div>
            </div>
          ) : (
            <div className="mp-loading" aria-hidden="true" />
          )}
        </section>

        <aside className="mp-box" aria-label="Recipes">
          <h3 className="mp-box-title">{signedIn ? "Your recipes" : "Recipes"}</h3>
          <input
            className="mp-box-search"
            type="search"
            placeholder="Search recipes"
            aria-label="Search recipes"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <p className="mp-box-hint">Drag onto a slot, or tap one then tap a slot.</p>
          {recipes.length === 0 ? (
            <p className="mp-box-hint">{signedIn ? <>Nothing to plan with yet. <a href="/recipes/new">Add a recipe</a> or save some from <a href="/recipes#discover">Discover</a>.</> : "No recipes to plan with yet."}</p>
          ) : shelf.length === 0 ? (
            <p className="mp-box-hint">No recipes match.</p>
          ) : (
            <div className="mp-box-grid">
              {shelf.map((r) => (
                <div
                  key={r.slug}
                  role="button"
                  tabIndex={0}
                  aria-pressed={armed === r.slug}
                  aria-label={r.name}
                  data-label={r.name}
                  className={`mp-tile ${armed === r.slug ? "armed" : ""}`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "copy";
                    e.dataTransfer.setData("text/plain", r.slug);
                    dragRef.current = { kind: "new", slug: r.slug };
                  }}
                  onDragEnd={() => {
                    dragRef.current = null;
                    setOverKey(null);
                  }}
                  onClick={() => setArmed(armed === r.slug ? null : r.slug)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setArmed(armed === r.slug ? null : r.slug);
                    }
                  }}
                >
                  <Thumb name={r.name} imageUrl={r.imageUrl} size={52} />
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      {activeSlug && <RecipeModal slug={activeSlug} onClose={() => setActiveSlug(null)} />}
    </div>
  );
}

// grid rows are flattened into the parent grid; this only exists to keep the JSX readable
function Row({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
