// Recurrence rules for planned workouts. Pure date maths on "YYYY-MM-DD" strings (done in UTC,
// so there is no timezone drift). Shared by the API (to create the rows) and the edit dialog
// (to preview how many workouts a rule will add), so both always agree.

export const MAX_OCCURRENCES = 200;
export const MAX_SPAN_DAYS = 366;

export type RepeatRule = {
  frequency: "daily" | "weekly";
  interval: number; // every N days / every N weeks (1–4)
  days: number[]; // weekly only: 0 = Monday … 6 = Sunday
  until: string; // last date to include, "YYYY-MM-DD"
};

const DAY = 86_400_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const isDateKey = (v: unknown): v is string => typeof v === "string" && DATE_RE.test(v) && !Number.isNaN(toUtc(v));

function toUtc(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d);
  // reject things like 2026-02-31 that Date.UTC silently rolls over
  const back = new Date(t);
  return back.getUTCFullYear() === y && back.getUTCMonth() === m - 1 && back.getUTCDate() === d ? t : NaN;
}

function fromUtc(t: number): string {
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

// 0 = Monday … 6 = Sunday (the calendar's column order)
export const weekdayOf = (key: string) => (new Date(toUtc(key)).getUTCDay() + 6) % 7;

export const addDays = (key: string, n: number) => fromUtc(toUtc(key) + n * DAY);

export function validateRule(start: string, rule: unknown): { ok: true; rule: RepeatRule } | { ok: false; error: string } {
  const r = rule as Partial<RepeatRule> | null;
  if (!r || typeof r !== "object") return { ok: false, error: "Invalid repeat settings." };
  if (r.frequency !== "daily" && r.frequency !== "weekly") return { ok: false, error: "Choose daily or weekly." };
  if (!Number.isInteger(r.interval) || r.interval! < 1 || r.interval! > 4) return { ok: false, error: "Repeat every 1 to 4." };
  if (!isDateKey(r.until)) return { ok: false, error: "Pick an end date." };
  if (r.until <= start) return { ok: false, error: "The end date must be after this workout." };
  if (toUtc(r.until) - toUtc(start) > MAX_SPAN_DAYS * DAY) return { ok: false, error: "You can repeat for up to a year." };

  let days: number[] = [];
  if (r.frequency === "weekly") {
    if (!Array.isArray(r.days) || r.days.length === 0) return { ok: false, error: "Pick at least one day of the week." };
    if (!r.days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) return { ok: false, error: "Invalid weekday." };
    days = [...new Set(r.days)].sort();
  }
  return { ok: true, rule: { frequency: r.frequency, interval: r.interval!, days, until: r.until } };
}

// Dates AFTER `start` (the workout you're repeating) up to and including rule.until.
// Stops one past MAX_OCCURRENCES so callers can tell "too many" from "just right".
export function occurrenceDates(start: string, rule: RepeatRule): string[] {
  const s = toUtc(start);
  const end = toUtc(rule.until);
  const mondayOfStartWeek = s - weekdayOf(start) * DAY;
  const out: string[] = [];

  for (let t = s + DAY; t <= end; t += DAY) {
    let hit: boolean;
    if (rule.frequency === "daily") {
      hit = Math.round((t - s) / DAY) % rule.interval === 0;
    } else {
      const weeksIn = Math.floor((t - mondayOfStartWeek) / (7 * DAY));
      hit = weeksIn % rule.interval === 0 && rule.days.includes((new Date(t).getUTCDay() + 6) % 7);
    }
    if (hit) {
      out.push(fromUtc(t));
      if (out.length > MAX_OCCURRENCES) break;
    }
  }
  return out;
}
