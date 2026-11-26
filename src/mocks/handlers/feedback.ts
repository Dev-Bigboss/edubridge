import { delay } from "msw";
import { http, HttpResponse } from "msw/http";
import { FeedbackInput, RubricInput, type Feedback, type Rubric } from "@/lib/api/schemas/feedback";
import { cohortSessions } from "@/lib/domain/cohort-schedule";
import { criterionKey, rubricFor, rubricProblems, scoreProblems } from "@/lib/domain/feedback";
import { audit, db, findUser, newId, notify, save, type StoredFeedback } from "../db";
import { findSession, sessionFacts } from "./sessions";
import { getUploadedFile } from "./uploads";
import { apiError, blockWhileImpersonating, requireUser, url, validationError } from "./util";

/** When and what kind of session a feedback belongs to, for display. */
function sessionInfo(id: string): { start_utc: string; kind: "COHORT" | "ONE_ON_ONE" } {
  if (id.includes(":")) {
    const cohort = db.cohorts.find((c) => c.id === id.split(":")[0]);
    const s = cohort && cohortSessions(cohort).find((x) => x.id === id);
    return { start_utc: s?.start_utc ?? id.split(":")[1] ?? "", kind: "COHORT" };
  }
  return { start_utc: db.bookings.find((b) => b.id === id)?.start_utc ?? "", kind: "ONE_ON_ONE" };
}

function toFeedback(f: StoredFeedback): Feedback {
  const info = sessionInfo(f.session_id);
  const { instructor_id, learner_id, ...rest } = f;
  return {
    ...rest,
    session_start_utc: info.start_utc,
    session_kind: info.kind,
    training_title: db.trainings.find((t) => t.id === f.training_id)?.title ?? "Training",
    instructor: { id: instructor_id, name: findUser(instructor_id)?.name ?? "Instructor" },
    learner: { id: learner_id, name: findUser(learner_id)?.name ?? "Learner" },
  };
}

const newestFirst = (a: StoredFeedback, b: StoredFeedback) => b.created_at.localeCompare(a.created_at);
const categoryOf = (trainingId: string) => db.trainings.find((t) => t.id === trainingId)?.category_id ?? null;

/** RubricInput → stored criteria, keeping existing keys so past feedback still lines up (FDB-2). */
function buildCriteria(input: RubricInput) {
  const taken: string[] = [];
  return input.criteria.map((c) => {
    const key = c.key && !taken.includes(c.key) ? c.key : criterionKey(c.label, taken);
    taken.push(key);
    return { key, label: c.label, description: c.description || null };
  });
}

/** One default; a category belongs to at most one live rubric; the default isn't tied to categories. */
function rubricConflict(input: RubricInput, id: string | null): { field: string; message: string } | null {
  const problem = rubricProblems(input.criteria);
  if (problem) return { field: "criteria", message: problem };
  if (!input.is_default) {
    const current = db.rubrics.find((r) => r.id === id);
    if (current?.is_default) return { field: "is_default", message: "Make another rubric the default first. There always has to be one." };
    if (input.category_ids.length === 0) return { field: "category_ids", message: "Choose the categories this rubric is for, or make it the default." };
  }
  for (const catId of input.is_default ? [] : input.category_ids) {
    const other = db.rubrics.find((r) => r.id !== id && !r.archived && r.category_ids.includes(catId));
    if (other) {
      const name = db.categories.find((c) => c.id === catId)?.name ?? "That category";
      return { field: "category_ids", message: `${name} already uses "${other.name}". Remove it there first.` };
    }
  }
  return null;
}

function saveRubric(input: RubricInput, existing: Rubric | null): Rubric {
  const rubric: Rubric = {
    id: existing?.id ?? newId("rub"),
    name: input.name,
    criteria: buildCriteria(input),
    category_ids: input.is_default ? [] : input.category_ids,
    is_default: input.is_default,
    archived: existing?.archived ?? false,
    updated_at: new Date().toISOString(),
  };
  if (rubric.is_default) for (const r of db.rubrics) r.is_default = false;
  if (existing) Object.assign(existing, rubric);
  else db.rubrics.push(rubric);
  return existing ?? rubric;
}

export const feedbackHandlers = [
  /* ---------- Admin: rubrics (FDB-1 "configurable rubric") ---------- */
  http.get(url("/admin/rubrics"), async () => {
    await delay(150);
    const admin = requireUser("ADMIN");
    if (admin instanceof Response) return admin;
    const items = [...db.rubrics].sort((a, b) => Number(b.is_default) - Number(a.is_default) || Number(a.archived) - Number(b.archived) || a.name.localeCompare(b.name));
    return HttpResponse.json({ items });
  }),

  http.post(url("/admin/rubrics"), async ({ request }) => {
    await delay(250);
    const admin = requireUser("ADMIN");
    if (admin instanceof Response) return admin;
    const parsed = RubricInput.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const conflict = rubricConflict(parsed.data, null);
    if (conflict) return apiError(422, "VALIDATION_FAILED", conflict.message, { [conflict.field]: [conflict.message] });
    const rubric = saveRubric(parsed.data, null);
    audit(admin, "rubric.created", "rubric", rubric.id, `Created rubric "${rubric.name}" (${rubric.criteria.length} criteria)`);
    save();
    return HttpResponse.json({ rubric }, { status: 201 });
  }),

  http.put(url("/admin/rubrics/:id"), async ({ params, request }) => {
    await delay(250);
    const admin = requireUser("ADMIN");
    if (admin instanceof Response) return admin;
    const existing = db.rubrics.find((r) => r.id === params.id);
    if (!existing) return apiError(404, "NOT_FOUND", "That rubric doesn't exist.");
    const parsed = RubricInput.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const conflict = rubricConflict(parsed.data, existing.id);
    if (conflict) return apiError(422, "VALIDATION_FAILED", conflict.message, { [conflict.field]: [conflict.message] });
    const rubric = saveRubric(parsed.data, existing);
    audit(admin, "rubric.updated", "rubric", rubric.id, `Updated rubric "${rubric.name}". Feedback already written keeps the version it used.`);
    save();
    return HttpResponse.json({ rubric });
  }),

  /** Archive or restore. The default can't be archived; restoring checks its categories are still free. */
  http.post(url("/admin/rubrics/:id/:action"), async ({ params }) => {
    await delay(200);
    const admin = requireUser("ADMIN");
    if (admin instanceof Response) return admin;
    const r = db.rubrics.find((x) => x.id === params.id);
    if (!r || !["archive", "restore"].includes(String(params.action))) return apiError(404, "NOT_FOUND", "That rubric doesn't exist.");
    if (params.action === "archive") {
      if (r.is_default) return apiError(409, "DEFAULT_RUBRIC", "The default rubric can't be archived. Make another one the default first.");
      r.archived = true;
    } else {
      const taken = r.category_ids.find((id) => db.rubrics.some((o) => o.id !== r.id && !o.archived && o.category_ids.includes(id)));
      if (taken) return apiError(409, "CATEGORY_TAKEN", "One of its categories now uses another rubric. Edit it before restoring.");
      r.archived = false;
    }
    r.updated_at = new Date().toISOString();
    audit(admin, `rubric.${params.action === "archive" ? "archived" : "restored"}`, "rubric", r.id, `${params.action === "archive" ? "Archived" : "Restored"} rubric "${r.name}"`);
    save();
    return HttpResponse.json({ rubric: r });
  }),

  /* ---------- Instructor: feedback per session (FDB-1/3) ---------- */
  http.get(url("/sessions/:id/feedback"), async ({ params }) => {
    await delay(150);
    const user = requireUser("INSTRUCTOR");
    if (user instanceof Response) return user;
    const found = findSession(String(params.id), user.id);
    if (!found) return apiError(404, "NOT_FOUND", "That session isn't on your schedule.");
    const facts = sessionFacts(found);
    const items = db.feedback.filter((f) => f.session_id === params.id && f.instructor_id === user.id).sort(newestFirst).map(toFeedback);
    return HttpResponse.json({ rubric: rubricFor(db.rubrics, categoryOf(facts.training_id)), items });
  }),

  /** Write or edit one learner's feedback. The learner is told the first time (FEEDBACK_ADDED). */
  http.put(url("/sessions/:id/feedback/:learnerId"), async ({ params, request }) => {
    await delay(300);
    const user = requireUser("INSTRUCTOR");
    if (user instanceof Response) return user;
    const readOnly = blockWhileImpersonating();
    if (readOnly) return readOnly;
    const found = findSession(String(params.id), user.id);
    if (!found) return apiError(404, "NOT_FOUND", "That session isn't on your schedule.");
    const facts = sessionFacts(found);
    const learnerId = String(params.learnerId);
    if (!facts.learners.includes(learnerId)) return apiError(404, "NOT_FOUND", "That learner wasn't booked on this session.");
    if (Date.parse(facts.start_utc) > Date.now()) return apiError(409, "SESSION_NOT_STARTED", "You can write feedback once the session has started.");
    const parsed = FeedbackInput.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const input = parsed.data;
    const existing = db.feedback.find((f) => f.session_id === params.id && f.learner_id === learnerId && f.instructor_id === user.id);
    const current = rubricFor(db.rubrics, categoryOf(facts.training_id));
    const rubric = existing?.rubric ?? (current && { id: current.id, name: current.name, criteria: current.criteria });
    if (!rubric) return apiError(409, "NO_RUBRIC", "No feedback rubric is set up yet. Ask an admin to add one.");
    const problems = scoreProblems(rubric.criteria, input.scores);
    if (Object.keys(problems).length) {
      return apiError(422, "VALIDATION_FAILED", "Choose a level for every part of the rubric.", Object.fromEntries(Object.entries(problems).map(([k, v]) => [`scores.${k}`, [v]])));
    }
    const attachment = input.attachment_id
      ? existing?.attachment?.id === input.attachment_id
        ? existing.attachment
        : getUploadedFile(input.attachment_id)
      : null;
    if (input.attachment_id && (!attachment || attachment.purpose !== "FEEDBACK_ATTACHMENT")) {
      return apiError(422, "VALIDATION_FAILED", "Upload the file again.", { attachment_id: ["Upload the file again. Files are virus-scanned before the learner can open them."] });
    }
    const now = new Date().toISOString();
    const fields = {
      scores: input.scores,
      comment: input.comment,
      strengths: input.strengths,
      improvements: input.improvements,
      next_steps: input.next_steps,
      assignment_title: input.assignment_title || null,
      attachment,
      updated_at: now,
    };
    let f = existing;
    if (f) Object.assign(f, fields);
    else {
      f = { id: newId("fbk"), session_id: String(params.id), training_id: facts.training_id, instructor_id: user.id, learner_id: learnerId, rubric, created_at: now, ...fields };
      db.feedback.push(f);
      const training = db.trainings.find((t) => t.id === facts.training_id)?.title ?? "your training";
      notify(learnerId, { type: "FEEDBACK_ADDED", title: "New feedback from your instructor", body: `${user.name} wrote feedback on your ${training} session.`, link: `/learn/feedback?training=${facts.training_id}` });
    }
    save();
    return HttpResponse.json({ feedback: toFeedback(f) }, { status: existing ? 200 : 201 });
  }),

  /* ---------- Learner: progress history (FDB-2), only their own (FDB-5) ---------- */
  http.get(url("/me/feedback"), async ({ request }) => {
    await delay(200);
    const user = requireUser("LEARNER");
    if (user instanceof Response) return user;
    const trainingId = new URL(request.url).searchParams.get("training_id");
    const items = db.feedback.filter((f) => f.learner_id === user.id && (!trainingId || f.training_id === trainingId)).sort(newestFirst).map(toFeedback);
    return HttpResponse.json({ items });
  }),

  /* ---------- Admin: read access (FDB-5) ---------- */
  http.get(url("/admin/users/:id/feedback"), async ({ params }) => {
    await delay(200);
    const admin = requireUser("ADMIN");
    if (admin instanceof Response) return admin;
    if (!findUser(String(params.id))) return apiError(404, "NOT_FOUND", "That user doesn't exist.");
    const items = db.feedback.filter((f) => f.learner_id === params.id || f.instructor_id === params.id).sort(newestFirst).map(toFeedback);
    return HttpResponse.json({ items });
  }),
];
