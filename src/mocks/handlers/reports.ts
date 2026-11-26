import { delay } from "msw";
import { http, HttpResponse } from "msw/http";
import type { AdminDashboard } from "@/lib/api/schemas/reports";
import { cohortSessions } from "@/lib/domain/cohort-schedule";
import { minimumShortfall } from "@/lib/domain/cohort-machine";
import { cents, DASHBOARD_PERIODS, median, REPORT_TYPES, responseHours, revenueBuckets, toCsv, type ReportType } from "@/lib/domain/reports";
import { audit, db, findUser, save } from "../db";
import { sweepEarnings } from "./earnings";
import { apiError, requireUser, url } from "./util";

const DAY = 86_400_000;
const ACTIVE_COHORTS = new Set(["OPEN", "FULL", "CLOSED", "IN_PROGRESS"]);
const within = (iso: string | null | undefined, from: number, to: number) => !!iso && Date.parse(iso) >= from && Date.parse(iso) < to;
const name = (id: string | null | undefined) => findUser(id)?.name ?? "";
const trainingTitle = (id: string) => db.trainings.find((t) => t.id === id)?.title ?? "";

function dashboard(days: number, nowMs = Date.now()): AdminDashboard {
  sweepEarnings(nowMs);
  const now = new Date(nowMs);
  const from = nowMs - days * DAY;
  const captured = db.payments.filter((p) => p.captured_at && ["CAPTURED", "PARTIALLY_REFUNDED", "REFUNDED"].includes(p.status));
  const inPeriod = captured.filter((p) => within(p.captured_at, from, nowMs + 1));
  const refunds = db.ledger.filter((e) => e.kind === "REFUND" && within(e.created_at, from, nowMs + 1));
  const earnings = db.ledger.filter((e) => e.kind === "EARNING" && within(e.created_at, from, nowMs + 1));

  const activeLearners = new Set([
    ...db.enrolments.filter((e) => e.status === "CONFIRMED" && ACTIVE_COHORTS.has(db.cohorts.find((c) => c.id === e.cohort_id)?.status ?? "")).map((e) => e.learner_id),
    ...db.bookings.filter((b) => ["ACCEPTED", "RESCHEDULE_REQUESTED"].includes(b.status) && Date.parse(b.end_utc) > nowMs).map((b) => b.learner_id),
  ]);

  const active = db.cohorts.filter((c) => ACTIVE_COHORTS.has(c.status));
  const belowMinimum = db.cohorts.filter((c) => ["OPEN", "FULL", "CLOSED"].includes(c.status) && minimumShortfall(c) > 0 && Date.parse(c.enrolment_deadline) > nowMs);

  const pending = db.bookings.filter((b) => b.status === "PENDING_INSTRUCTOR");
  const expiringSoon = pending.filter((b) => b.expires_at && Date.parse(b.expires_at) - nowMs < 6 * 3_600_000);

  // ADM-1 response times: requests that reached an instructor in the period.
  const measured = db.bookings
    .filter((b) => within(b.timeline.find((e) => e.event === "PAYMENT_AUTHORISED")?.at ?? b.created_at, from, nowMs + 1))
    .map((b) => ({ instructor_id: b.instructor_id, r: responseHours(b.timeline) }))
    .filter((x) => x.r !== null);
  const answeredHours = (list: typeof measured) => list.map((x) => x.r).filter((r): r is number => typeof r === "number");
  const instructors = [...new Set(measured.map((x) => x.instructor_id))];

  const openReports = db.messageReports.filter((r) => r.status === "OPEN").length;
  const applications = db.users.filter((u) => u.role === "INSTRUCTOR" && u.approval_status === "PENDING").length;
  const failedPayouts = db.payouts.filter((p) => p.status === "FAILED").length;
  const attention: AdminDashboard["attention"] = [
    { kind: "EXPIRING_REQUESTS" as const, count: expiringSoon.length, href: null },
    { kind: "FAILED_PAYOUTS" as const, count: failedPayouts, href: "/admin/payouts" },
    { kind: "APPLICATIONS" as const, count: applications, href: "/admin/users?approval=PENDING" },
    { kind: "MESSAGE_REPORTS" as const, count: openReports, href: "/admin/moderation" },
    { kind: "BELOW_MINIMUM" as const, count: belowMinimum.length, href: "/admin/cohorts" },
  ].filter((a) => a.count > 0);

  return {
    period: { days, from: new Date(from).toISOString(), to: now.toISOString() },
    users: {
      learners: db.users.filter((u) => u.role === "LEARNER" && u.status !== "SUSPENDED").length,
      instructors: db.users.filter((u) => u.role === "INSTRUCTOR" && u.approval_status === "APPROVED").length,
      new_in_period: db.users.filter((u) => within(u.created_at, from, nowMs + 1)).length,
    },
    enrolments: { new_in_period: db.enrolments.filter((e) => e.status === "CONFIRMED" && within(e.confirmed_at, from, nowMs + 1)).length, active_learners: activeLearners.size },
    revenue: {
      captured: inPeriod.reduce((n, p) => n + p.breakdown.total, 0),
      refunded: refunds.reduce((n, e) => n + (e.gross ?? 0), 0),
      commission: earnings.reduce((n, e) => n + (e.commission ?? 0), 0) - refunds.reduce((n, e) => n + (e.commission ?? 0), 0),
      series: revenueBuckets(days, now).map((b) => ({ ...b, captured: captured.filter((p) => within(p.captured_at, Date.parse(b.start), Date.parse(b.end))).reduce((n, p) => n + p.breakdown.total, 0) })),
    },
    cohorts: {
      active: active.length,
      starting_within_7_days: active.filter((c) => Date.parse(c.first_session_at) > nowMs && Date.parse(c.first_session_at) - nowMs < 7 * DAY).length,
      below_minimum: belowMinimum.length,
    },
    one_on_one: { pending: pending.length, expiring_within_6_hours: expiringSoon.length },
    response_times: {
      median_hours: median(answeredHours(measured)),
      answered: answeredHours(measured).length,
      expired: measured.filter((x) => x.r === "EXPIRED").length,
      by_instructor: instructors
        .map((id) => {
          const mine = measured.filter((x) => x.instructor_id === id);
          return { instructor_id: id, name: name(id), answered: answeredHours(mine).length, expired: mine.filter((x) => x.r === "EXPIRED").length, median_hours: median(answeredHours(mine)) };
        })
        .sort((a, b) => (b.median_hours ?? -1) - (a.median_hours ?? -1)),
    },
    attention,
  };
}

/** ADM-4: one CSV per report. Rows are ordered by date; money in dollars with two decimals. */
function report(type: ReportType, from: string, to: string): (string | number | null)[][] {
  const fromMs = Date.parse(`${from}T00:00:00Z`);
  const toMs = Date.parse(`${to}T00:00:00Z`) + DAY;
  const day = (iso: string | null) => (iso ? iso.slice(0, 10) : null);
  switch (type) {
    case "revenue": {
      const rows = db.ledger.filter((e) => e.kind === "EARNING" && within(e.created_at, fromMs, toMs)).sort((a, b) => a.created_at.localeCompare(b.created_at));
      return [
        ["date", "receipt", "learner", "training", "kind", "instructor", "paid_usd", "commission_percent", "commission_usd", "instructor_usd", "payment_status"],
        ...rows.map((e) => {
          const p = db.payments.find((x) => x.id === e.payment_id)!;
          const booking = db.bookings.find((b) => b.id === p.booking_id);
          const enrolment = db.enrolments.find((x) => x.id === p.enrolment_id);
          return [day(e.created_at), p.receipt_number, name(p.learner_id), trainingTitle(booking?.training_id ?? enrolment?.training_id ?? ""), booking ? "one-on-one" : "cohort seat", name(e.instructor_id), cents(e.gross ?? 0), e.commission_percent, cents(e.commission ?? 0), cents(e.amount), p.status];
        }),
      ];
    }
    case "refunds": {
      const rows = db.ledger.filter((e) => e.kind === "REFUND" && within(e.created_at, fromMs, toMs)).sort((a, b) => a.created_at.localeCompare(b.created_at));
      return [
        ["date", "receipt", "learner", "what", "instructor", "refunded_usd", "instructor_share_usd", "platform_share_usd"],
        ...rows.map((e) => {
          const p = db.payments.find((x) => x.id === e.payment_id);
          return [day(e.created_at), p?.receipt_number ?? null, name(p?.learner_id), e.description.replace(/^Refund: /, ""), name(e.instructor_id), cents(e.gross ?? 0), cents(-e.amount), cents(e.commission ?? 0)];
        }),
      ];
    }
    case "payouts": {
      const rows = db.payouts.filter((p) => within(p.requested_at, fromMs, toMs)).sort((a, b) => a.requested_at.localeCompare(b.requested_at));
      return [
        ["requested", "paid", "instructor", "amount_usd", "status", "trigger", "stripe_reference", "failure_reason"],
        ...rows.map((p) => [day(p.requested_at), day(p.paid_at), name(p.instructor_id), cents(p.amount), p.status, p.trigger, p.reference, p.failure_reason]),
      ];
    }
    case "attendance": {
      const out: (string | number | null)[][] = [["session_date", "training", "session", "instructor", "learner", "attendance"]];
      const sessions: { id: string; start: string; training: string; label: string; instructor: string; learners: string[] }[] = [];
      for (const c of db.cohorts.filter((x) => x.status !== "DRAFT" && x.status !== "CANCELLED")) {
        const learners = db.enrolments.filter((e) => e.cohort_id === c.id && e.status === "CONFIRMED").map((e) => e.learner_id);
        for (const s of cohortSessions(c)) if (within(s.start_utc, fromMs, Math.min(toMs, Date.now()))) sessions.push({ id: s.id, start: s.start_utc, training: c.training_id, label: c.name, instructor: c.instructor_id, learners });
      }
      for (const b of db.bookings.filter((x) => ["ACCEPTED", "COMPLETED", "NO_SHOW", "RESCHEDULE_REQUESTED"].includes(x.status))) {
        if (within(b.start_utc, fromMs, Math.min(toMs, Date.now()))) sessions.push({ id: b.id, start: b.start_utc, training: b.training_id, label: "One-on-one", instructor: b.instructor_id, learners: [b.learner_id] });
      }
      for (const s of sessions.sort((a, b) => a.start.localeCompare(b.start))) {
        for (const l of s.learners) out.push([s.start.slice(0, 16).replace("T", " ") + " UTC", trainingTitle(s.training), s.label, name(s.instructor), name(l), db.attendance[s.id]?.[l] ?? "NOT_TAKEN"]);
      }
      return out;
    }
  }
}

export const reportHandlers = [
  http.get(url("/admin/dashboard"), async ({ request }) => {
    await delay(250);
    const admin = requireUser("ADMIN");
    if (admin instanceof Response) return admin;
    const days = Number(new URL(request.url).searchParams.get("days") ?? 30);
    if (!(DASHBOARD_PERIODS as readonly number[]).includes(days)) return apiError(422, "VALIDATION_FAILED", "Choose 7, 30 or 90 days.", { days: ["Choose 7, 30 or 90 days."] });
    const data = dashboard(days);
    save();
    return HttpResponse.json(data);
  }),

  /** ADM-4: CSV downloads, audited (who exported what, for which dates). */
  http.get(url("/admin/reports/:type"), async ({ params, request }) => {
    await delay(300);
    const admin = requireUser("ADMIN");
    if (admin instanceof Response) return admin;
    const type = String(params.type) as ReportType;
    if (!REPORT_TYPES.includes(type)) return apiError(404, "NOT_FOUND", "That report doesn't exist.");
    const q = new URL(request.url).searchParams;
    const from = q.get("from") ?? "";
    const to = q.get("to") ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
      return apiError(422, "VALIDATION_FAILED", "Choose a start date on or before the end date.", { from: ["Choose a start date on or before the end date."] });
    }
    sweepEarnings();
    const rows = report(type, from, to);
    audit(admin, "report.exported", "report", `${type}:${from}:${to}`, `Exported the ${type} report, ${from} to ${to} (${rows.length - 1} rows)`);
    save();
    return new HttpResponse(toCsv(rows), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${type}-${from}-to-${to}.csv"`, "X-Row-Count": String(rows.length - 1) },
    });
  }),
];
