import { z } from "zod";
import { CONTACT_FILTERS } from "@/lib/domain/contact-filter";

/** Mirrors contracts/openapi/settings.yaml (ADM-3). */

export const RefundTier = z.object({
  /** Applies when the learner cancels at least this many hours before the session. */
  min_hours_before: z.number().int().min(0).max(720),
  refund_percent: z.number().int().min(0).max(100),
});
export type RefundTier = z.infer<typeof RefundTier>;

export const SettingsInput = z.object({
  /** PAY-7: platform's share of each payment, before the instructor's earnings. */
  commission_percent: z.number().min(0).max(50),
  /** OTO-5: an unanswered 1:1 request expires after this long. SRS default 24. */
  booking_expiry_hours: z.number().int().min(1).max(168),
  /** OTO-9, PAY-5: refund by notice given when the learner cancels. */
  learner_cancellation: z.object({ tiers: z.array(RefundTier).min(1).max(6) }),
  /** When the instructor cancels, the learner gets this share back (plan Q3: "depends who cancels"). */
  instructor_cancellation: z.object({ refund_percent: z.number().int().min(0).max(100) }),
  /** REC-5: recordings are deleted this many months after the session (plan §8 Q6 open). */
  recording_retention_months: z.number().int().min(1).max(60),
  /** MSG-5: email about unread messages once they've waited this long. */
  message_email_delay_minutes: z.number().int().min(5).max(1440),
  /** MSG-6: what happens to phone numbers, emails and chat links in messages. */
  contact_filter: z.enum(CONTACT_FILTERS),
});
export type SettingsInput = z.infer<typeof SettingsInput>;

export const PlatformSettings = SettingsInput.extend({
  /** Increases on every save; send it back so two admins can't overwrite each other. */
  version: z.number().int().positive(),
  updated_at: z.string(),
  /** Null until an admin first saves: the values are still the starting defaults. */
  updated_by: z.object({ id: z.string(), name: z.string() }).nullable(),
});
export type PlatformSettings = z.infer<typeof PlatformSettings>;

export const SettingsVersion = z.object({
  version: z.number().int(),
  updated_at: z.string(),
  updated_by_name: z.string(),
  summary: z.string(),
});

export const SettingsResponse = z.object({ settings: PlatformSettings, history: z.array(SettingsVersion) });
export type SettingsResponse = z.infer<typeof SettingsResponse>;
