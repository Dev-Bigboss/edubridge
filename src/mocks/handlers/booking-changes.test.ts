import { beforeEach, describe, expect, it } from "vitest";
import { ApiError, api } from "@/lib/api/client";
import { BookingCheckout, BookingResponse, SlotsResponse } from "@/lib/api/schemas/bookings";
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
const slots = () => api(`/trainings/${ACCA}/slots`, { query: { instructor_id: "usr_instructor_1", duration_min: 60, days: 40 }, schema: SlotsResponse }).then((r) => r.slots);
const act = (id: string, action: string, body: unknown = {}) => api(`/bookings/${id}/${action}`, { method: "POST", body, schema: BookingResponse }).then((r) => r.booking);
const as = (id: string) => mockSession.set(id);

/** A confirmed session, `daysAhead` days out, paid $75. */
async function confirmed(pick: (s: string[]) => string = (s) => s[0]) {
  as("usr_learner_1");
  const start = pick(await slots());
  const { booking } = await api("/bookings", {
    method: "POST",
    body: { training_id: ACCA, instructor_id: "usr_instructor_1", start_utc: start, duration_min: 60, note: null },
    idempotencyKey: crypto.randomUUID(),
    schema: BookingCheckout,
  });
  await api(`/mock/gateway/${booking.payment_id}/success`, { method: "POST" });
  db.payments.find((p) => p.id === booking.payment_id)!.mock!.settles_at = new Date(0).toISOString();
  await api(`/bookings/${booking.id}`);
  as("usr_instructor_1");
  await act(booking.id, "accept");
  return booking.id;
}
const stored = (id: string) => db.bookings.find((b) => b.id === id)!;
const paymentOf = (id: string) => db.payments.find((p) => p.id === stored(id).payment_id)!;

describe("rescheduling a confirmed session (OTO-9)", () => {
  beforeEach(() => resetDb());

  it("the learner asks, the instructor accepts: the session moves", async () => {
    const id = await confirmed();
    as("usr_learner_1");
    const target = (await slots()).at(-1)!;
    const asked = await act(id, "reschedule", { start_utc: target, note: "Work trip that day." });
    expect(asked).toMatchObject({ status: "RESCHEDULE_REQUESTED", reschedule: { requested_by: "LEARNER", start_utc: target } });
    expect((await failure(act(id, "accept-reschedule"))).code).toBe("INVALID_TRANSITION"); // can't accept your own
    expect(db.notifications[0]).toMatchObject({ user_id: "usr_instructor_1", type: "BOOKING_RESCHEDULED" });

    as("usr_instructor_1");
    const moved = await act(id, "accept-reschedule");
    expect(moved).toMatchObject({ status: "ACCEPTED", start_utc: target, reschedule: null, payment_status: "CAPTURED" });
    expect(db.notifications[0]).toMatchObject({ user_id: "usr_learner_1", title: "New time confirmed" });
  });

  it("declining or no answer keeps the original time", async () => {
    const id = await confirmed();
    const original = stored(id).start_utc;
    await act(id, "reschedule", { start_utc: (await slots()).at(-1)! }); // the instructor asks this time
    as("usr_learner_1");
    expect(await act(id, "decline-reschedule")).toMatchObject({ status: "ACCEPTED", start_utc: original });

    as("usr_learner_1");
    await act(id, "reschedule", { start_utc: (await slots()).at(-1)! });
    stored(id).expires_at = new Date(Date.now() - 1000).toISOString();
    sweepBookings();
    expect(stored(id)).toMatchObject({ status: "ACCEPTED", start_utc: original, reschedule: null });
  });

  it("only to a free time", async () => {
    const id = await confirmed();
    as("usr_learner_1");
    expect((await failure(act(id, "reschedule", { start_utc: "2000-01-01T00:00:00Z" }))).code).toBe("SLOT_TAKEN");
  });
});

describe("cancelling a confirmed session (OTO-9, PAY-5)", () => {
  beforeEach(() => resetDb());

  it("a learner cancelling with lots of notice gets everything back", async () => {
    const id = await confirmed((s) => s.find((x) => Date.parse(x) - Date.now() > 50 * 3_600_000)!);
    as("usr_learner_1");
    expect((await failure(act(id, "cancel", { reason: "" }))).fieldErrors).toHaveProperty("reason");
    const b = await act(id, "cancel", { reason: "My exam date moved." });
    expect(b).toMatchObject({ status: "CANCELLED", payment_status: "REFUNDED", cancellation: { by: "LEARNER", refund_amount: 7500 } });
    expect(db.notifications.map((n) => n.type).slice(0, 2).sort()).toEqual(["BOOKING_DECLINED", "PAYMENT_REFUNDED"]);
  });

  it("a learner cancelling inside 48 h gets the policy's share, under the rules from when they booked", async () => {
    const id = await confirmed();
    stored(id).start_utc = new Date(Date.now() + 30 * 3_600_000).toISOString();
    db.settings.learner_cancellation.tiers = [{ min_hours_before: 0, refund_percent: 0 }]; // changed later: must not apply
    as("usr_learner_1");
    const b = await act(id, "cancel", { reason: "Something came up." });
    expect(b.cancellation).toMatchObject({ refund_amount: 3750 });
    expect(paymentOf(id)).toMatchObject({ status: "PARTIALLY_REFUNDED", refunded_amount: 3750 });
  });

  it("the instructor cancelling refunds the learner in full, even at short notice", async () => {
    const id = await confirmed();
    stored(id).start_utc = new Date(Date.now() + 2 * 3_600_000).toISOString();
    const b = await act(id, "cancel", { reason: "I'm unwell, sorry." });
    expect(b.cancellation).toMatchObject({ by: "INSTRUCTOR", refund_amount: 7500 });
    expect(db.notifications[0]).toMatchObject({ user_id: "usr_learner_1", type: "BOOKING_DECLINED" });
  });

  it("can't cancel once the session has started", async () => {
    const id = await confirmed();
    stored(id).start_utc = new Date(Date.now() - 60_000).toISOString();
    as("usr_learner_1");
    expect((await failure(act(id, "cancel", { reason: "Too late now" }))).code).toBe("SESSION_STARTED");
  });
});
