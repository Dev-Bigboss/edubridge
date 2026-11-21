import { z } from "zod";

/** Mirrors contracts/openapi/recordings.yaml (REC-1..6). */

export const Recording = z.object({
  id: z.string(),
  /** The session it belongs to (REC-2): `cohort:date` or a booking id. */
  session_id: z.string(),
  kind: z.enum(["COHORT", "ONE_ON_ONE"]),
  training: z.object({ id: z.string(), title: z.string() }),
  /** Cohort name, or the other person's name for a 1:1. */
  subtitle: z.string(),
  recorded_at: z.string(),
  /** Full length from the provider; playback honours `trim`. */
  duration_sec: z.number().int().nonnegative(),
  status: z.enum(["PROCESSING", "READY", "FAILED"]),
  /** REC-5: hidden recordings are only visible to the instructor and admins. */
  hidden: z.boolean(),
  trim: z.object({ start_sec: z.number().int().nonnegative(), end_sec: z.number().int().positive() }).nullable(),
  has_captions: z.boolean(),
  /** REC-5: deleted automatically at this time (retention setting). */
  delete_at: z.string(),
  /** REC-4: where this viewer stopped last time. */
  resume_sec: z.number().int().nonnegative(),
});
export type Recording = z.infer<typeof Recording>;
export const RecordingList = z.object({ items: z.array(Recording) });
export const RecordingResponse = z.object({ recording: Recording });

/** REC-6: a short-lived signed URL per viewing; downloads are off by default. */
export const Playback = z.object({
  url: z.string(),
  captions_url: z.string().nullable(),
  expires_at: z.string(),
});
export type Playback = z.infer<typeof Playback>;

export const RecordingUpdate = z.object({
  hidden: z.boolean().optional(),
  trim: z.object({ start_sec: z.number().int().min(0), end_sec: z.number().int().positive() }).nullable().optional(),
});
export type RecordingUpdate = z.infer<typeof RecordingUpdate>;
