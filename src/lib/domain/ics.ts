/**
 * OTO-8: a calendar invite (.ics, RFC 5545) for a confirmed session, with the reminders the SRS
 * asks for (24 h and 1 h before). The backend attaches the same file to the confirmation email;
 * the app offers it as a download too.
 */

export type IcsEvent = {
  uid: string;
  start: string; // UTC ISO
  end: string;
  title: string;
  description: string;
  url: string | null;
  /** When the event was last changed; bump SEQUENCE on reschedule so calendars update it. */
  sequence?: number;
  now?: Date;
};

const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Text values escape backslash, comma, semicolon and newlines. */
const escape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Lines longer than 75 octets are folded with CRLF + space. */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    out.push(rest.slice(0, 75));
    rest = ` ${rest.slice(75)}`;
  }
  out.push(rest);
  return out.join("\r\n");
}

export function buildIcs(e: IcsEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EduBridge//Sessions//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.uid}@edubridge`,
    `DTSTAMP:${stamp((e.now ?? new Date()).toISOString())}`,
    `DTSTART:${stamp(e.start)}`,
    `DTEND:${stamp(e.end)}`,
    `SEQUENCE:${e.sequence ?? 0}`,
    `SUMMARY:${escape(e.title)}`,
    `DESCRIPTION:${escape(e.url ? `${e.description}\nJoin: ${e.url}` : e.description)}`,
    ...(e.url ? [`URL:${e.url}`, `LOCATION:${escape(e.url)}`] : []),
    ...["-PT24H", "-PT1H"].flatMap((trigger) => [
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escape(e.title)}`,
      `TRIGGER:${trigger}`,
      "END:VALARM",
    ]),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
