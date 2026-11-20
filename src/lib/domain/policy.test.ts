import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, describeTiers, diffSettings, refundPercent, tierProblems } from "./policy";

const tiers = DEFAULT_SETTINGS.learner_cancellation.tiers;

describe("cancellation policy (ADM-3, OTO-9)", () => {
  it("refunds by notice given, whatever order the rules are in", () => {
    expect(refundPercent(tiers, 72)).toBe(100);
    expect(refundPercent(tiers, 48)).toBe(100);
    expect(refundPercent(tiers, 30)).toBe(50);
    expect(refundPercent(tiers, 2)).toBe(0);
    expect(refundPercent([...tiers].reverse(), 30)).toBe(50);
    expect(refundPercent([{ min_hours_before: 12, refund_percent: 80 }], 1)).toBe(0);
  });

  it("describes the rules in plain words", () => {
    expect(describeTiers(tiers)).toEqual(["48 h or more before: 100% back", "24–48 h before: 50% back", "Less than 24 h before: 0% back"]);
  });

  it("rejects duplicate thresholds, a missing 0 h rule, and refunds that grow closer to the session", () => {
    expect(tierProblems(tiers)).toEqual([]);
    expect(tierProblems([{ min_hours_before: 24, refund_percent: 50 }, { min_hours_before: 24, refund_percent: 0 }, { min_hours_before: 0, refund_percent: 0 }])[0]).toMatchObject({ index: 1, field: "min_hours_before" });
    expect(tierProblems([{ min_hours_before: 24, refund_percent: 100 }])[0].message).toContain("0 hours");
    expect(tierProblems([{ min_hours_before: 48, refund_percent: 50 }, { min_hours_before: 0, refund_percent: 100 }])).toEqual([
      { index: 1, field: "refund_percent", message: "Cancelling later can't refund more than cancelling earlier." },
    ]);
  });

  it("summarises what changed for the audit log", () => {
    expect(diffSettings(DEFAULT_SETTINGS, DEFAULT_SETTINGS)).toBe("No changes");
    const next = { ...DEFAULT_SETTINGS, commission_percent: 15, booking_expiry_hours: 12 };
    expect(diffSettings(DEFAULT_SETTINGS, next)).toBe("Commission 20% → 15%. 1:1 request expiry 24 h → 12 h");
  });
});
