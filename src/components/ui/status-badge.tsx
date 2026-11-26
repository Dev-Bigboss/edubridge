import { cn } from "@/lib/cn";
import type { BookingStatus, CohortStatus, PaymentStatus, TrainingStatus } from "@/lib/domain/enums";

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

const TONE: Record<Tone, string> = {
  neutral: "bg-surface-1 text-body",
  info: "bg-info-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

type AnyStatus = BookingStatus | CohortStatus | PaymentStatus | TrainingStatus;

/** Labels people read; the enum stays the API value. */
const STATUS: Record<AnyStatus, { label: string; tone: Tone }> = {
  // Booking (SRS §4.3)
  PENDING_INSTRUCTOR: { label: "Awaiting instructor", tone: "warning" },
  COUNTER_PROPOSED: { label: "New time proposed", tone: "info" },
  ACCEPTED: { label: "Confirmed", tone: "success" },
  DECLINED: { label: "Declined", tone: "neutral" },
  EXPIRED: { label: "Expired", tone: "neutral" },
  RESCHEDULE_REQUESTED: { label: "Reschedule requested", tone: "info" },
  NO_SHOW: { label: "No-show", tone: "danger" },
  // Cohort (COH-3)
  OPEN: { label: "Open for enrolment", tone: "success" },
  FULL: { label: "Full", tone: "warning" },
  CLOSED: { label: "Enrolment closed", tone: "neutral" },
  IN_PROGRESS: { label: "In progress", tone: "info" },
  // Training (TRN-1)
  PUBLISHED: { label: "Published", tone: "success" },
  ARCHIVED: { label: "Archived", tone: "neutral" },
  // Shared
  DRAFT: { label: "Draft", tone: "neutral" },
  COMPLETED: { label: "Completed", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "danger" },
  // Payment
  PENDING: { label: "Pending", tone: "warning" },
  AUTHORISED: { label: "Authorised, not charged", tone: "info" },
  CAPTURED: { label: "Paid", tone: "success" },
  VOIDED: { label: "Released", tone: "neutral" },
  FAILED: { label: "Failed", tone: "danger" },
  PARTIALLY_REFUNDED: { label: "Partly refunded", tone: "info" },
  REFUNDED: { label: "Refunded", tone: "neutral" },
};

export function StatusBadge({ status, className }: { status: AnyStatus | (string & {}); className?: string }) {
  // Unknown values still render (data-not-code, TRN-2), just neutrally.
  const meta = STATUS[status as AnyStatus] ?? { label: status.replaceAll("_", " ").toLowerCase(), tone: "neutral" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[13px] font-medium leading-6 first-letter:uppercase",
        TONE[meta.tone],
        className,
      )}
    >
      {meta.label}
    </span>
  );
}

/** Plain badge for states that aren't API statuses (e.g. Active / Disabled). */
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[13px] leading-6 font-medium", TONE[tone])}>
      {children}
    </span>
  );
}
