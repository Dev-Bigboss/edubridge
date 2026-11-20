import { TZDate } from "@date-fns/tz";
import { WEEKDAYS, type Cohort, type CohortSchedule, type Weekday } from "@/lib/api/schemas/cohort";

/**
 * Demo cohorts, dated relative to today so the demo never goes stale: enrolment is open on some,
 * one is full, and past or draft cohorts exist to prove they stay out of the public catalogue.
 */

const DAY = 86_400_000;
const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** First date on or after `from` that falls on one of the weekdays. */
function firstMatching(from: Date, weekdays: Weekday[]): Date {
  for (let i = 0; i < 7; i++) {
    const d = new Date(from.getTime() + i * DAY);
    const idx = (d.getUTCDay() + 6) % 7; // Mon = 0
    if (weekdays.includes(WEEKDAYS[idx])) return d;
  }
  return from;
}

export function makeCohort(
  input: Omit<Cohort, "start_date" | "end_date" | "first_session_at" | "session_count" | "enrolment_deadline" | "schedule"> & {
    schedule: CohortSchedule;
    /** Days from today to the earliest possible start. Negative for cohorts already running. */
    startsInDays: number;
    weeks: number;
    /** Days before the first session that enrolment closes. */
    deadlineDaysBefore?: number;
  },
  now = new Date(),
): Cohort {
  const { startsInDays, weeks, deadlineDaysBefore = 2, ...rest } = input;
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = firstMatching(new Date(today.getTime() + startsInDays * DAY), input.schedule.weekdays);
  const end = new Date(start.getTime() + (weeks * 7 - 1) * DAY);
  const [h, m] = input.schedule.start_time.split(":").map(Number);
  const first = new TZDate(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), h, m, input.schedule.timezone);
  return {
    ...rest,
    start_date: ymd(start),
    end_date: ymd(end),
    session_count: weeks * input.schedule.weekdays.length,
    first_session_at: new Date(first.getTime()).toISOString(),
    enrolment_deadline: new Date(first.getTime() - deadlineDaysBefore * DAY).toISOString(),
  };
}

export function seedCohorts(now = new Date()): Cohort[] {
  const lagos = (weekdays: Weekday[], start_time: string, duration_min: number): CohortSchedule => ({
    weekdays,
    start_time,
    duration_min,
    timezone: "Africa/Lagos",
  });
  return [
    makeCohort(
      {
        id: "coh_sfr_jan",
        training_id: "trn_ican_sfr",
        name: "Evening cohort",
        schedule: lagos(["TUE", "THU"], "18:00", 120),
        startsInDays: 21,
        weeks: 6,
        capacity: 20,
        min_enrolment: 6,
        enrolled_count: 14,
        status: "OPEN",
        instructor_id: "usr_instructor_1",
      },
      now,
    ),
    makeCohort(
      {
        id: "coh_sfr_weekend",
        training_id: "trn_ican_sfr",
        name: "Weekend intensive",
        schedule: lagos(["SAT"], "10:00", 240),
        startsInDays: 10,
        weeks: 6,
        capacity: 12,
        min_enrolment: 6,
        enrolled_count: 12,
        status: "FULL",
        instructor_id: "usr_instructor_1",
      },
      now,
    ),
    makeCohort(
      {
        id: "coh_sfr_next",
        training_id: "trn_ican_sfr",
        name: "Spring evening cohort",
        schedule: lagos(["MON", "WED"], "18:30", 120),
        startsInDays: 75,
        weeks: 6,
        capacity: 20,
        min_enrolment: 6,
        enrolled_count: 0,
        status: "DRAFT",
        instructor_id: "usr_instructor_1",
      },
      now,
    ),
    makeCohort(
      {
        id: "coh_mth_sem1",
        training_id: "trn_mth101",
        name: "First semester cohort",
        schedule: lagos(["MON", "WED"], "17:00", 90),
        startsInDays: 12,
        weeks: 10,
        capacity: 30,
        min_enrolment: 5,
        enrolled_count: 8,
        status: "OPEN",
        instructor_id: "usr_instructor_2",
      },
      now,
    ),
    makeCohort(
      {
        id: "coh_mth_past",
        training_id: "trn_mth101",
        name: "Last semester's cohort",
        schedule: lagos(["TUE", "THU"], "17:00", 90),
        startsInDays: -120,
        weeks: 10,
        capacity: 30,
        min_enrolment: 5,
        enrolled_count: 24,
        status: "COMPLETED",
        instructor_id: "usr_instructor_2",
      },
      now,
    ),
  ];
}
