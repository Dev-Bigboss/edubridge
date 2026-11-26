import { delay } from "msw";
import { http, HttpResponse } from "msw/http";
import { recommend } from "@/lib/domain/recommendations";
import { db } from "../db";
import { omit, published, toCard } from "./catalog";
import { requireUser, url } from "./util";

const DONE_BOOKING = new Set(["DECLINED", "EXPIRED", "CANCELLED"]);

export const recommendationHandlers = [
  /** Phase 4: trainings that match the learner's onboarding goals and background. */
  http.get(url("/me/recommendations"), async () => {
    await delay(200);
    const user = requireUser("LEARNER");
    if (user instanceof Response) return user;
    const sections = db.onboarding[user.id]?.sections;
    const goals = sections?.goals;
    if (!goals) return HttpResponse.json({ items: [], profile_complete: false });
    const now = new Date();
    const owned = new Set([
      ...db.enrolments
        .filter((e) => e.learner_id === user.id && (e.status === "CONFIRMED" || e.status === "PENDING_PAYMENT"))
        .map((e) => db.cohorts.find((c) => c.id === e.cohort_id)?.training_id),
      ...db.bookings.filter((b) => b.learner_id === user.id && !DONE_BOOKING.has(b.status)).map((b) => b.training_id),
    ].filter((id): id is string => !!id));
    const items = recommend(
      published().map((t) => toCard(t, now)),
      {
        interest_category_ids: goals.interest_category_ids,
        topics: goals.topics,
        education_level: sections?.background?.education_level ?? null,
        exam_target_date: sections?.background?.exam_target_date ?? null,
      },
      { exclude: owned, today: now.toISOString().slice(0, 10) },
    ).map((s) => ({ training: omit(s.candidate, "keywords"), reasons: s.reasons }));
    return HttpResponse.json({ items, profile_complete: true });
  }),
];
