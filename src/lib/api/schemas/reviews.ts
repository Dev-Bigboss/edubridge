import { z } from "zod";
import { REVIEW_COMMENT } from "@/lib/domain/reviews";

/** Mirrors contracts/openapi/reviews.yaml (FDB-4). */

const Stars = z.number().int().min(1, { error: "Choose from 1 to 5 stars." }).max(5, { error: "Choose from 1 to 5 stars." });

/** What everyone sees: the author as "Ada D.", never their full name or id. */
export const PublicReview = z.object({
  id: z.string(),
  author_name: z.string(),
  instructor: z.object({ id: z.string(), name: z.string() }),
  training_rating: z.number().int(),
  instructor_rating: z.number().int(),
  comment: z.string(),
  context: z.enum(["COHORT", "ONE_ON_ONE"]),
  created_at: z.string(),
  edited: z.boolean(),
});
export type PublicReview = z.infer<typeof PublicReview>;

export const TrainingReviews = z.object({
  summary: z.object({
    count: z.number().int(),
    /** Null until there are enough reviews (MIN_REVIEWS_FOR_AVERAGE). */
    training_average: z.number().nullable(),
    instructors: z.array(z.object({ instructor_id: z.string(), count: z.number().int(), average: z.number().nullable() })),
  }),
  items: z.array(PublicReview),
  next_cursor: z.string().nullable(),
});
export type TrainingReviews = z.infer<typeof TrainingReviews>;

/** The learner's own view, with moderation status. */
export const MyReview = PublicReview.extend({
  training_id: z.string(),
  status: z.enum(["PUBLISHED", "HIDDEN"]),
  hidden_reason: z.string().nullable(),
});
export type MyReview = z.infer<typeof MyReview>;

/** Something this learner finished and may review (FDB-4: after completion). */
export const Reviewable = z.object({
  training_id: z.string(),
  training_title: z.string(),
  training_slug: z.string(),
  instructor: z.object({ id: z.string(), name: z.string() }),
  context: z.enum(["COHORT", "ONE_ON_ONE"]),
  completed_at: z.string(),
  review: MyReview.nullable(),
});
export type Reviewable = z.infer<typeof Reviewable>;
export const ReviewableList = z.object({ items: z.array(Reviewable) });

export const ReviewInput = z.object({
  training_id: z.string().min(1),
  instructor_id: z.string().min(1),
  training_rating: Stars,
  instructor_rating: Stars,
  comment: z
    .string()
    .trim()
    .min(REVIEW_COMMENT.min, { error: "Say a little about your experience to help other learners." })
    .max(REVIEW_COMMENT.max, { error: `Keep it under ${REVIEW_COMMENT.max} characters.` }),
});
export type ReviewInput = z.infer<typeof ReviewInput>;
export const MyReviewResponse = z.object({ review: MyReview });

/** Admin moderation view: the real author and the training. */
export const AdminReview = MyReview.extend({
  author: z.object({ id: z.string(), name: z.string() }),
  training_title: z.string(),
  moderation: z.object({ by_name: z.string(), at: z.string() }).nullable(),
});
export type AdminReview = z.infer<typeof AdminReview>;
export const AdminReviewList = z.object({ items: z.array(AdminReview) });

export const HideReviewInput = z.object({ reason: z.string().trim().min(5, { error: "Say why, so the learner understands." }).max(300) });
