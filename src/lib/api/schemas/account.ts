import { z } from "zod";
import { NewPassword } from "./auth";
import { StoredFile } from "./uploads";

/** Mirrors contracts/openapi/account.yaml: the signed-in person's own settings, any role. */

export const MyProfile = z.object({
  email: z.string(),
  name: z.string(),
  avatar: StoredFile.nullable(),
  timezone: z.string(),
  country: z.string().nullable(),
  /** Instructors only: shown on their public profile and training pages. */
  headline: z.string().nullable(),
  bio: z.string().nullable(),
});
export type MyProfile = z.infer<typeof MyProfile>;
export const MyProfileResponse = z.object({ profile: MyProfile });

export const ChangePassword = z
  .object({
    current_password: z.string().min(1, { error: "Enter your current password." }),
    new_password: NewPassword,
  })
  .refine((v) => v.new_password !== v.current_password, { path: ["new_password"], error: "Choose a password you haven't used here." });
export type ChangePassword = z.infer<typeof ChangePassword>;

export const MfaSetup = z.object({ secret: z.string(), otpauth_uri: z.string() });

export const PreferenceItem = z.object({
  group: z.enum(["bookings", "reminders", "payments", "content", "messages", "cohorts", "account", "moderation"]),
  in_app: z.boolean(),
  email: z.boolean(),
});
export const Preferences = z.object({ items: z.array(PreferenceItem) });
export type Preferences = z.infer<typeof Preferences>;

/** NFR Privacy: what stops an account from being deleted right now. */
export const DELETION_BLOCKERS = ["ACTIVE_ENROLMENT", "ACTIVE_BOOKING", "TEACHING_COHORT", "UNPAID_EARNINGS", "ADMIN_ACCOUNT"] as const;
export const DeletionBlocker = z.object({ code: z.enum(DELETION_BLOCKERS), detail: z.string(), link: z.string().nullable() });
export type DeletionBlocker = z.infer<typeof DeletionBlocker>;
export const DeletionCheck = z.object({ blockers: z.array(DeletionBlocker), has_password: z.boolean() });

export const DeleteAccount = z.object({
  confirm_email: z.string().trim().min(1, { error: "Type your email address to confirm." }),
  password: z.string().nullable(),
});
export type DeleteAccount = z.infer<typeof DeleteAccount>;
