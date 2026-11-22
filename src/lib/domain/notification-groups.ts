import type { NotificationType, Role } from "./enums";

/**
 * NTF-2: people choose channels per kind of event, not per one of 18 types. Some channels are
 * locked on because missing them costs money or access (receipts, refunds, approval decisions).
 */
export type NotificationGroup = {
  key: "bookings" | "reminders" | "payments" | "content" | "messages" | "cohorts" | "account" | "moderation";
  types: NotificationType[];
  roles: Role[];
  /** Channels that can't be turned off for this group. */
  locked: ("in_app" | "email")[];
};

export const NOTIFICATION_GROUPS: NotificationGroup[] = [
  { key: "bookings", types: ["BOOKING_REQUESTED", "BOOKING_ACCEPTED", "BOOKING_DECLINED", "BOOKING_EXPIRED", "BOOKING_RESCHEDULED"], roles: ["LEARNER", "INSTRUCTOR"], locked: [] },
  { key: "reminders", types: ["SESSION_REMINDER"], roles: ["LEARNER", "INSTRUCTOR"], locked: [] },
  { key: "payments", types: ["PAYMENT_SUCCEEDED", "PAYMENT_FAILED", "PAYMENT_REFUNDED"], roles: ["LEARNER"], locked: ["email"] },
  { key: "cohorts", types: ["COHORT_CANCELLED", "COHORT_CHANGED"], roles: ["LEARNER", "INSTRUCTOR"], locked: ["email"] },
  { key: "content", types: ["RESOURCE_ADDED", "RECORDING_ADDED", "FEEDBACK_ADDED"], roles: ["LEARNER"], locked: [] },
  { key: "messages", types: ["MESSAGE_RECEIVED"], roles: ["LEARNER", "INSTRUCTOR"], locked: [] },
  { key: "account", types: ["INSTRUCTOR_APPLICATION", "INSTRUCTOR_APPROVED", "INSTRUCTOR_REJECTED"], roles: ["INSTRUCTOR", "ADMIN"], locked: ["in_app", "email"] },
  { key: "moderation", types: ["MESSAGE_REPORTED"], roles: ["ADMIN"], locked: [] },
];

export type Preference = { group: NotificationGroup["key"]; in_app: boolean; email: boolean };

export const groupsFor = (role: Role) => NOTIFICATION_GROUPS.filter((g) => g.roles.includes(role));
export const groupOf = (type: string) => NOTIFICATION_GROUPS.find((g) => g.types.includes(type as NotificationType));

/** Everything on by default; saved choices on top; locked channels always on. */
export function effectivePreferences(role: Role, saved: Partial<Record<string, { in_app: boolean; email: boolean }>> = {}): Preference[] {
  return groupsFor(role).map((g) => ({
    group: g.key,
    in_app: g.locked.includes("in_app") || (saved[g.key]?.in_app ?? true),
    email: g.locked.includes("email") || (saved[g.key]?.email ?? true),
  }));
}

/** Should this event reach this person on this channel? */
export function wants(role: Role, saved: Parameters<typeof effectivePreferences>[1], type: string, channel: "in_app" | "email"): boolean {
  const group = groupOf(type);
  if (!group) return true;
  const pref = effectivePreferences(role, saved).find((p) => p.group === group.key);
  return pref ? pref[channel] : true;
}
