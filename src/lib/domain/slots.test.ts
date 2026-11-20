import { describe, expect, it } from "vitest";
import { availabilityProblems, freeSlots, groupByLocalDay, hoursOn, type Availability } from "./slots";

// Europe/London instructor, evenings Mon and Wed, 18:00–20:00.
const london: Availability = {
  timezone: "Europe/London",
  weekly: [
    { weekday: 1, start: "18:00", end: "20:00" },
    { weekday: 3, start: "18:00", end: "20:00" },
  ],
  overrides: [],
  notice_hours: 12,
};
const now = new Date("2027-01-01T09:00:00Z"); // a Friday

describe("instructor hours (OTO-1)", () => {
  it("uses weekly hours, unless a date override replaces or blocks them", () => {
    expect(hoursOn(london, "2027-01-04")).toEqual([{ start: "18:00", end: "20:00" }]); // Monday
    expect(hoursOn(london, "2027-01-05")).toEqual([]); // Tuesday
    const a = { ...london, overrides: [{ date: "2027-01-04", ranges: [] }, { date: "2027-01-05", ranges: [{ start: "09:00", end: "10:00" }] }] };
    expect(hoursOn(a, "2027-01-04")).toEqual([]);
    expect(hoursOn(a, "2027-01-05")).toEqual([{ start: "09:00", end: "10:00" }]);
  });
});

describe("free slots (OTO-2, OTO-3, OTO-10)", () => {
  it("steps every 30 minutes and fits the whole session in the window", () => {
    const one = freeSlots({ availability: london, busy: [], durationMin: 60, from: "2027-01-04", days: 1, now });
    expect(one).toEqual(["2027-01-04T18:00:00.000Z", "2027-01-04T18:30:00.000Z", "2027-01-04T19:00:00.000Z"]);
    const two = freeSlots({ availability: london, busy: [], durationMin: 120, from: "2027-01-04", days: 1, now });
    expect(two).toEqual(["2027-01-04T18:00:00.000Z"]);
  });

  it("skips anything already held, booked or taught, and anything inside the notice period", () => {
    const busy = [{ start: "2027-01-04T18:30:00.000Z", end: "2027-01-04T19:30:00.000Z" }];
    expect(freeSlots({ availability: london, busy, durationMin: 60, from: "2027-01-04", days: 1, now })).toEqual([]);
    expect(freeSlots({ availability: london, busy: [], durationMin: 30, from: "2027-01-04", days: 1, now: new Date("2027-01-04T07:00:00Z") })).toEqual([
      "2027-01-04T19:00:00.000Z",
      "2027-01-04T19:30:00.000Z",
    ]);
  });

  it("keeps the local hours across daylight saving (London moves to BST on 28 Mar 2027)", () => {
    const sundays = { ...london, weekly: [{ weekday: 7, start: "09:00", end: "10:00" }] };
    const slots = freeSlots({ availability: sundays, busy: [], durationMin: 60, from: "2027-03-21", days: 8, now: new Date("2027-03-01T00:00:00Z") });
    expect(slots).toEqual(["2027-03-21T09:00:00.000Z", "2027-03-28T08:00:00.000Z"]);
  });

  it("groups by the viewer's own date: a London evening is the next morning in Tokyo", () => {
    const starts = ["2027-01-04T18:00:00.000Z", "2027-01-06T18:00:00.000Z"];
    expect(groupByLocalDay(starts, "Europe/London").map((d) => d.date)).toEqual(["2027-01-04", "2027-01-06"]);
    expect(groupByLocalDay(starts, "Asia/Tokyo").map((d) => d.date)).toEqual(["2027-01-05", "2027-01-07"]);
  });
});

describe("availability checks", () => {
  it("finds reversed, overlapping and duplicate entries", () => {
    expect(availabilityProblems(london)).toEqual([]);
    const bad = {
      weekly: [
        { weekday: 1, start: "18:00", end: "17:00" },
        { weekday: 2, start: "09:00", end: "12:00" },
        { weekday: 2, start: "11:00", end: "13:00" },
      ],
      overrides: [
        { date: "2027-01-04", ranges: [] },
        { date: "2027-01-04", ranges: [] },
      ],
      notice_hours: 200,
    };
    expect(availabilityProblems(bad).map((p) => p.path)).toEqual(["weekly.0.end", "weekly.2.start", "overrides.1.date", "notice_hours"]);
  });
});
