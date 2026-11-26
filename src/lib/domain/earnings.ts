/**
 * PAY-7: instructor earnings. Every captured payment earns the instructor its amount minus the
 * platform commission, at the rate in force when it was captured. Refunds take back the instructor's
 * share of what was refunded, in the same proportion. Earnings are pending until a hold after the
 * teaching happens (refund and dispute risk), then available to pay out.
 */
export const MIN_PAYOUT_CENTS = 2000;
export const DEFAULT_EARNINGS_HOLD_DAYS = 7;
export const PAYOUT_SCHEDULES = ["MANUAL", "WEEKLY", "MONTHLY"] as const;
export type PayoutSchedule = (typeof PAYOUT_SCHEDULES)[number];

const DAY = 86_400_000;

/** Commission rounded to the cent; the instructor gets the rest, so the two always add up. */
export function splitCommission(gross: number, percent: number): { commission: number; net: number } {
  const commission = Math.round((gross * percent) / 100);
  return { commission, net: gross - commission };
}

/** The instructor's share of a refund: the refunded part of their net, rounded to the cent. */
export function refundShare(refund: number, gross: number, net: number): number {
  if (gross <= 0) return 0;
  return Math.min(net, Math.round((refund * net) / gross));
}

/** When an earning becomes available: the hold, counted from the session end (1:1) or the first class (cohort seat). */
export function availableAt(deliveredAt: string, holdDays: number): string {
  return new Date(Date.parse(deliveredAt) + holdDays * DAY).toISOString();
}

/**
 * Next automatic payout after `after`: Mondays (WEEKLY) or the 1st of the month (MONTHLY), 09:00 UTC.
 * MANUAL has none.
 */
export function nextPayoutRun(schedule: PayoutSchedule, after: Date): string | null {
  if (schedule === "MANUAL") return null;
  const d = new Date(Date.UTC(after.getUTCFullYear(), after.getUTCMonth(), after.getUTCDate(), 9));
  if (schedule === "WEEKLY") {
    const add = (8 - d.getUTCDay()) % 7; // days until Monday
    d.setUTCDate(d.getUTCDate() + add);
    if (d <= after) d.setUTCDate(d.getUTCDate() + 7);
    return d.toISOString();
  }
  d.setUTCDate(1);
  if (d <= after) d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString();
}

/** Why a payout can't be requested now, or null. */
export function payoutProblem(available: number, accountComplete: boolean, inFlight: boolean): string | null {
  if (!accountComplete) return "Finish your payout details with Stripe first.";
  if (inFlight) return "A payout is already on its way. You can request the next one once it arrives.";
  if (available < MIN_PAYOUT_CENTS) return "You can request a payout once you have at least $20 available.";
  return null;
}
