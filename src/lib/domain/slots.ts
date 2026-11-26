import { formatInZone } from "./time";
import { localInstant } from "./cohort-schedule";

/**
 * 1:1 availability and free slots (OTO-1, OTO-2, OTO-3, OTO-10).
 *
 * Instructors set hours as local wall-clock times in their own zone ("Mondays 18:00–21:00"), so
 * the hours survive daylight saving changes. Slots are worked out per calendar date in that zone
 * and returned as UTC instants; the learner's screen converts them to the learner's zone.
 * The backend computes the real list; the mock and the instructor's preview use this.
 */

export type TimeRange = { start: string; end: string }; // "HH:mm" local
export type WeeklyHours = { weekday: number; start: string; end: string }; // ISO weekday 1 = Mon
/** A date whose hours replace the weekly ones. No ranges means the whole day is blocked. */
export type DateOverride = { date: string; ranges: TimeRange[] };

export type Availability = {
  timezone: string;
  weekly: WeeklyHours[];
  overrides: DateOverride[];
  /** Earliest a learner can book, in hours from now. */
  notice_hours: number;
};

export type Busy = { start: string; end: string }; // UTC ISO

export const SLOT_STEP_MIN = 30;
/** How far ahead learners can book. */
export const HORIZON_DAYS = 60;

const DAY = 86_400_000;
const isoWeekday = (date: string) => ((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
const addDays = (date: string, n: number) => new Date(Date.parse(`${date}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);

/** The local hours that apply on one date in the instructor's zone. */
export function hoursOn(a: Pick<Availability, "weekly" | "overrides">, date: string): TimeRange[] {
  const override = a.overrides.find((o) => o.date === date);
  if (override) return override.ranges;
  const day = isoWeekday(date);
  return a.weekly.filter((w) => w.weekday === day).map(({ start, end }) => ({ start, end }));
}

const overlaps = (aStart: number, aEnd: number, b: Busy) => aStart < Date.parse(b.end) && Date.parse(b.start) < aEnd;

/**
 * Free start times (UTC ISO) for a session of `durationMin`, every 30 minutes inside the
 * instructor's hours, after the notice period, not overlapping anything already held or booked
 * (other 1:1 requests, confirmed sessions, cohort classes: OTO-10).
 */
export function freeSlots({
  availability,
  busy,
  durationMin,
  from,
  days,
  now = new Date(),
}: {
  availability: Availability;
  busy: Busy[];
  durationMin: number;
  /** First calendar date to look at, in the instructor's zone (YYYY-MM-DD). */
  from: string;
  days: number;
  now?: Date;
}): string[] {
  const earliest = now.getTime() + availability.notice_hours * 3_600_000;
  const latest = now.getTime() + HORIZON_DAYS * DAY;
  const out: string[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    for (const range of hoursOn(availability, date)) {
      const windowStart = localInstant(date, range.start, availability.timezone).getTime();
      const windowEnd = localInstant(date, range.end, availability.timezone).getTime();
      for (let s = windowStart; s + durationMin * 60_000 <= windowEnd; s += SLOT_STEP_MIN * 60_000) {
        const e = s + durationMin * 60_000;
        if (s < earliest || s > latest) continue;
        if (busy.some((b) => overlaps(s, e, b))) continue;
        out.push(new Date(s).toISOString());
      }
    }
  }
  return [...new Set(out)].sort();
}

/** Group UTC starts by the viewer's local calendar date, in order: what the date picker shows. */
export function groupByLocalDay(starts: string[], zone: string): { date: string; starts: string[] }[] {
  const map = new Map<string, string[]>();
  for (const s of starts) {
    const d = formatInZone(s, zone, "yyyy-MM-dd");
    map.set(d, [...(map.get(d) ?? []), s]);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, list]) => ({ date, starts: list }));
}

/** Today's date in a zone, the natural "from" for a slot search. */
export function todayIn(zone: string, now: Date = new Date()): string {
  return formatInZone(now.toISOString(), zone, "yyyy-MM-dd");
}

export type AvailabilityProblem = { path: string; message: string };

/** Ranges must be real, ordered and not overlap within a day or a date override. */
export function availabilityProblems(a: Pick<Availability, "weekly" | "overrides" | "notice_hours">): AvailabilityProblem[] {
  const problems: AvailabilityProblem[] = [];
  const check = (ranges: { start: string; end: string; path: string }[]) => {
    const sorted = [...ranges].sort((x, y) => x.start.localeCompare(y.start));
    sorted.forEach((r, k) => {
      if (r.start >= r.end) problems.push({ path: `${r.path}.end`, message: "End after the start time." });
      else if (k > 0 && r.start < sorted[k - 1].end) problems.push({ path: `${r.path}.start`, message: "This overlaps another time on the same day." });
    });
  };
  for (let day = 1; day <= 7; day++) {
    check(a.weekly.map((w, i) => ({ ...w, path: `weekly.${i}` })).filter((w) => w.weekday === day));
  }
  const seen = new Set<string>();
  a.overrides.forEach((o, i) => {
    if (seen.has(o.date)) problems.push({ path: `overrides.${i}.date`, message: "This date is already listed." });
    seen.add(o.date);
    check(o.ranges.map((r, j) => ({ ...r, path: `overrides.${i}.ranges.${j}` })));
  });
  if (a.notice_hours < 0 || a.notice_hours > 168) problems.push({ path: "notice_hours", message: "Use 0 to 168 hours." });
  return problems;
}
