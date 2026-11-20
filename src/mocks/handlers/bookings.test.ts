import { beforeEach, describe, expect, it } from "vitest";
import { ApiError, api } from "@/lib/api/client";
import { AvailabilityResponse, BookingCheckout, BookingList, BookingQuote, BookingResponse, SlotsResponse } from "@/lib/api/schemas/bookings";
import { db, mockSession, resetDb } from "../db";
import { busyFor, sweepBookings } from "./bookings";

const failure = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error("expected the request to fail");
    },
    (e) => e as ApiError,
  );
const ACCA = "trn_acca_sbr";
const slots = (duration = 60, instructor = "usr_instructor_1") =>
  api(`/trainings/${ACCA}/slots`, { query: { instructor_id: instructor, duration_min: duration }, schema: SlotsResponse });
const request = (start_utc: string, key = crypto.randomUUID(), duration_min = 60) =>
  api("/bookings", { method: "POST", body: { training_id: ACCA, instructor_id: "usr_instructor_1", start_utc, duration_min, note: "Group accounts, please." }, idempotencyKey: key, schema: BookingCheckout });
async function pay(paymentId: string, outcome: "success" | "decline") {
  await api(`/mock/gateway/${paymentId}/${outcome}`, { method: "POST" });
  db.payments.find((p) => p.id === paymentId)!.mock!.settles_at = new Date(0).toISOString();
}
const booking = (id: string) => api(`/bookings/${id}`, { schema: BookingResponse }).then((r) => r.booking);

describe("instructor availability (OTO-1)", () => {
  beforeEach(() => {
    resetDb();
    mockSession.set("usr_instructor_1");
  });

  it("reads and saves hours, rejecting overlaps on the right row", async () => {
    const { availability } = await api("/teach/availability", { schema: AvailabilityResponse });
    expect(availability.timezone).toBe("Europe/London");
    const bad = { ...availability, weekly: [...availability.weekly, { weekday: 1, start: "20:00", end: "22:00" }] };
    const err = await failure(api("/teach/availability", { method: "PUT", body: bad }));
    expect(Object.keys(err.fieldErrors)[0]).toMatch(/^weekly\.\d+\.start$/);
    const ok = { ...availability, overrides: [{ date: "2030-01-07", ranges: [] }], notice_hours: 24 };
    expect((await api("/teach/availability", { method: "PUT", body: ok, schema: AvailabilityResponse })).availability.notice_hours).toBe(24);
    mockSession.set("usr_learner_1");
    expect((await failure(api("/teach/availability"))).status).toBe(403);
  });
});

describe("requesting a 1:1 session (OTO-2/3/5/7, PAY-4)", () => {
  beforeEach(() => {
    resetDb();
    mockSession.set("usr_learner_1");
  });

  it("lists free slots publicly, only for an instructor of a 1:1 training", async () => {
    mockSession.set(null);
    const res = await slots();
    expect(res.instructor_timezone).toBe("Europe/London");
    expect(res.slots.length).toBeGreaterThan(10);
    expect((await failure(slots(60, "usr_instructor_2"))).status).toBe(404);
    expect((await failure(api("/trainings/trn_ican_sfr/slots", { query: { instructor_id: "usr_instructor_1", duration_min: 60 } }))).status).toBe(404);
  });

  it("quotes per hour for the chosen length", async () => {
    const q = await api("/bookings/quote", { query: { training_id: ACCA, instructor_id: "usr_instructor_1", duration_min: 90 }, schema: BookingQuote });
    expect(q.breakdown).toMatchObject({ total: 11250, duration_min: 90, unit_price: { amount: 7500, unit: "PER_HOUR" } });
    expect(q.expiry_hours).toBe(24);
  });

  it("holds the slot while paying, authorises the card, then waits for the instructor", async () => {
    const [first] = (await slots()).slots;
    const { booking: draft, checkout_url } = await request(first);
    expect(draft).toMatchObject({ status: "DRAFT", payment_status: "PENDING", breakdown: { total: 7500 } });
    expect(checkout_url).toBe(`/mock-gateway?payment_id=${draft.payment_id}`);
    expect((await slots()).slots).not.toContain(first); // held for others
    expect((await failure(request(first))).code).toBe("SLOT_TAKEN");

    await pay(draft.payment_id, "success");
    const pending = await booking(draft.id);
    expect(pending).toMatchObject({ status: "PENDING_INSTRUCTOR", payment_status: "AUTHORISED", note: "Group accounts, please." });
    expect(new Date(pending.expires_at!).getTime() - Date.now()).toBeGreaterThan(23 * 3_600_000);
    expect(pending.timeline.map((e) => e.event)).toEqual(["REQUESTED", "PAYMENT_AUTHORISED"]);
    expect(db.notifications[0]).toMatchObject({ user_id: "usr_instructor_1", type: "BOOKING_REQUESTED" });
    expect((await api("/me/bookings", { schema: BookingList })).items.map((b) => b.id)).toEqual([draft.id]);

    // The instructor can read it; another learner can't.
    mockSession.set("usr_instructor_1");
    expect((await booking(draft.id)).learner.name).toBe("Test Learner");
    mockSession.set("usr_learner_suspended");
    db.users.find((u) => u.id === "usr_learner_suspended")!.status = "ACTIVE";
    expect((await failure(booking(draft.id))).status).toBe(404);
  });

  it("a declined card or leaving the payment page frees the slot", async () => {
    const [first, second] = (await slots()).slots;
    const a = await request(first);
    await pay(a.booking.payment_id, "decline");
    expect((await booking(a.booking.id)).payment_status).toBe("FAILED");
    expect((await slots()).slots).toContain(first);

    const b = await request(second);
    await api(`/mock/gateway/${b.booking.payment_id}/cancel`, { method: "POST" });
    expect((await slots()).slots).toContain(second);
    expect((await api("/me/bookings", { schema: BookingList })).items).toEqual([]);
  });

  it("OTO-5: an unanswered request expires and the card hold is released", async () => {
    const [first] = (await slots()).slots;
    const { booking: draft } = await request(first);
    await pay(draft.payment_id, "success");
    await booking(draft.id);
    db.bookings[0].expires_at = new Date(Date.now() - 1000).toISOString();
    sweepBookings();
    const expired = await booking(draft.id);
    expect(expired).toMatchObject({ status: "EXPIRED", payment_status: "VOIDED", expires_at: null });
    expect(db.notifications[0]).toMatchObject({ user_id: "usr_learner_1", type: "BOOKING_EXPIRED" });
    expect((await slots()).slots).toContain(first);
  });

  it("OTO-10: cohort classes block the instructor's time", () => {
    const busy = busyFor("usr_instructor_1");
    const cohortClass = db.cohorts.find((c) => c.id === "coh_sfr_jan")!.first_session_at;
    expect(busy.some((b) => b.start === cohortClass)).toBe(true);
  });

  it("the same Idempotency-Key returns the same draft", async () => {
    const [first] = (await slots()).slots;
    const a = await request(first, "k1");
    const b = await request(first, "k1");
    expect(b.booking.id).toBe(a.booking.id);
  });
});
