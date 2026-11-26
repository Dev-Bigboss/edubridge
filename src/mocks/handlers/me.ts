import { delay } from "msw";
import { http, HttpResponse } from "msw/http";
import type { LearnerEnrolment } from "@/lib/api/schemas/payments";
import { db, save } from "../db";
import { omit, toPublicCohort } from "./catalog";
import { sweepCohorts } from "./cohorts";
import { nextCohortSession } from "./sessions";
import { apiError, requireUser, url } from "./util";

/** Enrolments a learner sees: paid ones, and ones refunded because the cohort was cancelled. */
const SHOWN = new Set(["CONFIRMED", "REFUNDED"]);

const EMPTY = { join_tested: false, resources_opened: false, met_instructor: false, dismissed: false };

/** ONB-5 applies to a paid seat until it's dismissed or the cohort has finished. */
function checklistFor(enrolmentId: string, status: string, cohortStatus: string, endDate: string, now: Date) {
  const c = db.checklists[enrolmentId] ?? EMPTY;
  const over = cohortStatus === "COMPLETED" || cohortStatus === "CANCELLED" || endDate < now.toISOString().slice(0, 10);
  if (status !== "CONFIRMED" || over || c.dismissed) return null;
  return { join_tested: c.join_tested, resources_opened: c.resources_opened, met_instructor: c.met_instructor };
}

export const meHandlers = [
  /** TRN-7: archived trainings stay listed for the learners who enrolled. */
  http.get(url("/me/enrolments"), async () => {
    await delay(250);
    const user = requireUser("LEARNER");
    if (user instanceof Response) return user;
    sweepCohorts();
    const now = new Date();
    const items: LearnerEnrolment[] = db.enrolments
      .filter((e) => e.learner_id === user.id && SHOWN.has(e.status))
      .flatMap((e) => {
        const training = db.trainings.find((t) => t.id === e.training_id);
        const cohort = db.cohorts.find((c) => c.id === e.cohort_id);
        if (!training || !cohort) return [];
        const category = db.categories.find((c) => c.id === training.category_id);
        // Refunded only when the cohort was cancelled; a refund for a seat that sold out never enrolled them.
        if (e.status === "REFUNDED" && cohort.status !== "CANCELLED") return [];
        return [
          {
            enrolment: e,
            training: { id: training.id, slug: training.slug, title: training.title, status: training.status, category_name: category?.name ?? "" },
            cohort: toPublicCohort(training, cohort, now),
            next_session: e.status === "CONFIRMED" ? nextCohortSession(cohort, now.getTime()) : null,
            checklist: checklistFor(e.id, e.status, cohort.status, cohort.end_date, now),
          },
        ];
      })
      .sort((a, b) => a.cohort.start_date.localeCompare(b.cohort.start_date));
    return HttpResponse.json({ items });
  }),

  /** PAY-6: payment history, newest first. Abandoned attempts (VOIDED) aren't payments to the learner. */
  http.get(url("/me/payments"), async () => {
    await delay(250);
    const user = requireUser("LEARNER");
    if (user instanceof Response) return user;
    const items = db.payments
      .filter((p) => p.learner_id === user.id && p.status !== "VOIDED")
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((p) => omit(omit(p, "mock"), "idempotency_key"));
    return HttpResponse.json({ items });
  }),

  /** ONB-5: tick a step, or `{ dismiss: true }` to hide the checklist. */
  http.post(url("/me/enrolments/:id/checklist"), async ({ params, request }) => {
    await delay(150);
    const user = requireUser("LEARNER");
    if (user instanceof Response) return user;
    const e = db.enrolments.find((x) => x.id === params.id && x.learner_id === user.id);
    if (!e) return apiError(404, "NOT_FOUND", "We couldn't find that enrolment.");
    if (db.impersonation) return new HttpResponse(null, { status: 204 }); // viewing-as leaves no trace
    const body = (await request.json()) as { item?: string; dismiss?: boolean };
    const c = (db.checklists[e.id] ??= { ...EMPTY });
    if (body.dismiss) c.dismissed = true;
    else if (body.item === "join_tested" || body.item === "resources_opened" || body.item === "met_instructor") c[body.item] = true;
    else return apiError(422, "VALIDATION_FAILED", "Unknown checklist step.");
    save();
    return new HttpResponse(null, { status: 204 });
  }),
];
