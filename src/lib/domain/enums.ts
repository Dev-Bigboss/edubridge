/**
 * Domain enums, spelled exactly as in the LMP SRS v0.1 so frontend, backend and QA share one vocabulary.
 * Where the SRS is silent and we had to choose, the value is marked "PLAN" and listed in
 * contracts/CONVENTIONS.md for backend review.
 */

/** SRS §1.4. Guest is "not signed in", so it is not a stored role. */
export const ROLES = ["LEARNER", "INSTRUCTOR", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

/**
 * SRS TRN-2: modalities live in a table so more can be added without a deploy.
 * These two codes are the seeded ones the UI has behaviour for; unknown codes must still render.
 */
export const MODALITY = { COHORT: "COHORT", ONE_ON_ONE: "ONE_ON_ONE" } as const;
export type KnownModalityCode = (typeof MODALITY)[keyof typeof MODALITY];
export type ModalityCode = KnownModalityCode | (string & {});

/** SRS TRN-1 */
export const TRAINING_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type TrainingStatus = (typeof TRAINING_STATUSES)[number];

/** SRS COH-3 (Full/Closed split into two values) */
export const COHORT_STATUSES = [
  "DRAFT",
  "OPEN",
  "FULL",
  "CLOSED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;
export type CohortStatus = (typeof COHORT_STATUSES)[number];

/** SRS §4.3 "1:1 booking state machine" */
export const BOOKING_STATUSES = [
  "DRAFT",
  "PENDING_INSTRUCTOR",
  "COUNTER_PROPOSED",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED",
  "RESCHEDULE_REQUESTED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** SRS PRC-2 */
export const PRICING_UNITS = ["PER_SEAT", "PER_SESSION", "PER_HOUR"] as const;
export type PricingUnit = (typeof PRICING_UNITS)[number];

/**
 * PLAN: SRS §5 gives Payment a `status` but no values. Proposed set, matching Stripe's
 * manual-capture lifecycle (PAY-2, PAY-4, PAY-5).
 */
export const PAYMENT_STATUSES = [
  "PENDING",
  "AUTHORISED",
  "CAPTURED",
  "VOIDED",
  "FAILED",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** SRS ONB-3: instructor needs admin approval before being published. */
export const APPROVAL_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

/** SRS §5 User.status, ADM-2 suspend */
export const USER_STATUSES = ["PENDING_VERIFICATION", "ACTIVE", "SUSPENDED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** PLAN (ONB-2 "education level"): SRS names the field, not the values. */
export const EDUCATION_LEVELS = ["SECONDARY", "UNDERGRADUATE", "POSTGRADUATE", "PROFESSIONAL", "OTHER"] as const;
export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

/** PLAN (ONB-3 payout details): state of the instructor's Stripe Connect account. */
export const PAYOUT_SETUP_STATUSES = ["NOT_STARTED", "PENDING", "COMPLETE"] as const;
export type PayoutSetupStatus = (typeof PAYOUT_SETUP_STATUSES)[number];

/** RES-4: uploads are virus-scanned before anyone can open them. */
export const FILE_SCAN_STATUSES = ["SCANNING", "CLEAN", "INFECTED"] as const;
export type FileScanStatus = (typeof FILE_SCAN_STATUSES)[number];

/** PLAN (TRN-1 "level"): SRS names the field, not the values. */
export const TRAINING_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"] as const;
export type TrainingLevel = (typeof TRAINING_LEVELS)[number];

/**
 * NTF-1 events. The SRS list (booking request, acceptance/decline/expiry, reschedule, reminders,
 * payment events, new resource, new recording, feedback, new message) plus the account and
 * cohort events Phase 1 already produces. PLAN: names are ours, for backend review.
 */
export const NOTIFICATION_TYPES = [
  "BOOKING_REQUESTED",
  "BOOKING_ACCEPTED",
  "BOOKING_DECLINED",
  "BOOKING_EXPIRED",
  "BOOKING_RESCHEDULED",
  "SESSION_REMINDER",
  "PAYMENT_SUCCEEDED",
  "PAYMENT_FAILED",
  "PAYMENT_REFUNDED",
  "RESOURCE_ADDED",
  "RECORDING_ADDED",
  "FEEDBACK_ADDED",
  "MESSAGE_RECEIVED",
  "COHORT_CANCELLED",
  "COHORT_CHANGED",
  "INSTRUCTOR_APPLICATION",
  "INSTRUCTOR_APPROVED",
  "INSTRUCTOR_REJECTED",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
