import { z } from "zod";
import { RUBRIC_CRITERIA } from "@/lib/domain/feedback";
import { StoredFile } from "./uploads";

/** Mirrors contracts/openapi/feedback.yaml (FDB-1..3, FDB-5). */

export const Criterion = z.object({ key: z.string(), label: z.string(), description: z.string().nullable() });
export type Criterion = z.infer<typeof Criterion>;

export const Rubric = z.object({
  id: z.string(),
  name: z.string(),
  criteria: z.array(Criterion),
  /** Trainings in these categories use this rubric; empty for the default. */
  category_ids: z.array(z.string()),
  is_default: z.boolean(),
  archived: z.boolean(),
  updated_at: z.string(),
});
export type Rubric = z.infer<typeof Rubric>;
export const RubricList = z.object({ items: z.array(Rubric) });
export const RubricResponse = z.object({ rubric: Rubric });

export const RubricInput = z.object({
  name: z.string().trim().min(2, { error: "Give the rubric a name instructors will recognise." }).max(80),
  criteria: z
    .array(
      z.object({
        /** Kept when editing an existing criterion so past feedback still lines up; new ones get a key from the label. */
        key: z.string().nullable(),
        label: z.string().trim().min(1, { error: "Name this criterion." }).max(60),
        description: z.string().trim().max(200).nullable(),
      }),
    )
    .min(RUBRIC_CRITERIA.min, { error: `Add at least ${RUBRIC_CRITERIA.min} criteria.` })
    .max(RUBRIC_CRITERIA.max, { error: `Use at most ${RUBRIC_CRITERIA.max} criteria.` }),
  category_ids: z.array(z.string()),
  is_default: z.boolean(),
});
export type RubricInput = z.infer<typeof RubricInput>;

export const Feedback = z.object({
  id: z.string(),
  /** sessions.yaml id: `cohort:date` for a class, the booking id for a 1:1. */
  session_id: z.string(),
  session_start_utc: z.string(),
  session_kind: z.enum(["COHORT", "ONE_ON_ONE"]),
  training_id: z.string(),
  training_title: z.string(),
  instructor: z.object({ id: z.string(), name: z.string() }),
  learner: z.object({ id: z.string(), name: z.string() }),
  /** The rubric as it was when this was written, so later edits to the rubric don't change it. */
  rubric: z.object({ id: z.string(), name: z.string(), criteria: z.array(Criterion) }),
  scores: z.record(z.string(), z.number().int()),
  comment: z.string(),
  strengths: z.string(),
  improvements: z.string(),
  next_steps: z.string(),
  /** FDB-3: optional assignment or exercise this is about, with a file. */
  assignment_title: z.string().nullable(),
  attachment: StoredFile.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Feedback = z.infer<typeof Feedback>;
export const FeedbackList = z.object({ items: z.array(Feedback) });
export const FeedbackResponse = z.object({ feedback: Feedback });

const text = (max: number) => z.string().trim().max(max, { error: `Keep it under ${max} characters.` });

export const FeedbackInput = z.object({
  scores: z.record(z.string(), z.number().int()),
  comment: text(2000).min(10, { error: "Write a few sentences about how the session went." }),
  strengths: text(1000),
  improvements: text(1000),
  next_steps: text(1000).min(5, { error: "Give at least one next step." }),
  assignment_title: text(120).nullable(),
  attachment_id: z.string().nullable(),
});
export type FeedbackInput = z.infer<typeof FeedbackInput>;

/** What the instructor needs to write feedback for one session: the rubric that applies and what's been sent. */
export const SessionFeedback = z.object({ rubric: Rubric.nullable(), items: z.array(Feedback) });
export type SessionFeedback = z.infer<typeof SessionFeedback>;
