import { delay } from "msw";
import { http, HttpResponse } from "msw/http";
import type { LearnerEnrolment } from "@/lib/api/schemas/payments";
import { db } from "../db";
import { omit, toPublicCohort } from "./catalog";
import { requireUser, url } from "./util";

/** Enrolments a learner sees: paid ones, and ones refunded because the cohort was cancelled. */
const SHOWN = new Set(["CONFIRMED", "REFUNDED"]);

export const meHandlers = [
  /** TRN-7: archived trainings stay listed for the learners who enrolled. */
  http.get(url("/me/enrolments"), async () => {
    await delay(250);
    const user = requireUser("LEARNER");
    if (user instanceof Response) return user;
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
];
