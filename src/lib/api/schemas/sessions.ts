import { z } from "zod";

/** Mirrors contracts/openapi/sessions.yaml (OTO-10, COH-4). */

export const ATTENDANCE = ["PRESENT", "LATE", "ABSENT"] as const;
export type Attendance = (typeof ATTENDANCE)[number];

/** One entry on an instructor's schedule: a cohort class or a 1:1 session. */
export const ScheduleItem = z.object({
  /** Cohort classes: `cohort:date`. 1:1 sessions: the booking id. */
  id: z.string(),
  kind: z.enum(["COHORT", "ONE_ON_ONE"]),
  training_title: z.string(),
  /** Cohort name, or the learner's name for a 1:1. */
  subtitle: z.string(),
  start_utc: z.string(),
  end_utc: z.string(),
  join_url: z.string().nullable(),
  status: z.enum(["SCHEDULED", "COMPLETED", "NO_SHOW", "CANCELLED"]),
  attendance: z.object({ taken: z.boolean(), present: z.number().int(), total: z.number().int() }),
});
export type ScheduleItem = z.infer<typeof ScheduleItem>;
export const ScheduleResponse = z.object({ items: z.array(ScheduleItem) });

export const RosterEntry = z.object({ learner_id: z.string(), name: z.string(), status: z.enum(ATTENDANCE).nullable() });
export const SessionDetail = z.object({ session: ScheduleItem, roster: z.array(RosterEntry) });
export type SessionDetail = z.infer<typeof SessionDetail>;

export const AttendanceInput = z.object({
  marks: z.array(z.object({ learner_id: z.string(), status: z.enum(ATTENDANCE) })).min(1),
});
export type AttendanceInput = z.infer<typeof AttendanceInput>;
