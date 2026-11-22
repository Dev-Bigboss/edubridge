import { beforeEach, describe, expect, it } from "vitest";
import { API_BASE_URL, ApiError, api } from "@/lib/api/client";
import { AdminPayoutList, EarningsSummary, PayoutResponse, Reconciliation } from "@/lib/api/schemas/earnings";
import { db, mockSession, resetDb } from "../db";
import { sweepEarnings } from "./earnings";

const failure = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error("expected the request to fail");
    },
    (e) => e as ApiError,
  );
const earnings = () => api("/teach/earnings", { schema: EarningsSummary });
const today = new Date().toISOString().slice(0, 10);

describe("earnings and payouts (PAY-7/8)", () => {
  beforeEach(() => {
    resetDb();
    mockSession.set("usr_instructor_1");
  });

  it("earns each captured seat minus commission; available after the hold; past payouts deducted", async () => {
    const e = await earnings();
    const seat = e.entries.find((x) => x.payment_id === "pay_seed_2")!;
    expect(seat).toMatchObject({ kind: "EARNING", gross: 40000, commission: 8000, commission_percent: 20, amount: 32000, status: "AVAILABLE" });
    expect(e.balances).toMatchObject({ available: 12000, pending: 0, paid_out_total: 20000, lifetime_net: 32000 });
    expect(e.payout_blocked_reason).toBeNull();
    // The rate is fixed when recorded: a later change doesn't touch it.
    db.settings.commission_percent = 30;
    expect((await earnings()).entries.find((x) => x.payment_id === "pay_seed_2")?.commission).toBe(8000);
  });

  it("keeps a new earning pending until the hold ends, and takes back the share of a refund", async () => {
    const p = db.payments.find((x) => x.id === "pay_seed_2")!;
    db.cohorts.find((c) => c.id === "coh_aa_2025")!.first_session_at = new Date(Date.now() - 86_400_000).toISOString(); // started yesterday
    const e1 = await earnings();
    expect(e1.balances).toMatchObject({ pending: 32000, available: -20000 });
    expect(e1.next_available_at).not.toBeNull();
    p.refunded_amount = 10000;
    p.status = "PARTIALLY_REFUNDED";
    const e2 = await earnings();
    const refund = e2.entries.find((x) => x.kind === "REFUND")!;
    expect(refund).toMatchObject({ gross: 10000, amount: -8000, commission: 2000, status: "PENDING" });
    expect(e2.balances.pending).toBe(24000);
    sweepEarnings();
    expect(db.ledger.filter((x) => x.kind === "REFUND")).toHaveLength(1); // not taken twice
  });

  it("pays out the available balance once per key, then settles; refuses below $20 or without Stripe set up", async () => {
    const first = await api("/teach/payouts", { method: "POST", idempotencyKey: "k1", schema: PayoutResponse });
    expect(first.payout).toMatchObject({ amount: 12000, status: "REQUESTED", trigger: "REQUEST" });
    const again = await api("/teach/payouts", { method: "POST", idempotencyKey: "k1", schema: PayoutResponse });
    expect(again.payout.id).toBe(first.payout.id);
    expect((await failure(api("/teach/payouts", { method: "POST", idempotencyKey: "k2" }))).code).toBe("PAYOUT_NOT_AVAILABLE");
    const e = await earnings();
    expect(e.balances).toMatchObject({ available: 0, in_flight: 12000 });

    sweepEarnings(Date.now() + 61_000);
    expect(db.payouts.find((p) => p.id === first.payout.id)).toMatchObject({ status: "PAID", reference: expect.stringMatching(/^tr_/) });

    resetDb();
    mockSession.set("usr_instructor_1");
    db.onboarding.usr_instructor_1 = { completed_steps: [], sections: { payout: { status: "PENDING" } } } as never;
    expect((await earnings()).payout_blocked_reason).toMatch(/payout details/);
  });

  it("runs scheduled payouts and moves the next run", async () => {
    await api("/teach/payout-schedule", { method: "PUT", body: { schedule: "WEEKLY" } });
    expect(db.payoutSchedules.usr_instructor_1.next_run_at).toMatch(/T09:00:00/);
    db.payoutSchedules.usr_instructor_1.next_run_at = new Date(Date.now() - 1000).toISOString();
    await earnings();
    const scheduled = db.payouts.find((p) => p.trigger === "SCHEDULE");
    expect(scheduled?.amount).toBe(12000);
    expect(Date.parse(db.payoutSchedules.usr_instructor_1.next_run_at!)).toBeGreaterThan(Date.now());
  });

  it("gives admins payouts and a reconciliation that adds up, also as CSV (audited)", async () => {
    await earnings(); // record the earnings
    mockSession.set("usr_admin_1");
    const list = await api("/admin/payouts", { schema: AdminPayoutList });
    expect(list.items[0]).toMatchObject({ instructor: { name: "Test Instructor" }, status: "PAID" });
    expect(list.totals.paid).toBe(20000);

    const r = await api("/admin/reconciliation", { query: { from: "2020-01-01", to: today }, schema: Reconciliation });
    expect(r.totals.captured).toBe(40000 + 25000);
    expect(r.totals.commission + r.totals.instructor_earnings).toBe(r.totals.net_revenue);
    expect(r.instructors.map((i) => [i.name, i.balance])).toEqual([
      ["Demo Instructor Two", 20000],
      ["Test Instructor", 12000],
    ]);
    const csv = await fetch(`${API_BASE_URL}/admin/reconciliation?from=2020-01-01&to=${today}&format=csv`, { credentials: "include" }).then((x) => x.text());
    expect(csv.split("\n")[0]).toBe("section,name,earned_usd,refunded_usd,paid_out_usd,balance_usd");
    expect(csv).toContain('instructor,"Test Instructor",320.00,0.00,200.00,120.00');
    expect(db.audit[0].action).toBe("report.exported");
    expect((await failure(api("/admin/reconciliation", { query: { from: today, to: "2020-01-01" } }))).status).toBe(422);
    mockSession.set("usr_instructor_1");
    expect((await failure(api("/admin/payouts"))).status).toBe(403);
  });
});
