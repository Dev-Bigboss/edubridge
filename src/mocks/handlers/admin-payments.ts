import { delay } from "msw";
import { http, HttpResponse } from "msw/http";
import { RefundRequest } from "@/lib/api/schemas/payments";
import { refundable } from "@/lib/domain/checkout";
import { formatMoney } from "@/lib/domain/money";
import { audit, db, findUser, notify, save, sendMail } from "../db";
import { omit } from "./catalog";
import { refundPayment } from "./checkout";
import { apiError, requireUser, url, validationError } from "./util";

const PAGE = 25;
/** PAY-8: a retried refund with the same Idempotency-Key returns the first result. */
const done = new Map<string, { payment: ReturnType<typeof row> }>();

function row(p: (typeof db.payments)[number]) {
  const enrolment = db.enrolments.find((e) => e.id === p.enrolment_id);
  const learner = findUser(p.learner_id);
  return {
    ...omit(omit(p, "mock"), "idempotency_key"),
    learner: { id: p.learner_id, name: learner?.name ?? "Deleted user", email: learner?.email ?? "" },
    enrolment_status: enrolment?.status ?? null,
    cohort_id: enrolment?.cohort_id ?? null,
  };
}

export const adminPaymentHandlers = [
  http.get(url("/admin/payments"), async ({ request }) => {
    await delay(250);
    const admin = requireUser("ADMIN");
    if (admin instanceof Response) return admin;
    const p = new URL(request.url).searchParams;
    const q = p.get("q")?.trim().toLowerCase();
    const list = db.payments
      // Abandoned checkouts never took money; they'd only add noise here.
      .filter((x) => x.status !== "VOIDED" && x.status !== "PENDING")
      .map(row)
      .filter((x) => !q || [x.learner.name, x.learner.email, x.description, x.receipt_number ?? "", x.id].some((s) => s.toLowerCase().includes(q)))
      .filter((x) => !p.get("status") || x.status === p.get("status"))
      .filter((x) => !p.get("from") || x.created_at.slice(0, 10) >= p.get("from")!)
      .filter((x) => !p.get("to") || x.created_at.slice(0, 10) <= p.get("to")!)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const cursor = p.get("cursor");
    const start = cursor ? list.findIndex((x) => x.id === cursor) + 1 : 0;
    const items = list.slice(start, start + PAGE);
    const taken = list.filter((x) => x.captured_at);
    return HttpResponse.json({
      items,
      next_cursor: start + PAGE < list.length ? items.at(-1)!.id : null,
      total: list.length,
      sums: {
        captured: taken.reduce((s, x) => s + x.breakdown.total, 0),
        refunded: taken.reduce((s, x) => s + x.refunded_amount, 0),
      },
    });
  }),

  /** PAY-5: full or partial refund to the original payment method. Audited, learner notified. */
  http.post(url("/admin/payments/:id/refund"), async ({ params, request }) => {
    await delay(500);
    const admin = requireUser("ADMIN");
    if (admin instanceof Response) return admin;
    const key = request.headers.get("Idempotency-Key");
    if (!key) return apiError(400, "IDEMPOTENCY_KEY_REQUIRED", "Missing Idempotency-Key header.");
    const previous = done.get(key);
    if (previous) return HttpResponse.json(previous);

    const payment = db.payments.find((x) => x.id === params.id);
    if (!payment) return apiError(404, "NOT_FOUND", "That payment doesn't exist.");
    const parsed = RefundRequest.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const { amount, reason, cancel_enrolment } = parsed.data;
    const left = refundable(payment);
    if (left === 0) return apiError(409, "NOT_REFUNDABLE", "Nothing left to refund on this payment.");
    if (amount > left) {
      const max = formatMoney({ amount: left, currency: payment.breakdown.currency });
      return apiError(422, "VALIDATION_FAILED", `You can refund up to ${max}.`, { amount: [`You can refund up to ${max}.`] });
    }
    const full = amount === left;
    if (cancel_enrolment && !payment.enrolment_id) {
      return apiError(422, "VALIDATION_FAILED", "Only cohort seats have an enrolment to cancel.", { cancel_enrolment: ["Only for cohort seats."] });
    }
    if (cancel_enrolment && !full) {
      return apiError(422, "VALIDATION_FAILED", "Cancel the enrolment only with a full refund.", { cancel_enrolment: ["Only with a full refund."] });
    }

    refundPayment(payment, amount);
    const enrolment = db.enrolments.find((e) => e.id === payment.enrolment_id);
    if (cancel_enrolment && enrolment?.status === "CONFIRMED") {
      enrolment.status = "REFUNDED";
      const cohort = db.cohorts.find((c) => c.id === enrolment.cohort_id);
      if (cohort) {
        cohort.enrolled_count = Math.max(0, cohort.enrolled_count - 1);
        // A freed seat reopens a full cohort while enrolment is still possible.
        if (cohort.status === "FULL" && new Date(cohort.enrolment_deadline) > new Date()) cohort.status = "OPEN";
      }
    }
    const money = formatMoney({ amount, currency: payment.breakdown.currency });
    const learner = findUser(payment.learner_id);
    notify(payment.learner_id, {
      type: "PAYMENT_REFUNDED",
      title: `${money} refunded`,
      body: `${payment.description}: ${reason}${cancel_enrolment ? " Your enrolment has been cancelled." : ""} It can take 5 to 10 working days to reach your card.`,
      link: "/learn/payments",
    });
    if (learner) sendMail(learner.email, `Refund of ${money}`, "/learn/payments");
    audit(admin, "payment.refund", "payment", payment.id, `Refunded ${money} of ${payment.receipt_number ?? payment.id} to ${learner?.name ?? "learner"}${cancel_enrolment ? " and cancelled the enrolment" : ""}. Reason: ${reason}`);
    save();
    const body = { payment: row(payment) };
    done.set(key, body);
    return HttpResponse.json(body);
  }),
];
