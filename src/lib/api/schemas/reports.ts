import { z } from "zod";

/** Mirrors contracts/openapi/reports.yaml (ADM-1, ADM-4). Amounts are cents, USD. */

export const AdminDashboard = z.object({
  period: z.object({ days: z.number().int(), from: z.string(), to: z.string() }),
  users: z.object({ learners: z.number().int(), instructors: z.number().int(), new_in_period: z.number().int() }),
  enrolments: z.object({ new_in_period: z.number().int(), active_learners: z.number().int() }),
  revenue: z.object({
    captured: z.number().int(),
    refunded: z.number().int(),
    commission: z.number().int(),
    /** Oldest first: daily for 7 and 30 days, weekly for 90. */
    series: z.array(z.object({ start: z.string(), end: z.string(), captured: z.number().int() })),
  }),
  cohorts: z.object({ active: z.number().int(), starting_within_7_days: z.number().int(), below_minimum: z.number().int() }),
  one_on_one: z.object({ pending: z.number().int(), expiring_within_6_hours: z.number().int() }),
  response_times: z.object({
    median_hours: z.number().nullable(),
    answered: z.number().int(),
    expired: z.number().int(),
    by_instructor: z.array(z.object({ instructor_id: z.string(), name: z.string(), answered: z.number().int(), expired: z.number().int(), median_hours: z.number().nullable() })),
  }),
  /** Things waiting for an admin, most urgent first; empty when there's nothing to do. */
  attention: z.array(
    z.object({
      kind: z.enum(["APPLICATIONS", "MESSAGE_REPORTS", "BELOW_MINIMUM", "EXPIRING_REQUESTS", "FAILED_PAYOUTS"]),
      count: z.number().int(),
      href: z.string().nullable(),
    }),
  ),
});
export type AdminDashboard = z.infer<typeof AdminDashboard>;
