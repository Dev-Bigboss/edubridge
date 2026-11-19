import { describe, expect, it } from "vitest";
import { ONE_ON_ONE_DURATIONS_MIN, formatDuration, formatMoney, formatPriceTag, minorDigits } from "./money";

describe("money", () => {
  it("formats cents as USD without a trailing .00 for whole amounts", () => {
    expect(formatMoney({ amount: 5000, currency: "USD" })).toBe("$50");
    expect(formatMoney({ amount: 4999, currency: "USD" })).toBe("$49.99");
    expect(formatMoney({ amount: 123456789, currency: "USD" })).toBe("$1,234,567.89");
  });

  it("knows zero-decimal currencies", () => {
    expect(minorDigits("USD")).toBe(2);
    expect(minorDigits("JPY")).toBe(0);
    expect(formatMoney({ amount: 500, currency: "JPY" })).toBe("¥500");
  });

  it("labels the pricing unit (PRC-2)", () => {
    expect(formatPriceTag({ amount: 4000, currency: "USD" }, "PER_HOUR")).toBe("$40 per hour");
    expect(formatPriceTag({ amount: 25000, currency: "USD" }, "PER_SEAT")).toBe("$250 per seat");
  });

  it("offers 1 h to 4 h in 30-minute steps (plan §2.1)", () => {
    expect(ONE_ON_ONE_DURATIONS_MIN[0]).toBe(60);
    expect(ONE_ON_ONE_DURATIONS_MIN.at(-1)).toBe(240);
    expect(ONE_ON_ONE_DURATIONS_MIN.every((m, i, a) => i === 0 || m - a[i - 1] === 30)).toBe(true);
  });

  it("formats durations", () => {
    expect(formatDuration(60)).toBe("1 hour");
    expect(formatDuration(90)).toBe("1 h 30 min");
    expect(formatDuration(240)).toBe("4 hours");
    expect(formatDuration(30)).toBe("30 min");
  });
});
