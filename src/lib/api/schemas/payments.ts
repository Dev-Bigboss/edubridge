import { z } from "zod";
import { PAYMENT_STATUSES } from "@/lib/domain/enums";
import { PriceSchema, PublicCohort, PublicTrainingCard } from "./catalog";

/** Mirrors contracts/openapi/payments.yaml. */

const Amount = z.number().int().nonnegative();

/**
 * PRC-7: what the learner will pay, line by line, as the backend computes it. The UI shows
 * these numbers as they are and never adds them up itself. Discounts and tax arrive with PRC-6
 * (Phase 3); until then they are 0 but the lines exist so nothing changes shape later.
 */
export const PriceBreakdown = z.object({
  currency: z.string().length(3),
  unit_price: PriceSchema,
  quantity: z.number().int().positive(),
  /** 1:1 sessions priced per hour: the length charged for. Null for seats and per-session prices. */
  duration_min: z.number().int().positive().nullable(),
  subtotal: Amount,
  discount: Amount,
  tax: Amount,
  total: Amount,
});
export type PriceBreakdown = z.infer<typeof PriceBreakdown>;

export const ENROL_BLOCKS = ["FULL", "NOT_OPEN", "DEADLINE_PASSED", "ALREADY_ENROLLED", "NO_PRICE"] as const;

/** GET /checkout/cohorts/{id}: the learner's quote and whether they can buy it now. */
export const CohortCheckout = z.object({
  cohort: PublicCohort,
  training: PublicTrainingCard,
  breakdown: PriceBreakdown.nullable(),
  blocked: z.enum(ENROL_BLOCKS).nullable(),
});
export type CohortCheckout = z.infer<typeof CohortCheckout>;

export const ENROLMENT_STATUSES = ["PENDING_PAYMENT", "CONFIRMED", "CANCELLED", "REFUNDED"] as const;
export type EnrolmentStatus = (typeof ENROLMENT_STATUSES)[number];

export const Enrolment = z.object({
  id: z.string(),
  learner_id: z.string(),
  training_id: z.string(),
  cohort_id: z.string(),
  status: z.enum(ENROLMENT_STATUSES),
  /** BR-4: the price paid, frozen at purchase. */
  price: PriceSchema,
  payment_id: z.string(),
  created_at: z.string(),
  confirmed_at: z.string().nullable(),
});
export type Enrolment = z.infer<typeof Enrolment>;

export const Payment = z.object({
  id: z.string(),
  learner_id: z.string(),
  /** Exactly one of these is set: a cohort seat or a 1:1 booking (SRS §5 Enrolment/Booking ↔ Payment). */
  enrolment_id: z.string().nullable(),
  booking_id: z.string().nullable(),
  /** "ICAN Skills: Financial Reporting · Evening cohort" */
  description: z.string(),
  breakdown: PriceBreakdown,
  status: z.enum(PAYMENT_STATUSES),
  /** "Visa ending 4242", from the gateway once paid. */
  method: z.string().nullable(),
  failure_message: z.string().nullable(),
  refunded_amount: Amount,
  created_at: z.string(),
  captured_at: z.string().nullable(),
  /**
   * PAY-6: set once paid. The app shows the receipt at /receipts/{id}; `receipt_url` is the PDF the
   * backend generates and emails (signed, short-lived), offered as a download when present.
   */
  receipt_number: z.string().nullable(),
  receipt_url: z.string().nullable(),
});
export type Payment = z.infer<typeof Payment>;
export const PaymentList = z.object({ items: z.array(Payment) });

/** POST /checkout/sessions: send the learner to the gateway's hosted page (PAY-1: no card data here). */
export const CheckoutSession = z.object({ payment: Payment, checkout_url: z.string() });

/** GET /payments/{id}: the payment with its enrolment, polled by the return page (PAY-2). */
export const PaymentDetail = z.object({
  payment: Payment,
  /** Cohort payments; null for 1:1 bookings (see booking_id). */
  enrolment: Enrolment.nullable(),
  cohort_id: z.string().nullable(),
  training_slug: z.string(),
});
export type PaymentDetail = z.infer<typeof PaymentDetail>;

/** GET /me/enrolments: what the learner has joined, with enough to show it without more calls. */
export const LearnerEnrolment = z.object({
  enrolment: Enrolment,
  training: z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    /** TRN-7: ARCHIVED trainings stay listed for learners who enrolled. */
    status: z.enum(["PUBLISHED", "ARCHIVED", "DRAFT"]),
    category_name: z.string(),
  }),
  cohort: PublicCohort,
});
export type LearnerEnrolment = z.infer<typeof LearnerEnrolment>;
export const LearnerEnrolmentList = z.object({ items: z.array(LearnerEnrolment) });

/* ---------- admin (PAY-5) ---------- */

export const AdminPaymentRow = Payment.extend({
  learner: z.object({ id: z.string(), name: z.string(), email: z.string() }),
  /** Null for 1:1 bookings. */
  enrolment_status: z.enum(ENROLMENT_STATUSES).nullable(),
  cohort_id: z.string().nullable(),
});
export type AdminPaymentRow = z.infer<typeof AdminPaymentRow>;

export const AdminPaymentPage = z.object({
  items: z.array(AdminPaymentRow),
  next_cursor: z.string().nullable(),
  total: z.number().int(),
  /** Over the filtered set: money taken and money returned, in USD minor units. */
  sums: z.object({ captured: z.number().int(), refunded: z.number().int() }),
});
export type AdminPaymentPage = z.infer<typeof AdminPaymentPage>;

export const RefundRequest = z.object({
  amount: z.number().int().positive(),
  reason: z.string().trim().min(5).max(500),
  /** Only with a full refund: cancel the enrolment and free the seat. */
  cancel_enrolment: z.boolean(),
});
export type RefundRequest = z.infer<typeof RefundRequest>;

export type AdminPaymentFilters = { q?: string; status?: string; from?: string; to?: string };
