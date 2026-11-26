/**
 * ADM-1/4: dashboard periods, revenue buckets, instructor response times and CSV encoding, shared by
 * the API and the app.
 */
export const DASHBOARD_PERIODS = [7, 30, 90] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];
export const REPORT_TYPES = ["revenue", "payouts", "attendance", "refunds"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

const DAY = 86_400_000;

/** Daily buckets for 7 and 30 days, weekly for 90, oldest first, each labelled by its first day (UTC). */
export function revenueBuckets(days: number, now: Date): { start: string; end: string }[] {
  const size = days > 30 ? 7 : 1;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const count = Math.ceil(days / size);
  return Array.from({ length: count }, (_, i) => {
    const end = today + DAY - (count - 1 - i) * size * DAY;
    return { start: new Date(end - size * DAY).toISOString(), end: new Date(end).toISOString() };
  });
}

/** Middle value of a list (mean of the two middles for an even count), or null. */
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

type Entry = { at: string; actor: string; event: string };

/**
 * Hours from when a 1:1 request reached the instructor (card authorised) to their first answer, or
 * "EXPIRED" when the system expired it first, or null while still waiting.
 */
export function responseHours(timeline: Entry[]): number | "EXPIRED" | null {
  const start = timeline.find((e) => e.event === "PAYMENT_AUTHORISED") ?? timeline.find((e) => e.event === "REQUESTED");
  if (!start) return null;
  for (const e of timeline) {
    if (e.at < start.at) continue;
    if (e.actor === "INSTRUCTOR") return Math.round(((Date.parse(e.at) - Date.parse(start.at)) / 3_600_000) * 10) / 10;
    if (e.event === "EXPIRED") return "EXPIRED";
  }
  return null;
}

/** RFC 4180 CSV: quotes fields with commas, quotes or line breaks; neutralises spreadsheet formulas. */
export function toCsv(rows: (string | number | null)[][]): string {
  const cell = (v: string | number | null) => {
    if (v === null) return "";
    let s = String(v);
    // A leading = + - @ makes Excel run the cell as a formula (CSV injection). Numbers are left alone.
    if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  return rows.map((r) => r.map(cell).join(",")).join("\r\n");
}

export const cents = (n: number) => (n / 100).toFixed(2);
