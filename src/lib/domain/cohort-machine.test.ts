import { describe, expect, it } from "vitest";
import { canEnrol, canMoveCohort, cohortActions, cohortEditable } from "./cohort-machine";

describe("cohort status flow (COH-3)", () => {
  it("follows the SRS order", () => {
    expect(canMoveCohort("DRAFT", "OPEN")).toBe(true);
    expect(canMoveCohort("OPEN", "FULL")).toBe(true);
    expect(canMoveCohort("FULL", "IN_PROGRESS")).toBe(true);
    expect(canMoveCohort("IN_PROGRESS", "COMPLETED")).toBe(true);
  });

  it("cannot cancel a completed cohort or reopen a cancelled one", () => {
    expect(canMoveCohort("COMPLETED", "CANCELLED")).toBe(false);
    expect(canMoveCohort("CANCELLED", "OPEN")).toBe(false);
  });
});

describe("canEnrol (COH-2)", () => {
  const base = {
    status: "OPEN" as const,
    capacity: 20,
    enrolledCount: 5,
    enrolmentDeadlineUtc: "2026-12-01T00:00:00Z",
  };
  const now = new Date("2026-11-20T00:00:00Z");

  it("allows enrolment with seats and before the deadline", () => {
    expect(canEnrol(base, now)).toEqual({ ok: true });
  });

  it("blocks when full, even if status is still OPEN", () => {
    expect(canEnrol({ ...base, enrolledCount: 20 }, now)).toEqual({ ok: false, reason: "FULL" });
  });

  it("blocks after the deadline", () => {
    expect(canEnrol(base, new Date("2026-12-01T00:00:01Z"))).toEqual({ ok: false, reason: "DEADLINE_PASSED" });
  });

  it("blocks when not open", () => {
    expect(canEnrol({ ...base, status: "DRAFT" }, now)).toEqual({ ok: false, reason: "NOT_OPEN" });
  });
});

describe("admin cohort actions", () => {
  it("offers only the moves the status flow allows", () => {
    expect(cohortActions("DRAFT")).toEqual(["open", "cancel"]);
    expect(cohortActions("OPEN")).toEqual(["close", "start", "cancel"]);
    expect(cohortActions("FULL")).toEqual(["close", "start", "cancel"]);
    expect(cohortActions("IN_PROGRESS")).toEqual(["complete", "cancel"]);
    expect(cohortActions("COMPLETED")).toEqual([]);
  });

  it("locks dates once a cohort starts and everything once it ends", () => {
    expect(cohortEditable("OPEN")).toBe("ALL");
    expect(cohortEditable("IN_PROGRESS")).toBe("SEATS_AND_NAME");
    expect(cohortEditable("CANCELLED")).toBe("NONE");
  });
});
