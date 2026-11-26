import { z } from "zod";
import { APPROVAL_STATUSES, ROLES, USER_STATUSES } from "@/lib/domain/enums";
import { User } from "./auth";
import { OnboardingState } from "./onboarding";

/** Mirrors contracts/openapi/admin-users.yaml (ADM-2, ONB-3, ADM-5). */

export const AdminUserRow = User.omit({ impersonated_by: true }).extend({
  created_at: z.string(),
  last_sign_in_at: z.string().nullable(),
});
export type AdminUserRow = z.infer<typeof AdminUserRow>;

export const AdminUserPage = z.object({
  items: z.array(AdminUserRow),
  next_cursor: z.string().nullable(),
  total: z.number().int(),
  /** For the "Waiting for approval" shortcut, whatever the current filter. */
  pending_approvals: z.number().int(),
});

export const AuditEntry = z.object({
  id: z.string(),
  actor_id: z.string(),
  actor_name: z.string(),
  action: z.string(),
  target_type: z.string(),
  target_id: z.string(),
  summary: z.string(),
  created_at: z.string(),
});
export type AuditEntry = z.infer<typeof AuditEntry>;

export const AdminUserDetail = z.object({
  user: AdminUserRow,
  /** What they entered during onboarding (ONB-2/3). Null for admins. */
  onboarding: OnboardingState.shape.sections.nullable(),
  stats: z.object({ enrolments: z.number().int(), trainings_taught: z.number().int(), payments_total: z.number().int() }),
  /** Latest admin actions about this user (ADM-5). */
  history: z.array(AuditEntry),
});
export type AdminUserDetail = z.infer<typeof AdminUserDetail>;

export const USER_ACTIONS = ["approve", "reject", "suspend", "reactivate", "reset-access", "impersonate"] as const;
export type UserAction = (typeof USER_ACTIONS)[number];
/** Actions that must say why: the person affected is told, and the audit log keeps it. */
export const NEEDS_REASON: readonly UserAction[] = ["reject", "suspend", "impersonate"];

export type UserFilters = { q?: string; role?: (typeof ROLES)[number]; status?: (typeof USER_STATUSES)[number]; approval?: (typeof APPROVAL_STATUSES)[number] };

export const AuditPage = z.object({
  items: z.array(AuditEntry),
  next_cursor: z.string().nullable(),
  total: z.number().int(),
  facets: z.object({ actors: z.array(z.object({ id: z.string(), name: z.string() })), target_types: z.array(z.string()) }),
});
export type AuditPage = z.infer<typeof AuditPage>;
export type AuditFilters = { q?: string; actor_id?: string; target_type?: string; from?: string; to?: string };
