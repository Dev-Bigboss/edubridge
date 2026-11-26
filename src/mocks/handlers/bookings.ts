import { delay } from "msw";
import { http, HttpResponse } from "msw/http";
import { AvailabilityInput, BookingRequest, type Booking } from "@/lib/api/schemas/bookings";
import { sessionBreakdown } from "@/lib/domain/checkout";
import { formatMoney } from "@/lib/domain/money";
import { cancellationRefund } from "@/lib/domain/policy";
import { cohortSessions } from "@/lib/domain/cohort-schedule";
import { MODALITY } from "@/lib/domain/enums";
import { resolvePrice } from "@/lib/domain/pricing";
import { availabilityProblems, freeSlots, todayIn, type Busy } from "@/lib/domain/slots";
import { formatSessionTime } from "@/lib/domain/time";
import { canTransition, type BookingAction } from "@/lib/domain/booking-machine";
import { db, findUser, newId, notify, save, sendMail, type StoredBooking } from "../db";
import { omit } from "./catalog";
import { nextReceiptNumber, refundPayment, settle } from "./checkout";
import { apiError, blockWhileImpersonating, requireUser, url, validationError } from "./util";

type StoredPayment = (typeof db.payments)[number];

/** A learner has this long on the payment page before the held slot is released. */
const HOLD_MIN = 30;
const HOLDING = new Set(["PENDING_INSTRUCTOR", "COUNTER_PROPOSED", "ACCEPTED", "RESCHEDULE_REQUESTED"]);
const TEACHING = new Set(["OPEN", "FULL", "CLOSED", "IN_PROGRESS"]);
const DAY = 86_400_000;
/** Plan §2.1: the learner answers a counter-proposal within 48 h, well inside the card hold's ~7 days. */
export const PROPOSAL_EXPIRY_HOURS = 48;

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
    for (const session of cohortSessions(c)) busy.push({ start: session.start_utc, end: session.end_utc });
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
    if (b.status === "COUNTER_PROPOSED" && b.expires_at && new Date(b.expires_at) <= now) {
      b.status = "EXPIRED";
      b.expires_at = null;
      b.proposal = null;
      b.timeline.push({ at: now.toISOString(), actor: "SYSTEM", event: "EXPIRED", note: null });
      const payment = db.payments.find((p) => p.id === b.payment_id);
      if (payment?.status === "AUTHORISED") payment.status = "VOIDED";
      for (const userId of [b.learner_id, b.instructor_id]) {
        notify(userId, {
          type: "BOOKING_EXPIRED",
          title: "The proposed time expired",
          body: "Nobody accepted the new time in time, so the request is closed. The card hold is released.",
          link: userId === b.learner_id ? `/learn/bookings/${b.id}` : "/teach/requests",
        });
      }
      changed = true;
    }
  }
  for (const b of db.bookings) {
    // OTO-9: an unanswered reschedule lapses; the original time stands.
    if (b.status === "RESCHEDULE_REQUESTED" && b.expires_at && new Date(b.expires_at) <= now) {
      const requester = b.reschedule?.requested_by === "LEARNER" ? b.learner_id : b.instructor_id;
      b.status = "ACCEPTED";
      b.reschedule = null;
      b.expires_at = null;
      b.timeline.push({ at: now.toISOString(), actor: "SYSTEM", event: "RESCHEDULE_DECLINED", note: "No answer in time; the original time stands." });
      notify(requester, {
        type: "BOOKING_RESCHEDULED",
        title: "Your new time wasn't accepted in time",
        body: "The session stays at its original time.",
        link: requester === b.learner_id ? `/learn/bookings/${b.id}` : "/teach/requests",
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
      policy: { learner_tiers: db.settings.learner_cancellation.tiers, instructor_refund_percent: db.settings.instructor_cancellation.refund_percent },
      cancellation: null,
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

  /* ---------- the instructor's side (OTO-4) ---------- */
  http.get(url("/teach/bookings"), async () => {
    await delay(250);
    const user = requireUser("INSTRUCTOR");
    if (user instanceof Response) return user;
    sweepBookings();
    const items = db.bookings
      .filter((b) => b.instructor_id === user.id && b.status !== "DRAFT")
      .sort((a, b) => a.start_utc.localeCompare(b.start_utc))
      .map(toBooking);
    return HttpResponse.json({ items });
  }),

  /**
   * OTO-4/6/8, PAY-4: accept | decline | propose (instructor), accept-proposal | decline-proposal
   * (learner). The booking state machine decides what each person may do.
   */
  http.post(url("/bookings/:id/:action"), async ({ params, request }) => {
    await delay(450);
    const user = requireUser("LEARNER", "INSTRUCTOR");
    if (user instanceof Response) return user;
    const readOnly = blockWhileImpersonating();
    if (readOnly) return readOnly;
    sweepBookings();
    const b = db.bookings.find((x) => x.id === params.id);
    const mine = b && (user.role === "LEARNER" ? b.learner_id === user.id : b.instructor_id === user.id);
    if (!b || !mine) return apiError(404, "NOT_FOUND", "We couldn't find that booking.");
    const ACTIONS: Record<string, BookingAction> = {
      accept: "ACCEPT",
      decline: "DECLINE",
      propose: "PROPOSE_TIME",
      "accept-proposal": "ACCEPT_PROPOSAL",
      "decline-proposal": "DECLINE_PROPOSAL",
      reschedule: "REQUEST_RESCHEDULE",
      "accept-reschedule": "ACCEPT_RESCHEDULE",
      "decline-reschedule": "DECLINE_RESCHEDULE",
      cancel: "CANCEL",
    };
    const action = ACTIONS[params.action as string];
    if (!action) return apiError(404, "NOT_FOUND", "Unknown action.");
    // OTO-9: the person who asked for a reschedule waits for the other side.
    const ownReschedule = (action === "ACCEPT_RESCHEDULE" || action === "DECLINE_RESCHEDULE") && b.reschedule?.requested_by === user.role;
    if (!canTransition(b.status, action, user.role) || ownReschedule) {
      const why = b.status === "EXPIRED" ? "This request has expired." : "This booking has already moved on. Refresh to see where it stands.";
      return apiError(409, "INVALID_TRANSITION", why);
    }
    const body = (await request.json().catch(() => ({}))) as { reason?: string; start_utc?: string; note?: string };
    const now = new Date();
    const at = now.toISOString();
    const payment = db.payments.find((p) => p.id === b.payment_id)!;
    const learner = findUser(b.learner_id);
    const instructor = findUser(b.instructor_id);
    const confirm = (actor: "INSTRUCTOR" | "LEARNER", event: "ACCEPTED" | "PROPOSAL_ACCEPTED") => {
      // PAY-4: capture only now. OTO-8: meeting link, invites and reminders.
      payment.status = "CAPTURED";
      payment.captured_at = at;
      payment.receipt_number = nextReceiptNumber(at);
      b.status = "ACCEPTED";
      b.expires_at = null;
      b.meeting_url = `https://meet.example.com/edubridge/${b.id}`;
      b.timeline.push({ at, actor, event, note: null });
      for (const person of [learner, instructor]) {
        if (!person) continue;
        sendMail(person.email, `Confirmed: ${formatSessionTime(b.start_utc, person.timezone)} (calendar invite attached)`, person.role === "LEARNER" ? `/learn/bookings/${b.id}` : "/teach/requests");
      }
      notify(actor === "INSTRUCTOR" ? b.learner_id : b.instructor_id, {
        type: "BOOKING_ACCEPTED",
        title: "Session confirmed",
        body: `${formatSessionTime(b.start_utc, (actor === "INSTRUCTOR" ? learner : instructor)?.timezone ?? "UTC")}. The join link and calendar invite are ready.`,
        link: actor === "INSTRUCTOR" ? `/learn/bookings/${b.id}` : "/teach/requests",
      });
    };
    const freeFor = (startIso: string) => {
      const a = db.availability[b.instructor_id];
      const start = new Date(startIso);
      return (
        !!a &&
        freeSlots({ availability: a, busy: busyFor(b.instructor_id, now, b.id), durationMin: b.duration_min, from: todayIn(a.timezone, new Date(start.getTime() - 2 * DAY)), days: 4 }).includes(start.toISOString())
      );
    };

    switch (action) {
      case "ACCEPT":
        confirm("INSTRUCTOR", "ACCEPTED");
        break;
      case "DECLINE": {
        const reason = body.reason?.trim() ?? "";
        if (reason.length < 5) return apiError(422, "VALIDATION_FAILED", "Say why, in a few words.", { reason: ["Tell the learner why, in a few words. They see this."] });
        b.status = "DECLINED";
        b.expires_at = null;
        payment.status = "VOIDED";
        b.timeline.push({ at, actor: "INSTRUCTOR", event: "DECLINED", note: reason });
        notify(b.learner_id, {
          type: "BOOKING_DECLINED",
          title: `${instructor?.name ?? "The instructor"} can't take this session`,
          body: `${reason} Your card wasn't charged and the hold is released.`,
          link: `/learn/bookings/${b.id}`,
        });
        break;
      }
      case "PROPOSE_TIME": {
        if (!body.start_utc || Number.isNaN(Date.parse(body.start_utc))) {
          return apiError(422, "VALIDATION_FAILED", "Pick a time.", { start_utc: ["Pick a time from your free times."] });
        }
        if (!freeFor(body.start_utc)) return apiError(409, "SLOT_TAKEN", "That time isn't free in your calendar any more. Pick another.");
        const start = new Date(body.start_utc);
        b.status = "COUNTER_PROPOSED";
        b.proposal = { start_utc: start.toISOString(), end_utc: new Date(start.getTime() + b.duration_min * 60_000).toISOString(), note: body.note?.trim() || null };
        b.expires_at = new Date(now.getTime() + PROPOSAL_EXPIRY_HOURS * 3_600_000).toISOString();
        b.timeline.push({ at, actor: "INSTRUCTOR", event: "TIME_PROPOSED", note: b.proposal.note });
        notify(b.learner_id, {
          type: "BOOKING_RESCHEDULED",
          title: `${instructor?.name ?? "Your instructor"} proposed another time`,
          body: `${formatSessionTime(b.proposal.start_utc, learner?.timezone ?? "UTC")}. Accept or decline within ${PROPOSAL_EXPIRY_HOURS} hours.`,
          link: `/learn/bookings/${b.id}`,
        });
        break;
      }
      case "ACCEPT_PROPOSAL": {
        if (!b.proposal) return apiError(409, "INVALID_TRANSITION", "There's no proposed time to accept.");
        if (!freeFor(b.proposal.start_utc)) return apiError(409, "SLOT_TAKEN", "That time is no longer free. Ask the instructor for another.");
        b.start_utc = b.proposal.start_utc;
        b.end_utc = b.proposal.end_utc;
        b.proposal = null;
        confirm("LEARNER", "PROPOSAL_ACCEPTED");
        break;
      }
      case "REQUEST_RESCHEDULE": {
        if (Date.parse(b.start_utc) <= now.getTime()) return apiError(409, "SESSION_STARTED", "This session has already started.");
        if (!body.start_utc || Number.isNaN(Date.parse(body.start_utc))) {
          return apiError(422, "VALIDATION_FAILED", "Pick a time.", { start_utc: ["Pick one of the free times."] });
        }
        if (!freeFor(body.start_utc)) return apiError(409, "SLOT_TAKEN", "That time isn't free any more. Pick another.");
        const start = new Date(body.start_utc);
        b.status = "RESCHEDULE_REQUESTED";
        b.reschedule = {
          requested_by: user.role as "LEARNER" | "INSTRUCTOR",
          start_utc: start.toISOString(),
          end_utc: new Date(start.getTime() + b.duration_min * 60_000).toISOString(),
          note: body.note?.trim() || null,
        };
        // Answer within 48 h, and before the original start: after that the original time stands.
        b.expires_at = new Date(Math.min(now.getTime() + PROPOSAL_EXPIRY_HOURS * 3_600_000, Date.parse(b.start_utc))).toISOString();
        b.timeline.push({ at, actor: user.role as "LEARNER" | "INSTRUCTOR", event: "RESCHEDULE_REQUESTED", note: b.reschedule.note });
        const other = user.role === "LEARNER" ? instructor : learner;
        if (other) {
          notify(other.id, {
            type: "BOOKING_RESCHEDULED",
            title: `${user.name} asked to move your session`,
            body: `New time: ${formatSessionTime(b.reschedule.start_utc, other.timezone)}. Accept or keep the original time.`,
            link: other.role === "LEARNER" ? `/learn/bookings/${b.id}` : "/teach/requests",
          });
        }
        break;
      }
      case "ACCEPT_RESCHEDULE":
      case "DECLINE_RESCHEDULE": {
        if (!b.reschedule) return apiError(409, "INVALID_TRANSITION", "There's no reschedule to answer.");
        const accepted = action === "ACCEPT_RESCHEDULE";
        if (accepted && !freeFor(b.reschedule.start_utc)) return apiError(409, "SLOT_TAKEN", "That time is no longer free, so the original time stands.");
        const requester = b.reschedule.requested_by === "LEARNER" ? learner : instructor;
        if (accepted) {
          b.start_utc = b.reschedule.start_utc;
          b.end_utc = b.reschedule.end_utc;
        }
        b.status = "ACCEPTED";
        b.reschedule = null;
        b.expires_at = null;
        b.timeline.push({ at, actor: user.role as "LEARNER" | "INSTRUCTOR", event: accepted ? "RESCHEDULE_ACCEPTED" : "RESCHEDULE_DECLINED", note: body.note?.trim() || null });
        if (requester) {
          notify(requester.id, {
            type: "BOOKING_RESCHEDULED",
            title: accepted ? "New time confirmed" : "The original time stands",
            body: accepted ? `${formatSessionTime(b.start_utc, requester.timezone)}. Your calendar invite has been updated.` : `${user.name} kept the original time.`,
            link: requester.role === "LEARNER" ? `/learn/bookings/${b.id}` : "/teach/requests",
          });
          if (accepted) sendMail(requester.email, "Session moved (updated calendar invite attached)", requester.role === "LEARNER" ? `/learn/bookings/${b.id}` : "/teach/requests");
        }
        break;
      }
      case "CANCEL": {
        const reason = body.reason?.trim() ?? "";
        if (reason.length < 5) return apiError(422, "VALIDATION_FAILED", "Say why, in a few words.", { reason: ["Say why, in a few words. The other person sees this."] });
        const by = user.role as "LEARNER" | "INSTRUCTOR";
        const refund = cancellationRefund({ policy: b.policy, total: b.breakdown.total, startUtc: b.start_utc, by, now });
        if (!refund.allowed) return apiError(409, "SESSION_STARTED", "This session has already started, so it can't be cancelled.");
        if (refund.amount > 0) refundPayment(payment, refund.amount);
        b.status = "CANCELLED";
        b.reschedule = null;
        b.expires_at = null;
        b.cancellation = { by, reason, refund_amount: refund.amount };
        b.timeline.push({ at, actor: by, event: "CANCELLED", note: reason });
        const money = formatMoney({ amount: refund.amount, currency: b.breakdown.currency });
        const other = by === "LEARNER" ? instructor : learner;
        if (other) {
          notify(other.id, {
            type: "BOOKING_DECLINED",
            title: `${user.name} cancelled your session`,
            body: by === "INSTRUCTOR" ? `${reason} You've been refunded ${money}.` : reason,
            link: other.role === "LEARNER" ? `/learn/bookings/${b.id}` : "/teach/requests",
          });
        }
        if (by === "LEARNER" && refund.amount > 0) {
          notify(b.learner_id, { type: "PAYMENT_REFUNDED", title: `${money} refunded`, body: `${refund.percent}% back under the cancellation policy.`, link: "/learn/payments" });
        }
        break;
      }
      case "DECLINE_PROPOSAL":
        b.status = "DECLINED";
        b.expires_at = null;
        b.proposal = null;
        payment.status = "VOIDED";
        b.timeline.push({ at, actor: "LEARNER", event: "PROPOSAL_DECLINED", note: body.note?.trim() || null });
        notify(b.instructor_id, {
          type: "BOOKING_DECLINED",
          title: `${learner?.name ?? "The learner"} declined your proposed time`,
          body: "The request is closed and their card hold is released.",
          link: "/teach/requests",
        });
        break;
    }
    save();
    return HttpResponse.json({ booking: toBooking(b) });
  }),

  /* ---------- Admin: list bookings (admin gap #4) ---------- */
  http.get(url("/admin/bookings"), async ({ request }) => {
    await delay(250);
    const admin = requireUser("ADMIN");
    if (admin instanceof Response) return admin;
    sweepBookings();
    const p = new URL(request.url).searchParams;
    const status = p.get("status");
    const q = p.get("q")?.toLowerCase() ?? "";
    const items = db.bookings
      .filter((b) => {
        if (b.status === "DRAFT") return false;
        if (status && b.status !== status) return false;
        if (q) {
          const learner = findUser(b.learner_id);
          const instructor = findUser(b.instructor_id);
          const training = db.trainings.find((t) => t.id === b.training_id);
          const hay = `${learner?.name ?? ""} ${instructor?.name ?? ""} ${training?.title ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(toBooking);
    return HttpResponse.json({ items });
  }),
];
