import { beforeEach, describe, expect, it } from "vitest";
import { ApiError, api } from "@/lib/api/client";
import { BookingCheckout, BookingResponse, SlotsResponse } from "@/lib/api/schemas/bookings";
import { LearnerEnrolmentList } from "@/lib/api/schemas/payments";
import { ScheduleResponse, SessionDetail } from "@/lib/api/schemas/sessions";
import { db, mockSession, resetDb } from "../db";

const failure = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error("expected the request to fail");
    },
    (e) => e as ApiError,
  );
const schedule = () => api("/teach/schedule", { schema: ScheduleResponse }).then((r) => r.items);
const session = (id: string) => api(`/sessions/${encodeURIComponent(id)}`, { schema: SessionDetail });
const mark = (id: string, marks: unknown) => api(`/sessions/${encodeURIComponent(id)}/attendance`, { method: "PUT", body: { marks }, schema: SessionDetail });

describe("instructor schedule (OTO-10)", () => {
  beforeEach(() => {
    resetDb();
    mockSession.set("usr_instructor_1");
  });

  it("lists cohort classes and confirmed 1:1 sessions together, in time order", async () => {
    // A confirmed 1:1 next to the cohort classes.
    mockSession.set("usr_learner_1");
    const [start] = (await api("/trainings/trn_acca_sbr/slots", { query: { instructor_id: "usr_instructor_1", duration_min: 60 }, schema: SlotsResponse })).slots;
    const { booking } = await api("/bookings", { method: "POST", body: { training_id: "trn_acca_sbr", instructor_id: "usr_instructor_1", start_utc: start, duration_min: 60, note: null }, idempotencyKey: "s1", schema: BookingCheckout });
    await api(`/mock/gateway/${booking.payment_id}/success`, { method: "POST" });
    db.payments.find((p) => p.id === booking.payment_id)!.mock!.settles_at = new Date(0).toISOString();
    await api(`/bookings/${booking.id}`);
    mockSession.set("usr_instructor_1");
    await api(`/bookings/${booking.id}/accept`, { method: "POST", schema: BookingResponse });

    const items = await schedule();
    expect(items.some((i) => i.kind === "COHORT" && i.subtitle === "Autumn cohort")).toBe(true);
    expect(items.find((i) => i.kind === "ONE_ON_ONE")).toMatchObject({ id: booking.id, subtitle: "Test Learner", join_url: expect.stringContaining(booking.id) });
    expect(items.map((i) => i.start_utc)).toEqual([...items.map((i) => i.start_utc)].sort());
    expect(items.some((i) => i.subtitle === "Spring evening cohort")).toBe(false); // drafts aren't scheduled
  });

  it("is the instructor's own: others get 404 and learners 403", async () => {
    const [first] = await schedule();
    mockSession.set("usr_instructor_3");
    expect((await failure(session(first.id))).status).toBe(404);
    mockSession.set("usr_learner_1");
    expect((await failure(schedule())).status).toBe(403);
  });
});

describe("attendance (COH-4)", () => {
  beforeEach(() => {
    resetDb();
    mockSession.set("usr_instructor_1");
  });

  it("marks a past class for the cohort's roster and counts who came", async () => {
    const past = (await schedule()).find((i) => i.subtitle === "Autumn cohort" && Date.parse(i.start_utc) < Date.now())!;
    const before = await session(past.id);
    expect(before.roster.map((r) => r.name)).toEqual(["Ada Demo", "Chidi Demo", "Fola Demo", "Test Learner"]);
    expect(before.session.attendance).toEqual({ taken: false, present: 0, total: 4 });

    const marks = before.roster.map((r, i) => ({ learner_id: r.learner_id, status: i === 0 ? "ABSENT" : i === 1 ? "LATE" : "PRESENT" }));
    const after = await mark(past.id, marks);
    expect(after.session).toMatchObject({ status: "COMPLETED", attendance: { taken: true, present: 3, total: 4 } });
    expect(after.roster[0].status).toBe("ABSENT");
  });

  it("not before the class starts, and only for people on the roster", async () => {
    const future = (await schedule()).find((i) => i.subtitle === "Autumn cohort" && Date.parse(i.start_utc) > Date.now())!;
    expect((await failure(mark(future.id, [{ learner_id: "usr_learner_1", status: "PRESENT" }]))).code).toBe("NOT_STARTED");
    const past = (await schedule()).find((i) => i.subtitle === "Autumn cohort" && Date.parse(i.start_utc) < Date.now())!;
    expect((await failure(mark(past.id, [{ learner_id: "usr_learner_suspended", status: "PRESENT" }]))).status).toBe(422);
  });

  it("learners see their next class with its join link", async () => {
    mockSession.set("usr_learner_1");
    const { items } = await api("/me/enrolments", { schema: LearnerEnrolmentList });
    const running = items.find((i) => i.cohort.id === "coh_aa_2025")!;
    expect(running.next_session).toMatchObject({ id: expect.stringMatching(/^coh_aa_2025:/), join_url: expect.stringContaining("coh_aa_2025-") });
    expect(items.find((i) => i.cohort.id === "coh_mth_past")!.next_session).toBeNull();
  });
});
