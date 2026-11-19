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
