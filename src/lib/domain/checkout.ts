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
  return { currency: price.currency, unit_price: price, quantity: 1, subtotal, discount, tax, total: subtotal - discount + tax };
}
