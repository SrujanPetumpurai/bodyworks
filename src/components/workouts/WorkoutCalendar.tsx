import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import AccountMenu from "../AccountMenu";

/* ---------- types ---------- */

type Category = "exercise" | "martial_arts" | "cardio" | "mobility";
type View = "year" | "month" | "day";

type Entry = {
  id: number;
  date: string; // YYYY-MM-DD
  category: Category;
  title: string | null;
  notes: string | null;
  startMinutes: number | null;
  durationMinutes: number;
  completed: boolean;
};

type NewEntry = Omit<Entry, "id">;
type Drag = { kind: "new"; category: Category } | { kind: "move"; id: number };

/* ---------- icons ---------- */

function Svg({ size = 22, children }: { size?: number; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const CheckIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M5 12.5l4.5 4.5L19 7" strokeWidth="3" />
  </Svg>
);
const ExerciseIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
  </Svg>
);
const MartialArtsIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M7 11V7.5a1.5 1.5 0 0 1 3 0V7a1.5 1.5 0 0 1 3 0v.5a1.5 1.5 0 0 1 3 0V11M7 11h9v4a4 4 0 0 1-4 4h-1a4 4 0 0 1-4-4z" />
  </Svg>
);
const CardioIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M2.5 12H7l2-5 4 10 2-5h6.5" />
  </Svg>
);
const MobilityIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v6M12 9l-5 3M12 9l5-3M12 13l-3 6M12 13l4 5" />
  </Svg>
);

const CATEGORIES: { key: Category; label: string; Icon: ComponentType<{ size?: number }> }[] = [
  { key: "exercise", label: "Exercise", Icon: ExerciseIcon },
  { key: "martial_arts", label: "Martial arts", Icon: MartialArtsIcon },
  { key: "cardio", label: "Cardio", Icon: CardioIcon },
  { key: "mobility", label: "Mobility", Icon: MobilityIcon },
];
const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.key, c])) as Record<Category, (typeof CATEGORIES)[number]>;

/* ---------- date helpers (all local time, "YYYY-MM-DD" keys) ---------- */

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Monday-first grid, padded to full weeks
function monthCells(y: number, m: number) {
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const total = Math.ceil((lead + days) / 7) * 7;
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(y, m, 1 - lead + i);
    return { key: keyOf(d), day: d.getDate(), inMonth: d.getMonth() === m };
  });
}

function fmtTime(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${m ? `:${pad(m)}` : ""} ${h < 12 ? "AM" : "PM"}`;
}
const toTimeInput = (min: number | null) => (min == null ? "" : `${pad(Math.floor(min / 60))}:${pad(min % 60)}`);
const fromTimeInput = (v: string) => {
  if (!v) return null;
  const [h, m] = v.split(":").map(Number);
  return h * 60 + m;
};

const HOUR_H = 56;
const DURATIONS = [15, 30, 45, 60, 90, 120, 180];

// side-by-side columns for overlapping timed entries
function layoutDay(list: Entry[]) {
  const out = new Map<number, { col: number; cols: number }>();
  let cluster: { e: Entry; col: number }[] = [];
  let clusterEnd = 0;
  const flush = () => {
    const cols = Math.max(...cluster.map((c) => c.col)) + 1;
    cluster.forEach((c) => out.set(c.e.id, { col: c.col, cols }));
    cluster = [];
  };
  for (const e of list) {
    const s = e.startMinutes!;
    if (cluster.length && s >= clusterEnd) flush();
    const used = new Set(cluster.filter((c) => c.e.startMinutes! + c.e.durationMinutes > s).map((c) => c.col));
    let col = 0;
    while (used.has(col)) col++;
    cluster.push({ e, col });
    clusterEnd = Math.max(clusterEnd, s + e.durationMinutes);
  }
  if (cluster.length) flush();
  return out;
}

/* ---------- component ---------- */

export default function WorkoutCalendar({ signedIn }: { signedIn: boolean }) {

  // "today" is only known in the browser: the server runs in UTC, so computing it during
  // server render would be a day off for part of the day and break hydration.
  const [todayKey, setTodayKey] = useState("");
  const [cursor, setCursor] = useState("");
  const ready = cursor !== "";
  const [view, setView] = useState<View>("month");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [armed, setArmed] = useState<Category | null>(null); // tap-to-place (touch fallback)
  const [overKey, setOverKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dragRef = useRef<Drag | null>(null);
  const dayScrollRef = useRef<HTMLDivElement>(null);
  const dayGridRef = useRef<HTMLDivElement>(null);

  const cursorDate = ready ? fromKey(cursor) : new Date(2000, 0, 1);
  const cursorYear = cursorDate.getFullYear();

  /* ----- load a window around the cursor's year ----- */
  useEffect(() => {
    const k = keyOf(new Date());
    setTodayKey(k);
    setCursor(k);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!signedIn) {
      setEntries([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/workouts?from=${cursorYear - 1}-12-15&to=${cursorYear + 1}-01-15`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((rows: Entry[]) => !cancelled && setEntries(rows))
      .catch(() => !cancelled && setError("Couldn't load your plan."));
    return () => {
      cancelled = true;
    };
  }, [signedIn, cursorYear, ready]);

  const byDate = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of entries) {
      const list = map.get(e.date);
      if (list) list.push(e);
      else map.set(e.date, [e]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.startMinutes ?? -1) - (b.startMinutes ?? -1) || a.id - b.id);
    }
    return map;
  }, [entries]);

  /* ----- mutations (optimistic) ----- */
  async function create(input: NewEntry) {
    const tempId = -Date.now();
    setEntries((es) => [...es, { ...input, id: tempId }]);
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error();
      const saved: Entry = await res.json();
      setEntries((es) => es.map((e) => (e.id === tempId ? saved : e)));
    } catch {
      setEntries((es) => es.filter((e) => e.id !== tempId));
      setError("Couldn't save that workout.");
    }
  }

  async function patch(id: number, changes: Partial<NewEntry>) {
    if (id < 0) return;
    const prev = entries.find((e) => e.id === id);
    if (!prev) return;
    setEntries((es) => es.map((e) => (e.id === id ? { ...e, ...changes } : e)));
    try {
      const res = await fetch(`/api/workouts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      if (!res.ok) throw new Error();
    } catch {
      setEntries((es) => es.map((e) => (e.id === id ? prev : e)));
      setError("Couldn't update that workout.");
    }
  }

  async function remove(id: number) {
    if (id < 0) return;
    const prev = entries.find((e) => e.id === id);
    setEntries((es) => es.filter((e) => e.id !== id));
    try {
      const res = await fetch(`/api/workouts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      if (prev) setEntries((es) => [...es, prev]);
      setError("Couldn't delete that workout.");
    }
  }

  const toggleDone = (e: Entry) => patch(e.id, { completed: !e.completed });

  /* ----- placing things ----- */
  function place(category: Category, date: string, startMinutes: number | null) {
    if (!signedIn) return setError("Sign in to plan workouts.");
    create({ date, category, title: null, notes: null, startMinutes, durationMinutes: 60, completed: false });
  }

  // startMinutes: undefined = keep existing time, null = clear it, number = set it
  function handleDrop(date: string, startMinutes?: number | null) {
    const d = dragRef.current;
    dragRef.current = null;
    setOverKey(null);
    if (!d) return;
    if (d.kind === "new") return place(d.category, date, startMinutes ?? null);
    patch(d.id, { date, ...(startMinutes !== undefined ? { startMinutes } : {}) });
  }

  function dropProps(id: string, date: string, startMinutes?: number | null) {
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
        e.stopPropagation();
        handleDrop(date, startMinutes);
      },
    };
  }

  function entryDragProps(entry: Entry) {
    return {
      draggable: entry.id > 0,
      onDragStart: (e: React.DragEvent) => {
        dragRef.current = { kind: "move", id: entry.id };
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(entry.id));
      },
      onDragEnd: () => {
        dragRef.current = null;
        setOverKey(null);
      },
    };
  }

  // click on a date cell: place the armed icon, otherwise jump to that day
  function onCellClick(date: string) {
    if (armed) return place(armed, date, null);
    setCursor(date);
    setView("day");
  }

  /* ----- navigation ----- */
  function shift(dir: 1 | -1) {
    const d = fromKey(cursor);
    if (view === "year") d.setFullYear(d.getFullYear() + dir);
    else if (view === "month") {
      d.setDate(1);
      d.setMonth(d.getMonth() + dir);
    } else d.setDate(d.getDate() + dir);
    setCursor(keyOf(d));
  }

  const title =
    view === "year"
      ? String(cursorYear)
      : view === "month"
        ? `${MONTHS[cursorDate.getMonth()]} ${cursorYear}`
        : cursorDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  /* ----- effects ----- */
  useEffect(() => {
    if (view === "day" && dayScrollRef.current) dayScrollRef.current.scrollTop = 6 * HOUR_H - 8;
  }, [view]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setSelectedId(null);
      setArmed(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

  const selected = entries.find((e) => e.id === selectedId) ?? null;

  /* ---------- renderers ---------- */

  const checkButton = (e: Entry) => (
    <button
      type="button"
      className="wk-check"
      aria-pressed={e.completed}
      aria-label={e.completed ? "Mark as not done" : "Mark as done"}
      title={e.completed ? "Done — click to undo" : "Mark as done"}
      onClick={(ev) => {
        ev.stopPropagation();
        toggleDone(e);
      }}
    >
      <CheckIcon size={11} />
    </button>
  );

  const chip = (e: Entry) => {
    const { Icon, label } = CAT[e.category];
    return (
      <div
        key={e.id}
        className={`wk-chip wk-cat--${e.category} ${e.completed ? "done" : ""}`}
        {...entryDragProps(e)}
        onClick={(ev) => {
          ev.stopPropagation();
          setSelectedId(e.id);
        }}
        title={`${e.title ?? label}${e.startMinutes != null ? ` · ${fmtTime(e.startMinutes)}` : ""}${e.completed ? " · done" : ""}`}
      >
        <Icon size={14} />
        <span className="wk-chip-text">
          {e.startMinutes != null && <b>{fmtTime(e.startMinutes)} </b>}
          {e.title ?? label}
        </span>
        {checkButton(e)}
      </div>
    );
  };

  function renderMonth() {
    const cells = monthCells(cursorYear, cursorDate.getMonth());
    return (
      <div className="wk-month">
        <div className="wk-dow">
          {DOW.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="wk-month-grid">
          {cells.map((c) => {
            const list = byDate.get(c.key) ?? [];
            const allDone = list.length > 0 && list.every((e) => e.completed);
            return (
              <div
                key={c.key}
                className={`wk-cell ${c.inMonth ? "" : "out"} ${c.key === todayKey ? "today" : ""} ${c.key < todayKey ? "past" : ""} ${overKey === c.key ? "over" : ""} ${armed ? "armed" : ""}`}
                onClick={() => onCellClick(c.key)}
                aria-current={c.key === todayKey ? "date" : undefined}
                {...dropProps(c.key, c.key)}
              >
                <div className="wk-cell-head">
                  {allDone && (
                    <span className="wk-cell-ok" title="All done" aria-label="All workouts done">
                      <CheckIcon size={11} />
                    </span>
                  )}
                  {c.key === todayKey && <span className="wk-cell-tag">Today</span>}
                  <span className="wk-cell-num">{c.day}</span>
                </div>
                <div className="wk-cell-chips">
                  {list.slice(0, 3).map((e) => chip(e))}
                  {list.length > 3 && <span className="wk-more">+{list.length - 3} more</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderYear() {
    return (
      <div className="wk-year">
        {MONTHS.map((name, m) => (
          <div key={name} className="wk-mini">
            <button
              type="button"
              className="wk-mini-title"
              onClick={() => {
                setCursor(keyOf(new Date(cursorYear, m, 1)));
                setView("month");
              }}
            >
              {name}
            </button>
            <div className="wk-mini-dow">
              {DOW.map((d) => (
                <span key={d}>{d[0]}</span>
              ))}
            </div>
            <div className="wk-mini-grid">
              {monthCells(cursorYear, m).map((c) => {
                if (!c.inMonth) return <span key={c.key} />;
                const list = byDate.get(c.key) ?? [];
                const cats = [...new Set(list.map((e) => e.category))];
                const allDone = list.length > 0 && list.every((e) => e.completed);
                return (
                  <button
                    type="button"
                    key={c.key}
                    className={`wk-mini-day ${c.key === todayKey ? "today" : ""} ${c.key < todayKey ? "past" : ""} ${overKey === c.key ? "over" : ""} ${list.length ? "has" : ""} ${allDone ? "alldone" : ""}`}
                    onClick={() => onCellClick(c.key)}
                    title={list.length ? `${list.length} planned${allDone ? " · all done" : ""}` : undefined}
                    {...dropProps(c.key, c.key)}
                  >
                    {c.day}
                    {cats.length > 0 && (
                      <span className="wk-dots">
                        {cats.slice(0, 3).map((k) => (
                          <i key={k} className={`wk-cat--${k}`} />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderDay() {
    const list = byDate.get(cursor) ?? [];
    const untimed = list.filter((e) => e.startMinutes == null);
    const timed = list.filter((e) => e.startMinutes != null);
    const lay = layoutDay(timed);

    // pointer y -> minutes, snapped to 30
    const minutesAt = (clientY: number) => {
      const rect = dayGridRef.current!.getBoundingClientRect();
      const raw = ((clientY - rect.top) / HOUR_H) * 60;
      return Math.max(0, Math.min(23 * 60 + 30, Math.floor(raw / 30) * 30));
    };

    return (
      <div className={`wk-day ${cursor < todayKey ? "past" : ""}`}>
        <div
          className={`wk-untimed ${overKey === "untimed" ? "over" : ""}`}
          {...dropProps("untimed", cursor, null)}
        >
          <span className="wk-untimed-label">No set time</span>
          {untimed.map((e) => chip(e))}
          {untimed.length === 0 && <span className="wk-hint">Drop here to plan it for the day without a time</span>}
        </div>

        <div className="wk-day-scroll" ref={dayScrollRef}>
          <div
            className={`wk-day-grid ${overKey === "timeline" ? "over" : ""}`}
            ref={dayGridRef}
            style={{ height: 24 * HOUR_H }}
            onClick={(e) => {
              if (armed) place(armed, cursor, minutesAt(e.clientY));
            }}
            onDragOver={(e) => {
              if (!dragRef.current) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = dragRef.current.kind === "new" ? "copy" : "move";
              if (overKey !== "timeline") setOverKey("timeline");
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverKey(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(cursor, minutesAt(e.clientY));
            }}
          >
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="wk-hour" style={{ top: h * HOUR_H, height: HOUR_H }}>
                <span>{fmtTime(h * 60)}</span>
              </div>
            ))}

            {timed.map((e) => {
              const pos = lay.get(e.id) ?? { col: 0, cols: 1 };
              const { Icon, label } = CAT[e.category];
              return (
                <div
                  key={e.id}
                  className={`wk-block wk-cat--${e.category} ${e.completed ? "done" : ""}`}
                  style={{
                    top: (e.startMinutes! / 60) * HOUR_H,
                    height: Math.max((e.durationMinutes / 60) * HOUR_H - 2, 26),
                    left: `calc(72px + (100% - 80px) * ${pos.col / pos.cols})`,
                    width: `calc((100% - 80px) / ${pos.cols} - 4px)`,
                  }}
                  {...entryDragProps(e)}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    setSelectedId(e.id);
                  }}
                >
                  <Icon size={16} />
                  <div className="wk-block-text">
                    <strong>{e.title ?? label}</strong>
                    <small>
                      {fmtTime(e.startMinutes!)} – {fmtTime((e.startMinutes! + e.durationMinutes) % 1440)}
                    </small>
                  </div>
                  {checkButton(e)}
                </div>
              );
            })}

            {cursor === todayKey && <NowLine />}
          </div>
        </div>
      </div>
    );
  }

  /* ---------- page ---------- */

  return (
    <div className="rb-page wk-page">
      <header className="rb-topbar">
        <a href="/" className="rb-wordmark">bodyworks</a>
        <nav className="rb-nav" aria-label="Main">
          <a href="/workouts" aria-current="page">Workouts</a>
          <a href="/daily-requirements">Daily needs</a>
          <a href="/recipes">Recipes</a>
          <a href="/communities">Communities</a>
        </nav>
        <AccountMenu />
      </header>

      <div className="wk-container">
        <h1 className="rb-title wk-title">Workout planner</h1>
        <p className="rb-lede">Drag a workout onto a day. Switch between year, month and day to plan it your way.</p>

        {!signedIn && (
          <p className="wk-banner">
            <a href="/auth?next=%2Fworkouts">Sign in</a> to plan and save workouts — your calendar is stored per account.
          </p>
        )}
        {error && <p className="wk-banner wk-banner--error" role="alert">{error}</p>}
        {armed && (
          <p className="wk-banner" role="status">
            Placing <b>{CAT[armed].label}</b> — tap a date. Tap the icon again, or press Esc, to cancel.
          </p>
        )}

        <div className="wk-body">

          <section className="wk-card">
            <div className="wk-toolbar">
              <div className="wk-tabs" role="tablist">
                {(["year", "month", "day"] as View[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="tab"
                    aria-selected={view === v}
                    className={view === v ? "on" : ""}
                    onClick={() => setView(v)}
                  >
                    {v[0].toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
              <div className="wk-nav">
                <button type="button" onClick={() => shift(-1)} aria-label="Previous">‹</button>
                <button type="button" className="wk-today" onClick={() => setCursor(todayKey)}>Today</button>
                <button type="button" onClick={() => shift(1)} aria-label="Next">›</button>
              </div>
              <h2 className="wk-range">
                {ready ? title : ""}
                {view === "day" && cursor === todayKey && <span className="wk-badge today">Today</span>}
                {view === "day" && cursor < todayKey && <span className="wk-badge past">Past day</span>}
              </h2>
            </div>

            {ready && view === "year" && renderYear()}
            {ready && view === "month" && renderMonth()}
            {ready && view === "day" && renderDay()}
            {!ready && <div className="wk-loading" aria-hidden="true" />}
          </section>
          <aside className="wk-tray" aria-label="Workout icons — drag onto a date">
            <span className="wk-tray-cap">Drag</span>
            <div className="wk-tray-items">
              {CATEGORIES.map(({ key, label, Icon }) => (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  aria-pressed={armed === key}
                  aria-label={label}
                  data-label={label}
                  className={`wk-tile wk-cat--${key} ${armed === key ? "armed" : ""}`}
                  draggable
                  onDragStart={(e) => {
                    dragRef.current = { kind: "new", category: key };
                    e.dataTransfer.effectAllowed = "copy";
                    e.dataTransfer.setData("text/plain", key);
                  }}
                  onDragEnd={() => {
                    dragRef.current = null;
                    setOverKey(null);
                  }}
                  onClick={() => setArmed((a) => (a === key ? null : key))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setArmed((a) => (a === key ? null : key));
                    }
                  }}
                >
                  <Icon size={26} />
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>

      {selected && (
        <EntryModal
          key={selected.id}
          entry={selected}
          onClose={() => setSelectedId(null)}
          onPatch={(c) => patch(selected.id, c)}
          onDelete={() => {
            remove(selected.id);
            setSelectedId(null);
          }}
        />
      )}
    </div>
  );
}

/* ---------- current-time line for today's day view ---------- */

function NowLine() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const mins = now.getHours() * 60 + now.getMinutes();
  return <div className="wk-now" style={{ top: (mins / 60) * HOUR_H }} />;
}

/* ---------- edit modal ---------- */

function EntryModal({
  entry,
  onClose,
  onPatch,
  onDelete,
}: {
  entry: Entry;
  onClose: () => void;
  onPatch: (c: Partial<NewEntry>) => void;
  onDelete: () => void;
}) {
  const { Icon, label } = CAT[entry.category];
  const durations = DURATIONS.includes(entry.durationMinutes)
    ? DURATIONS
    : [...DURATIONS, entry.durationMinutes].sort((a, b) => a - b);

  return (
    <div className="wk-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="wk-modal" role="dialog" aria-modal="true" aria-label={`Edit ${label}`}>
        <button type="button" className="wk-modal-close" onClick={onClose} aria-label="Close">×</button>
        <div className={`wk-modal-head wk-cat--${entry.category}`}>
          <span className="wk-modal-icon"><Icon size={22} /></span>
          <h2>{label}</h2>
        </div>

        <button
          type="button"
          className={`wk-complete ${entry.completed ? "on" : ""}`}
          aria-pressed={entry.completed}
          onClick={() => onPatch({ completed: !entry.completed })}
        >
          <CheckIcon size={16} />
          {entry.completed ? "Completed — tap to undo" : "Mark as done"}
        </button>

        <label className="wk-field">
          <span>Title</span>
          <input
            type="text"
            maxLength={80}
            placeholder={label}
            defaultValue={entry.title ?? ""}
            onBlur={(e) => {
              const v = e.target.value.trim() || null;
              if (v !== entry.title) onPatch({ title: v });
            }}
          />
        </label>

        <div className="wk-row">
          <label className="wk-field">
            <span>Date</span>
            <input
              type="date"
              value={entry.date}
              onChange={(e) => e.target.value && onPatch({ date: e.target.value })}
            />
          </label>
          <label className="wk-field">
            <span>Start time</span>
            <input
              type="time"
              value={toTimeInput(entry.startMinutes)}
              onChange={(e) => onPatch({ startMinutes: fromTimeInput(e.target.value) })}
            />
          </label>
          <label className="wk-field">
            <span>Length</span>
            <select
              value={entry.durationMinutes}
              onChange={(e) => onPatch({ durationMinutes: Number(e.target.value) })}
            >
              {durations.map((d) => (
                <option key={d} value={d}>
                  {d >= 60 ? `${Math.floor(d / 60)}h${d % 60 ? ` ${d % 60}m` : ""}` : `${d}m`}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="wk-field">
          <span>Notes</span>
          <textarea
            rows={3}
            maxLength={500}
            placeholder="Sets, reps, what to focus on…"
            defaultValue={entry.notes ?? ""}
            onBlur={(e) => {
              const v = e.target.value.trim() || null;
              if (v !== entry.notes) onPatch({ notes: v });
            }}
          />
        </label>

        <div className="wk-modal-actions">
          <button type="button" className="wk-delete" onClick={onDelete}>Delete</button>
          <button type="button" className="wk-done" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
