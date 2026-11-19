import { z } from "zod";
import { APPROVAL_STATUSES, ROLES, USER_STATUSES } from "@/lib/domain/enums";

/** Mirrors contracts/openapi/auth.yaml. Field names are snake_case as in SRS §5. */

export const OnboardingStatus = z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]);

export const User = z.object({
  id: z.string(),
  role: z.enum(ROLES),
  email: z.email(),
  name: z.string(),
  timezone: z.string(),
  status: z.enum(USER_STATUSES),
  avatar_url: z.string().nullable(),
  /** ONB-6: lets the app send people back to the step they left. */
  onboarding_status: OnboardingStatus,
  /** ONB-3: only set for instructors. */
  approval_status: z.enum(APPROVAL_STATUSES).nullable(),
  mfa_enabled: z.boolean(),
  /**
   * ONB-4: true when the user hasn't accepted the current terms and privacy versions
   * (new Google sign-ups, or after a document changes). The app asks before anything else.
   */
  consent_required: z.boolean(),
});
export type User = z.infer<typeof User>;

export const SessionResponse = z.object({ user: User });
export type SessionResponse = z.infer<typeof SessionResponse>;

export const LoginRequest = z.object({
  email: z.email({ error: "Enter a valid email address." }),
  password: z.string().min(1, { error: "Enter your password." }),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

/** NFR Security: Admin and Instructor sign-ins require a second factor. */
export const LoginResponse = z.discriminatedUnion("mfa_required", [
  z.object({ mfa_required: z.literal(false), user: User }),
  z.object({ mfa_required: z.literal(true), mfa_challenge_id: z.string() }),
]);
export type LoginResponse = z.infer<typeof LoginResponse>;

export const MfaVerifyRequest = z.object({
  mfa_challenge_id: z.string(),
  code: z.string().regex(/^\d{6}$/, { error: "Enter the 6-digit code from your authenticator app." }),
});
export type MfaVerifyRequest = z.infer<typeof MfaVerifyRequest>;

/** NFR Security: length over composition rules (NIST SP 800-63B). The backend also checks breached lists. */
export const NewPassword = z
  .string()
  .min(10, { error: "Use at least 10 characters." })
  .max(128, { error: "Use 128 characters or fewer." });

export const REGISTERABLE_ROLES = ["LEARNER", "INSTRUCTOR"] as const;

/** ONB-1 + ONB-4. Admin accounts are created by other admins, never self-registered. */
export const RegisterRequest = z.object({
  role: z.enum(REGISTERABLE_ROLES),
  name: z.string().trim().min(2, { error: "Enter your full name." }).max(120, { error: "Use 120 characters or fewer." }),
  email: z.email({ error: "Enter a valid email address." }),
  password: NewPassword,
  timezone: z.string(),
  /** Must be checked: the versions accepted are sent alongside. */
  accept_terms: z.literal(true, { error: "Please accept the terms and privacy policy to continue." }),
  terms_version: z.string(),
  privacy_version: z.string(),
});
export type RegisterRequest = z.infer<typeof RegisterRequest>;

/** 202: account created in PENDING_VERIFICATION, verification email sent. No session yet. */
export const RegisterResponse = z.object({ email: z.email() });

export const EmailOnly = z.object({ email: z.email({ error: "Enter a valid email address." }) });
export type EmailOnly = z.infer<typeof EmailOnly>;

export const ResetPasswordForm = z
  .object({ password: NewPassword, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { error: "The passwords don't match.", path: ["confirm"] });
export type ResetPasswordForm = z.infer<typeof ResetPasswordForm>;

export const LegalVersions = z.object({ terms_version: z.string(), privacy_version: z.string() });
export type LegalVersions = z.infer<typeof LegalVersions>;
