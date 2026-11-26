import { delay } from "msw";
import { http, HttpResponse } from "msw/http";
import { RecordingUpdate, type Recording } from "@/lib/api/schemas/recordings";
import { trimProblem, TRIM_PROBLEMS } from "@/lib/domain/recordings";
import { db, findUser, notify, save, type MockUser, type StoredRecording } from "../db";
import { apiError, blockWhileImpersonating, requireUser, url, validationError } from "./util";

const MONTH = 30.44 * 86_400_000;

const deleteAt = (r: StoredRecording) => new Date(Date.parse(r.recorded_at) + db.settings.recording_retention_months * MONTH).toISOString();

/**
 * REC-2/5: the provider finishes processing (learners are told), and recordings past the
 * retention period are deleted. The backend runs both from webhooks and a scheduler.
 */
export function sweepRecordings(now = Date.now()) {
  let changed = false;
  for (const r of db.recordings) {
    if (r.status === "PROCESSING" && r.ready_at && Date.parse(r.ready_at) <= now) {
      r.status = "READY";
      r.ready_at = null;
      const title = db.trainings.find((t) => t.id === r.training_id)?.title ?? "your training";
      for (const learnerId of learnersOf(r)) {
        notify(learnerId, { type: "RECORDING_ADDED", title: "New recording", body: `A class recording for ${title} is ready to watch.`, link: `/learn/recordings/${r.id}` });
      }
      changed = true;
    }
  }
  const kept = db.recordings.filter((r) => Date.parse(deleteAt(r)) > now);
  if (kept.length !== db.recordings.length) {
    db.recordings = kept;
    changed = true;
  }
  if (changed) save();
}

function learnersOf(r: StoredRecording): string[] {
  if (r.cohort_id) return db.enrolments.filter((e) => e.cohort_id === r.cohort_id && e.status === "CONFIRMED").map((e) => e.learner_id);
  const b = db.bookings.find((x) => x.id === r.booking_id);
  return b ? [b.learner_id] : [];
}

/** REC-3: who may see a recording, and whether this person manages it. */
function access(r: StoredRecording, user: MockUser): "MANAGE" | "WATCH" | null {
  if (user.role === "ADMIN") return "MANAGE"; // moderation
  if (user.role === "INSTRUCTOR") return r.instructor_id === user.id ? "MANAGE" : null;
  if (r.hidden || r.status !== "READY") return null;
  return learnersOf(r).includes(user.id) ? "WATCH" : null;
}

function toRecording(r: StoredRecording, user: MockUser): Recording {
  const title = db.trainings.find((t) => t.id === r.training_id)?.title ?? "Training";
  const cohort = r.cohort_id ? db.cohorts.find((c) => c.id === r.cohort_id) : null;
  const booking = r.booking_id ? db.bookings.find((b) => b.id === r.booking_id) : null;
  const other = booking ? findUser(user.id === booking.learner_id ? booking.instructor_id : booking.learner_id)?.name : null;
  return {
    id: r.id,
    session_id: r.session_id,
    kind: r.kind,
    training: { id: r.training_id, title },
    subtitle: cohort?.name ?? other ?? "",
    recorded_at: r.recorded_at,
    duration_sec: r.duration_sec,
    status: r.status,
    hidden: r.hidden,
    trim: r.trim,
    has_captions: r.has_captions,
    delete_at: deleteAt(r),
    resume_sec: db.recordingProgress[user.id]?.[r.id] ?? 0,
  };
}

function find(id: string, user: MockUser) {
  sweepRecordings();
  const r = db.recordings.find((x) => x.id === id);
  const level = r ? access(r, user) : null;
  return r && level ? { r, level } : null;
}

const notFound = () => apiError(404, "NOT_FOUND", "That recording isn't available. It may have been removed, or it's not from one of your sessions.");

export const recordingHandlers = [
  http.get(url("/me/recordings"), async ({ request }) => {
    await delay(250);
    const user = requireUser("LEARNER");
    if (user instanceof Response) return user;
    sweepRecordings();
    const trainingId = new URL(request.url).searchParams.get("training_id");
    const items = db.recordings
      .filter((r) => access(r, user) && (!trainingId || r.training_id === trainingId))
      .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))
      .map((r) => toRecording(r, user));
    return HttpResponse.json({ items });
  }),

  http.get(url("/teach/recordings"), async () => {
    await delay(250);
    const user = requireUser("INSTRUCTOR");
    if (user instanceof Response) return user;
    sweepRecordings();
    const items = db.recordings
      .filter((r) => r.instructor_id === user.id)
      .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))
      .map((r) => toRecording(r, user));
    return HttpResponse.json({ items });
  }),

  http.get(url("/recordings/:id"), async ({ params }) => {
    await delay(200);
    const user = requireUser();
    if (user instanceof Response) return user;
    const found = find(params.id as string, user);
    return found ? HttpResponse.json({ recording: toRecording(found.r, user) }) : notFound();
  }),

  /** REC-6: a signed, expiring link per viewing. The demo clip ignores the token. */
  http.get(url("/recordings/:id/playback"), async ({ params }) => {
    await delay(200);
    const user = requireUser();
    if (user instanceof Response) return user;
    const found = find(params.id as string, user);
    if (!found) return notFound();
    if (found.r.status !== "READY") return apiError(409, "NOT_READY", "This recording is still processing. Try again in a few minutes.");
    const expires = new Date(Date.now() + 60 * 60_000).toISOString();
    const token = Math.random().toString(36).slice(2);
    return HttpResponse.json({
      url: `/demo/recording-sample.webm?token=${token}&expires=${encodeURIComponent(expires)}`,
      captions_url: found.r.has_captions ? "/demo/captions.vtt" : null,
      expires_at: expires,
    });
  }),

  /** REC-4: remember where this person stopped. Not a change to the recording, so allowed while viewing as. */
  http.put(url("/recordings/:id/progress"), async ({ params, request }) => {
    const user = requireUser();
    if (user instanceof Response) return user;
    const found = find(params.id as string, user);
    if (!found) return notFound();
    if (db.impersonation) return new HttpResponse(null, { status: 204 }); // an admin viewing as someone leaves no trace
    const { position_sec } = (await request.json()) as { position_sec?: number };
    if (typeof position_sec !== "number" || position_sec < 0) return apiError(422, "VALIDATION_FAILED", "Send position_sec.");
    (db.recordingProgress[user.id] ??= {})[found.r.id] = Math.floor(Math.min(position_sec, found.r.duration_sec));
    save();
    return new HttpResponse(null, { status: 204 });
  }),

  /** REC-5: the instructor hides, shows or trims. */
  http.patch(url("/recordings/:id"), async ({ params, request }) => {
    await delay(300);
    const user = requireUser("INSTRUCTOR", "ADMIN");
    if (user instanceof Response) return user;
    const readOnly = blockWhileImpersonating();
    if (readOnly) return readOnly;
    const found = find(params.id as string, user);
    if (!found || found.level !== "MANAGE") return notFound();
    const parsed = RecordingUpdate.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const { hidden, trim } = parsed.data;
    if (trim) {
      const problem = trimProblem(trim.start_sec, trim.end_sec, found.r.duration_sec);
      if (problem) return apiError(422, "VALIDATION_FAILED", TRIM_PROBLEMS[problem], { "trim.end_sec": [TRIM_PROBLEMS[problem]] });
    }
    if (hidden !== undefined) found.r.hidden = hidden;
    if (trim !== undefined) found.r.trim = trim && trim.start_sec === 0 && trim.end_sec === found.r.duration_sec ? null : trim;
    save();
    return HttpResponse.json({ recording: toRecording(found.r, user) });
  }),

  http.delete(url("/recordings/:id"), async ({ params }) => {
    await delay(300);
    const user = requireUser("INSTRUCTOR", "ADMIN");
    if (user instanceof Response) return user;
    const readOnly = blockWhileImpersonating();
    if (readOnly) return readOnly;
    const found = find(params.id as string, user);
    if (!found || found.level !== "MANAGE") return notFound();
    db.recordings = db.recordings.filter((r) => r.id !== found.r.id);
    save();
    return new HttpResponse(null, { status: 204 });
  }),

  /* ---------- Admin: all recordings for moderation (REC-3) ---------- */
  http.get(url("/admin/recordings"), async () => {
    await delay(250);
    const admin = requireUser("ADMIN");
    if (admin instanceof Response) return admin;
    sweepRecordings();
    const items = db.recordings
      .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))
      .map((r) => toRecording(r, admin));
    return HttpResponse.json({ items });
  }),
];
