import { z } from "zod";
import { COHORT_STATUSES } from "@/lib/domain/enums";

/** Mirrors contracts/openapi/cohorts.yaml. */

export const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/**
 * COH-1 "recurring session schedule": the same local time on chosen weekdays, in the zone the
 * instructor teaches in. The backend expands it into dated sessions (COH-4); the UI only
 * describes it and converts the first session to the viewer's zone.
 */
export const CohortSchedule = z.object({
  weekdays: z.array(z.enum(WEEKDAYS)).min(1),
  /** "18:30", 24-hour, in `timezone` */
  start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  duration_min: z.number().int().min(15).max(480),
  timezone: z.string(),
});
export type CohortSchedule = z.infer<typeof CohortSchedule>;

export const Cohort = z.object({
  id: z.string(),
  training_id: z.string(),
  name: z.string(),
  /** Calendar dates (YYYY-MM-DD) in the schedule's zone. */
  start_date: z.string(),
  end_date: z.string(),
  schedule: CohortSchedule,
  session_count: z.number().int().nonnegative(),
  /** UTC instant of the first session, so the UI can show it in the viewer's zone. */
  first_session_at: z.string(),
  capacity: z.number().int().positive(),
  /** COH-5: below this by the deadline, the cohort is cancelled and refunded. Null = no minimum. */
  min_enrolment: z.number().int().positive().nullable(),
  enrolled_count: z.number().int().nonnegative(),
  /** UTC instant. COH-2: no enrolment after this. */
  enrolment_deadline: z.string(),
  status: z.enum(COHORT_STATUSES),
  instructor_id: z.string(),
});
export type Cohort = z.infer<typeof Cohort>;
