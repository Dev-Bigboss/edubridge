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
  group: z.enum(["bookings", "reminders", "payments", "content", "messages", "cohorts", "account"]),
  in_app: z.boolean(),
  email: z.boolean(),
});
export const Preferences = z.object({ items: z.array(PreferenceItem) });
export type Preferences = z.infer<typeof Preferences>;
