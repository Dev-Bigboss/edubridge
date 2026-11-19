import { z } from "zod";
import { EDUCATION_LEVELS, PAYOUT_SETUP_STATUSES } from "@/lib/domain/enums";
import { isValidTimeZone } from "@/lib/domain/time";
import { OnboardingStatus, User } from "./auth";
import { StoredFile } from "./uploads";

/**
 * Mirrors contracts/openapi/onboarding.yaml. Each wizard step is one "section", saved on
 * "Save and continue" so people can leave and resume where they stopped (ONB-6).
 * Request bodies reference uploads by id; responses return the stored file.
 */

export const LEARNER_STEPS = ["profile", "goals", "background"] as const;
export const INSTRUCTOR_STEPS = ["profile", "expertise", "verification", "payout", "availability"] as const;
export type LearnerStep = (typeof LEARNER_STEPS)[number];
export type InstructorStep = (typeof INSTRUCTOR_STEPS)[number];
export type OnboardingStep = LearnerStep | InstructorStep;

const timezone = z.string().refine(isValidTimeZone, { error: "Choose a time zone from the list." });
const country = z.string().regex(/^[A-Z]{2}$/, { error: "Choose your country." });

/* ---------- profile (both roles) ---------- */

export const ProfileInput = z.object({
  name: z.string().trim().min(2, { error: "Enter your full name." }).max(120),
  avatar_file_id: z.string().nullable(),
  timezone,
  country,
});
export type ProfileInput = z.infer<typeof ProfileInput>;

export const InstructorProfileInput = ProfileInput.extend({
  headline: z
    .string()
    .trim()
    .min(10, { error: "Write a short headline, at least 10 characters." })
    .max(120, { error: "Keep the headline under 120 characters." }),
  bio: z
    .string()
    .trim()
    .min(80, { error: "Tell learners a little more: at least 80 characters." })
    .max(2000, { error: "Keep your bio under 2,000 characters." }),
});
export type InstructorProfileInput = z.infer<typeof InstructorProfileInput>;

const ProfileOut = z.object({
  name: z.string(),
  avatar: StoredFile.nullable(),
  timezone: z.string(),
  country: z.string().nullable(),
  headline: z.string().optional(),
  bio: z.string().optional(),
});

/* ---------- learner ---------- */

export const GoalsInput = z.object({
  learning_goals: z
    .string()
    .trim()
    .min(10, { error: "Tell us what you want to achieve, in a sentence or two." })
    .max(1000),
  interest_category_ids: z.array(z.string()).min(1, { error: "Pick at least one area." }),
  topics: z.array(z.string().trim().min(1).max(40)).max(10, { error: "Up to 10 topics." }),
});
export type GoalsInput = z.infer<typeof GoalsInput>;

export const BackgroundInput = z.object({
  education_level: z.enum(EDUCATION_LEVELS, { error: "Choose the option closest to you." }),
  /** Optional, local date YYYY-MM-DD (a day, not an instant, so no time zone). */
  exam_target_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
});
export type BackgroundInput = z.infer<typeof BackgroundInput>;

/* ---------- instructor ---------- */

const thisYear = new Date().getFullYear();
export const Qualification = z.object({
  title: z.string().trim().min(2, { error: "Enter the qualification." }).max(120),
  institution: z.string().trim().min(2, { error: "Enter where you earned it." }).max(120),
  year: z.coerce
    .number<string | number>({ error: "Enter a year." })
    .int()
    .min(1950, { error: "Enter a year after 1950." })
    .max(thisYear, { error: "That year is in the future." }),
});

export const ExpertiseInput = z.object({
  category_ids: z.array(z.string()).min(1, { error: "Pick at least one category you teach." }),
  subjects: z
    .array(z.string().trim().min(1).max(40))
    .min(1, { error: "Add at least one subject." })
    .max(15, { error: "Up to 15 subjects." }),
  qualifications: z.array(Qualification).min(1, { error: "Add at least one qualification." }).max(10),
});
export type ExpertiseInput = z.infer<typeof ExpertiseInput>;

export const VerificationInput = z.object({
  id_document_file_id: z.string({ error: "Upload a government-issued photo ID." }).min(1, {
    error: "Upload a government-issued photo ID.",
  }),
  credential_file_ids: z.array(z.string()).max(5, { error: "Up to 5 documents." }),
});
export type VerificationInput = z.infer<typeof VerificationInput>;

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Use a time like 09:00." });

/** ISO weekday: 1 = Monday … 7 = Sunday. Times are wall-clock in `timezone` (OTO-1). */
export const WeeklySlot = z.object({ weekday: z.number().int().min(1).max(7), start: hhmm, end: hhmm });
export type WeeklySlot = z.infer<typeof WeeklySlot>;

export const AvailabilityInput = z
  .object({ timezone, weekly: z.array(WeeklySlot).min(1, { error: "Add at least one time you're available." }) })
  .superRefine((v, ctx) => {
    v.weekly.forEach((s, i) => {
      if (s.start >= s.end) ctx.addIssue({ code: "custom", path: ["weekly", i, "end"], message: "End after the start time." });
    });
    // No overlaps within a day (BR-3 starts here: one instructor, one slot at a time).
    for (let day = 1; day <= 7; day++) {
      const slots = v.weekly.map((s, i) => ({ ...s, i })).filter((s) => s.weekday === day).sort((a, b) => a.start.localeCompare(b.start));
      for (let k = 1; k < slots.length; k++) {
        if (slots[k].start < slots[k - 1].end) {
          ctx.addIssue({ code: "custom", path: ["weekly", slots[k].i, "start"], message: "This overlaps another time on the same day." });
        }
      }
    }
  });
export type AvailabilityInput = z.infer<typeof AvailabilityInput>;

/* ---------- state ---------- */

export const OnboardingState = z.object({
  role: z.enum(["LEARNER", "INSTRUCTOR"]),
  status: OnboardingStatus,
  completed_steps: z.array(z.string()),
  sections: z.object({
    profile: ProfileOut.nullable(),
    goals: GoalsInput.nullable().optional(),
    background: BackgroundInput.nullable().optional(),
    expertise: ExpertiseInput.nullable().optional(),
    verification: z.object({ id_document: StoredFile.nullable(), credentials: z.array(StoredFile) }).nullable().optional(),
    payout: z.object({ status: z.enum(PAYOUT_SETUP_STATUSES) }).optional(),
    availability: z.object({ timezone: z.string(), weekly: z.array(WeeklySlot) }).nullable().optional(),
  }),
});
export type OnboardingState = z.infer<typeof OnboardingState>;

export const PayoutLinkResponse = z.object({ url: z.string() });
export const SubmitResponse = z.object({ user: User });
