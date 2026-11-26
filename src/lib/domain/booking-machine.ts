import type { BookingStatus, Role } from "./enums";

/**
 * 1:1 booking state machine (SRS §4.3, OTO-3..9).
 *
 * The backend is the authority on transitions. The frontend uses this table to decide
 * which actions to offer, so a button never appears for a move the API would reject.
 *
 * Who can trigger each move:
 *   LEARNER / INSTRUCTOR: a person in the UI
 *   SYSTEM: the backend scheduler (expiry, completion), never offered as a button
 */
export type Actor = Role | "SYSTEM";

export type BookingAction =
  | "SUBMIT"
  | "ACCEPT"
  | "DECLINE"
  | "PROPOSE_TIME"
  | "ACCEPT_PROPOSAL"
  | "DECLINE_PROPOSAL"
  | "EXPIRE"
  | "REQUEST_RESCHEDULE"
  | "ACCEPT_RESCHEDULE"
  | "DECLINE_RESCHEDULE"
  | "CANCEL"
  | "COMPLETE"
  | "MARK_NO_SHOW";

type Transition = {
  action: BookingAction;
  from: BookingStatus;
  to: BookingStatus;
  actors: readonly Actor[];
  /** Set when the SRS does not spell this move out and the plan chose it. */
  plan?: string;
};

const PARTIES = ["LEARNER", "INSTRUCTOR"] as const;

export const BOOKING_TRANSITIONS: readonly Transition[] = [
  { action: "SUBMIT", from: "DRAFT", to: "PENDING_INSTRUCTOR", actors: ["LEARNER"] },

  { action: "ACCEPT", from: "PENDING_INSTRUCTOR", to: "ACCEPTED", actors: ["INSTRUCTOR"] },
  { action: "DECLINE", from: "PENDING_INSTRUCTOR", to: "DECLINED", actors: ["INSTRUCTOR"] },
  { action: "PROPOSE_TIME", from: "PENDING_INSTRUCTOR", to: "COUNTER_PROPOSED", actors: ["INSTRUCTOR"] },
  { action: "EXPIRE", from: "PENDING_INSTRUCTOR", to: "EXPIRED", actors: ["SYSTEM"] },

  { action: "ACCEPT_PROPOSAL", from: "COUNTER_PROPOSED", to: "ACCEPTED", actors: ["LEARNER"] },
  { action: "DECLINE_PROPOSAL", from: "COUNTER_PROPOSED", to: "DECLINED", actors: ["LEARNER"] },
  {
    action: "EXPIRE",
    from: "COUNTER_PROPOSED",
    to: "EXPIRED",
    actors: ["SYSTEM"],
    plan: "Learner has 48 h to answer a counter-proposal so the Stripe authorisation (~7 days) cannot lapse. Plan §2.1.",
  },

  { action: "COMPLETE", from: "ACCEPTED", to: "COMPLETED", actors: ["SYSTEM"] },
  { action: "CANCEL", from: "ACCEPTED", to: "CANCELLED", actors: PARTIES },
  { action: "MARK_NO_SHOW", from: "ACCEPTED", to: "NO_SHOW", actors: ["INSTRUCTOR", "SYSTEM"] },
  { action: "REQUEST_RESCHEDULE", from: "ACCEPTED", to: "RESCHEDULE_REQUESTED", actors: PARTIES },

  {
    action: "ACCEPT_RESCHEDULE",
    from: "RESCHEDULE_REQUESTED",
    to: "ACCEPTED",
    actors: PARTIES,
    plan: "SRS stops at RESCHEDULE_REQUESTED. The other party accepting moves the booking back to ACCEPTED at the new time (OTO-9).",
  },
  {
    action: "DECLINE_RESCHEDULE",
    from: "RESCHEDULE_REQUESTED",
    to: "ACCEPTED",
    actors: PARTIES,
    plan: "Declining a reschedule keeps the original time.",
  },
  {
    action: "CANCEL",
    from: "RESCHEDULE_REQUESTED",
    to: "CANCELLED",
    actors: PARTIES,
    plan: "Either party can still cancel while a reschedule is pending; cancellation policy applies.",
  },
];

export const TERMINAL_BOOKING_STATUSES: readonly BookingStatus[] = [
  "DECLINED",
  "EXPIRED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];

export function isTerminal(status: BookingStatus): boolean {
  return TERMINAL_BOOKING_STATUSES.includes(status);
}

export function canTransition(from: BookingStatus, action: BookingAction, actor: Actor): boolean {
  return BOOKING_TRANSITIONS.some(
    (t) => t.from === from && t.action === action && t.actors.includes(actor),
  );
}

export function nextStatus(from: BookingStatus, action: BookingAction): BookingStatus | null {
  return BOOKING_TRANSITIONS.find((t) => t.from === from && t.action === action)?.to ?? null;
}

/**
 * Actions a person can take on a booking right now. For a pending reschedule, the person who
 * asked for it waits; only the other party may accept or decline (OTO-9).
 */
export function availableActions(
  status: BookingStatus,
  role: Role,
  opts: { rescheduleRequestedBy?: Role } = {},
): BookingAction[] {
  return BOOKING_TRANSITIONS.filter((t) => {
    if (t.from !== status || !t.actors.includes(role)) return false;
    if (
      (t.action === "ACCEPT_RESCHEDULE" || t.action === "DECLINE_RESCHEDULE") &&
      opts.rescheduleRequestedBy === role
    ) {
      return false;
    }
    return true;
  }).map((t) => t.action);
}

/** Booking states where the learner's card authorisation is held but not captured (PAY-4, BR-2). */
export const AUTHORISATION_HELD: readonly BookingStatus[] = ["PENDING_INSTRUCTOR", "COUNTER_PROPOSED"];
