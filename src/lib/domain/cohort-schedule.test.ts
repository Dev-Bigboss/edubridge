import { describe, expect, it } from "vitest";
import { formatCalendarDate, formatWeekdays, scheduleInZone, seatsLeft } from "./cohort-schedule";
import { makeCohort } from "@/mocks/seed-cohorts";

const lagosEvening = { weekdays: ["TUE", "THU"] as const, start_time: "18:00", duration_min: 120, timezone: "Africa/Lagos" };

describe("cohort schedule in the viewer's zone (COH-1, NFR time zones)", () => {
  // Tue 12 Jan 2027, 18:00 in Lagos (UTC+1) = 17:00 UTC
  const first = "2027-01-12T17:00:00.000Z";

  it("keeps the days and shows the instructor's time for a viewer in the same zone", () => {
    const s = scheduleInZone({ ...lagosEvening, weekdays: ["TUE", "THU"] }, first, "Africa/Lagos");
    expect(s).toMatchObject({ weekdays: ["TUE", "THU"], start: "18:00", end: "20:00" });
    expect(s.zone).toBe("GMT+1");
  });

  it("converts the time for a viewer a few hours away", () => {
    const s = scheduleInZone({ ...lagosEvening, weekdays: ["TUE", "THU"] }, first, "America/New_York");
    expect(s).toMatchObject({ weekdays: ["TUE", "THU"], start: "12:00", end: "14:00", zone: "EST" });
  });

  it("moves the class to the next day when the time zone gap crosses midnight", () => {
    const s = scheduleInZone({ ...lagosEvening, weekdays: ["TUE", "THU"] }, first, "Asia/Tokyo");
    expect(s).toMatchObject({ weekdays: ["WED", "FRI"], start: "02:00", end: "04:00" });
  });

  it("wraps Sunday to Monday across the week boundary", () => {
    // Sun 17 Jan 2027, 20:00 Lagos = 19:00 UTC = Mon 04:00 Tokyo
    const s = scheduleInZone({ ...lagosEvening, weekdays: ["SUN"], start_time: "20:00" }, "2027-01-17T19:00:00.000Z", "Asia/Tokyo");
    expect(s.weekdays).toEqual(["MON"]);
    // and back the other way: Mon 01:00 Lagos is still Sunday in New York
    const back = scheduleInZone({ ...lagosEvening, weekdays: ["MON"], start_time: "01:00" }, "2027-01-18T00:00:00.000Z", "America/New_York");
    expect(back.weekdays).toEqual(["SUN"]);
  });

  it("formats weekdays, calendar dates and seats", () => {
    expect(formatWeekdays(["TUE", "THU"])).toBe("Tue and Thu");
    expect(formatWeekdays(["MON", "WED", "FRI"])).toBe("Mon, Wed and Fri");
    expect(formatCalendarDate("2027-01-12")).toBe("12 Jan 2027");
    expect(seatsLeft({ capacity: 20, enrolled_count: 14 })).toBe(6);
    expect(seatsLeft({ capacity: 12, enrolled_count: 13 })).toBe(0);
  });
});

describe("demo cohort dates", () => {
  it("starts on a scheduled weekday, counts sessions and closes enrolment before the first one", () => {
    const now = new Date("2026-11-20T10:00:00Z"); // a Friday
    const c = makeCohort(
      {
        id: "c",
        training_id: "t",
        name: "Evening",
        schedule: { ...lagosEvening, weekdays: ["TUE", "THU"] },
        startsInDays: 0,
        weeks: 6,
        capacity: 20,
        min_enrolment: null,
        enrolled_count: 0,
        status: "OPEN",
        instructor_id: "i",
      },
      now,
    );
    expect(c.start_date).toBe("2026-11-24");
    expect(c.first_session_at).toBe("2026-11-24T17:00:00.000Z");
    expect(c.session_count).toBe(12);
    expect(c.end_date).toBe("2027-01-04");
    expect(c.enrolment_deadline).toBe("2026-11-22T17:00:00.000Z");
  });
});
