import { delay } from "msw";
import { http, HttpResponse } from "msw/http";
import { ScheduleInput, type AdminPayout, type EarningsSummary, type LedgerEntry, type Payout, type Reconciliation } from "@/lib/api/schemas/earnings";
import { availableAt, MIN_PAYOUT_CENTS, nextPayoutRun, payoutProblem, refundShare, splitCommission } from "@/lib/domain/earnings";
import { audit, db, findUser, newId, notify, save, type MockUser, type StoredLedgerEntry, type StoredPayout } from "../db";
import { toCsv } from "@/lib/domain/reports";
import { apiError, blockWhileImpersonating, requireUser, url } from "./util";

const CAPTURED = new Set(["CAPTURED", "PARTIALLY_REFUNDED", "REFUNDED"]);
/** Mock transfers arrive a minute after they're requested. */
const SETTLE_MS = 60_000;

/** Who earned a payment, and when the teaching happened (1:1 session end, or the cohort's first class). */
function source(p: (typeof db.payments)[number]): { instructor_id: string; delivered_at: string; what: string } | null {
  if (p.booking_id) {
    const b = db.bookings.find((x) => x.id === p.booking_id);
    if (!b) return null;
    return { instructor_id: b.instructor_id, delivered_at: b.end_utc, what: `One-on-one with ${findUser(b.learner_id)?.name ?? "a learner"}` };
  }
  const e = db.enrolments.find((x) => x.id === p.enrolment_id);
  const c = e && db.cohorts.find((x) => x.id === e.cohort_id);
  if (!e || !c) return null;
  return { instructor_id: c.instructor_id, delivered_at: c.first_session_at, what: `Seat in ${c.name} (${findUser(e.learner_id)?.name ?? "a learner"})` };
}

/**
 * PAY-7 job, run on reads in the mock: record an earning for every captured payment (commission at the
 * rate in force now, which is capture time for new payments), take back refunded shares, settle due
 * transfers and run scheduled payouts. The backend does the first two from Stripe webhooks.
 */
export function sweepEarnings(now = Date.now()) {
  const hold = db.settings.earnings_hold_days;
  for (const p of db.payments) {
    if (!CAPTURED.has(p.status)) continue;
    const src = source(p);
    if (!src) continue;
    let earning = db.ledger.find((x) => x.kind === "EARNING" && x.payment_id === p.id);
    if (!earning) {
      const gross = p.breakdown.total;
      const percent = db.settings.commission_percent;
      const { commission, net } = splitCommission(gross, percent);
      earning = {
        id: newId("led"), instructor_id: src.instructor_id, kind: "EARNING", description: src.what, payment_id: p.id, payout_id: null,
        gross, commission, commission_percent: percent, amount: net, available_at: availableAt(src.delivered_at, hold), created_at: p.captured_at ?? new Date(now).toISOString(),
      };
      db.ledger.push(earning);
    }
    const refundedGross = db.ledger.filter((x) => x.kind === "REFUND" && x.payment_id === p.id).reduce((n, x) => n + (x.gross ?? 0), 0);
    const delta = p.refunded_amount - refundedGross;
    if (delta > 0) {
      const takenBefore = -db.ledger.filter((x) => x.kind === "REFUND" && x.payment_id === p.id).reduce((n, x) => n + x.amount, 0);
      const share = refundShare(p.refunded_amount, earning.gross!, earning.amount) - takenBefore;
      const nowIso = new Date(now).toISOString();
      db.ledger.push({
        id: newId("led"), instructor_id: src.instructor_id, kind: "REFUND", description: `Refund: ${src.what}`, payment_id: p.id, payout_id: null,
        gross: delta, commission: delta - share, commission_percent: earning.commission_percent, amount: -share,
        // Still pending earnings are reduced while pending; available ones are reduced straight away.
        available_at: Date.parse(earning.available_at) > now ? earning.available_at : nowIso, created_at: nowIso,
      });
    }
  }
  for (const po of db.payouts) {
    if (po.status === "REQUESTED" && po.settles_at && Date.parse(po.settles_at) <= now) {
      Object.assign(po, { status: "PAID", paid_at: po.settles_at, reference: `tr_mock_${po.id.slice(-6)}`, settles_at: null });
      notify(po.instructor_id, { type: "PAYMENT_SUCCEEDED", title: "Payout sent", body: `$${(po.amount / 100).toFixed(2)} is on its way to your bank account.`, link: "/teach/earnings" });
    }
  }
  for (const [instructorId, s] of Object.entries(db.payoutSchedules)) {
    if (!s.next_run_at || Date.parse(s.next_run_at) > now) continue;
    const user = findUser(instructorId);
    if (user && !problemFor(user, now)) createPayout(user, "SCHEDULE", now);
    s.next_run_at = nextPayoutRun(s.schedule, new Date(now));
  }
}

const isAvailable = (e: StoredLedgerEntry, now: number) => Date.parse(e.available_at) <= now;
const ledgerOf = (id: string) => db.ledger.filter((e) => e.instructor_id === id);

function balances(instructorId: string, now = Date.now()) {
  const entries = ledgerOf(instructorId);
  const sum = (list: StoredLedgerEntry[]) => list.reduce((n, e) => n + e.amount, 0);
  const payouts = db.payouts.filter((p) => p.instructor_id === instructorId);
  return {
    pending: sum(entries.filter((e) => !isAvailable(e, now))),
    available: sum(entries.filter((e) => isAvailable(e, now))),
    in_flight: payouts.filter((p) => p.status === "REQUESTED").reduce((n, p) => n + p.amount, 0),
    paid_out_total: payouts.filter((p) => p.status === "PAID").reduce((n, p) => n + p.amount, 0),
    lifetime_net: sum(entries.filter((e) => e.kind === "EARNING" || e.kind === "REFUND")),
  };
}

export function payoutAccountStatus(user: MockUser): "NOT_STARTED" | "PENDING" | "COMPLETE" {
  const saved = (db.onboarding[user.id]?.sections as { payout?: { status?: "NOT_STARTED" | "PENDING" | "COMPLETE" } } | undefined)?.payout?.status;
  return saved ?? (user.onboarding_status === "COMPLETED" ? "COMPLETE" : "NOT_STARTED");
}

function problemFor(user: MockUser, now = Date.now()) {
  const b = balances(user.id, now);
  return payoutProblem(b.available, payoutAccountStatus(user) === "COMPLETE", b.in_flight > 0);
}

/** Pays out the whole available balance: a PAYOUT ledger line now, the transfer settles later. */
function createPayout(user: MockUser, trigger: StoredPayout["trigger"], now = Date.now()): StoredPayout {
  const amount = balances(user.id, now).available;
  const at = new Date(now).toISOString();
  const po: StoredPayout = { id: newId("po"), instructor_id: user.id, amount, status: "REQUESTED", trigger, requested_at: at, paid_at: null, failure_reason: null, reference: null, settles_at: new Date(now + SETTLE_MS).toISOString() };
  db.payouts.push(po);
  db.ledger.push({ id: newId("led"), instructor_id: user.id, kind: "PAYOUT", description: "Payout to your bank account", payment_id: null, payout_id: po.id, gross: null, commission: null, commission_percent: null, amount: -amount, available_at: at, created_at: at });
  return po;
}

const toEntry = (e: StoredLedgerEntry, now: number): LedgerEntry => {
  const { instructor_id, ...rest } = e;
  void instructor_id;
  return { ...rest, status: isAvailable(e, now) ? "AVAILABLE" : "PENDING" };
};
const toPayout = (p: StoredPayout): Payout => ({ id: p.id, amount: p.amount, currency: "USD", status: p.status, trigger: p.trigger, requested_at: p.requested_at, paid_at: p.paid_at, failure_reason: p.failure_reason, reference: p.reference });

function summary(user: MockUser, now = Date.now()): EarningsSummary {
  const entries = ledgerOf(user.id).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const next = entries.filter((e) => !isAvailable(e, now) && e.amount > 0).map((e) => e.available_at).sort()[0] ?? null;
  const schedule = db.payoutSchedules[user.id] ?? { schedule: "MANUAL" as const, next_run_at: null };
  return {
    currency: "USD",
    balances: balances(user.id, now),
    next_available_at: next,
    commission_percent: db.settings.commission_percent,
    hold_days: db.settings.earnings_hold_days,
    min_payout: MIN_PAYOUT_CENTS,
    payout_account_status: payoutAccountStatus(user),
    schedule,
    payout_blocked_reason: problemFor(user, now),
    entries: entries.map((e) => toEntry(e, now)),
    payouts: db.payouts.filter((p) => p.instructor_id === user.id).sort((a, b) => b.requested_at.localeCompare(a.requested_at)).map(toPayout),
  };
}

const inRange = (iso: string | null, from: string, to: string) => !!iso && iso.slice(0, 10) >= from && iso.slice(0, 10) <= to;
const money = (n: number) => (n / 100).toFixed(2);

function reconciliation(from: string, to: string): Reconciliation {
  const entries = db.ledger.filter((e) => inRange(e.created_at, from, to));
  const earnings = entries.filter((e) => e.kind === "EARNING");
  const refunds = entries.filter((e) => e.kind === "REFUND");
  const paid = db.payouts.filter((p) => p.status === "PAID" && inRange(p.paid_at, from, to));
  const sum = (list: { gross?: number | null; commission?: number | null; amount?: number }[], k: "gross" | "commission" | "amount") => list.reduce((n, e) => n + ((e[k] as number | null) ?? 0), 0);
  const instructorIds = [...new Set([...earnings, ...refunds].map((e) => e.instructor_id).concat(paid.map((p) => p.instructor_id)))];
  const now = Date.now();
  const owed = [...new Set(db.ledger.map((e) => e.instructor_id))].reduce((n, id) => {
    const b = balances(id, now);
    return n + b.pending + b.available;
  }, 0);
  return {
    from, to, currency: "USD",
    totals: {
      captured: sum(earnings, "gross"),
      refunded: sum(refunds, "gross"),
      net_revenue: sum(earnings, "gross") - sum(refunds, "gross"),
      commission: sum(earnings, "commission") - sum(refunds, "commission"),
      instructor_earnings: sum(earnings, "amount") + sum(refunds, "amount"),
      paid_out: paid.reduce((n, p) => n + p.amount, 0),
      owed_to_instructors: owed,
    },
    instructors: instructorIds
      .map((id) => ({
        instructor_id: id,
        name: findUser(id)?.name ?? "Instructor",
        earned: sum(earnings.filter((e) => e.instructor_id === id), "amount"),
        refunded: -sum(refunds.filter((e) => e.instructor_id === id), "amount"),
        paid_out: paid.filter((p) => p.instructor_id === id).reduce((n, p) => n + p.amount, 0),
        balance: (() => { const b = balances(id, now); return b.pending + b.available; })(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export const earningsHandlers = [
  http.get(url("/teach/earnings"), async () => {
    await delay(200);
    const user = requireUser("INSTRUCTOR");
    if (user instanceof Response) return user;
    sweepEarnings();
    save();
    return HttpResponse.json(summary(user));
  }),

  /** Pay out the whole available balance now (Idempotency-Key: a repeat returns the same payout). */
  http.post(url("/teach/payouts"), async ({ request }) => {
    await delay(350);
    const user = requireUser("INSTRUCTOR");
    if (user instanceof Response) return user;
    const readOnly = blockWhileImpersonating();
    if (readOnly) return readOnly;
    sweepEarnings();
    const key = request.headers.get("Idempotency-Key");
    const repeat = key && db.payouts.find((p) => p.instructor_id === user.id && (p as StoredPayout & { idempotency_key?: string }).idempotency_key === key);
    if (repeat) return HttpResponse.json({ payout: toPayout(repeat) });
    const problem = problemFor(user);
    if (problem) return apiError(409, "PAYOUT_NOT_AVAILABLE", problem);
    const po = Object.assign(createPayout(user, "REQUEST"), key ? { idempotency_key: key } : {});
    save();
    return HttpResponse.json({ payout: toPayout(po) }, { status: 201 });
  }),

  http.put(url("/teach/payout-schedule"), async ({ request }) => {
    await delay(200);
    const user = requireUser("INSTRUCTOR");
    if (user instanceof Response) return user;
    const readOnly = blockWhileImpersonating();
    if (readOnly) return readOnly;
    const parsed = ScheduleInput.safeParse(await request.json());
    if (!parsed.success) return apiError(422, "VALIDATION_FAILED", "Choose how often to be paid.", { schedule: ["Choose how often to be paid."] });
    db.payoutSchedules[user.id] = { schedule: parsed.data.schedule, next_run_at: nextPayoutRun(parsed.data.schedule, new Date()) };
    save();
    return HttpResponse.json({ schedule: db.payoutSchedules[user.id] });
  }),

  /* ---------- Admin (PAY-7/8) ---------- */
  http.get(url("/admin/payouts"), async ({ request }) => {
    await delay(200);
    const admin = requireUser("ADMIN");
    if (admin instanceof Response) return admin;
    sweepEarnings();
    const status = new URL(request.url).searchParams.get("status");
    const all = db.payouts.filter((p) => !status || p.status === status).sort((a, b) => b.requested_at.localeCompare(a.requested_at));
    const items: AdminPayout[] = all.map((p) => ({ ...toPayout(p), instructor: { id: p.instructor_id, name: findUser(p.instructor_id)?.name ?? "Instructor" } }));
    const total = (s: StoredPayout["status"]) => db.payouts.filter((p) => p.status === s).reduce((n, p) => n + p.amount, 0);
    return HttpResponse.json({ items, totals: { requested: total("REQUESTED"), paid: total("PAID"), failed: total("FAILED") } });
  }),

  /** PAY-8: money in and out for a period. ?format=csv downloads the same figures. */
  http.get(url("/admin/reconciliation"), async ({ request }) => {
    await delay(250);
    const admin = requireUser("ADMIN");
    if (admin instanceof Response) return admin;
    sweepEarnings();
    const q = new URL(request.url).searchParams;
    const from = q.get("from") ?? "";
    const to = q.get("to") ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
      return apiError(422, "VALIDATION_FAILED", "Choose a start date on or before the end date.", { from: ["Choose a start date on or before the end date."] });
    }
    const report = reconciliation(from, to);
    if (q.get("format") === "csv") {
      const t = report.totals;
      const csv = toCsv([
        ["section", "name", "earned_usd", "refunded_usd", "paid_out_usd", "balance_usd"],
        ...report.instructors.map((i) => ["instructor", i.name, money(i.earned), money(i.refunded), money(i.paid_out), money(i.balance)]),
        [],
        ["total", "captured_usd", "refunded_usd", "net_revenue_usd", "commission_usd", "instructor_earnings_usd", "paid_out_usd", "owed_to_instructors_usd"],
        ["total", money(t.captured), money(t.refunded), money(t.net_revenue), money(t.commission), money(t.instructor_earnings), money(t.paid_out), money(t.owed_to_instructors)],
      ]);
      audit(admin, "report.exported", "report", `reconciliation:${from}:${to}`, `Exported reconciliation ${from} to ${to}`);
      save();
      return new HttpResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="reconciliation-${from}-to-${to}.csv"` } });
    }
    return HttpResponse.json(report);
  }),
];
