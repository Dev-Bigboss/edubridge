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
  enrolment_id: z.string(),
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
export const PaymentDetail = z.object({ payment: Payment, enrolment: Enrolment, cohort_id: z.string(), training_slug: z.string() });
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
