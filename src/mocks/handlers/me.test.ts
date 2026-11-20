import { beforeEach, describe, expect, it } from "vitest";
import { ApiError, api } from "@/lib/api/client";
import { CheckoutSession, LearnerEnrolmentList, PaymentList } from "@/lib/api/schemas/payments";
import { db, mockSession, resetDb } from "../db";

const failure = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error("expected the request to fail");
    },
    (e) => e as ApiError,
  );
const enrolments = () => api("/me/enrolments", { schema: LearnerEnrolmentList }).then((r) => r.items);
const payments = () => api("/me/payments", { schema: PaymentList }).then((r) => r.items);

describe("learner's own enrolments and payments (TRN-7, PAY-6)", () => {
  beforeEach(() => {
    resetDb();
    mockSession.set("usr_learner_1");
  });

  it("needs a learner", async () => {
    mockSession.set(null);
    expect((await failure(enrolments())).status).toBe(401);
    mockSession.set("usr_admin_1");
    expect((await failure(payments())).status).toBe(403);
  });

  it("lists enrolments including an archived training's, with the cohort", async () => {
    const items = await enrolments();
    expect(items.map((i) => i.cohort.id)).toEqual(["coh_mth_past", "coh_aa_2025"]);
    const archived = items.find((i) => i.training.status === "ARCHIVED")!;
    expect(archived.training.title).toBe("ICAN Audit and Assurance (2025 syllabus)");
    expect(archived.enrolment.price).toEqual({ amount: 40000, currency: "USD", unit: "PER_SEAT" });
  });

  it("lists paid payments with receipts, newest first, and leaves out abandoned attempts", async () => {
    const before = await payments();
    expect(before.every((p) => p.receipt_number)).toBe(true);
    expect(before.map((p) => p.created_at)).toEqual([...before.map((p) => p.created_at)].sort().reverse());

    const { payment } = await api("/checkout/sessions", { method: "POST", body: { cohort_id: "coh_mth_sem1" }, idempotencyKey: "k", schema: CheckoutSession });
    await api(`/mock/gateway/${payment.id}/cancel`, { method: "POST" });
    expect((await payments()).map((p) => p.id)).not.toContain(payment.id);
  });

  it("keeps a cancelled cohort's refunded enrolment, but not other people's", async () => {
    db.cohorts.find((c) => c.id === "coh_aa_2025")!.status = "CANCELLED";
    db.enrolments.find((e) => e.id === "enr_seed_2")!.status = "REFUNDED";
    expect((await enrolments()).find((i) => i.cohort.id === "coh_aa_2025")?.enrolment.status).toBe("REFUNDED");
    db.enrolments.forEach((e) => (e.learner_id = "someone_else"));
    expect(await enrolments()).toEqual([]);
  });
});
