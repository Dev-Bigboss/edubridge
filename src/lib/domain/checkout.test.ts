import { describe, expect, it } from "vitest";
import { refundable, seatBreakdown } from "./checkout";

describe("checkout money rules", () => {
  it("breaks a seat price into lines that add up (PRC-7)", () => {
    expect(seatBreakdown({ amount: 45000, currency: "USD", unit: "PER_SEAT" })).toMatchObject({ subtotal: 45000, discount: 0, tax: 0, total: 45000, quantity: 1 });
  });

  it("only refunds what was taken and not yet returned (PAY-5)", () => {
    const p = (status: string, refunded_amount = 0) => ({ status, refunded_amount, breakdown: { total: 25000 } });
    expect(refundable(p("CAPTURED"))).toBe(25000);
    expect(refundable(p("PARTIALLY_REFUNDED", 10000))).toBe(15000);
    expect(refundable(p("REFUNDED", 25000))).toBe(0);
    expect(refundable(p("PENDING"))).toBe(0);
    expect(refundable(p("FAILED"))).toBe(0);
  });
});
