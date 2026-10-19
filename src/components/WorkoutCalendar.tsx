import { useEffect, useMemo, useRef, useState } from "react";
import AccountMenu from "../AccountMenu";
import IconBox from "./IconBox";
import { BUILTIN, CheckIcon, FALLBACK_TYPE, typeFromCustom, type Category, type CustomType, type TypeDef } from "./icons";
import type { GlyphKey, Shade } from "../../lib/workout-glyphs";
import { MAX_OCCURRENCES, addDays, occurrenceDates, validateRule, weekdayOf, type RepeatRule } from "../../lib/workout-repeat";

/* ---------- types ---------- */

type View = "year" | "month" | "day";

type Entry = {
  id: number;
  date: string; // YYYY-MM-DD
  category: Category | null; // built-in icon…
  typeId: number | null; // …or a custom icon (exactly one is set)
  title: string | null;
  notes: string | null;
  startMinutes: number | null;
  durationMinutes: number;
  completed: boolean;
  seriesId: string | null; // shared by every workout created from one "Repeat"
};

type NewEntry = Omit<Entry, "id">;
// ref is "c:<category>" for built-in icons or "t:<id>" for custom ones
type Drag = { kind: "new"; ref: string } | { kind: "move"; id: number };

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
  const [armed, setArmed] = useState<string | null>(null); // icon ref armed for tap-to-place (touch fallback)
  const [overKey, setOverKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [custom, setCustom] = useState<CustomType[]>([]);

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

  useEffect(() => {
    if (!ready || !signedIn) {
      setCustom([]);
      return;
    }
    let cancelled = false;
    fetch("/api/workout-types")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((rows: CustomType[]) => !cancelled && setCustom(rows))
      .catch(() => !cancelled && setError("Couldn't load your icons."));
    return () => {
      cancelled = true;
    };
  }, [ready, signedIn]);

  const types = useMemo(() => [...BUILTIN, ...custom.map(typeFromCustom)], [custom]);
  const typeMap = useMemo(() => new Map(types.map((t) => [t.ref, t])), [types]);
  const typeOf = (e: Entry): TypeDef => typeMap.get(e.category ? `c:${e.category}` : `t:${e.typeId}`) ?? FALLBACK_TYPE;

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

  // in-flight PATCH requests; "Repeat" waits for these so copies never use stale values
  const pending = useRef(new Set<Promise<unknown>>());

  function patch(id: number, changes: Partial<NewEntry>) {
    if (id < 0) return;
    const prev = entries.find((e) => e.id === id);
    if (!prev) return;
    setEntries((es) => es.map((e) => (e.id === id ? { ...e, ...changes } : e)));
    const run = fetch(`/api/workouts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
      })
      .catch(() => {
        setEntries((es) => es.map((e) => (e.id === id ? prev : e)));
        setError("Couldn't update that workout.");
      });
    pending.current.add(run);
    run.finally(() => pending.current.delete(run));
  }

  // scope: "this" | "following" | "all" — the last two also remove the rest of a repeat series
  async function removeEntry(entry: Entry, scope: "this" | "following" | "all") {
    if (entry.id < 0) return;
    const inSeries = (x: Entry) =>
      scope !== "this" && entry.seriesId !== null && x.seriesId === entry.seriesId && (scope === "all" || x.date >= entry.date);
    const gone = entries.filter((x) => x.id === entry.id || inSeries(x));
    const ids = new Set(gone.map((x) => x.id));
    setEntries((es) => es.filter((x) => !ids.has(x.id)));
    try {
      const res = await fetch(`/api/workouts/${entry.id}?scope=${scope}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setEntries((es) => [...es, ...gone]);
      setError("Couldn't delete that workout.");
    }
  }

  // resolves to an error message, or null on success
  async function repeatEntry(entry: Entry, rule: RepeatRule): Promise<string | null> {
    if (entry.id < 0) return "Still saving — try again in a moment.";
    await Promise.allSettled([...pending.current]);
    try {
      const res = await fetch(`/api/workouts/${entry.id}/repeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rule),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return data?.error ?? "Couldn't create the repeats.";
      setEntries((es) => [...es.map((x) => (x.id === entry.id ? { ...x, seriesId: data.seriesId } : x)), ...(data.created as Entry[])]);
      return null;
    } catch {
      return "Couldn't create the repeats.";
    }
  }

  async function createIcon(input: { name: string; glyph: GlyphKey; shade: Shade }): Promise<string | null> {
    try {
      const res = await fetch("/api/workout-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return data?.error ?? "Couldn't create that icon.";
      setCustom((c) => [...c, data as CustomType]);
      return null;
    } catch {
      return "Couldn't create that icon.";
    }
  }

  async function deleteIcon(t: TypeDef) {
    if (t.id === null) return;
    const used = entries.filter((e) => e.typeId === t.id).length;
    const ok = window.confirm(
      used
        ? `Delete “${t.name}”? Its ${used} planned workout${used === 1 ? "" : "s"} will be removed too.`
        : `Delete “${t.name}”?`
    );
    if (!ok) return;
    try {
      const res = await fetch(`/api/workout-types/${t.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setCustom((c) => c.filter((x) => x.id !== t.id));
      setEntries((es) => es.filter((e) => e.typeId !== t.id));
      if (armed === t.ref) setArmed(null);
    } catch {
      setError("Couldn't delete that icon.");
    }
  }

  const toggleDone = (e: Entry) => patch(e.id, { completed: !e.completed });

  /* ----- placing things ----- */
  function place(ref: string, date: string, startMinutes: number | null) {
    if (!signedIn) return setError("Sign in to plan workouts.");
    const base = { date, title: null, notes: null, startMinutes, durationMinutes: 60, completed: false, seriesId: null };
    create(
      ref.startsWith("t:")
        ? { ...base, category: null, typeId: Number(ref.slice(2)) }
        : { ...base, category: ref.slice(2) as Category, typeId: null }
    );
  }

  // startMinutes: undefined = keep existing time, null = clear it, number = set it
  function handleDrop(date: string, startMinutes?: number | null) {
    const d = dragRef.current;
    dragRef.current = null;
    setOverKey(null);
    if (!d) return;
    if (d.kind === "new") return place(d.ref, date, startMinutes ?? null);
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
    const t = typeOf(e);
    return (
      <div
        key={e.id}
        className={`wk-chip wk-shade--${t.shade} ${e.completed ? "done" : ""}`}
        {...entryDragProps(e)}
        onClick={(ev) => {
          ev.stopPropagation();
          setSelectedId(e.id);
        }}
        title={`${e.title ?? t.name}${e.startMinutes != null ? ` · ${fmtTime(e.startMinutes)}` : ""}${e.completed ? " · done" : ""}${e.seriesId ? " · repeats" : ""}`}
      >
        <span className="wk-dot">{e.completed ? <CheckIcon size={12} /> : <t.Icon size={12} />}</span>
        <span className="wk-chip-text">{e.title ?? t.name}</span>
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
                const cats = [...new Set(list.map((e) => typeOf(e).shade))];
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
                          <i key={k} className={`wk-shade--${k}`} />
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
              const t = typeOf(e);
              return (
                <div
                  key={e.id}
                  className={`wk-block wk-shade--${t.shade} ${e.completed ? "done" : ""}`}
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
                  <span className="wk-dot wk-dot--lg"><t.Icon size={14} /></span>
                  <div className="wk-block-text">
                    <strong>{e.title ?? t.name}</strong>
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
          <a href="/recipes">Recipes</a>
        </nav>
        <AccountMenu showAddRecipe={false} />
      </header>

      <div className="wk-container">
        <section className="rb-photo-head rb-photo-head--gym">
          <p className="rb-eyebrow">Build your routine</p>
          <h1 className="rb-title wk-title">Workout planner</h1>
          <p className="rb-lede">Drag a workout onto a day. Switch between year, month and day to plan it your way.</p>
        </section>

        {!signedIn && (
          <p className="wk-banner">
            <a href="/auth?next=%2Fworkouts">Sign in</a> to plan and save workouts — your calendar is stored per account.
          </p>
        )}
        {error && <p className="wk-banner wk-banner--error" role="alert">{error}</p>}
        {armed && (
          <p className="wk-banner" role="status">
            Placing <b>{typeMap.get(armed)?.name ?? "icon"}</b> — tap a date. Tap the icon again, or press Esc, to cancel.
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
          <IconBox
            types={types}
            signedIn={signedIn}
            armed={armed}
            onArm={setArmed}
            onDragStart={(ref) => {
              dragRef.current = { kind: "new", ref };
            }}
            onDragEnd={() => {
              dragRef.current = null;
              setOverKey(null);
            }}
            onCreate={createIcon}
            onDelete={deleteIcon}
          />
        </div>
      </div>

      {selected && (
        <EntryModal
          key={selected.id}
          entry={selected}
          type={typeOf(selected)}
          onClose={() => setSelectedId(null)}
          onPatch={(c) => patch(selected.id, c)}
          onRepeat={(rule) => repeatEntry(selected, rule)}
          onDelete={(scope) => {
            removeEntry(selected, scope);
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
  type,
  onClose,
  onPatch,
  onRepeat,
  onDelete,
}: {
  entry: Entry;
  type: TypeDef;
  onClose: () => void;
  onPatch: (c: Partial<NewEntry>) => void;
  onRepeat: (rule: RepeatRule) => Promise<string | null>;
  onDelete: (scope: "this" | "following" | "all") => void;
}) {
  const [askDelete, setAskDelete] = useState(false);
  const { Icon, name: label } = type;
  const durations = DURATIONS.includes(entry.durationMinutes)
    ? DURATIONS
    : [...DURATIONS, entry.durationMinutes].sort((a, b) => a - b);

  return (
    <div className="wk-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="wk-modal" role="dialog" aria-modal="true" aria-label={`Edit ${label}`}>
        <button type="button" className="wk-modal-close" onClick={onClose} aria-label="Close">×</button>
        <div className={`wk-modal-head wk-shade--${type.shade}`}>
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

        {entry.seriesId ? (
          <p className="wk-series-note"><RepeatGlyph /> Part of a repeating series</p>
        ) : (
          <RepeatSection entry={entry} onRepeat={onRepeat} />
        )}

        {askDelete && (
          <div className="wk-delete-scope" role="group" aria-label="What should be deleted?">
            <span>Delete…</span>
            <button type="button" onClick={() => onDelete("this")}>Just this one</button>
            <button type="button" onClick={() => onDelete("following")}>This and following</button>
            <button type="button" onClick={() => onDelete("all")}>Entire series</button>
            <button type="button" className="wk-link" onClick={() => setAskDelete(false)}>Cancel</button>
          </div>
        )}

        <div className="wk-modal-actions">
          <button type="button" className="wk-delete" onClick={() => (entry.seriesId ? setAskDelete(true) : onDelete("this"))}>Delete</button>
          <button type="button" className="wk-done" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}


/* ---------- repeat ---------- */

const RepeatGlyph = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3" />
  </svg>
);

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const QUICK_ENDS = [
  { label: "4 wks", days: 28 },
  { label: "8 wks", days: 56 },
  { label: "3 mo", days: 91 },
  { label: "6 mo", days: 182 },
];

function RepeatSection({ entry, onRepeat }: { entry: Entry; onRepeat: (rule: RepeatRule) => Promise<string | null> }) {
  const [open, setOpen] = useState(false);
  const [frequency, setFrequency] = useState<"daily" | "weekly">("weekly");
  const [every, setEvery] = useState(1);
  const [days, setDays] = useState<number[]>([weekdayOf(entry.date)]);
  const [until, setUntil] = useState(addDays(entry.date, 56));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // the same function the server uses, so the preview always matches what gets created
  const rule: RepeatRule = { frequency, interval: every, days: frequency === "weekly" ? days : [], until };
  const checked = validateRule(entry.date, rule);
  const dates = checked.ok ? occurrenceDates(entry.date, checked.rule) : [];
  const problem = !checked.ok
    ? checked.error
    : dates.length === 0
      ? "No dates match those settings."
      : dates.length > MAX_OCCURRENCES
        ? `That's more than ${MAX_OCCURRENCES} workouts — shorten the end date.`
        : null;
  const last = dates[dates.length - 1];

  async function submit() {
    if (problem || busy) return;
    setBusy(true);
    setMsg(null);
    const err = await onRepeat(rule);
    setBusy(false);
    if (err) setMsg(err);
    else setOpen(false);
  }

  if (!open) {
    return (
      <button type="button" className="wk-repeat-toggle" onClick={() => setOpen(true)}>
        <RepeatGlyph /> Repeat…
      </button>
    );
  }

  const unit = frequency === "daily" ? "day" : "week";
  return (
    <div className="wk-repeat" role="group" aria-label="Repeat this workout">
      <div className="wk-repeat-row">
        <select aria-label="Frequency" value={frequency} onChange={(e) => setFrequency(e.target.value as "daily" | "weekly")}>
          <option value="weekly">Weekly</option>
          <option value="daily">Daily</option>
        </select>
        <span>every</span>
        <select aria-label="Interval" value={every} onChange={(e) => setEvery(Number(e.target.value))}>
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <span>{unit}{every === 1 ? "" : "s"}</span>
      </div>

      {frequency === "weekly" && (
        <div className="wk-days" role="group" aria-label="Days of the week">
          {WEEKDAYS.map((name, i) => (
            <button
              key={name}
              type="button"
              aria-pressed={days.includes(i)}
              aria-label={name}
              title={name}
              className={days.includes(i) ? "on" : ""}
              onClick={() => setDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]))}
            >
              {name[0]}
            </button>
          ))}
        </div>
      )}

      <div className="wk-repeat-row">
        <label className="wk-repeat-until">
          <span>Until</span>
          <input type="date" value={until} min={addDays(entry.date, 1)} onChange={(e) => e.target.value && setUntil(e.target.value)} />
        </label>
        <div className="wk-quick">
          {QUICK_ENDS.map((q) => (
            <button key={q.label} type="button" onClick={() => setUntil(addDays(entry.date, q.days))}>{q.label}</button>
          ))}
        </div>
      </div>

      <p className={`wk-repeat-summary ${problem ? "bad" : ""}`} aria-live="polite">
        {problem ?? `Adds ${dates.length} more workout${dates.length === 1 ? "" : "s"}, through ${fmtLong(last)}.`}
      </p>
      {msg && <p className="wk-box-error" role="alert">{msg}</p>}

      <div className="wk-repeat-actions">
        <button type="button" className="wk-link" onClick={() => setOpen(false)}>Cancel</button>
        <button type="button" className="wk-create-btn" disabled={!!problem || busy} onClick={submit}>
          {busy ? "Creating…" : "Repeat"}
        </button>
      </div>
    </div>
  );
}

function fmtLong(key: string | undefined) {
  if (!key) return "";
  return fromKey(key).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}
