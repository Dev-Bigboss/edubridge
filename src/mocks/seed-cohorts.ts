import { TZDate } from "@date-fns/tz";
import { WEEKDAYS, type Cohort, type CohortSchedule, type Weekday } from "@/lib/api/schemas/cohort";
import type { Enrolment, Payment } from "@/lib/api/schemas/payments";

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
        // Running cohort of a training archived since: hidden from the catalogue, still the learners' (TRN-7).
        id: "coh_aa_2025",
        training_id: "trn_ican_aa_2025",
        name: "Autumn cohort",
        schedule: lagos(["MON", "THU"], "18:00", 120),
        startsInDays: -24,
        weeks: 8,
        capacity: 20,
        min_enrolment: 6,
        enrolled_count: 11,
        status: "IN_PROGRESS",
        instructor_id: "usr_instructor_1",
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

/**
 * The demo learner's history: a finished cohort and one in progress on a training that has since
 * been archived (TRN-7: still theirs). Paid and receipted, so the payments page has rows.
 */
export function seedLearnerHistory(cohorts: Cohort[]): { enrolments: Enrolment[]; payments: Payment[] } {
  const items = [
    { cohort: "coh_mth_past", training: "trn_mth101", title: "MTH 101: Elementary Mathematics I", amount: 25000, n: 1 },
    { cohort: "coh_aa_2025", training: "trn_ican_aa_2025", title: "ICAN Audit and Assurance (2025 syllabus)", amount: 40000, n: 2 },
  ];
  const enrolments: Enrolment[] = [];
  const payments: Payment[] = [];
  for (const it of items) {
    const cohort = cohorts.find((c) => c.id === it.cohort)!;
    const paidAt = new Date(new Date(cohort.enrolment_deadline).getTime() - 7 * DAY).toISOString();
    const price = { amount: it.amount, currency: "USD", unit: "PER_SEAT" as const };
    enrolments.push({
      id: `enr_seed_${it.n}`,
      learner_id: "usr_learner_1",
      training_id: it.training,
      cohort_id: it.cohort,
      status: "CONFIRMED",
      price,
      payment_id: `pay_seed_${it.n}`,
      created_at: paidAt,
      confirmed_at: paidAt,
    });
    payments.push({
      id: `pay_seed_${it.n}`,
      learner_id: "usr_learner_1",
      enrolment_id: `enr_seed_${it.n}`,
      booking_id: null,
      description: `${it.title} · ${cohort.name}`,
      breakdown: { currency: "USD", unit_price: price, quantity: 1, duration_min: null, subtotal: it.amount, discount: 0, tax: 0, total: it.amount },
      status: "CAPTURED",
      method: "Visa ending 4242",
      failure_message: null,
      refunded_amount: 0,
      created_at: paidAt,
      captured_at: paidAt,
      receipt_number: `EB-${paidAt.slice(0, 4)}-${String(it.n).padStart(5, "0")}`,
      receipt_url: null,
    });
  }
  return { enrolments, payments };
}
