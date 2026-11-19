"use client";

import { BookOpen, CalendarClock, CircleAlert, Hourglass, LayoutDashboard, UserRoundPen, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { User } from "@/lib/api/schemas/auth";
import { useSession } from "@/lib/auth/session";
import { cn } from "@/lib/cn";

type Area = "learner" | "instructor" | "admin";

const CONFIG: Record<Area, { icon: LucideIcon; ctaHref: string }> = {
  learner: { icon: BookOpen, ctaHref: "/trainings" },
  instructor: { icon: CalendarClock, ctaHref: "/teach/availability" },
  admin: { icon: LayoutDashboard, ctaHref: "/admin/trainings/new" },
};

/**
 * Phase 0 dashboard: greets the user and shows the empty state their real dashboard will
 * replace in Phase 1–3 (learner: NTF-1; instructor: OTO-4, PAY-7; admin: ADM-1).
 */
export function DashboardHome({ area }: { area: Area }) {
  const t = useTranslations("dashboard");
  const { data: user } = useSession();
  const { icon, ctaHref } = CONFIG[area];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-[28px]">{t("greeting", { name: user?.name.split(" ")[0] ?? "" })}</h1>
      <p className="mb-8 leading-relaxed">{t(`${area}.intro`)}</p>
      {user && <AccountNotice user={user} />}
      <EmptyState
        icon={icon}
        title={t(`${area}.emptyTitle`)}
        description={t(`${area}.emptyBody`)}
        action={
          <Button asChild>
            <Link href={ctaHref}>{t(`${area}.emptyCta`)}</Link>
          </Button>
        }
      />
    </div>
  );
}

/** One account-level prompt at most: unfinished onboarding (ONB-6) or instructor approval (ONB-3). */
function AccountNotice({ user }: { user: User }) {
  const t = useTranslations("dashboard.notices");
  let notice: { icon: LucideIcon; tone: "info" | "warn"; title: string; body: string; href?: string; cta?: string } | null = null;

  if (user.role === "LEARNER" && user.onboarding_status !== "COMPLETED") {
    notice = { icon: UserRoundPen, tone: "info", title: t("finishTitle"), body: t("finishBody"), href: "/onboarding/learner", cta: t("finishCta") };
  } else if (user.role === "INSTRUCTOR" && user.approval_status === "PENDING") {
    notice = { icon: Hourglass, tone: "info", title: t("pendingTitle"), body: t("pendingBody") };
  } else if (user.role === "INSTRUCTOR" && user.approval_status === "REJECTED") {
    notice = { icon: CircleAlert, tone: "warn", title: t("rejectedTitle"), body: t("rejectedBody") };
  }
  if (!notice) return null;
  const Icon = notice.icon;

  return (
    <div
      role="status"
      className={cn(
        "mb-8 flex flex-col gap-4 rounded-md border p-5 sm:flex-row sm:items-center",
        notice.tone === "info" ? "border-primary/25 bg-surface-2" : "border-danger/30 bg-danger-soft",
      )}
    >
      <Icon aria-hidden="true" className={cn("size-6 shrink-0", notice.tone === "info" ? "text-primary" : "text-danger")} />
      <div className="flex-1">
        <p className="font-heading font-medium text-heading">{notice.title}</p>
        <p className="leading-relaxed">{notice.body}</p>
      </div>
      {notice.href && (
        <Button asChild variant="outline">
          <Link href={notice.href}>{notice.cta}</Link>
        </Button>
      )}
    </div>
  );
}
