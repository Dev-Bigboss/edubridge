import { describe, expect, it } from "vitest";
import { formatInZone, formatSessionTime, formatTimeRange, isValidTimeZone, minutesUntil, zoneLabel, timeAgo } from "./time";

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

describe("timeAgo", () => {
  const now = new Date("2026-11-20T12:00:00Z");
  const before = (s: number) => new Date(now.getTime() - s * 1000).toISOString();
  it("reads naturally from seconds to a week, then shows the date", () => {
    expect(timeAgo(before(20), now)).toBe("just now");
    expect(timeAgo(before(5 * 60), now)).toBe("5 minutes ago");
    expect(timeAgo(before(3 * 3600), now)).toBe("3 hours ago");
    expect(timeAgo(before(26 * 3600), now)).toBe("yesterday");
    expect(timeAgo(before(3 * 86_400), now)).toBe("3 days ago");
    expect(timeAgo("2026-10-02T12:00:00Z", now)).toBe("2 Oct");
    expect(timeAgo("2025-10-02T12:00:00Z", now)).toBe("2 Oct 2025");
  });
});
