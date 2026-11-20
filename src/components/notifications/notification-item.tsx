"use client";

import {
  Bell,
  CalendarClock,
  CalendarX,
  CircleCheck,
  CircleX,
  FileText,
  MessageCircle,
  MessageSquareText,
  RotateCcw,
  UserCheck,
  UserPlus,
  UserX,
  Video,
  type LucideIcon,
} from "lucide-react";
import type { Notification } from "@/lib/api/schemas/notifications";
import { cn } from "@/lib/cn";
import type { NotificationType } from "@/lib/domain/enums";
import { timeAgo } from "@/lib/domain/time";

const ICONS: Partial<Record<NotificationType, LucideIcon>> = {
  BOOKING_REQUESTED: CalendarClock,
  BOOKING_ACCEPTED: CircleCheck,
  BOOKING_DECLINED: CircleX,
  BOOKING_EXPIRED: CalendarX,
  BOOKING_RESCHEDULED: CalendarClock,
  SESSION_REMINDER: CalendarClock,
  PAYMENT_SUCCEEDED: CircleCheck,
  PAYMENT_FAILED: CircleX,
  PAYMENT_REFUNDED: RotateCcw,
  RESOURCE_ADDED: FileText,
  RECORDING_ADDED: Video,
  FEEDBACK_ADDED: MessageSquareText,
  MESSAGE_RECEIVED: MessageCircle,
  COHORT_CANCELLED: CalendarX,
  COHORT_CHANGED: CalendarClock,
  INSTRUCTOR_APPLICATION: UserPlus,
  INSTRUCTOR_APPROVED: UserCheck,
  INSTRUCTOR_REJECTED: UserX,
};

/** Bad news gets the danger tone; everything else stays calm. */
const DANGER = new Set(["PAYMENT_FAILED", "COHORT_CANCELLED", "BOOKING_DECLINED", "BOOKING_EXPIRED", "INSTRUCTOR_REJECTED"]);

/**
 * One notification row: icon, title, body, time, and an unread dot. Rendered as a button so
 * opening it can mark it read before following its link.
 */
export function NotificationItem({
  n,
  onOpen,
  compact,
  now = new Date(),
}: {
  n: Notification;
  onOpen: (n: Notification) => void;
  compact?: boolean;
  now?: Date;
}) {
  const Icon = ICONS[n.type as NotificationType] ?? Bell;
  const unread = !n.read_at;
  return (
    <button
      type="button"
      onClick={() => onOpen(n)}
      className={cn(
        "flex w-full items-start gap-3 rounded-sm px-3 py-3 text-left transition-colors duration-150 hover:bg-surface-1",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
        unread && "bg-info-soft/60",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
          DANGER.has(n.type) ? "bg-danger-soft text-danger" : "bg-surface-2 text-primary",
        )}
      >
        <Icon aria-hidden="true" className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block leading-snug text-heading", unread && "font-semibold")}>{n.title}</span>
        <span className={cn("block text-[15px] leading-relaxed", compact && "line-clamp-2")}>{n.body}</span>
        <span className="mt-0.5 block text-sm">
          <time dateTime={n.created_at}>{timeAgo(n.created_at, now)}</time>
          {unread && <span className="sr-only">, unread</span>}
        </span>
      </span>
      {unread && <span aria-hidden="true" className="mt-2 size-2.5 shrink-0 rounded-full bg-primary" />}
    </button>
  );
}
