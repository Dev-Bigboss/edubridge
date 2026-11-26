import { delay } from "msw";
import { http, HttpResponse } from "msw/http";
import { HideReviewInput, ReviewInput, type AdminReview, type MyReview, type PublicReview, type Reviewable } from "@/lib/api/schemas/reviews";
import { averageRating, reviewerName } from "@/lib/domain/reviews";
import { audit, db, findUser, newId, save, type MockUser, type StoredReview } from "../db";
import { apiError, blockWhileImpersonating, requireUser, url, validationError } from "./util";

const PAGE = 10;

function toPublic(r: StoredReview): PublicReview {
  return {
    id: r.id,
    author_name: reviewerName(findUser(r.learner_id)?.name ?? "A learner"),
    instructor: { id: r.instructor_id, name: findUser(r.instructor_id)?.name ?? "Instructor" },
    training_rating: r.training_rating,
    instructor_rating: r.instructor_rating,
    comment: r.comment,
    context: r.context,
    created_at: r.created_at,
    edited: r.updated_at !== r.created_at,
  };
}

const toMine = (r: StoredReview): MyReview => ({ ...toPublic(r), training_id: r.training_id, status: r.status, hidden_reason: r.hidden_reason });

function toAdmin(r: StoredReview): AdminReview {
  return {
    ...toMine(r),
    author: { id: r.learner_id, name: findUser(r.learner_id)?.name ?? "Learner" },
    training_title: db.trainings.find((t) => t.id === r.training_id)?.title ?? "Training",
    moderation: r.moderation,
  };
}

/** FDB-4 "after completion": a finished cohort seat, or a completed 1:1 session. One entry per training and instructor. */
function reviewablesOf(user: MockUser): Reviewable[] {
  const found = new Map<string, Omit<Reviewable, "review">>();
  const add = (trainingId: string, instructorId: string, context: Reviewable["context"], completedAt: string) => {
    const key = `${trainingId}|${instructorId}`;
    const t = db.trainings.find((x) => x.id === trainingId);
    const existing = found.get(key);
    if (!t || (existing && existing.completed_at >= completedAt)) return;
    found.set(key, {
      training_id: t.id, training_title: t.title, training_slug: t.slug, context, completed_at: completedAt,
      instructor: { id: instructorId, name: findUser(instructorId)?.name ?? "Instructor" },
    });
  };
  for (const e of db.enrolments.filter((x) => x.learner_id === user.id && x.status === "CONFIRMED")) {
    const c = db.cohorts.find((x) => x.id === e.cohort_id);
    if (c?.status === "COMPLETED") add(c.training_id, c.instructor_id, "COHORT", c.end_date);
  }
  for (const b of db.bookings.filter((x) => x.learner_id === user.id && x.status === "COMPLETED")) add(b.training_id, b.instructor_id, "ONE_ON_ONE", b.end_utc);
  return [...found.values()]
    .sort((a, b) => b.completed_at.localeCompare(a.completed_at))
    .map((x) => {
      const review = db.reviews.find((r) => r.learner_id === user.id && r.training_id === x.training_id && r.instructor_id === x.instructor.id);
      return { ...x, review: review ? toMine(review) : null };
    });
}

export const reviewHandlers = [
  /** Public: published reviews of a training, newest first, with averages once there are enough. */
  http.get(url("/trainings/:id/reviews"), async ({ params, request }) => {
    await delay(150);
    const training = db.trainings.find((t) => t.id === params.id && t.status !== "DRAFT");
    if (!training) return apiError(404, "NOT_FOUND", "That training doesn't exist.");
    const live = db.reviews.filter((r) => r.training_id === training.id && r.status === "PUBLISHED").sort((a, b) => b.created_at.localeCompare(a.created_at));
    const cursor = new URL(request.url).searchParams.get("cursor");
    const start = cursor ? Math.max(0, live.findIndex((r) => r.id === cursor)) : 0;
    const page = live.slice(start, start + PAGE);
    const instructors = [...new Set(live.map((r) => r.instructor_id))].map((id) => {
      const mine = live.filter((r) => r.instructor_id === id).map((r) => r.instructor_rating);
      return { instructor_id: id, count: mine.length, average: averageRating(mine) };
    });
    return HttpResponse.json({
      summary: { count: live.length, training_average: averageRating(live.map((r) => r.training_rating)), instructors },
      items: page.map(toPublic),
      next_cursor: live[start + PAGE]?.id ?? null,
    });
  }),

  http.get(url("/me/reviewables"), async () => {
    await delay(150);
    const user = requireUser("LEARNER");
    if (user instanceof Response) return user;
    return HttpResponse.json({ items: reviewablesOf(user) });
  }),

  /** Write or edit my review. Editing a hidden review sends it back to published (an admin can hide it again). */
  http.put(url("/me/reviews"), async ({ request }) => {
    await delay(300);
    const user = requireUser("LEARNER");
    if (user instanceof Response) return user;
    const readOnly = blockWhileImpersonating();
    if (readOnly) return readOnly;
    const parsed = ReviewInput.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const input = parsed.data;
    const eligible = reviewablesOf(user).find((x) => x.training_id === input.training_id && x.instructor.id === input.instructor_id);
    if (!eligible) return apiError(403, "NOT_ELIGIBLE", "You can review a training once you've finished it with this instructor.");
    const now = new Date().toISOString();
    let r = db.reviews.find((x) => x.learner_id === user.id && x.training_id === input.training_id && x.instructor_id === input.instructor_id);
    const fields = { training_rating: input.training_rating, instructor_rating: input.instructor_rating, comment: input.comment, updated_at: now };
    if (r) Object.assign(r, fields, { status: "PUBLISHED", hidden_reason: null });
    else {
      r = { id: newId("rev"), learner_id: user.id, training_id: input.training_id, instructor_id: input.instructor_id, context: eligible.context, status: "PUBLISHED", hidden_reason: null, moderation: null, created_at: now, ...fields };
      db.reviews.push(r);
    }
    save();
    return HttpResponse.json({ review: toMine(r) }, { status: eligible.review ? 200 : 201 });
  }),

  http.delete(url("/me/reviews/:id"), async ({ params }) => {
    await delay(200);
    const user = requireUser("LEARNER");
    if (user instanceof Response) return user;
    const readOnly = blockWhileImpersonating();
    if (readOnly) return readOnly;
    const before = db.reviews.length;
    db.reviews = db.reviews.filter((r) => !(r.id === params.id && r.learner_id === user.id));
    if (db.reviews.length === before) return apiError(404, "NOT_FOUND", "That review doesn't exist.");
    save();
    return new HttpResponse(null, { status: 204 });
  }),

  /* ---------- Admin moderation ---------- */
  http.get(url("/admin/reviews"), async ({ request }) => {
    await delay(200);
    const admin = requireUser("ADMIN");
    if (admin instanceof Response) return admin;
    const status = new URL(request.url).searchParams.get("status") ?? "PUBLISHED";
    const items = db.reviews.filter((r) => r.status === status).sort((a, b) => b.updated_at.localeCompare(a.updated_at)).map(toAdmin);
    return HttpResponse.json({ items });
  }),

  http.post(url("/admin/reviews/:id/hide"), async ({ params, request }) => {
    await delay(250);
    const admin = requireUser("ADMIN");
    if (admin instanceof Response) return admin;
    const parsed = HideReviewInput.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const r = db.reviews.find((x) => x.id === params.id);
    if (!r) return apiError(404, "NOT_FOUND", "That review doesn't exist.");
    if (r.status === "HIDDEN") return apiError(409, "ALREADY_HIDDEN", "Another admin has already hidden this review.");
    Object.assign(r, { status: "HIDDEN", hidden_reason: parsed.data.reason, moderation: { by_name: admin.name, at: new Date().toISOString() } });
    audit(admin, "review.hidden", "review", r.id, `Hid a review of ${toAdmin(r).training_title}. Reason: ${parsed.data.reason}`);
    save();
    return HttpResponse.json({ review: toAdmin(r) });
  }),

  http.post(url("/admin/reviews/:id/restore"), async ({ params }) => {
    await delay(250);
    const admin = requireUser("ADMIN");
    if (admin instanceof Response) return admin;
    const r = db.reviews.find((x) => x.id === params.id);
    if (!r) return apiError(404, "NOT_FOUND", "That review doesn't exist.");
    Object.assign(r, { status: "PUBLISHED", hidden_reason: null, moderation: { by_name: admin.name, at: new Date().toISOString() } });
    audit(admin, "review.restored", "review", r.id, `Restored a review of ${toAdmin(r).training_title}`);
    save();
    return HttpResponse.json({ review: toAdmin(r) });
  }),
];
