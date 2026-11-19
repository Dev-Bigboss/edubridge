import { describe, expect, it } from "vitest";
import { formatInZone, formatSessionTime, formatTimeRange, isValidTimeZone, minutesUntil, zoneLabel } from "./time";

describe("time zones (SRS §2, OTO-2)", () => {
  const utc = "2026-03-03T13:00:00Z";

  it("renders the same instant in each viewer's zone", () => {
    expect(formatInZone(utc, "Africa/Lagos", "HH:mm")).toBe("14:00");
    expect(formatInZone(utc, "Europe/London", "HH:mm")).toBe("13:00");
    expect(formatInZone(utc, "America/New_York", "HH:mm")).toBe("08:00");
  });

  it("handles the US DST switch (8 Mar 2026)", () => {
    expect(formatInZone("2026-03-07T15:00:00Z", "America/New_York", "HH:mm")).toBe("10:00");
    expect(formatInZone("2026-03-09T15:00:00Z", "America/New_York", "HH:mm")).toBe("11:00");
    expect(zoneLabel("2026-03-07T15:00:00Z", "America/New_York")).toBe("EST");
    expect(zoneLabel("2026-03-09T15:00:00Z", "America/New_York")).toBe("EDT");
  });

  it("crosses the date line correctly", () => {
    expect(formatInZone("2026-03-03T23:30:00Z", "Asia/Tokyo", "yyyy-MM-dd HH:mm")).toBe("2026-03-04 08:30");
  });

  it("always names the zone", () => {
    expect(formatSessionTime(utc, "Africa/Lagos")).toBe("Tue 3 Mar, 14:00 GMT+1");
    expect(formatTimeRange(utc, "2026-03-03T14:30:00Z", "Africa/Lagos")).toBe("14:00–15:30 GMT+1");
  });

  it("validates IANA zones", () => {
    expect(isValidTimeZone("Africa/Lagos")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
  });

  it("counts minutes to expiry (OTO-5)", () => {
    const now = new Date("2026-03-03T12:00:00Z");
    expect(minutesUntil("2026-03-04T12:00:00Z", now)).toBe(1440);
    expect(minutesUntil("2026-03-03T11:59:00Z", now)).toBe(-1);
  });
});
