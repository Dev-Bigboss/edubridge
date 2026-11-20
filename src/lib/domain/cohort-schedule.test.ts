import { describe, expect, it } from "vitest";
import { dateInZone, deadlineFromDate, enrolmentPhase, formatCalendarDate, formatWeekdays, localInstant, nextSession, planSessions, scheduleInZone, seatsLeft } from "./cohort-schedule";
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

describe("planSessions and deadlines (COH-1)", () => {
  const schedule = { weekdays: ["TUE", "THU"] as ("TUE" | "THU")[], start_time: "18:00", duration_min: 120, timezone: "Africa/Lagos" };

  it("counts the scheduled weekdays between two dates, inclusive, and finds the first one", () => {
    // Mon 11 Jan to Thu 21 Jan 2027: Tue 12, Thu 14, Tue 19, Thu 21
    expect(planSessions("2027-01-11", "2027-01-21", schedule)).toEqual({ count: 4, firstSessionAt: "2027-01-12T17:00:00.000Z" });
  });

  it("returns no sessions for an empty or backwards range", () => {
    expect(planSessions("2027-01-15", "2027-01-18", schedule)).toEqual({ count: 0, firstSessionAt: null }); // Fri to Mon
    expect(planSessions("2027-01-21", "2027-01-11", schedule).count).toBe(0);
    expect(planSessions("", "2027-01-11", schedule).count).toBe(0);
  });

  it("uses the schedule's zone across daylight saving changes", () => {
    const london = { ...schedule, weekdays: ["SUN"] as "SUN"[], start_time: "09:00", timezone: "Europe/London" };
    expect(planSessions("2027-03-28", "2027-03-28", london).firstSessionAt).toBe("2027-03-28T08:00:00.000Z"); // BST
    expect(planSessions("2027-03-21", "2027-03-21", london).firstSessionAt).toBe("2027-03-21T09:00:00.000Z"); // GMT
  });

  it("closes enrolment at the end of the chosen day in the schedule's zone and reads it back", () => {
    const deadline = deadlineFromDate("2027-01-10", "Africa/Lagos");
    expect(deadline).toBe("2027-01-10T22:59:00.000Z");
    expect(dateInZone(deadline, "Africa/Lagos")).toBe("2027-01-10");
    expect(localInstant("2027-07-01", "10:30", "America/New_York").toISOString()).toBe("2027-07-01T14:30:00.000Z");
  });
});

describe("next class and enrolment groups (My trainings)", () => {
  // Tue/Thu 18:00–20:00 Lagos (17:00–19:00 UTC), 12 Jan to 21 Jan 2027
  const c = {
    start_date: "2027-01-12",
    end_date: "2027-01-21",
    first_session_at: "2027-01-12T17:00:00.000Z",
    status: "OPEN",
    schedule: { weekdays: ["TUE", "THU"] as ("TUE" | "THU")[], start_time: "18:00", duration_min: 120, timezone: "Africa/Lagos" },
  };
  const at = (iso: string) => new Date(iso);

  it("finds the first class before the cohort starts", () => {
    expect(nextSession(c, at("2027-01-01T00:00:00Z"))).toBe("2027-01-12T17:00:00.000Z");
    expect(enrolmentPhase(c, at("2027-01-01T00:00:00Z"))).toBe("UPCOMING");
  });

  it("keeps a class that's running as next, then moves to the following one", () => {
    expect(nextSession(c, at("2027-01-12T18:30:00Z"))).toBe("2027-01-12T17:00:00.000Z");
    expect(nextSession(c, at("2027-01-12T19:00:01Z"))).toBe("2027-01-14T17:00:00.000Z");
    expect(enrolmentPhase({ ...c, status: "IN_PROGRESS" }, at("2027-01-13T00:00:00Z"))).toBe("IN_PROGRESS");
  });

  it("is finished after the last class, when completed, and separate when cancelled", () => {
    expect(nextSession(c, at("2027-01-21T19:00:01Z"))).toBeNull();
    expect(enrolmentPhase(c, at("2027-01-22T00:00:00Z"))).toBe("FINISHED");
    expect(enrolmentPhase({ ...c, status: "COMPLETED" }, at("2027-01-13T00:00:00Z"))).toBe("FINISHED");
    expect(enrolmentPhase({ ...c, status: "CANCELLED" }, at("2027-01-01T00:00:00Z"))).toBe("CANCELLED");
  });
});
