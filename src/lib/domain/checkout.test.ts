import { describe, expect, it } from "vitest";
import { refundable, seatBreakdown, sessionBreakdown } from "./checkout";

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

  it("prices a 1:1 session by the hour or flat per session", () => {
    expect(sessionBreakdown({ amount: 7500, currency: "USD", unit: "PER_HOUR" }, 90)).toMatchObject({ subtotal: 11250, total: 11250, duration_min: 90 });
    expect(sessionBreakdown({ amount: 3333, currency: "USD", unit: "PER_HOUR" }, 90).total).toBe(5000); // rounded to the cent
    expect(sessionBreakdown({ amount: 9000, currency: "USD", unit: "PER_SESSION" }, 120)).toMatchObject({ total: 9000, duration_min: null });
    expect(() => sessionBreakdown({ amount: 1, currency: "USD", unit: "PER_SEAT" }, 60)).toThrow();
  });
});
