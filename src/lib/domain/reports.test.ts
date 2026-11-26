import { describe, expect, it } from "vitest";
import { median, responseHours, revenueBuckets, toCsv } from "./reports";

describe("reports helpers", () => {
  it("makes daily buckets up to 30 days and weekly beyond, ending today", () => {
    const now = new Date("2026-11-22T15:00:00Z");
    const daily = revenueBuckets(7, now);
    expect(daily).toHaveLength(7);
    expect(daily.at(-1)).toEqual({ start: "2026-11-22T00:00:00.000Z", end: "2026-11-23T00:00:00.000Z" });
    expect(daily[0].start).toBe("2026-11-16T00:00:00.000Z");
    const weekly = revenueBuckets(90, now);
    expect(weekly).toHaveLength(13);
    expect(weekly.at(-1)?.start).toBe("2026-11-16T00:00:00.000Z");
  });

  it("finds the median", () => {
    expect(median([])).toBeNull();
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it("measures instructor response from the card hold to the first answer", () => {
    const t = (h: number) => new Date(Date.UTC(2026, 10, 20, h)).toISOString();
    expect(responseHours([{ at: t(0), actor: "LEARNER", event: "REQUESTED" }, { at: t(1), actor: "SYSTEM", event: "PAYMENT_AUTHORISED" }, { at: t(6), actor: "INSTRUCTOR", event: "ACCEPTED" }])).toBe(5);
    expect(responseHours([{ at: t(1), actor: "SYSTEM", event: "PAYMENT_AUTHORISED" }, { at: t(25), actor: "SYSTEM", event: "EXPIRED" }])).toBe("EXPIRED");
    expect(responseHours([{ at: t(1), actor: "SYSTEM", event: "PAYMENT_AUTHORISED" }])).toBeNull();
    expect(responseHours([])).toBeNull();
  });

  it("writes CSV that spreadsheets open safely", () => {
    expect(toCsv([["name", "amount"], ['Ada "A" Demo, PhD', 12.5], ["=HYPERLINK(1)", null], ["-5", -5]])).toBe(
      'name,amount\r\n"Ada ""A"" Demo, PhD",12.5\r\n\'=HYPERLINK(1),\r\n\'-5,-5',
    );
  });
});
