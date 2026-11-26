import { delay } from "msw";
import { http, HttpResponse } from "msw/http";
import { AttendanceInput, type ScheduleItem } from "@/lib/api/schemas/sessions";
import type { Cohort } from "@/lib/api/schemas/cohort";
import { cohortSessions, type DatedSession } from "@/lib/domain/cohort-schedule";
import { db, findUser, save, type StoredBooking } from "../db";
import { sweepBookings } from "./bookings";
import { apiError, blockWhileImpersonating, requireUser, url, validationError } from "./util";

const DAY = 86_400_000;
const LISTED_COHORTS = new Set(["OPEN", "FULL", "CLOSED", "IN_PROGRESS", "COMPLETED"]);
const LISTED_BOOKINGS = new Set(["ACCEPTED", "RESCHEDULE_REQUESTED", "COMPLETED", "NO_SHOW"]);

/** Zoom will issue these (plan §8 Q1); one link per class, stable for the cohort's learners. */
export const cohortJoinUrl = (sessionId: string) => `https://meet.example.com/edubridge/${sessionId.replace(":", "-")}`;

const rosterOf = (cohortId: string) =>
  db.enrolments.filter((e) => e.cohort_id === cohortId && e.status === "CONFIRMED").map((e) => e.learner_id);

function cohortItem(c: Cohort, s: DatedSession): ScheduleItem {
  const roster = rosterOf(c.id);
  const marks = db.attendance[s.id] ?? {};
  const taken = roster.length > 0 && roster.every((id) => marks[id]);
  return {
    id: s.id,
    kind: "COHORT",
    training_title: db.trainings.find((t) => t.id === c.training_id)?.title ?? "Training",
    subtitle: c.name,
    start_utc: s.start_utc,
    end_utc: s.end_utc,
    join_url: c.status === "CANCELLED" ? null : cohortJoinUrl(s.id),
    status: c.status === "CANCELLED" ? "CANCELLED" : Date.parse(s.end_utc) < Date.now() && taken ? "COMPLETED" : "SCHEDULED",
    attendance: { taken, present: roster.filter((id) => marks[id] && marks[id] !== "ABSENT").length, total: roster.length },
  };
}

function bookingItem(b: StoredBooking): ScheduleItem {
  const mark = db.attendance[b.id]?.[b.learner_id];
  return {
    id: b.id,
    kind: "ONE_ON_ONE",
    training_title: db.trainings.find((t) => t.id === b.training_id)?.title ?? "Training",
    subtitle: findUser(b.learner_id)?.name ?? "Learner",
    start_utc: b.start_utc,
    end_utc: b.end_utc,
    join_url: b.meeting_url,
    status: b.status === "COMPLETED" ? "COMPLETED" : b.status === "NO_SHOW" ? "NO_SHOW" : "SCHEDULED",
    attendance: { taken: !!mark, present: mark && mark !== "ABSENT" ? 1 : 0, total: 1 },
  };
}

/** OTO-10: everything this instructor teaches in a window, cohort classes and 1:1 sessions together. */
export function scheduleFor(instructorId: string, from: number, to: number): ScheduleItem[] {
  const items: ScheduleItem[] = [];
  for (const c of db.cohorts) {
    if (c.instructor_id !== instructorId || !LISTED_COHORTS.has(c.status)) continue;
    for (const s of cohortSessions(c)) {
      const t = Date.parse(s.start_utc);
      if (t >= from && t < to) items.push(cohortItem(c, s));
    }
  }
  for (const b of db.bookings) {
    if (b.instructor_id !== instructorId || !LISTED_BOOKINGS.has(b.status)) continue;
    const t = Date.parse(b.start_utc);
    if (t >= from && t < to) items.push(bookingItem(b));
  }
  return items.sort((a, b) => a.start_utc.localeCompare(b.start_utc));
}

/** Finds a session by id for its instructor: a cohort class (`cohort:date`) or a 1:1 booking. */
export function findSession(id: string, instructorId: string) {
  if (id.includes(":")) {
    const [cohortId] = id.split(":");
    const c = db.cohorts.find((x) => x.id === cohortId && x.instructor_id === instructorId);
    const s = c && cohortSessions(c).find((x) => x.id === id);
    return c && s ? { kind: "COHORT" as const, cohort: c, session: s } : null;
  }
  const b = db.bookings.find((x) => x.id === id && x.instructor_id === instructorId && LISTED_BOOKINGS.has(x.status));
  return b ? { kind: "ONE_ON_ONE" as const, booking: b } : null;
}

/** The session's start and the learners on it (cohort seats, or the 1:1 learner). */
export function sessionFacts(found: NonNullable<ReturnType<typeof findSession>>) {
  return found.kind === "COHORT"
    ? { start_utc: found.session.start_utc, kind: found.kind, training_id: found.cohort.training_id, learners: rosterOf(found.cohort.id) }
    : { start_utc: found.booking.start_utc, kind: found.kind, training_id: found.booking.training_id, learners: [found.booking.learner_id] };
}

function detail(found: NonNullable<ReturnType<typeof findSession>>) {
  if (found.kind === "COHORT") {
    const marks = db.attendance[found.session.id] ?? {};
    return {
      session: cohortItem(found.cohort, found.session),
      roster: rosterOf(found.cohort.id)
        .map((id) => ({ learner_id: id, name: findUser(id)?.name ?? "Learner", status: marks[id] ?? null }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }
  const b = found.booking;
  return { session: bookingItem(b), roster: [{ learner_id: b.learner_id, name: findUser(b.learner_id)?.name ?? "Learner", status: db.attendance[b.id]?.[b.learner_id] ?? null }] };
}

/** The learner's next class in a cohort, with its join link. */
export function nextCohortSession(c: Cohort, now = Date.now()) {
  if (c.status === "CANCELLED") return null;
  const s = cohortSessions(c).find((x) => Date.parse(x.end_utc) > now);
  return s ? { id: s.id, start_utc: s.start_utc, end_utc: s.end_utc, join_url: cohortJoinUrl(s.id) } : null;
}

export const sessionHandlers = [
  http.get(url("/teach/schedule"), async ({ request }) => {
    await delay(250);
    const user = requireUser("INSTRUCTOR");
    if (user instanceof Response) return user;
    sweepBookings();
    const p = new URL(request.url).searchParams;
    const from = p.get("from") ? Date.parse(`${p.get("from")}T00:00:00Z`) : Date.now() - 7 * DAY;
    const days = Math.min(Number(p.get("days")) || 35, 90);
    return HttpResponse.json({ items: scheduleFor(user.id, from, from + days * DAY) });
  }),

  http.get(url("/sessions/:id"), async ({ params }) => {
    await delay(200);
    const user = requireUser("INSTRUCTOR");
    if (user instanceof Response) return user;
    const found = findSession(decodeURIComponent(params.id as string), user.id);
    if (!found) return apiError(404, "NOT_FOUND", "We couldn't find that session.");
    return HttpResponse.json(detail(found));
  }),

  /**
   * COH-4: attendance, from the start of the session. For a 1:1, present or late completes the
   * session; absent marks the learner as a no-show (booking state machine: MARK_NO_SHOW).
   */
  http.put(url("/sessions/:id/attendance"), async ({ params, request }) => {
    await delay(350);
    const user = requireUser("INSTRUCTOR");
    if (user instanceof Response) return user;
    const readOnly = blockWhileImpersonating();
    if (readOnly) return readOnly;
    const found = findSession(decodeURIComponent(params.id as string), user.id);
    if (!found) return apiError(404, "NOT_FOUND", "We couldn't find that session.");
    const start = found.kind === "COHORT" ? found.session.start_utc : found.booking.start_utc;
    if (Date.parse(start) > Date.now()) return apiError(409, "NOT_STARTED", "You can take attendance once the session has started.");
    const parsed = AttendanceInput.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const roster = new Set(found.kind === "COHORT" ? rosterOf(found.cohort.id) : [found.booking.learner_id]);
    const unknown = parsed.data.marks.find((m) => !roster.has(m.learner_id));
    if (unknown) return apiError(422, "VALIDATION_FAILED", "Someone on the list isn't in this session.");
    const id = found.kind === "COHORT" ? found.session.id : found.booking.id;
    db.attendance[id] = { ...(db.attendance[id] ?? {}), ...Object.fromEntries(parsed.data.marks.map((m) => [m.learner_id, m.status])) };
    if (found.kind === "ONE_ON_ONE") {
      const b = found.booking;
      const mark = db.attendance[id][b.learner_id];
      const at = new Date().toISOString();
      const next = mark === "ABSENT" ? "NO_SHOW" : "COMPLETED";
      if (b.status !== next && (b.status === "ACCEPTED" || b.status === "COMPLETED" || b.status === "NO_SHOW")) {
        b.status = next;
        b.timeline.push({ at, actor: "INSTRUCTOR", event: next, note: null });
      }
    }
    save();
    return HttpResponse.json(detail(found));
  }),
];
