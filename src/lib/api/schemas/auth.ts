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
