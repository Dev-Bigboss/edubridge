import { TZDate } from "@date-fns/tz";
import { WEEKDAYS, type CohortSchedule, type Weekday } from "@/lib/api/schemas/cohort";
import { formatInZone, zoneLabel } from "./time";

/**
 * A cohort's recurring schedule is stored in the instructor's zone (COH-1). Learners see it in
 * their own zone, and a time zone gap can move a class to the day before or after, so weekdays
 * shift with the time. The first session's UTC instant anchors the conversion.
 */
export function scheduleInZone(
  schedule: CohortSchedule,
  firstSessionAt: string,
  zone: string,
): { weekdays: Weekday[]; start: string; end: string; zone: string } {
  const start = new Date(firstSessionAt);
  const end = new Date(start.getTime() + schedule.duration_min * 60_000);
  const isoDay = (z: string) => Number(formatInZone(firstSessionAt, z, "i")); // 1 = Mon … 7 = Sun
  let shift = isoDay(zone) - isoDay(schedule.timezone);
  if (shift > 3) shift -= 7; // Sun → Mon across the week boundary
  if (shift < -3) shift += 7;
  const weekdays = schedule.weekdays
    .map((d) => WEEKDAYS[(WEEKDAYS.indexOf(d) + shift + 7) % 7])
    .sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));
  return {
    weekdays,
    start: formatInZone(start.toISOString(), zone, "HH:mm"),
    end: formatInZone(end.toISOString(), zone, "HH:mm"),
    zone: zoneLabel(firstSessionAt, zone),
  };
}

/** "Tue and Thu", "Mon, Wed and Fri" in the given locale. */
export function formatWeekdays(weekdays: Weekday[], locale = "en-GB"): string {
  // 2024-01-01 was a Monday, so day index i is 2024-01-(1+i).
  const fmt = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  const names = weekdays.map((d) => fmt.format(new Date(Date.UTC(2024, 0, 1 + WEEKDAYS.indexOf(d)))));
  return new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(names);
}

/** "12 Jan 2027" for a calendar date string, never shifted by the viewer's zone. */
export function formatCalendarDate(date: string, locale = "en-GB"): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function seatsLeft(c: { capacity: number; enrolled_count: number }): number {
  return Math.max(0, c.capacity - c.enrolled_count);
}

const DAY_MS = 86_400_000;

/**
 * COH-1/4: the sessions a schedule produces between two calendar dates (inclusive), in the
 * schedule's zone. Returns the count and the first session's UTC instant (null when none fall
 * in the range). The backend owns the real session list; this mirrors it for the form preview.
 */
export function planSessions(
  startDate: string,
  endDate: string,
  schedule: CohortSchedule,
): { count: number; firstSessionAt: string | null } {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start || schedule.weekdays.length === 0) {
    return { count: 0, firstSessionAt: null };
  }
  let count = 0;
  let first: Date | null = null;
  for (let t = start; t <= end; t += DAY_MS) {
    const d = new Date(t);
    if (!schedule.weekdays.includes(WEEKDAYS[(d.getUTCDay() + 6) % 7])) continue;
    count++;
    first ??= localInstant(d.toISOString().slice(0, 10), schedule.start_time, schedule.timezone);
  }
  return { count, firstSessionAt: first?.toISOString() ?? null };
}

/** The UTC instant of a wall-clock time on a calendar date in a zone ("2027-01-12", "18:00", "Africa/Lagos"). */
export function localInstant(date: string, time: string, zone: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return new Date(new TZDate(y, m - 1, d, h, min, zone).getTime());
}

/** Enrolment closes at the end of the chosen day in the schedule's zone. */
export function deadlineFromDate(date: string, zone: string): string {
  return localInstant(date, "23:59", zone).toISOString();
}

/** The calendar date (in `zone`) of a UTC instant, for filling a date input back in. */
export function dateInZone(utcIso: string, zone: string): string {
  return formatInZone(utcIso, zone, "yyyy-MM-dd");
}

/**
 * The next class that hasn't ended yet, or null once the cohort is over. A class that's running
 * right now counts as "next", so learners can still find it. Phase 2 replaces this with the
 * backend's dated sessions (COH-4), which can include one-off changes.
 */
export function nextSession(
  c: { start_date: string; end_date: string; schedule: CohortSchedule },
  now: Date = new Date(),
): string | null {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - DAY_MS).toISOString().slice(0, 10);
  const from = c.start_date > today ? c.start_date : today;
  const end = Date.parse(`${c.end_date}T00:00:00Z`);
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= end; t += DAY_MS) {
    const d = new Date(t);
    if (!c.schedule.weekdays.includes(WEEKDAYS[(d.getUTCDay() + 6) % 7])) continue;
    const start = localInstant(d.toISOString().slice(0, 10), c.schedule.start_time, c.schedule.timezone);
    if (start.getTime() + c.schedule.duration_min * 60_000 > now.getTime()) return start.toISOString();
  }
  return null;
}

export type EnrolmentPhase = "UPCOMING" | "IN_PROGRESS" | "FINISHED" | "CANCELLED";

/** Which group a learner's enrolment sits in on "My trainings". */
export function enrolmentPhase(
  c: { status: string; first_session_at: string; start_date: string; end_date: string; schedule: CohortSchedule },
  now: Date = new Date(),
): EnrolmentPhase {
  if (c.status === "CANCELLED") return "CANCELLED";
  if (c.status === "COMPLETED" || nextSession(c, now) === null) return "FINISHED";
  return new Date(c.first_session_at) <= now ? "IN_PROGRESS" : "UPCOMING";
}

export type DatedSession = { id: string; date: string; start_utc: string; end_utc: string };

/**
 * COH-4: the dated sessions a cohort's schedule produces. Ids are stable (`cohort:date`) so
 * attendance and join links can hang off them; the backend stores real session rows instead.
 */
export function cohortSessions(c: { id: string; start_date: string; end_date: string; schedule: CohortSchedule }): DatedSession[] {
  const out: DatedSession[] = [];
  const end = Date.parse(`${c.end_date}T12:00:00Z`);
  for (let t = Date.parse(`${c.start_date}T12:00:00Z`); t <= end; t += DAY_MS) {
    const d = new Date(t);
    if (!c.schedule.weekdays.includes(WEEKDAYS[(d.getUTCDay() + 6) % 7])) continue;
    const date = d.toISOString().slice(0, 10);
    const start = localInstant(date, c.schedule.start_time, c.schedule.timezone);
    out.push({
      id: `${c.id}:${date}`,
      date,
      start_utc: start.toISOString(),
      end_utc: new Date(start.getTime() + c.schedule.duration_min * 60_000).toISOString(),
    });
  }
  return out;
}
