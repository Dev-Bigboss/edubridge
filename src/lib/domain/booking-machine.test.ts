import { describe, expect, it } from "vitest";
import { BOOKING_STATUSES } from "./enums";
import {
  BOOKING_TRANSITIONS,
  availableActions,
  canTransition,
  isTerminal,
  nextStatus,
} from "./booking-machine";

describe("booking state machine (SRS §4.3)", () => {
  it("only uses statuses defined in the SRS", () => {
    for (const t of BOOKING_TRANSITIONS) {
      expect(BOOKING_STATUSES).toContain(t.from);
      expect(BOOKING_STATUSES).toContain(t.to);
    }
  });

  it("covers every transition the SRS lists", () => {
    const pairs = new Set(BOOKING_TRANSITIONS.map((t) => `${t.from}->${t.to}`));
    const srs = [
      "DRAFT->PENDING_INSTRUCTOR",
      "PENDING_INSTRUCTOR->ACCEPTED",
      "PENDING_INSTRUCTOR->DECLINED",
      "PENDING_INSTRUCTOR->EXPIRED",
      "PENDING_INSTRUCTOR->COUNTER_PROPOSED",
      "COUNTER_PROPOSED->ACCEPTED",
      "COUNTER_PROPOSED->DECLINED",
      "ACCEPTED->COMPLETED",
      "ACCEPTED->CANCELLED",
      "ACCEPTED->NO_SHOW",
      "ACCEPTED->RESCHEDULE_REQUESTED",
    ];
    for (const p of srs) expect(pairs).toContain(p);
  });

  it("marks every move not in the SRS with a plan note", () => {
    const srsPairs = new Set([
      "DRAFT->PENDING_INSTRUCTOR",
      "PENDING_INSTRUCTOR->ACCEPTED",
      "PENDING_INSTRUCTOR->DECLINED",
      "PENDING_INSTRUCTOR->EXPIRED",
      "PENDING_INSTRUCTOR->COUNTER_PROPOSED",
      "COUNTER_PROPOSED->ACCEPTED",
      "COUNTER_PROPOSED->DECLINED",
      "ACCEPTED->COMPLETED",
      "ACCEPTED->CANCELLED",
      "ACCEPTED->NO_SHOW",
      "ACCEPTED->RESCHEDULE_REQUESTED",
    ]);
    for (const t of BOOKING_TRANSITIONS) {
      if (!srsPairs.has(`${t.from}->${t.to}`)) expect(t.plan, `${t.from}->${t.to}`).toBeTruthy();
    }
  });

  it("only the instructor can accept, decline or propose a time (OTO-4)", () => {
    for (const action of ["ACCEPT", "DECLINE", "PROPOSE_TIME"] as const) {
      expect(canTransition("PENDING_INSTRUCTOR", action, "INSTRUCTOR")).toBe(true);
      expect(canTransition("PENDING_INSTRUCTOR", action, "LEARNER")).toBe(false);
      expect(canTransition("PENDING_INSTRUCTOR", action, "ADMIN")).toBe(false);
    }
  });

  it("only the learner answers a counter-proposal (OTO-6)", () => {
    expect(availableActions("COUNTER_PROPOSED", "LEARNER")).toEqual(["ACCEPT_PROPOSAL", "DECLINE_PROPOSAL"]);
    expect(availableActions("COUNTER_PROPOSED", "INSTRUCTOR")).toEqual([]);
  });

  it("expiry is system-only and never offered as a button (OTO-5)", () => {
    expect(availableActions("PENDING_INSTRUCTOR", "INSTRUCTOR")).not.toContain("EXPIRE");
    expect(canTransition("PENDING_INSTRUCTOR", "EXPIRE", "SYSTEM")).toBe(true);
  });

  it("the party who asked for a reschedule cannot accept it themselves (OTO-9)", () => {
    expect(availableActions("RESCHEDULE_REQUESTED", "LEARNER", { rescheduleRequestedBy: "LEARNER" })).toEqual([
      "CANCEL",
    ]);
    expect(availableActions("RESCHEDULE_REQUESTED", "INSTRUCTOR", { rescheduleRequestedBy: "LEARNER" })).toEqual([
      "ACCEPT_RESCHEDULE",
      "DECLINE_RESCHEDULE",
      "CANCEL",
    ]);
  });

  it("terminal states offer no actions", () => {
    for (const s of ["DECLINED", "EXPIRED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const) {
      expect(isTerminal(s)).toBe(true);
      expect(availableActions(s, "LEARNER")).toEqual([]);
      expect(availableActions(s, "INSTRUCTOR")).toEqual([]);
    }
  });

  it("resolves the next status for an action", () => {
    expect(nextStatus("PENDING_INSTRUCTOR", "ACCEPT")).toBe("ACCEPTED");
    expect(nextStatus("COMPLETED", "CANCEL")).toBeNull();
  });
});
