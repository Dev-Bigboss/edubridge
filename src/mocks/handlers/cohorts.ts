import { delay } from "msw";
import { http, HttpResponse } from "msw/http";
import { COHORT_ACTIONS, CohortInput, type Cohort, type CohortAction } from "@/lib/api/schemas/cohort";
import { COHORT_ACTION_TARGET, canMoveCohort, cohortEditable } from "@/lib/domain/cohort-machine";
import { planSessions } from "@/lib/domain/cohort-schedule";
import { MODALITY } from "@/lib/domain/enums";
import { formatMoney } from "@/lib/domain/money";
import { audit, db, findUser, newId, notify, save, sendMail } from "../db";
import { refundPayment } from "./checkout";
import { apiError, requireUser, url, validationError } from "./util";

/** COH-1: cohorts are created by admins (plan §8 Q8 asks whether instructors may too). */
const admin = () => requireUser("ADMIN");

const fieldError = (field: string, message: string) => apiError(422, "VALIDATION_FAILED", message, { [field]: [message] });

function toAdmin(c: Cohort) {
  return {
    ...c,
    training_title: db.trainings.find((t) => t.id === c.training_id)?.title ?? "Removed training",
    instructor_name: findUser(c.instructor_id)?.name ?? "Instructor",
  };
}

/** Rules shared by create and edit. Returns an error response, or the derived fields. */
function check(input: CohortInput, existing?: Cohort) {
  const training = db.trainings.find((t) => t.id === input.training_id);
  const modality = training && db.modalities.find((m) => m.id === training.modality_id);
  if (!training || training.status === "ARCHIVED") return fieldError("training_id", "Choose a training that isn't archived.");
  if (modality?.code !== MODALITY.COHORT) return fieldError("training_id", "Cohorts can only be added to cohort trainings.");
  if (!training.instructors.some((i) => i.instructor_id === input.instructor_id)) {
    return fieldError("instructor_id", "Choose an instructor assigned to this training.");
  }
  const plan = planSessions(input.start_date, input.end_date, input.schedule);
  if (!plan.firstSessionAt) return fieldError("schedule.weekdays", "No class falls between the start and end dates. Check the days.");
  if (new Date(input.enrolment_deadline) > new Date(plan.firstSessionAt)) {
    return fieldError("enrolment_deadline", "Enrolment must close before the first class.");
  }
  if (!existing && new Date(plan.firstSessionAt) < new Date()) return fieldError("start_date", "Start in the future.");
  if (existing && input.capacity < existing.enrolled_count) {
    return fieldError("capacity", `${existing.enrolled_count} learners are already enrolled. Seats can't go below that.`);
  }
  return { session_count: plan.count, first_session_at: plan.firstSessionAt };
}

/** COH-5: cancelling refunds every paid seat in full and tells each learner. */
function cancelCohort(cohort: Cohort, reason: string) {
  const training = db.trainings.find((t) => t.id === cohort.training_id);
  let refunded = 0;
  for (const e of db.enrolments.filter((x) => x.cohort_id === cohort.id && x.status === "CONFIRMED")) {
    const payment = db.payments.find((p) => p.id === e.payment_id);
    if (payment) refundPayment(payment, payment.breakdown.total - payment.refunded_amount);
    e.status = "REFUNDED";
    refunded++;
    const learner = findUser(e.learner_id);
    if (payment) {
      notify(e.learner_id, {
        type: "COHORT_CANCELLED",
        title: `${cohort.name} is cancelled`,
        body: `${training?.title ?? "Your training"}: ${reason} You've been refunded ${formatMoney({ amount: payment.breakdown.total, currency: payment.breakdown.currency })} in full.`,
        link: "/learn/payments",
      });
    }
    if (learner && payment) {
      sendMail(
        learner.email,
        `${training?.title ?? "Your cohort"} is cancelled: ${formatMoney({ amount: payment.breakdown.total, currency: payment.breakdown.currency })} refunded`,
        "/learn/payments",
      );
    }
  }
  cohort.enrolled_count = 0;
  return { refunded, reason };
}

export const cohortHandlers = [
  http.get(url("/admin/cohorts"), async ({ request }) => {
    await delay(250);
    const user = admin();
    if (user instanceof Response) return user;
    const p = new URL(request.url).searchParams;
    const items = db.cohorts
      .filter((c) => !p.get("training_id") || c.training_id === p.get("training_id"))
      .filter((c) => !p.get("status") || c.status === p.get("status"))
      .sort((a, b) => a.start_date.localeCompare(b.start_date))
      .map(toAdmin);
    return HttpResponse.json({ items });
  }),

  http.post(url("/admin/cohorts"), async ({ request }) => {
    await delay(400);
    const user = admin();
    if (user instanceof Response) return user;
    const parsed = CohortInput.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const derived = check(parsed.data);
    if (derived instanceof Response) return derived;
    const cohort: Cohort = { ...parsed.data, ...derived, id: newId("coh"), enrolled_count: 0, status: "DRAFT" };
    db.cohorts.push(cohort);
    audit(user, "cohort.created", "cohort", cohort.id, `Created cohort "${cohort.name}" for ${toAdmin(cohort).training_title}`);
    save();
    return HttpResponse.json({ cohort: toAdmin(cohort) }, { status: 201 });
  }),

  http.patch(url("/admin/cohorts/:id"), async ({ params, request }) => {
    await delay(400);
    const user = admin();
    if (user instanceof Response) return user;
    const cohort = db.cohorts.find((c) => c.id === params.id);
    if (!cohort) return apiError(404, "NOT_FOUND", "That cohort doesn't exist.");
    const editable = cohortEditable(cohort.status);
    if (editable === "NONE") return apiError(409, "COHORT_LOCKED", "Finished and cancelled cohorts can't be changed.");
    const parsed = CohortInput.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const input = parsed.data;
    if (input.training_id !== cohort.training_id) return fieldError("training_id", "A cohort can't move to another training.");
    if (editable === "SEATS_AND_NAME") {
      const locked = ["start_date", "end_date", "instructor_id", "enrolment_deadline"] as const;
      if (locked.some((k) => input[k] !== cohort[k]) || JSON.stringify(input.schedule) !== JSON.stringify(cohort.schedule)) {
        return apiError(409, "COHORT_LOCKED", "This cohort has started. Only its name and seats can change.");
      }
    }
    const derived = check(input, cohort);
    if (derived instanceof Response) return derived;
    Object.assign(cohort, input, derived);
    // Seats added to a full cohort open it again; seats removed down to the enrolled count fill it.
    if (cohort.status === "FULL" && cohort.enrolled_count < cohort.capacity) cohort.status = "OPEN";
    else if (cohort.status === "OPEN" && cohort.enrolled_count >= cohort.capacity) cohort.status = "FULL";
    audit(user, "cohort.updated", "cohort", cohort.id, `Updated cohort "${cohort.name}"`);
    save();
    return HttpResponse.json({ cohort: toAdmin(cohort) });
  }),

  /** COH-3 status changes. Cancel takes `{ reason }` and refunds every paid seat (COH-5). */
  http.post(url("/admin/cohorts/:id/:action"), async ({ params, request }) => {
    await delay(400);
    const user = admin();
    if (user instanceof Response) return user;
    const cohort = db.cohorts.find((c) => c.id === params.id);
    if (!cohort) return apiError(404, "NOT_FOUND", "That cohort doesn't exist.");
    const action = params.action as CohortAction;
    if (!COHORT_ACTIONS.includes(action)) return apiError(404, "NOT_FOUND", "Unknown action.");
    const target = COHORT_ACTION_TARGET[action];
    if (!canMoveCohort(cohort.status, target) || (cohort.status === "FULL" && action === "open")) {
      return apiError(409, "INVALID_TRANSITION", `A ${cohort.status.toLowerCase().replace("_", " ")} cohort can't be moved that way.`);
    }
    let summary = `Cohort "${cohort.name}": ${cohort.status} → ${target}`;
    if (action === "open") {
      const training = db.trainings.find((t) => t.id === cohort.training_id);
      if (training?.status !== "PUBLISHED") return apiError(409, "TRAINING_NOT_PUBLISHED", "Publish the training first, so learners can find this cohort.");
      if (new Date(cohort.enrolment_deadline) <= new Date()) return apiError(409, "DEADLINE_PASSED", "The enrolment deadline has passed. Move it later first.");
    }
    if (action === "cancel") {
      const body = (await request.json().catch(() => ({}))) as { reason?: string };
      const reason = body.reason?.trim() ?? "";
      if (reason.length < 5) return fieldError("reason", "Say why, in a few words. Learners see this.");
      const { refunded } = cancelCohort(cohort, reason);
      summary += `, ${refunded} refunded. Reason: ${reason}`;
    }
    cohort.status = target;
    audit(user, `cohort.${action}`, "cohort", cohort.id, summary);
    save();
    return HttpResponse.json({ cohort: toAdmin(cohort) });
  }),
];
