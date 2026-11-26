import type { Price } from "./pricing";

/**
 * PRC-7 breakdown for one cohort seat. Discount codes and tax are PRC-6 (Phase 3), so both are 0
 * until then; the lines exist now so the checkout layout and the contract don't change later.
 * The backend computes this; the mock uses the same function.
 */
export function seatBreakdown(price: Price) {
  const subtotal = price.amount;
  const discount = 0;
  const tax = 0;
  return { currency: price.currency, unit_price: price, quantity: 1, duration_min: null, subtotal, discount, tax, total: subtotal - discount + tax };
}

/**
 * One 1:1 session (OTO-2, PRC-2/3). Per-hour prices are charged for the length chosen, rounded to
 * the cent; per-session prices are flat. Seats can't be booked 1:1.
 */
export function sessionBreakdown(price: Price, durationMin: number) {
  if (price.unit === "PER_SEAT") throw new Error("A per-seat price can't be used for a 1:1 session.");
  const hourly = price.unit === "PER_HOUR";
  const subtotal = hourly ? Math.round((price.amount * durationMin) / 60) : price.amount;
  return {
    currency: price.currency,
    unit_price: price,
    quantity: 1,
    duration_min: hourly ? durationMin : null,
    subtotal,
    discount: 0,
    tax: 0,
    total: subtotal,
  };
}

/** PAY-5: how much of a payment can still be refunded. Only money actually taken can go back. */
export function refundable(p: { status: string; refunded_amount: number; breakdown: { total: number } }): number {
  if (p.status !== "CAPTURED" && p.status !== "PARTIALLY_REFUNDED") return 0;
  return Math.max(0, p.breakdown.total - p.refunded_amount);
}
