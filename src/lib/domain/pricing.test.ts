import { describe, expect, it } from "vitest";
import { addRuleVersion, lowestPrice, resolvePrice, ruleAt, ruleHistory, scheduledRule, type PricingRule } from "./pricing";

const rule = (over: Partial<PricingRule>): PricingRule => ({
  id: "r1",
  modality_id: "mod_cohort",
  category_id: "cat_exam",
  unit: "PER_SEAT",
  amount: 8000,
  currency: "GBP",
  effective_from: "2026-01-01T00:00:00Z",
  effective_to: null,
  ...over,
});

const training = {
  modality_id: "mod_cohort",
  category_id: "cat_exam",
  price_override: null,
  instructors: [
    { instructor_id: "i1", custom_rate: null },
    { instructor_id: "i2", custom_rate: { amount: 6000, currency: "GBP", unit: "PER_SEAT" as const } },
  ],
};
const at = new Date("2026-06-01T00:00:00Z");

describe("resolvePrice (PRC-4)", () => {
  const rules = [rule({})];

  it("SRS acceptance: a £50 training override beats an £80 rule", () => {
    const p = resolvePrice({ ...training, price_override: { amount: 5000, currency: "GBP", unit: "PER_SEAT" } }, rules, {
      instructorId: "i2",
      at,
    });
    expect(p).toMatchObject({ amount: 5000, source: "TRAINING_OVERRIDE" });
  });

  it("uses the instructor's rate before the rule", () => {
    expect(resolvePrice(training, rules, { instructorId: "i2", at })).toMatchObject({ amount: 6000, source: "INSTRUCTOR_RATE" });
  });

  it("falls back to the Modality × Category rule", () => {
    expect(resolvePrice(training, rules, { instructorId: "i1", at })).toMatchObject({ amount: 8000, source: "RULE", rule_id: "r1" });
    expect(resolvePrice(training, rules, { at })).toMatchObject({ source: "RULE" });
  });

  it("returns null when nothing prices the training", () => {
    expect(resolvePrice({ ...training, category_id: "other" }, rules, { instructorId: "i1", at })).toBeNull();
  });

  it("shows the lowest instructor price as the 'from' price", () => {
    expect(lowestPrice(training, rules, at)?.amount).toBe(6000);
    expect(lowestPrice({ ...training, instructors: [] }, rules, at)?.amount).toBe(8000);
  });
});

describe("rule versions (PRC-5)", () => {
  const now = new Date("2026-06-01T00:00:00Z");
  const base = [rule({ id: "v1" })];

  it("adds a version and closes the previous one where the new one starts", () => {
    const res = addRuleVersion(base, { ...base[0], amount: 9000, effective_from: "2026-07-01T00:00:00Z" }, "v2", now);
    if (!res.ok) throw new Error(res.message);
    expect(res.rules.find((r) => r.id === "v1")?.effective_to).toBe("2026-07-01T00:00:00Z");
    // Before the change: old price. After: new price.
    expect(ruleAt(res.rules, "mod_cohort", "cat_exam", new Date("2026-06-15T00:00:00Z"))?.amount).toBe(8000);
    expect(ruleAt(res.rules, "mod_cohort", "cat_exam", new Date("2026-07-02T00:00:00Z"))?.amount).toBe(9000);
    expect(scheduledRule(res.rules, "mod_cohort", "cat_exam", now)?.id).toBe("v2");
    expect(ruleHistory(res.rules, "mod_cohort", "cat_exam").map((r) => r.id)).toEqual(["v2", "v1"]);
  });

  it("never backdates a price", () => {
    const res = addRuleVersion(base, { ...base[0], amount: 9000, effective_from: "2026-05-01T00:00:00Z" }, "v2", now);
    expect(res).toMatchObject({ ok: false, field: "effective_from" });
  });

  it("must start after the latest (possibly scheduled) version", () => {
    const scheduled = addRuleVersion(base, { ...base[0], amount: 9000, effective_from: "2026-08-01T00:00:00Z" }, "v2", now);
    if (!scheduled.ok) throw new Error();
    const clash = addRuleVersion(scheduled.rules, { ...base[0], amount: 9500, effective_from: "2026-07-01T00:00:00Z" }, "v3", now);
    expect(clash).toMatchObject({ ok: false, field: "effective_from" });
  });

  it("rejects zero, negative and fractional minor units", () => {
    for (const amount of [0, -100, 10.5]) {
      expect(addRuleVersion([], { ...base[0], amount, effective_from: "2026-07-01T00:00:00Z" }, "x", now)).toMatchObject({
        ok: false,
        field: "amount",
      });
    }
  });

  it("starts a brand-new pair with no history", () => {
    const res = addRuleVersion([], { ...base[0], effective_from: now.toISOString() }, "first", now);
    expect(res.ok).toBe(true);
  });
});
