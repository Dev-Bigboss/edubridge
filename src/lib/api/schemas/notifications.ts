import { z } from "zod";
import { NOTIFICATION_TYPES } from "@/lib/domain/enums";

/** Mirrors contracts/openapi/notifications.yaml (NTF-1). */

export const Notification = z.object({
  id: z.string(),
  /** Unknown future types still render with a generic icon. */
  type: z.union([z.enum(NOTIFICATION_TYPES), z.string()]),
  /** Written by the backend in the user's language, so the same text goes in the email. */
  title: z.string(),
  body: z.string(),
  /** In-app path to act on it, e.g. /learn/trainings. */
  link: z.string().nullable(),
  created_at: z.string(),
  read_at: z.string().nullable(),
});
export type Notification = z.infer<typeof Notification>;

export const NotificationPage = z.object({
  items: z.array(Notification),
  next_cursor: z.string().nullable(),
  unread_count: z.number().int().nonnegative(),
});
export type NotificationPage = z.infer<typeof NotificationPage>;

export const UnreadCount = z.object({ unread_count: z.number().int().nonnegative() });
