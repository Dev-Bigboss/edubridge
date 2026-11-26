import { beforeEach, describe, expect, it } from "vitest";
import { ApiError, api } from "@/lib/api/client";
import { AdminPaymentPage } from "@/lib/api/schemas/payments";
import { db, mockSession, resetDb } from "../db";

const failure = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error("expected the request to fail");
    },
    (e) => e as ApiError,
  );
const list = (query: Record<string, string> = {}) => api("/admin/payments", { query, schema: AdminPaymentPage });
const refund = (id: string, body: unknown, key = crypto.randomUUID()) => api(`/admin/payments/${id}/refund`, { method: "POST", body, idempotencyKey: key });

describe("admin payments and refunds (PAY-5)", () => {
  beforeEach(() => {
    resetDb();
    mockSession.set("usr_admin_1");
  });

  it("lists taken payments with the learner and sums, admin-only", async () => {
    const page = await list();
    expect(page.items.map((p) => p.id)).toEqual(["pay_seed_2", "pay_seed_1"]);
    expect(page.items[0].learner).toMatchObject({ name: "Test Learner", email: "learner@example.com" });
    expect(page.sums).toEqual({ captured: 65000, refunded: 0 });
    expect((await list({ q: "mth 101" })).total).toBe(1);
    mockSession.set("usr_learner_1");
    expect((await failure(list())).status).toBe(403);
  });

  it("refunds part, then the rest, never more than was taken", async () => {
    await refund("pay_seed_2", { amount: 10000, reason: "One class was missed.", cancel_enrolment: false });
    expect(db.payments.find((p) => p.id === "pay_seed_2")).toMatchObject({ status: "PARTIALLY_REFUNDED", refunded_amount: 10000 });
    expect((await failure(refund("pay_seed_2", { amount: 40000, reason: "Too much", cancel_enrolment: false }))).fieldErrors).toHaveProperty("amount");
    await refund("pay_seed_2", { amount: 30000, reason: "Learner withdrew.", cancel_enrolment: false });
    expect(db.payments.find((p) => p.id === "pay_seed_2")!.status).toBe("REFUNDED");
    expect((await failure(refund("pay_seed_2", { amount: 1, reason: "Again please", cancel_enrolment: false }))).code).toBe("NOT_REFUNDABLE");
    expect((await list()).sums.refunded).toBe(40000);
  });

  it("a full refund can cancel the enrolment and free the seat; it notifies and audits", async () => {
    const cohort = db.cohorts.find((c) => c.id === "coh_aa_2025")!;
    const before = cohort.enrolled_count;
    expect((await failure(refund("pay_seed_2", { amount: 100, reason: "Partial with cancel", cancel_enrolment: true }))).fieldErrors).toHaveProperty("cancel_enrolment");
    await refund("pay_seed_2", { amount: 40000, reason: "Moving abroad, agreed with support.", cancel_enrolment: true });
    expect(db.enrolments.find((e) => e.id === "enr_seed_2")!.status).toBe("REFUNDED");
    expect(cohort.enrolled_count).toBe(before - 1);
    expect(db.notifications[0]).toMatchObject({ user_id: "usr_learner_1", type: "PAYMENT_REFUNDED", title: "$400 refunded" });
    expect(db.audit[0]).toMatchObject({ action: "payment.refund", target_id: "pay_seed_2" });
  });

  it("PAY-8: a retried refund with the same key refunds once", async () => {
    const body = { amount: 5000, reason: "Goodwill credit.", cancel_enrolment: false };
    await refund("pay_seed_1", body, "same-key");
    await refund("pay_seed_1", body, "same-key");
    expect(db.payments.find((p) => p.id === "pay_seed_1")!.refunded_amount).toBe(5000);
  });

  it("needs a reason", async () => {
    expect((await failure(refund("pay_seed_1", { amount: 100, reason: "", cancel_enrolment: false }))).fieldErrors).toHaveProperty("reason");
  });
});
