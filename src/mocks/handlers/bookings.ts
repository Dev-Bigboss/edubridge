import { delay } from "msw";
import { http, HttpResponse } from "msw/http";
import { AvailabilityInput, BookingRequest, type Booking } from "@/lib/api/schemas/bookings";
import { sessionBreakdown } from "@/lib/domain/checkout";
import { localInstant } from "@/lib/domain/cohort-schedule";
import { WEEKDAYS } from "@/lib/api/schemas/cohort";
import { MODALITY } from "@/lib/domain/enums";
import { resolvePrice } from "@/lib/domain/pricing";
import { availabilityProblems, freeSlots, todayIn, type Busy } from "@/lib/domain/slots";
import { formatSessionTime } from "@/lib/domain/time";
import { db, findUser, newId, notify, save, type StoredBooking } from "../db";
import { omit } from "./catalog";
import { settle } from "./checkout";
import { apiError, blockWhileImpersonating, requireUser, url, validationError } from "./util";

type StoredPayment = (typeof db.payments)[number];

/** A learner has this long on the payment page before the held slot is released. */
const HOLD_MIN = 30;
const HOLDING = new Set(["PENDING_INSTRUCTOR", "COUNTER_PROPOSED", "ACCEPTED", "RESCHEDULE_REQUESTED"]);
const TEACHING = new Set(["OPEN", "FULL", "CLOSED", "IN_PROGRESS"]);
const DAY = 86_400_000;

/* ---------- helpers ---------- */

const instructorOf = (id: string) => {
  const u = findUser(id);
  return { id, name: u?.name ?? "Instructor", avatar_url: u?.avatar_url ?? null, headline: u?.headline ?? null };
};

export function toBooking(b: StoredBooking): Booking {
  const t = db.trainings.find((x) => x.id === b.training_id);
  const payment = db.payments.find((p) => p.id === b.payment_id);
  return {
    ...omit(omit(omit(omit(b, "training_id"), "instructor_id"), "learner_id"), "held_until"),
    training: { id: b.training_id, slug: t?.slug ?? "", title: t?.title ?? "Training" },
    instructor: instructorOf(b.instructor_id),
    learner: { id: b.learner_id, name: findUser(b.learner_id)?.name ?? "Learner" },
    payment_status: payment?.status ?? "PENDING",
  };
}

/**
 * OTO-3/10: everything that already takes the instructor's time: held drafts, pending requests
 * and proposals, confirmed sessions (and a pending reschedule's new time), and cohort classes.
 */
export function busyFor(instructorId: string, now = new Date(), ignoreBookingId?: string): Busy[] {
  const busy: Busy[] = [];
  for (const b of db.bookings) {
    if (b.instructor_id !== instructorId || b.id === ignoreBookingId) continue;
    const draftHeld = b.status === "DRAFT" && b.held_until && new Date(b.held_until) > now;
    if (draftHeld || (HOLDING.has(b.status) && b.status !== "COUNTER_PROPOSED")) busy.push({ start: b.start_utc, end: b.end_utc });
    if (b.status === "COUNTER_PROPOSED" && b.proposal) busy.push({ start: b.proposal.start_utc, end: b.proposal.end_utc });
    if (b.status === "RESCHEDULE_REQUESTED" && b.reschedule) busy.push({ start: b.reschedule.start_utc, end: b.reschedule.end_utc });
  }
  for (const c of db.cohorts) {
    if (c.instructor_id !== instructorId || !TEACHING.has(c.status)) continue;
    const end = Date.parse(`${c.end_date}T12:00:00Z`);
    for (let t = Date.parse(`${c.start_date}T12:00:00Z`); t <= end; t += DAY) {
      const date = new Date(t).toISOString().slice(0, 10);
      if (!c.schedule.weekdays.includes(WEEKDAYS[(new Date(t).getUTCDay() + 6) % 7])) continue;
      const start = localInstant(date, c.schedule.start_time, c.schedule.timezone);
      busy.push({ start: start.toISOString(), end: new Date(start.getTime() + c.schedule.duration_min * 60_000).toISOString() });
    }
  }
  return busy;
}

/**
 * OTO-5 and abandoned checkouts. The backend runs this on a schedule; the mock runs it before
 * answering anything about bookings, so the demo behaves the same.
 */
export function sweepBookings(now = new Date()) {
  let changed = false;
  for (const b of db.bookings) {
    if (b.status === "PENDING_INSTRUCTOR" && b.expires_at && new Date(b.expires_at) <= now) {
      b.status = "EXPIRED";
      b.expires_at = null;
      b.timeline.push({ at: now.toISOString(), actor: "SYSTEM", event: "EXPIRED", note: null });
      const payment = db.payments.find((p) => p.id === b.payment_id);
      if (payment?.status === "AUTHORISED") payment.status = "VOIDED"; // PAY-4: release the hold
      notify(b.learner_id, {
        type: "BOOKING_EXPIRED",
        title: "Your session request expired",
        body: `${instructorOf(b.instructor_id).name} didn't answer in time. Your card wasn't charged and the hold is released.`,
        link: `/learn/bookings/${b.id}`,
      });
      changed = true;
    }
  }
  if (changed) save();
}

function trainingFor1on1(trainingId: string, instructorId: string) {
  const t = db.trainings.find((x) => x.id === trainingId && x.status === "PUBLISHED");
  const modality = t && db.modalities.find((m) => m.id === t.modality_id);
  if (!t || modality?.code !== MODALITY.ONE_ON_ONE) return null;
  if (!t.instructors.some((i) => i.instructor_id === instructorId)) return null;
  return t;
}

/** Called by the payment webhook (mock gateway) once the card is authorised or declined. */
export function settleBookingPayment(payment: StoredPayment, outcome: "success" | "decline") {
  const b = db.bookings.find((x) => x.id === payment.booking_id);
  if (!b) return;
  const now = new Date();
  if (outcome === "decline") {
    payment.status = "FAILED";
    payment.failure_message = "Your card was declined. Nothing was held or charged.";
    b.held_until = now.toISOString(); // release the slot
    b.timeline.push({ at: now.toISOString(), actor: "SYSTEM", event: "PAYMENT_FAILED", note: null });
    return;
  }
  // PAY-4: authorised now, captured only when the instructor accepts.
  payment.status = "AUTHORISED";
  payment.method = "Visa ending 4242";
  b.status = "PENDING_INSTRUCTOR";
  b.held_until = null;
  b.expires_at = new Date(now.getTime() + db.settings.booking_expiry_hours * 3_600_000).toISOString();
  b.timeline.push(
    { at: now.toISOString(), actor: "LEARNER", event: "REQUESTED", note: b.note },
    { at: now.toISOString(), actor: "SYSTEM", event: "PAYMENT_AUTHORISED", note: null },
  );
  const instructor = findUser(b.instructor_id);
  notify(b.instructor_id, {
    type: "BOOKING_REQUESTED",
    title: `New session request from ${findUser(b.learner_id)?.name ?? "a learner"}`,
    body: `${formatSessionTime(b.start_utc, instructor?.timezone ?? "UTC")}, ${b.duration_min} min. Answer within ${db.settings.booking_expiry_hours} hours.`,
    link: `/teach/requests`,
  });
}

/** Called when the learner leaves the gateway without paying. */
export function cancelBookingCheckout(payment: StoredPayment) {
  const b = db.bookings.find((x) => x.id === payment.booking_id);
  if (b) b.held_until = new Date().toISOString();
}

const learnerMayView = (b: StoredBooking, userId: string, role: string) =>
  role === "ADMIN" || b.learner_id === userId || b.instructor_id === userId;

/* ---------- handlers ---------- */

export const bookingHandlers = [
  /* OTO-1: the instructor's own hours. */
  http.get(url("/teach/availability"), async () => {
    await delay(200);
    const user = requireUser("INSTRUCTOR");
    if (user instanceof Response) return user;
    const a = db.availability[user.id] ?? { timezone: user.timezone, weekly: [], overrides: [], notice_hours: 12 };
    return HttpResponse.json({ availability: a });
  }),

  http.put(url("/teach/availability"), async ({ request }) => {
    await delay(350);
    const user = requireUser("INSTRUCTOR");
    if (user instanceof Response) return user;
    const readOnly = blockWhileImpersonating();
    if (readOnly) return readOnly;
    const parsed = AvailabilityInput.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const problems = availabilityProblems(parsed.data);
    if (problems.length) {
      const field_errors: Record<string, string[]> = {};
      for (const p of problems) (field_errors[p.path] ??= []).push(p.message);
      return apiError(422, "VALIDATION_FAILED", "Some times need another look.", field_errors);
    }
    const overrides = [...parsed.data.overrides].sort((a, b) => a.date.localeCompare(b.date));
    db.availability[user.id] = { ...parsed.data, overrides };
    save();
    // Existing requests and sessions are kept; only new requests use the new hours.
    return HttpResponse.json({ availability: db.availability[user.id] });
  }),

  /* OTO-2: free starts. Public so guests can see times before signing in. */
  http.get(url("/trainings/:id/slots"), async ({ params, request }) => {
    await delay(250);
    sweepBookings();
    const p = new URL(request.url).searchParams;
    const instructorId = p.get("instructor_id") ?? "";
    const duration = Number(p.get("duration_min"));
    if (!trainingFor1on1(params.id as string, instructorId)) return apiError(404, "NOT_FOUND", "That instructor doesn't teach this training one-on-one.");
    if (!Number.isInteger(duration) || duration < 30 || duration > 240) return apiError(422, "VALIDATION_FAILED", "Choose a session length.", { duration_min: ["Choose a session length."] });
    const a = db.availability[instructorId];
    if (!a) return HttpResponse.json({ instructor_timezone: findUser(instructorId)?.timezone ?? "UTC", duration_min: duration, slots: [] });
    const days = Math.min(Number(p.get("days")) || 28, 60);
    const slots = freeSlots({ availability: a, busy: busyFor(instructorId), durationMin: duration, from: p.get("from") ?? todayIn(a.timezone), days });
    return HttpResponse.json({ instructor_timezone: a.timezone, duration_min: duration, slots });
  }),

  /* PRC-7 before requesting. */
  http.get(url("/bookings/quote"), async ({ request }) => {
    await delay(150);
    const p = new URL(request.url).searchParams;
    const instructorId = p.get("instructor_id") ?? "";
    const t = trainingFor1on1(p.get("training_id") ?? "", instructorId);
    if (!t) return apiError(404, "NOT_FOUND", "That instructor doesn't teach this training one-on-one.");
    const price = resolvePrice(t, db.pricingRules, { instructorId, at: new Date() });
    if (!price) return apiError(409, "NO_PRICE", "This session can't be booked yet.");
    return HttpResponse.json({ breakdown: sessionBreakdown(price, Number(p.get("duration_min")) || 60), expiry_hours: db.settings.booking_expiry_hours });
  }),

  /* OTO-3, PAY-4: hold the slot, then send the learner to authorise their card. */
  http.post(url("/bookings"), async ({ request }) => {
    await delay(450);
    const user = requireUser("LEARNER");
    if (user instanceof Response) return user;
    const readOnly = blockWhileImpersonating();
    if (readOnly) return readOnly;
    const key = request.headers.get("Idempotency-Key");
    if (!key) return apiError(400, "IDEMPOTENCY_KEY_REQUIRED", "Missing Idempotency-Key header.");
    const again = db.payments.find((x) => x.idempotency_key === key && x.learner_id === user.id && x.booking_id);
    if (again) {
      const b = db.bookings.find((x) => x.id === again.booking_id)!;
      return HttpResponse.json({ booking: toBooking(b), checkout_url: `/mock-gateway?payment_id=${again.id}` }, { status: 201 });
    }
    sweepBookings();
    const parsed = BookingRequest.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const input = parsed.data;
    const t = trainingFor1on1(input.training_id, input.instructor_id);
    if (!t) return apiError(404, "NOT_FOUND", "That instructor doesn't teach this training one-on-one.");
    const a = db.availability[input.instructor_id];
    const start = new Date(input.start_utc);
    // Re-check on the server: the slot list the learner saw may be minutes old.
    const free =
      a &&
      freeSlots({ availability: a, busy: busyFor(input.instructor_id), durationMin: input.duration_min, from: todayIn(a.timezone, new Date(start.getTime() - 2 * DAY)), days: 4 }).includes(start.toISOString());
    if (!free) return apiError(409, "SLOT_TAKEN", "That time was just taken or is no longer available. Pick another time.");
    const price = resolvePrice(t, db.pricingRules, { instructorId: input.instructor_id, at: new Date() });
    if (!price) return apiError(409, "NO_PRICE", "This session can't be booked yet.");

    const now = new Date().toISOString();
    const breakdown = sessionBreakdown(price, input.duration_min);
    const booking: StoredBooking = {
      id: newId("bkg"),
      status: "DRAFT",
      training_id: t.id,
      instructor_id: input.instructor_id,
      learner_id: user.id,
      start_utc: start.toISOString(),
      end_utc: new Date(start.getTime() + input.duration_min * 60_000).toISOString(),
      duration_min: input.duration_min,
      note: input.note || null,
      expires_at: null,
      held_until: new Date(Date.now() + HOLD_MIN * 60_000).toISOString(),
      proposal: null,
      reschedule: null,
      meeting_url: null,
      breakdown,
      payment_id: newId("pay"),
      timeline: [],
      created_at: now,
    };
    const instructorName = findUser(input.instructor_id)?.name ?? "Instructor";
    db.bookings.push(booking);
    db.payments.push({
      id: booking.payment_id,
      learner_id: user.id,
      enrolment_id: null,
      booking_id: booking.id,
      description: `${t.title} · 1:1 with ${instructorName}`,
      breakdown,
      status: "PENDING",
      method: null,
      failure_message: null,
      refunded_amount: 0,
      created_at: now,
      captured_at: null,
      receipt_number: null,
      receipt_url: null,
      idempotency_key: key,
    });
    save();
    return HttpResponse.json({ booking: toBooking(booking), checkout_url: `/mock-gateway?payment_id=${booking.payment_id}` }, { status: 201 });
  }),

  http.get(url("/bookings/:id"), async ({ params }) => {
    await delay(200);
    const user = requireUser();
    if (user instanceof Response) return user;
    sweepBookings();
    const b = db.bookings.find((x) => x.id === params.id);
    if (!b || !learnerMayView(b, user.id, user.role)) return apiError(404, "NOT_FOUND", "We couldn't find that booking.");
    // Reading the booking is when the mock gateway's "webhook" lands (see checkout.ts).
    const payment = db.payments.find((x) => x.id === b.payment_id);
    if (payment) settle(payment);
    return HttpResponse.json({ booking: toBooking(b) });
  }),

  http.get(url("/me/bookings"), async () => {
    await delay(250);
    const user = requireUser("LEARNER");
    if (user instanceof Response) return user;
    sweepBookings();
    const items = db.bookings
      // Drafts that never reached the instructor aren't bookings to the learner.
      .filter((b) => b.learner_id === user.id && b.status !== "DRAFT")
      .sort((a, b) => b.start_utc.localeCompare(a.start_utc))
      .map(toBooking);
    return HttpResponse.json({ items });
  }),
];
