import { describe, expect, it } from "vitest";
import { buildIcs } from "./ics";

describe("calendar invite (OTO-8)", () => {
  const ics = buildIcs({
    uid: "bkg_1",
    start: "2027-01-12T17:00:00.000Z",
    end: "2027-01-12T18:30:00.000Z",
    title: "ACCA SBR, one-on-one with Test Instructor",
    description: "Group accounts; consolidation, please",
    url: "https://meet.example.com/edubridge/bkg_1",
    now: new Date("2027-01-01T09:00:00Z"),
  });

  it("is a valid VEVENT in UTC with CRLF line ends", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics).toContain("DTSTART:20270112T170000Z\r\n");
    expect(ics).toContain("DTEND:20270112T183000Z\r\n");
    expect(ics).toContain("DTSTAMP:20270101T090000Z\r\n");
    expect(ics).toContain("UID:bkg_1@edubridge\r\n");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("escapes text and carries the join link", () => {
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).toContain("SUMMARY:ACCA SBR\\, one-on-one with Test Instructor");
    expect(unfolded).toContain("Group accounts\; consolidation\\, please\\nJoin: https://meet.example.com");
    expect(unfolded).toContain("URL:https://meet.example.com/edubridge/bkg_1");
  });

  it("sets reminders 24 hours and 1 hour before", () => {
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(2);
    expect(ics).toContain("TRIGGER:-PT24H");
    expect(ics).toContain("TRIGGER:-PT1H");
  });

  it("folds long lines at 75 characters", () => {
    const long = buildIcs({ uid: "x", start: "2027-01-12T17:00:00Z", end: "2027-01-12T18:00:00Z", title: "t", description: "y".repeat(200), url: null });
    expect(long.split("\r\n").every((l) => l.length <= 75)).toBe(true);
    expect(long).toContain("\r\n y");
  });
});
