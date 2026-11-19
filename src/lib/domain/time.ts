import { format } from "date-fns";
import { tz } from "@date-fns/tz";

/**
 * All timestamps arrive from the API as ISO 8601 UTC. They are always shown in the viewer's
 * time zone with the zone named, never in server or browser-default time (SRS §2, OTO-2, NFR Localisation).
 */

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function isValidTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** Short zone name for a given instant, e.g. "EST" vs "EDT", "GMT+1". */
export function zoneLabel(utcIso: string, zone: string, locale = "en-US"): string {
  const parts = new Intl.DateTimeFormat(locale, { timeZone: zone, timeZoneName: "short" }).formatToParts(
    new Date(utcIso),
  );
  return parts.find((p) => p.type === "timeZoneName")?.value ?? zone;
}

export function formatInZone(utcIso: string, zone: string, pattern: string): string {
  return format(new Date(utcIso), pattern, { in: tz(zone) });
}

/** "Tue 3 Mar, 14:00 GMT+1" style, used on session cards and booking timelines. */
export function formatSessionTime(utcIso: string, zone: string): string {
  return `${formatInZone(utcIso, zone, "EEE d MMM, HH:mm")} ${zoneLabel(utcIso, zone)}`;
}

/** "14:00–15:30 GMT+1" for a session range on the same day. */
export function formatTimeRange(startUtc: string, endUtc: string, zone: string): string {
  return `${formatInZone(startUtc, zone, "HH:mm")}–${formatInZone(endUtc, zone, "HH:mm")} ${zoneLabel(startUtc, zone)}`;
}

/** Remaining whole minutes until an instant; negative once passed. Used for expiry countdowns (OTO-5). */
export function minutesUntil(utcIso: string, now: Date = new Date()): number {
  return Math.floor((new Date(utcIso).getTime() - now.getTime()) / 60_000);
}
