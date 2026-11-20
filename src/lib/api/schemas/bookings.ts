import { z } from "zod";
import { BOOKING_STATUSES, PAYMENT_STATUSES } from "@/lib/domain/enums";
import { PublicInstructor } from "./catalog";
import { PriceBreakdown } from "./payments";

/** Mirrors contracts/openapi/bookings.yaml (OTO-1..10, PAY-4). */

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Use a time like 09:00." });
const TimeRange = z.object({ start: hhmm, end: hhmm });

/* ---------- availability (OTO-1) ---------- */

export const AvailabilityInput = z.object({
  timezone: z.string().min(1),
  weekly: z.array(TimeRange.extend({ weekday: z.number().int().min(1).max(7) })).max(50),
  /** A date's hours replace the weekly ones; no ranges blocks the whole day. */
  overrides: z.array(z.object({ date: z.iso.date({ error: "Choose a date." }), ranges: z.array(TimeRange).max(6) })).max(120),
  notice_hours: z.number({ error: "Enter a number of hours." }).int().min(0).max(168),
});
export type AvailabilityInput = z.infer<typeof AvailabilityInput>;
export const AvailabilityResponse = z.object({ availability: AvailabilityInput });

/** OTO-2: free starts (UTC) for one instructor, training and session length. */
export const SlotsResponse = z.object({
  instructor_timezone: z.string(),
  duration_min: z.number().int(),
  slots: z.array(z.string()),
});
export type SlotsResponse = z.infer<typeof SlotsResponse>;

/* ---------- bookings ---------- */

export const BOOKING_EVENTS = [
  "REQUESTED",
  "PAYMENT_AUTHORISED",
  "PAYMENT_FAILED",
  "ACCEPTED",
  "DECLINED",
  "TIME_PROPOSED",
  "PROPOSAL_ACCEPTED",
  "PROPOSAL_DECLINED",
  "EXPIRED",
  "RESCHEDULE_REQUESTED",
  "RESCHEDULE_ACCEPTED",
  "RESCHEDULE_DECLINED",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
] as const;

export const TimelineEntry = z.object({
  at: z.string(),
  actor: z.enum(["LEARNER", "INSTRUCTOR", "SYSTEM"]),
  event: z.union([z.enum(BOOKING_EVENTS), z.string()]),
  /** A message from the person (decline reason, note with a proposal). */
  note: z.string().nullable(),
});

export const Booking = z.object({
  id: z.string(),
  status: z.enum(BOOKING_STATUSES),
  training: z.object({ id: z.string(), slug: z.string(), title: z.string() }),
  instructor: PublicInstructor,
  learner: z.object({ id: z.string(), name: z.string() }),
  start_utc: z.string(),
  end_utc: z.string(),
  duration_min: z.number().int(),
  /** The learner's message to the instructor with the request. */
  note: z.string().nullable(),
  /** OTO-5/6: when the waiting side must answer by (pending request or counter-proposal). */
  expires_at: z.string().nullable(),
  /** OTO-6: the instructor's alternative time while COUNTER_PROPOSED. */
  proposal: z.object({ start_utc: z.string(), end_utc: z.string(), note: z.string().nullable() }).nullable(),
  /** OTO-9: a pending reschedule while RESCHEDULE_REQUESTED. */
  reschedule: z.object({ requested_by: z.enum(["LEARNER", "INSTRUCTOR"]), start_utc: z.string(), end_utc: z.string(), note: z.string().nullable() }).nullable(),
  /** OTO-8: created on acceptance. */
  meeting_url: z.string().nullable(),
  /** BR-4: the price agreed at request time. */
  breakdown: PriceBreakdown,
  /** OTO-9: the cancellation rules in force when the session was requested. */
  policy: z.object({
    learner_tiers: z.array(z.object({ min_hours_before: z.number().int(), refund_percent: z.number().int() })),
    instructor_refund_percent: z.number().int(),
  }),
  /** Set when cancelled: who, why, and what went back to the learner. */
  cancellation: z.object({ by: z.enum(["LEARNER", "INSTRUCTOR"]), reason: z.string(), refund_amount: z.number().int() }).nullable(),
  payment_id: z.string(),
  payment_status: z.enum(PAYMENT_STATUSES),
  timeline: z.array(TimelineEntry),
  created_at: z.string(),
});
export type Booking = z.infer<typeof Booking>;
export const BookingResponse = z.object({ booking: Booking });
export const BookingList = z.object({ items: z.array(Booking) });

export const ONE_ON_ONE_LENGTHS = [60, 90, 120, 150, 180, 210, 240] as const;

export const BookingRequest = z.object({
  training_id: z.string(),
  instructor_id: z.string(),
  start_utc: z.string(),
  duration_min: z.number().int().refine((n) => (ONE_ON_ONE_LENGTHS as readonly number[]).includes(n), { error: "Choose a session length from the list." }),
  note: z.string().trim().max(1000).nullable(),
});
export type BookingRequest = z.infer<typeof BookingRequest>;

/** GET /bookings/quote: PRC-7 breakdown before requesting. */
export const BookingQuote = z.object({ breakdown: PriceBreakdown, expiry_hours: z.number().int() });

export const BookingCheckout = z.object({ booking: Booking, checkout_url: z.string() });
