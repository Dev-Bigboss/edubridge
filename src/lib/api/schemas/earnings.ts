import { z } from "zod";
import { PAYOUT_SCHEDULES } from "@/lib/domain/earnings";

/** Mirrors contracts/openapi/earnings.yaml (PAY-7, PAY-8). Amounts are cents in USD. */

export const LedgerEntry = z.object({
  id: z.string(),
  /** EARNING (+net), REFUND (−share), PAYOUT (−amount), PAYOUT_RETURNED (+amount when a payout fails). */
  kind: z.enum(["EARNING", "REFUND", "PAYOUT", "PAYOUT_RETURNED"]),
  description: z.string(),
  payment_id: z.string().nullable(),
  payout_id: z.string().nullable(),
  /** EARNING and REFUND: what the learner paid or got back, and the platform's part of it. Null for payouts. */
  gross: z.number().int().nullable(),
  commission: z.number().int().nullable(),
  commission_percent: z.number().nullable(),
  /** Signed change to the instructor's balance. */
  amount: z.number().int(),
  status: z.enum(["PENDING", "AVAILABLE"]),
  available_at: z.string(),
  created_at: z.string(),
});
export type LedgerEntry = z.infer<typeof LedgerEntry>;

export const Payout = z.object({
  id: z.string(),
  amount: z.number().int(),
  currency: z.literal("USD"),
  status: z.enum(["REQUESTED", "PAID", "FAILED"]),
  trigger: z.enum(["REQUEST", "SCHEDULE"]),
  requested_at: z.string(),
  paid_at: z.string().nullable(),
  failure_reason: z.string().nullable(),
  /** The Stripe transfer id once it exists. */
  reference: z.string().nullable(),
});
export type Payout = z.infer<typeof Payout>;

export const EarningsSummary = z.object({
  currency: z.literal("USD"),
  balances: z.object({
    pending: z.number().int(),
    available: z.number().int(),
    in_flight: z.number().int(),
    paid_out_total: z.number().int(),
    lifetime_net: z.number().int(),
  }),
  /** The next date a pending earning becomes available, if any. */
  next_available_at: z.string().nullable(),
  commission_percent: z.number(),
  hold_days: z.number().int(),
  min_payout: z.number().int(),
  payout_account_status: z.enum(["NOT_STARTED", "PENDING", "COMPLETE"]),
  schedule: z.object({ schedule: z.enum(PAYOUT_SCHEDULES), next_run_at: z.string().nullable() }),
  /** Null when a payout can be requested now; otherwise why not, in plain words. */
  payout_blocked_reason: z.string().nullable(),
  entries: z.array(LedgerEntry),
  payouts: z.array(Payout),
});
export type EarningsSummary = z.infer<typeof EarningsSummary>;

export const PayoutResponse = z.object({ payout: Payout });
export const ScheduleInput = z.object({ schedule: z.enum(PAYOUT_SCHEDULES) });

/** Admin list (PAY-7). */
export const AdminPayout = Payout.extend({ instructor: z.object({ id: z.string(), name: z.string() }) });
export type AdminPayout = z.infer<typeof AdminPayout>;
export const AdminPayoutList = z.object({ items: z.array(AdminPayout), totals: z.object({ requested: z.number().int(), paid: z.number().int(), failed: z.number().int() }) });

/** PAY-8: money in and out for a period, matching Stripe's balance. */
export const Reconciliation = z.object({
  from: z.string(),
  to: z.string(),
  currency: z.literal("USD"),
  totals: z.object({
    captured: z.number().int(),
    refunded: z.number().int(),
    net_revenue: z.number().int(),
    commission: z.number().int(),
    instructor_earnings: z.number().int(),
    paid_out: z.number().int(),
    owed_to_instructors: z.number().int(),
  }),
  instructors: z.array(
    z.object({
      instructor_id: z.string(),
      name: z.string(),
      earned: z.number().int(),
      refunded: z.number().int(),
      paid_out: z.number().int(),
      balance: z.number().int(),
    }),
  ),
});
export type Reconciliation = z.infer<typeof Reconciliation>;
