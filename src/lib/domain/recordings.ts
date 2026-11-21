/**
 * Playback rules (REC-4/5): the part learners see after a trim, where to resume, and clock text.
 * The backend applies the trim when it cuts the file; the player also clamps to it so a stale
 * copy never shows trimmed content.
 */

export type Trim = { start_sec: number; end_sec: number } | null;

export function playableRange(durationSec: number, trim: Trim): { start: number; end: number } {
  if (!trim) return { start: 0, end: durationSec };
  const start = Math.max(0, Math.min(trim.start_sec, durationSec));
  const end = Math.max(start, Math.min(trim.end_sec, durationSec));
  return { start, end };
}

/** Resume where they stopped, unless that's outside the range or within the last 10 s (then start over). */
export function resumeAt(positionSec: number, range: { start: number; end: number }): number {
  if (positionSec <= range.start || positionSec >= range.end - 10) return range.start;
  return Math.floor(positionSec);
}

/** "4:05", "1:02:03". */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** "1:30" or "90" or "1:02:03" → seconds; null for anything else. */
export function parseClock(text: string): number | null {
  const parts = text.trim().split(":");
  if (parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
  return parts.reduce((acc, p) => acc * 60 + Number(p), 0);
}

export const TRIM_PROBLEMS = { order: "End after the start.", tooShort: "Keep at least 10 seconds.", beyond: "That's past the end of the recording." } as const;

export function trimProblem(startSec: number, endSec: number, durationSec: number): keyof typeof TRIM_PROBLEMS | null {
  if (endSec > durationSec) return "beyond";
  if (endSec <= startSec) return "order";
  if (endSec - startSec < 10) return "tooShort";
  return null;
}
