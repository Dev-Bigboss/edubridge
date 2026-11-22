import { describe, expect, it } from "vitest";
import { availableAt, nextPayoutRun, payoutProblem, refundShare, splitCommission } from "./earnings";

describe("earnings", () => {
  it("splits commission to the cent so the parts add up", () => {
    expect(splitCommission(40000, 20)).toEqual({ commission: 8000, net: 32000 });
    expect(splitCommission(4999, 17.5)).toEqual({ commission: 875, net: 4124 });
    expect(splitCommission(1000, 0)).toEqual({ commission: 0, net: 1000 });
  });

  it("takes back the instructor's share of a refund, never more than they earned", () => {
    expect(refundShare(20000, 40000, 32000)).toBe(16000);
    expect(refundShare(40000, 40000, 32000)).toBe(32000);
    expect(refundShare(999999, 40000, 32000)).toBe(32000);
    expect(refundShare(100, 0, 0)).toBe(0);
  });

  it("holds earnings for the set days after delivery", () => {
    expect(availableAt("2026-11-01T10:00:00.000Z", 7)).toBe("2026-11-08T10:00:00.000Z");
  });

  it("finds the next Monday or 1st of the month at 09:00 UTC", () => {
    // Sat 21 Nov 2026
    expect(nextPayoutRun("WEEKLY", new Date("2026-11-21T12:00:00Z"))).toBe("2026-11-23T09:00:00.000Z");
    // Monday before 09:00 → same day; after → next week
    expect(nextPayoutRun("WEEKLY", new Date("2026-11-23T08:00:00Z"))).toBe("2026-11-23T09:00:00.000Z");
    expect(nextPayoutRun("WEEKLY", new Date("2026-11-23T10:00:00Z"))).toBe("2026-11-30T09:00:00.000Z");
    expect(nextPayoutRun("MONTHLY", new Date("2026-11-21T12:00:00Z"))).toBe("2026-12-01T09:00:00.000Z");
    expect(nextPayoutRun("MONTHLY", new Date("2026-12-31T23:00:00Z"))).toBe("2027-01-01T09:00:00.000Z");
    expect(nextPayoutRun("MANUAL", new Date())).toBeNull();
  });

  it("explains why a payout can't be requested", () => {
    expect(payoutProblem(5000, false, false)).toMatch(/payout details/);
    expect(payoutProblem(5000, true, true)).toMatch(/already on its way/);
    expect(payoutProblem(1999, true, false)).toMatch(/\$20/);
    expect(payoutProblem(2000, true, false)).toBeNull();
  });
});
