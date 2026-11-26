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

/** REC-4: one line of a transcript, in seconds from the start of the full recording. */
export type TranscriptSegment = { start_sec: number; end_sec: number; text: string };

const vttTime = (s: string): number | null => {
  const m = /^(?:(\d+):)?(\d{2}):(\d{2})[.,](\d{3})$/.exec(s.trim());
  return m ? Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 1000 : null;
};

/** Parses WebVTT cues (what Zoom's audio transcript is delivered as) into plain segments. Tags and notes are dropped. */
export function parseVtt(vtt: string): TranscriptSegment[] {
  const out: TranscriptSegment[] = [];
  for (const block of vtt.replace(/\r\n?/g, "\n").split(/\n{2,}/)) {
    const lines = block.split("\n").filter(Boolean);
    const at = lines.findIndex((l) => l.includes("-->"));
    if (at < 0) continue;
    const [from, rest] = lines[at].split("-->");
    const start = vttTime(from);
    const end = vttTime(rest.trim().split(/\s+/)[0]);
    const text = lines.slice(at + 1).join(" ").replace(/<[^>]+>/g, "").trim();
    if (start !== null && end !== null && text) out.push({ start_sec: start, end_sec: end, text });
  }
  return out;
}

/** REC-5: a trimmed recording's transcript keeps only what overlaps the kept part. */
export function segmentsInRange(segments: TranscriptSegment[], range: { start: number; end: number }): TranscriptSegment[] {
  return segments.filter((s) => s.end_sec > range.start && s.start_sec < range.end);
}

/** The segment being spoken at `t`, or null between segments. */
export function activeSegmentIndex(segments: TranscriptSegment[], t: number): number {
  return segments.findIndex((s) => t >= s.start_sec && t < s.end_sec);
}
