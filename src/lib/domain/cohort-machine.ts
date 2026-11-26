import type { CohortStatus } from "./enums";

/**
 * Cohort status flow (SRS COH-3): Draft → Open → Full/Closed → In Progress → Completed → Cancelled.
 *
 * The SRS lists the states as a line. Read literally, a completed cohort could be cancelled,
 * which makes no sense for refunds (COH-5). The plan's reading, for backend review:
 * - Cancelled is reachable from any state before Completed.
 * - FULL → OPEN when a seat frees up (refund or removal).
 */
export const COHORT_TRANSITIONS: Readonly<Record<CohortStatus, readonly CohortStatus[]>> = {
  DRAFT: ["OPEN", "CANCELLED"],
  OPEN: ["FULL", "CLOSED", "IN_PROGRESS", "CANCELLED"],
  FULL: ["OPEN", "CLOSED", "IN_PROGRESS", "CANCELLED"],
  CLOSED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canMoveCohort(from: CohortStatus, to: CohortStatus): boolean {
  return COHORT_TRANSITIONS[from].includes(to);
}

/** COH-2: a learner can enrol only while seats remain and before the deadline. */
export function canEnrol(
  cohort: { status: CohortStatus; capacity: number; enrolledCount: number; enrolmentDeadlineUtc: string },
  now: Date = new Date(),
): { ok: true } | { ok: false; reason: "NOT_OPEN" | "FULL" | "DEADLINE_PASSED" } {
  if (cohort.status === "FULL" || cohort.enrolledCount >= cohort.capacity) return { ok: false, reason: "FULL" };
  if (cohort.status !== "OPEN") return { ok: false, reason: "NOT_OPEN" };
  if (now.getTime() > new Date(cohort.enrolmentDeadlineUtc).getTime()) {
    return { ok: false, reason: "DEADLINE_PASSED" };
  }
  return { ok: true };
}

/**
 * Admin actions (POST /admin/cohorts/{id}/{action}) and the status each one moves to. FULL is
 * never chosen by hand: the backend sets it when the last seat is paid and clears it when one frees.
 */
export const COHORT_ACTION_TARGET = {
  open: "OPEN",
  close: "CLOSED",
  start: "IN_PROGRESS",
  complete: "COMPLETED",
  cancel: "CANCELLED",
} as const satisfies Record<string, CohortStatus>;
export type CohortActionName = keyof typeof COHORT_ACTION_TARGET;

export function cohortActions(status: CohortStatus): CohortActionName[] {
  return (Object.keys(COHORT_ACTION_TARGET) as CohortActionName[]).filter(
    // FULL → OPEN happens on its own when a seat frees, so it is never a button.
    (a) => canMoveCohort(status, COHORT_ACTION_TARGET[a]) && !(status === "FULL" && a === "open"),
  );
}

/** Dates, schedule and instructor can change until the cohort starts; seats and name until it ends. */
export function cohortEditable(status: CohortStatus): "ALL" | "SEATS_AND_NAME" | "NONE" {
  if (status === "COMPLETED" || status === "CANCELLED") return "NONE";
  return status === "IN_PROGRESS" ? "SEATS_AND_NAME" : "ALL";
}

/**
 * COH-5: how many more seats must sell by the deadline for the cohort to run. 0 when there's no
 * minimum or it's already met. Below it at the deadline, the cohort is cancelled and refunded.
 */
export function minimumShortfall(c: { min_enrolment: number | null; enrolled_count: number }): number {
  return c.min_enrolment === null ? 0 : Math.max(0, c.min_enrolment - c.enrolled_count);
}

/** Cohorts the deadline check applies to: still taking or holding enrolments, not started. */
export const AUTO_CANCEL_STATUSES: readonly CohortStatus[] = ["OPEN", "FULL", "CLOSED"];
