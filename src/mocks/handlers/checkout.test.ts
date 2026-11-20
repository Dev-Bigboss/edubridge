import { beforeEach, describe, expect, it } from "vitest";
import { ApiError, api } from "@/lib/api/client";
import { CheckoutSession, CohortCheckout, PaymentDetail } from "@/lib/api/schemas/payments";
import { db, mockSession, resetDb } from "../db";

const failure = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error("expected the request to fail");
    },
    (e) => e as ApiError,
  );

const quote = (id: string) => api(`/checkout/cohorts/${id}`, { schema: CohortCheckout });
const start = (cohort_id: string, key = crypto.randomUUID()) =>
  api("/checkout/sessions", { method: "POST", body: { cohort_id }, idempotencyKey: key, schema: CheckoutSession });
const payment = (id: string) => api(`/payments/${id}`, { schema: PaymentDetail });
/** Pay on the mock gateway, then skip the simulated webhook delay. */
async function pay(id: string, outcome: "success" | "decline") {
  await api(`/mock/gateway/${id}/${outcome}`, { method: "POST" });
  db.payments.find((p) => p.id === id)!.mock!.settles_at = new Date(0).toISOString();
}

describe("cohort checkout mock (payments.yaml, PAY-1/2, COH-2)", () => {
  beforeEach(() => {
    resetDb();
    mockSession.set("usr_learner_1");
  });

  it("needs a signed-in learner", async () => {
    mockSession.set(null);
    expect((await failure(quote("coh_mth_sem1"))).status).toBe(401);
    mockSession.set("usr_instructor_1");
    expect((await failure(quote("coh_mth_sem1"))).status).toBe(403);
  });

  it("PRC-7: quotes the seat with every line of the breakdown", async () => {
    const q = await quote("coh_mth_sem1");
    expect(q.breakdown).toMatchObject({ subtotal: 25000, discount: 0, tax: 0, total: 25000, currency: "USD" });
    expect(q.blocked).toBeNull();
    expect((await quote("coh_sfr_weekend")).blocked).toBe("FULL");
  });

  it("PAY-2: enrols only once the webhook confirms payment, and fills the seat", async () => {
    const before = db.cohorts.find((c) => c.id === "coh_mth_sem1")!.enrolled_count;
    const { payment: p, checkout_url } = await start("coh_mth_sem1");
    expect(checkout_url).toBe(`/mock-gateway?payment_id=${p.id}`);
    expect(p.status).toBe("PENDING");

    await api(`/mock/gateway/${p.id}/success`, { method: "POST" });
    expect((await payment(p.id)).payment.status).toBe("PENDING"); // webhook not here yet
    db.payments.find((x) => x.id === p.id)!.mock!.settles_at = new Date(0).toISOString();

    const done = await payment(p.id);
    expect(done.payment).toMatchObject({ status: "CAPTURED", method: "Visa ending 4242" });
    expect(done.enrolment).toMatchObject({ status: "CONFIRMED", price: { amount: 25000 } });
    expect(done.training_slug).toBe("mth-101-elementary-mathematics-i");
    expect(db.cohorts.find((c) => c.id === "coh_mth_sem1")!.enrolled_count).toBe(before + 1);
    expect(db.outbox[0].subject).toContain("You're enrolled");
    expect((await quote("coh_mth_sem1")).blocked).toBe("ALREADY_ENROLLED");
    expect((await failure(start("coh_mth_sem1"))).code).toBe("ALREADY_ENROLLED");
  });

  it("a declined card leaves no enrolment and the learner can try again", async () => {
    const { payment: p } = await start("coh_mth_sem1");
    await pay(p.id, "decline");
    const done = await payment(p.id);
    expect(done.payment).toMatchObject({ status: "FAILED", failure_message: "Your card was declined. Nothing was charged." });
    expect(done.enrolment.status).toBe("CANCELLED");
    expect((await quote("coh_mth_sem1")).blocked).toBeNull();
  });

  it("PAY-8: the same Idempotency-Key returns the same session instead of a second charge", async () => {
    const a = await start("coh_mth_sem1", "key-1");
    const b = await start("coh_mth_sem1", "key-1");
    expect(b.payment.id).toBe(a.payment.id);
    expect(db.payments).toHaveLength(1);
  });

  it("refunds in full when the last seat went while the learner was paying", async () => {
    const c = db.cohorts.find((x) => x.id === "coh_mth_sem1")!;
    c.enrolled_count = c.capacity - 1;
    const first = await start("coh_mth_sem1");
    mockSession.set("usr_learner_1");
    c.enrolled_count = c.capacity; // someone else paid first
    await pay(first.payment.id, "success");
    const done = await payment(first.payment.id);
    expect(done.payment).toMatchObject({ status: "REFUNDED", refunded_amount: 25000 });
    expect(done.enrolment.status).toBe("REFUNDED");
  });

  it("fills the cohort with the last seat, and only the payer (or an admin) can read a payment", async () => {
    const c = db.cohorts.find((x) => x.id === "coh_mth_sem1")!;
    c.enrolled_count = c.capacity - 1;
    const { payment: p } = await start("coh_mth_sem1");
    await pay(p.id, "success");
    await payment(p.id);
    expect(c.status).toBe("FULL");
    mockSession.set("usr_instructor_1");
    expect((await failure(payment(p.id))).status).toBe(404);
  });

  it("leaving the gateway voids the attempt", async () => {
    const { payment: p } = await start("coh_mth_sem1");
    await api(`/mock/gateway/${p.id}/cancel`, { method: "POST" });
    expect((await payment(p.id)).payment.status).toBe("VOIDED");
    expect((await failure(api(`/mock/gateway/${p.id}/success`, { method: "POST" }))).code).toBe("SESSION_CLOSED");
  });
});
