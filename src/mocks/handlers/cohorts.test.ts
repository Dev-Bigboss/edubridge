import { beforeEach, describe, expect, it } from "vitest";
import { ApiError, api } from "@/lib/api/client";
import { AdminCohortList, CohortResponse, type CohortInput } from "@/lib/api/schemas/cohort";
import { deadlineFromDate } from "@/lib/domain/cohort-schedule";
import { db, mockSession, resetDb } from "../db";
import { sweepCohorts } from "./cohorts";

const failure = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error("expected the request to fail");
    },
    (e) => e as ApiError,
  );

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const input = (over: Partial<CohortInput> = {}): CohortInput => ({
  training_id: "trn_mth101",
  instructor_id: "usr_instructor_2",
  name: "Second semester cohort",
  start_date: inDays(30),
  end_date: inDays(30 + 69),
  schedule: { weekdays: ["TUE", "THU"], start_time: "17:00", duration_min: 90, timezone: "Africa/Lagos" },
  capacity: 25,
  min_enrolment: 5,
  enrolment_deadline: deadlineFromDate(inDays(25), "Africa/Lagos"),
  ...over,
});
const create = (body: CohortInput) => api("/admin/cohorts", { method: "POST", body, schema: CohortResponse }).then((r) => r.cohort);
const act = (id: string, action: string, body?: unknown) =>
  api(`/admin/cohorts/${id}/${action}`, { method: "POST", body, schema: CohortResponse }).then((r) => r.cohort);

describe("admin cohorts mock (cohorts.yaml, COH-1/3/5)", () => {
  beforeEach(() => {
    resetDb();
    mockSession.set("usr_admin_1");
  });

  it("keeps non-admins out and lists cohorts with names", async () => {
    const { items } = await api("/admin/cohorts", { schema: AdminCohortList });
    expect(items.find((c) => c.id === "coh_sfr_jan")).toMatchObject({ training_title: "ICAN Skills: Financial Reporting", instructor_name: "Test Instructor" });
    mockSession.set("usr_instructor_1");
    expect((await failure(api("/admin/cohorts"))).status).toBe(403);
  });

  it("creates a draft and works out the sessions and first class", async () => {
    const c = await create(input());
    expect(c.status).toBe("DRAFT");
    expect(c.session_count).toBe(20);
    expect(new Date(c.first_session_at) > new Date()).toBe(true);
    expect(db.audit[0].action).toBe("cohort.created");
  });

  it("rejects 1:1 trainings, unassigned instructors, empty schedules and late deadlines", async () => {
    const err = async (body: CohortInput) => (await failure(create(body))).fieldErrors;
    expect(await err(input({ training_id: "trn_acca_sbr", instructor_id: "usr_instructor_1" }))).toHaveProperty("training_id");
    expect(await err(input({ instructor_id: "usr_instructor_1" }))).toHaveProperty("instructor_id");
    // A one-day cohort on a weekday other than that day has no class.
    const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
    const other = days[(new Date(`${inDays(30)}T12:00:00Z`).getUTCDay() + 7) % 7]; // the day after, Mon-based
    expect(await err(input({ end_date: inDays(30), schedule: { ...input().schedule, weekdays: [other] } }))).toHaveProperty(["schedule.weekdays"]);
    expect(await err(input({ enrolment_deadline: deadlineFromDate(inDays(60), "Africa/Lagos") }))).toHaveProperty("enrolment_deadline");
    expect(await err(input({ capacity: 4, min_enrolment: 5 }))).toHaveProperty("min_enrolment");
  });

  it("follows the status flow and won't open a cohort past its deadline", async () => {
    const c = await create(input());
    expect((await act(c.id, "open")).status).toBe("OPEN");
    expect((await failure(act(c.id, "complete"))).code).toBe("INVALID_TRANSITION");
    expect((await act(c.id, "close")).status).toBe("CLOSED");
    db.cohorts.find((x) => x.id === "coh_sfr_next")!.enrolment_deadline = new Date(Date.now() - 1000).toISOString();
    expect((await failure(act("coh_sfr_next", "open"))).code).toBe("DEADLINE_PASSED");
  });

  it("won't drop seats below the learners enrolled, and adding seats reopens a full cohort", async () => {
    const full = db.cohorts.find((c) => c.id === "coh_sfr_weekend")!;
    const body = { ...input(), training_id: full.training_id, instructor_id: full.instructor_id, name: full.name, start_date: full.start_date, end_date: full.end_date, schedule: full.schedule, enrolment_deadline: full.enrolment_deadline, min_enrolment: full.min_enrolment };
    const patch = (capacity: number) => api(`/admin/cohorts/${full.id}`, { method: "PATCH", body: { ...body, capacity }, schema: CohortResponse });
    expect((await failure(patch(10))).fieldErrors).toHaveProperty("capacity");
    expect((await patch(15)).cohort.status).toBe("OPEN");
  });

  it("locks dates once a cohort starts", async () => {
    const c = db.cohorts.find((x) => x.id === "coh_mth_sem1")!;
    c.status = "IN_PROGRESS";
    const body = { training_id: c.training_id, instructor_id: c.instructor_id, name: "Renamed", start_date: c.start_date, end_date: c.end_date, schedule: c.schedule, capacity: c.capacity, min_enrolment: c.min_enrolment, enrolment_deadline: c.enrolment_deadline };
    expect((await api(`/admin/cohorts/${c.id}`, { method: "PATCH", body, schema: CohortResponse })).cohort.name).toBe("Renamed");
    expect((await failure(api(`/admin/cohorts/${c.id}`, { method: "PATCH", body: { ...body, end_date: inDays(200) } }))).code).toBe("COHORT_LOCKED");
  });

  it("COH-5: cancelling needs a reason and refunds every paid seat", async () => {
    db.enrolments.push({ id: "enr_1", learner_id: "usr_learner_1", training_id: "trn_mth101", cohort_id: "coh_mth_sem1", status: "CONFIRMED", price: { amount: 25000, currency: "USD", unit: "PER_SEAT" }, payment_id: "pay_1", created_at: "", confirmed_at: "" });
    db.payments.push({ id: "pay_1", learner_id: "usr_learner_1", enrolment_id: "enr_1", booking_id: null, description: "MTH 101", breakdown: { currency: "USD", unit_price: { amount: 25000, currency: "USD", unit: "PER_SEAT" }, quantity: 1, duration_min: null, subtotal: 25000, discount: 0, tax: 0, total: 25000 }, status: "CAPTURED", method: "Visa ending 4242", failure_message: null, refunded_amount: 0, created_at: "", captured_at: "", receipt_number: "EB-2026-09999", receipt_url: null });
    expect((await failure(act("coh_mth_sem1", "cancel", { reason: "" }))).fieldErrors).toHaveProperty("reason");
    const c = await act("coh_mth_sem1", "cancel", { reason: "The instructor is unavailable this semester." });
    expect(c.status).toBe("CANCELLED");
    expect(db.payments.find((p) => p.id === "pay_1")).toMatchObject({ status: "REFUNDED", refunded_amount: 25000 });
    expect(db.enrolments.find((e) => e.id === "enr_1")!.status).toBe("REFUNDED");
    expect(db.outbox[0]).toMatchObject({ to: "learner@example.com" });
    expect(db.outbox[0].subject).toContain("$250 refunded");
  });
});

describe("automatic cancellation below the minimum (COH-5)", () => {
  beforeEach(() => resetDb());

  it("at the deadline, a cohort short of its minimum is cancelled, refunded and everyone told", async () => {
    const c = db.cohorts.find((x) => x.id === "coh_mth_sem1")!;
    c.enrolled_count = 2; // minimum is 5
    db.enrolments.push({ id: "enr_auto", learner_id: "usr_learner_1", training_id: c.training_id, cohort_id: c.id, status: "CONFIRMED", price: { amount: 25000, currency: "USD", unit: "PER_SEAT" }, payment_id: "pay_auto", created_at: "", confirmed_at: "" });
    db.payments.push({ id: "pay_auto", learner_id: "usr_learner_1", enrolment_id: "enr_auto", booking_id: null, description: "MTH 101", breakdown: { currency: "USD", unit_price: { amount: 25000, currency: "USD", unit: "PER_SEAT" }, quantity: 1, duration_min: null, subtotal: 25000, discount: 0, tax: 0, total: 25000 }, status: "CAPTURED", method: "Visa ending 4242", failure_message: null, refunded_amount: 0, created_at: "", captured_at: "", receipt_number: "EB-2026-00099", receipt_url: null });

    sweepCohorts(); // deadline not reached yet
    expect(c.status).toBe("OPEN");

    c.enrolment_deadline = new Date(Date.now() - 60_000).toISOString();
    sweepCohorts();
    expect(c.status).toBe("CANCELLED");
    expect(db.payments.find((p) => p.id === "pay_auto")!.status).toBe("REFUNDED");
    expect(db.notifications.map((n) => [n.user_id, n.type]).slice(0, 2)).toEqual([
      ["usr_instructor_2", "COHORT_CANCELLED"],
      ["usr_learner_1", "COHORT_CANCELLED"],
    ]);
    expect(db.audit[0]).toMatchObject({ actor_name: "System", action: "cohort.auto_cancel", target_id: c.id });
  });

  it("leaves cohorts that met their minimum, have none, or already started", () => {
    for (const c of db.cohorts) c.enrolment_deadline = new Date(Date.now() - 60_000).toISOString();
    const before = db.cohorts.map((c) => c.status);
    sweepCohorts();
    expect(db.cohorts.map((c) => c.status)).toEqual(before); // every seeded cohort meets its minimum
  });
});
