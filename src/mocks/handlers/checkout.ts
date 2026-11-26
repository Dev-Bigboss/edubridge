import { delay } from "msw";
import { http, HttpResponse } from "msw/http";
import type { Cohort } from "@/lib/api/schemas/cohort";
import type { Enrolment, Payment } from "@/lib/api/schemas/payments";
import { seatBreakdown } from "@/lib/domain/checkout";
import { canEnrol } from "@/lib/domain/cohort-machine";
import { formatMoney } from "@/lib/domain/money";
import { resolvePrice } from "@/lib/domain/pricing";
import { db, findUser, newId, notify, save, sendMail } from "../db";
import { cancelBookingCheckout, settleBookingPayment } from "./bookings";
import { VISIBLE_COHORTS, omit, published, toCard, toPublicCohort } from "./catalog";
import { apiError, blockWhileImpersonating, requireUser, url } from "./util";

type StoredPayment = (typeof db.payments)[number];

/** PAY-6: sequential, never reused. */
export const nextReceiptNumber = (nowIso: string) =>
  `EB-${nowIso.slice(0, 4)}-${String(db.payments.filter((p) => p.receipt_number).length + 1).padStart(5, "0")}`;

/** How long the mock gateway's "webhook" takes to arrive after the learner pays. */
export const MOCK_WEBHOOK_DELAY_MS = 1500;

function findCohort(id: string) {
  const cohort = db.cohorts.find((c) => c.id === id && VISIBLE_COHORTS.has(c.status));
  const training = cohort && published().find((t) => t.id === cohort.training_id);
  return cohort && training ? { cohort, training } : null;
}

const enrolled = (learnerId: string, cohortId: string) =>
  db.enrolments.some((e) => e.learner_id === learnerId && e.cohort_id === cohortId && e.status === "CONFIRMED");

function blockFor(cohort: Cohort, learnerId: string) {
  if (enrolled(learnerId, cohort.id)) return "ALREADY_ENROLLED" as const;
  const check = canEnrol({
    status: cohort.status,
    capacity: cohort.capacity,
    enrolledCount: cohort.enrolled_count,
    enrolmentDeadlineUtc: cohort.enrolment_deadline,
  });
  return check.ok ? null : check.reason;
}

/** PAY-5: refunds go back to the original payment method. Full refunds mark the payment REFUNDED. */
export function refundPayment(payment: StoredPayment, amount: number) {
  payment.refunded_amount = Math.min(payment.breakdown.total, payment.refunded_amount + amount);
  payment.status = payment.refunded_amount >= payment.breakdown.total ? "REFUNDED" : "PARTIALLY_REFUNDED";
}

/**
 * The backend does this when Stripe's `checkout.session.completed` (or `payment_failed`)
 * webhook arrives, never when the browser comes back (PAY-2). The mock applies it on the first
 * read after the simulated delay.
 */
export function settle(payment: StoredPayment) {
  if (payment.status !== "PENDING" || !payment.mock || new Date(payment.mock.settles_at) > new Date()) return;
  if (payment.booking_id) {
    settleBookingPayment(payment, payment.mock.outcome);
    delete payment.mock;
    save();
    return;
  }
  const enrolment = db.enrolments.find((e) => e.id === payment.enrolment_id)!;
  const cohort = db.cohorts.find((c) => c.id === enrolment.cohort_id)!;
  const learner = findUser(payment.learner_id);
  const now = new Date().toISOString();
  if (payment.mock.outcome === "decline") {
    payment.status = "FAILED";
    payment.failure_message = "Your card was declined. Nothing was charged.";
    enrolment.status = "CANCELLED";
    notify(payment.learner_id, {
      type: "PAYMENT_FAILED",
      title: "Payment didn't go through",
      body: `Your card was declined for ${payment.description}. Nothing was charged; you can try again.`,
      link: `/checkout/cohort/${enrolment.cohort_id}`,
    });
  } else {
    payment.status = "CAPTURED";
    payment.captured_at = now;
    payment.method = "Visa ending 4242";
    // PAY-6: sequential, never reused. The backend renders the PDF and emails it.
    payment.receipt_number = nextReceiptNumber(now);
    // receipt_url (the emailed PDF) comes from the backend; the demo can't render PDFs.
    if (cohort.enrolled_count >= cohort.capacity || !["OPEN", "FULL"].includes(cohort.status)) {
      // Someone took the last seat while this learner was on the payment page.
      refundPayment(payment, payment.breakdown.total);
      payment.failure_message = "The last seat was taken while you were paying, so we refunded you in full.";
      enrolment.status = "REFUNDED";
      notify(payment.learner_id, {
        type: "PAYMENT_REFUNDED",
        title: "Refunded: the cohort filled up",
        body: `The last seat in ${payment.description} was taken while you were paying. We refunded you in full.`,
        link: "/learn/payments",
      });
    } else {
      enrolment.status = "CONFIRMED";
      enrolment.confirmed_at = now;
      cohort.enrolled_count++;
      if (cohort.enrolled_count >= cohort.capacity) cohort.status = "FULL";
      if (learner) sendMail(learner.email, `You're enrolled: ${payment.description}`, `/checkout/return?payment_id=${payment.id}`);
      notify(payment.learner_id, {
        type: "PAYMENT_SUCCEEDED",
        title: `You're enrolled: ${payment.description}`,
        body: `We received ${formatMoney({ amount: payment.breakdown.total, currency: payment.breakdown.currency })}. Your receipt is in Payments.`,
        link: "/learn/trainings",
      });
    }
  }
  delete payment.mock;
  save();
}

const publicPayment = (p: StoredPayment): Payment => omit(omit(p, "mock"), "idempotency_key");

export const checkoutHandlers = [
  /** PRC-7: the learner's quote for one seat, and whether they can buy it right now. */
  http.get(url("/checkout/cohorts/:id"), async ({ params }) => {
    await delay(250);
    const user = requireUser("LEARNER");
    if (user instanceof Response) return user;
    const found = findCohort(params.id as string);
    if (!found) return apiError(404, "NOT_FOUND", "That cohort isn't available. It may have been cancelled.");
    const now = new Date();
    const price = resolvePrice(found.training, db.pricingRules, { instructorId: found.cohort.instructor_id, at: now });
    return HttpResponse.json({
      cohort: toPublicCohort(found.training, found.cohort, now),
      training: omit(toCard(found.training, now), "keywords"),
      breakdown: price ? seatBreakdown(price) : null,
      blocked: price ? blockFor(found.cohort, user.id) : "NO_PRICE",
    });
  }),

  /** PAY-1/2: create the gateway session. Same Idempotency-Key, same session (PAY-8). */
  http.post(url("/checkout/sessions"), async ({ request }) => {
    await delay(500);
    const user = requireUser("LEARNER");
    if (user instanceof Response) return user;
    const blocked0 = blockWhileImpersonating();
    if (blocked0) return blocked0;
    const key = request.headers.get("Idempotency-Key");
    if (!key) return apiError(400, "IDEMPOTENCY_KEY_REQUIRED", "Missing Idempotency-Key header.");
    const again = db.payments.find((p) => p.idempotency_key === key && p.learner_id === user.id);
    if (again) return HttpResponse.json({ payment: publicPayment(again), checkout_url: `/mock-gateway?payment_id=${again.id}` }, { status: 201 });

    const { cohort_id } = (await request.json()) as { cohort_id?: string };
    const found = findCohort(cohort_id ?? "");
    if (!found) return apiError(404, "NOT_FOUND", "That cohort isn't available. It may have been cancelled.");
    const now = new Date();
    const price = resolvePrice(found.training, db.pricingRules, { instructorId: found.cohort.instructor_id, at: now });
    const blocked = price ? blockFor(found.cohort, user.id) : "NO_PRICE";
    if (blocked) {
      const messages = {
        ALREADY_ENROLLED: "You're already enrolled in this cohort.",
        FULL: "This cohort has just filled up.",
        NOT_OPEN: "This cohort isn't open for enrolment.",
        DEADLINE_PASSED: "Enrolment for this cohort has closed.",
        NO_PRICE: "This cohort can't be bought yet. Please try again later.",
      } as const;
      return apiError(409, blocked, messages[blocked]);
    }
    // A learner who starts again abandons the earlier unpaid attempt.
    for (const p of db.payments.filter((x) => x.learner_id === user.id && x.status === "PENDING" && !x.mock)) {
      const e = db.enrolments.find((x) => x.id === p.enrolment_id);
      if (e?.cohort_id === found.cohort.id) {
        p.status = "VOIDED";
        e.status = "CANCELLED";
      }
    }
    const breakdown = seatBreakdown(price!);
    const created_at = now.toISOString();
    const enrolment: Enrolment = {
      id: newId("enr"),
      learner_id: user.id,
      training_id: found.training.id,
      cohort_id: found.cohort.id,
      status: "PENDING_PAYMENT",
      price: breakdown.unit_price,
      payment_id: newId("pay"),
      created_at,
      confirmed_at: null,
    };
    const payment: StoredPayment = {
      id: enrolment.payment_id,
      learner_id: user.id,
      enrolment_id: enrolment.id,
      description: `${found.training.title} · ${found.cohort.name}`,
      breakdown,
      status: "PENDING",
      method: null,
      failure_message: null,
      refunded_amount: 0,
      created_at,
      captured_at: null,
      booking_id: null,
      receipt_number: null,
      receipt_url: null,
      idempotency_key: key,
    };
    db.enrolments.push(enrolment);
    db.payments.push(payment);
    save();
    return HttpResponse.json({ payment: publicPayment(payment), checkout_url: `/mock-gateway?payment_id=${payment.id}` }, { status: 201 });
  }),

  /** PAY-2: polled by the return page until the webhook has confirmed or failed the payment. */
  http.get(url("/payments/:id"), async ({ params }) => {
    await delay(200);
    const user = requireUser();
    if (user instanceof Response) return user;
    const payment = db.payments.find((p) => p.id === params.id);
    if (!payment || (payment.learner_id !== user.id && user.role !== "ADMIN")) return apiError(404, "NOT_FOUND", "We couldn't find that payment.");
    settle(payment);
    const enrolment = db.enrolments.find((e) => e.id === payment.enrolment_id) ?? null;
    const booking = db.bookings.find((b) => b.id === payment.booking_id);
    const training = db.trainings.find((t) => t.id === (enrolment?.training_id ?? booking?.training_id));
    return HttpResponse.json({ payment: publicPayment(payment), enrolment, cohort_id: enrolment?.cohort_id ?? null, training_slug: training?.slug ?? "" });
  }),

  /* ---------- mock gateway (stands in for Stripe's hosted page; mock mode only) ---------- */
  http.get(url("/mock/gateway/:id"), async ({ params }) => {
    await delay(150);
    const payment = db.payments.find((p) => p.id === params.id);
    if (!payment) return apiError(404, "NOT_FOUND", "Unknown checkout session.");
    // Like Stripe's success_url and cancel_url, set when the session was created.
    const booking = db.bookings.find((b) => b.id === payment.booking_id);
    const enrolment = db.enrolments.find((e) => e.id === payment.enrolment_id);
    const urls = booking
      ? {
          success_url: `/learn/bookings/${booking.id}`,
          cancel_url: `/learn/book/${db.trainings.find((t) => t.id === booking.training_id)?.slug}?instructor=${booking.instructor_id}&cancelled=1`,
        }
      : { success_url: `/checkout/return?payment_id=${payment.id}`, cancel_url: `/checkout/cohort/${enrolment?.cohort_id}?cancelled=1` };
    return HttpResponse.json({
      payment: publicPayment(payment),
      ...urls,
      authorise_only: !!booking,
      total: formatMoney({ amount: payment.breakdown.total, currency: payment.breakdown.currency }),
    });
  }),

  http.post(url("/mock/gateway/:id/:outcome"), async ({ params }) => {
    await delay(700);
    const payment = db.payments.find((p) => p.id === params.id);
    if (!payment || payment.status !== "PENDING" || payment.mock) return apiError(409, "SESSION_CLOSED", "This checkout session has already finished.");
    const outcome = params.outcome as string;
    if (outcome === "cancel") {
      payment.status = "VOIDED";
      if (payment.booking_id) cancelBookingCheckout(payment);
      else db.enrolments.find((e) => e.id === payment.enrolment_id)!.status = "CANCELLED";
    } else if (outcome === "success" || outcome === "decline") {
      payment.mock = { outcome, settles_at: new Date(Date.now() + MOCK_WEBHOOK_DELAY_MS).toISOString() };
    } else return apiError(404, "NOT_FOUND", "Unknown outcome.");
    save();
    return HttpResponse.json({ ok: true });
  }),
];
