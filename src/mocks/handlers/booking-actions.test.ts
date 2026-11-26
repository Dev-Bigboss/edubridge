import { beforeEach, describe, expect, it } from "vitest";
import { ApiError, api } from "@/lib/api/client";
import { BookingCheckout, BookingList, BookingResponse, SlotsResponse } from "@/lib/api/schemas/bookings";
import { db, mockSession, resetDb } from "../db";
import { sweepBookings } from "./bookings";

const failure = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error("expected the request to fail");
    },
    (e) => e as ApiError,
  );
const ACCA = "trn_acca_sbr";
const slots = () => api(`/trainings/${ACCA}/slots`, { query: { instructor_id: "usr_instructor_1", duration_min: 60 }, schema: SlotsResponse }).then((r) => r.slots);
const act = (id: string, action: string, body: unknown = {}) => api(`/bookings/${id}/${action}`, { method: "POST", body, schema: BookingResponse }).then((r) => r.booking);

/** A pending request from the demo learner, card authorised. */
async function pendingRequest() {
  mockSession.set("usr_learner_1");
  const [start] = await slots();
  const { booking } = await api("/bookings", {
    method: "POST",
    body: { training_id: ACCA, instructor_id: "usr_instructor_1", start_utc: start, duration_min: 60, note: null },
    idempotencyKey: crypto.randomUUID(),
    schema: BookingCheckout,
  });
  await api(`/mock/gateway/${booking.payment_id}/success`, { method: "POST" });
  db.payments.find((p) => p.id === booking.payment_id)!.mock!.settles_at = new Date(0).toISOString();
  await api(`/bookings/${booking.id}`);
  return booking.id;
}

describe("instructor answers a request (OTO-4/6/8, PAY-4)", () => {
  beforeEach(() => resetDb());

  it("accept captures the payment, creates the meeting link and a receipt, and notifies the learner", async () => {
    const id = await pendingRequest();
    mockSession.set("usr_instructor_1");
    expect((await api("/teach/bookings", { schema: BookingList })).items.map((b) => b.status)).toEqual(["PENDING_INSTRUCTOR"]);
    const b = await act(id, "accept");
    expect(b).toMatchObject({ status: "ACCEPTED", payment_status: "CAPTURED", expires_at: null, meeting_url: `https://meet.example.com/edubridge/${id}` });
    expect(db.payments.find((p) => p.id === b.payment_id)!.receipt_number).toMatch(/^EB-/);
    expect(db.notifications[0]).toMatchObject({ user_id: "usr_learner_1", type: "BOOKING_ACCEPTED" });
    expect(db.outbox.slice(0, 2).map((m) => m.to).sort()).toEqual(["instructor@example.com", "learner@example.com"]);
    expect((await failure(act(id, "accept"))).code).toBe("INVALID_TRANSITION");
  });

  it("decline needs a reason, releases the hold and tells the learner", async () => {
    const id = await pendingRequest();
    mockSession.set("usr_instructor_1");
    expect((await failure(act(id, "decline", { reason: "" }))).fieldErrors).toHaveProperty("reason");
    const b = await act(id, "decline", { reason: "I'm travelling that week." });
    expect(b).toMatchObject({ status: "DECLINED", payment_status: "VOIDED" });
    expect(b.timeline.at(-1)).toMatchObject({ event: "DECLINED", note: "I'm travelling that week." });
    expect(db.notifications[0]).toMatchObject({ user_id: "usr_learner_1", type: "BOOKING_DECLINED" });
  });

  it("only the instructor can answer, and only their own requests", async () => {
    const id = await pendingRequest();
    expect((await failure(act(id, "accept"))).code).toBe("INVALID_TRANSITION"); // the learner
    mockSession.set("usr_instructor_3");
    expect((await failure(act(id, "accept"))).status).toBe(404);
  });
});

describe("counter-proposals (OTO-6)", () => {
  beforeEach(() => resetDb());

  it("propose a free time; the learner accepts and the session moves to it", async () => {
    const id = await pendingRequest();
    mockSession.set("usr_instructor_1");
    const later = (await slots()).at(-1)!;
    expect((await failure(act(id, "propose", { start_utc: "2000-01-01T10:00:00Z" }))).code).toBe("SLOT_TAKEN");
    const proposed = await act(id, "propose", { start_utc: later, note: "Evenings work better that week." });
    expect(proposed).toMatchObject({ status: "COUNTER_PROPOSED", proposal: { start_utc: later, note: "Evenings work better that week." }, payment_status: "AUTHORISED" });
    expect(new Date(proposed.expires_at!).getTime() - Date.now()).toBeGreaterThan(47 * 3_600_000);

    mockSession.set("usr_learner_1");
    const b = await act(id, "accept-proposal");
    expect(b).toMatchObject({ status: "ACCEPTED", start_utc: later, proposal: null, payment_status: "CAPTURED" });
    expect(b.timeline.map((e) => e.event)).toEqual(["REQUESTED", "PAYMENT_AUTHORISED", "TIME_PROPOSED", "PROPOSAL_ACCEPTED"]);
  });

  it("the learner can decline the new time; the hold is released", async () => {
    const id = await pendingRequest();
    mockSession.set("usr_instructor_1");
    await act(id, "propose", { start_utc: (await slots()).at(-1)! });
    mockSession.set("usr_learner_1");
    expect(await act(id, "decline-proposal")).toMatchObject({ status: "DECLINED", payment_status: "VOIDED" });
    expect(db.notifications[0]).toMatchObject({ user_id: "usr_instructor_1", type: "BOOKING_DECLINED" });
  });

  it("an unanswered proposal expires for both sides", async () => {
    const id = await pendingRequest();
    mockSession.set("usr_instructor_1");
    await act(id, "propose", { start_utc: (await slots()).at(-1)! });
    db.bookings[0].expires_at = new Date(Date.now() - 1000).toISOString();
    sweepBookings();
    expect(db.bookings[0]).toMatchObject({ status: "EXPIRED", proposal: null });
    expect(db.payments.find((p) => p.id === db.bookings[0].payment_id)!.status).toBe("VOIDED");
    expect(db.notifications.slice(0, 2).map((n) => n.user_id).sort()).toEqual(["usr_instructor_1", "usr_learner_1"]);
  });
});
