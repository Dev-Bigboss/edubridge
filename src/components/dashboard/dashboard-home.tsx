"use client";

import { BookOpen, CalendarClock, CircleAlert, Hourglass, LayoutDashboard, UserRoundPen, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/spinner";
import { useMyEnrolments } from "@/lib/api/hooks/me";
import { nextSession } from "@/lib/domain/cohort-schedule";
import { browserTimeZone, formatSessionTime } from "@/lib/domain/time";
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

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-[28px]">{t("greeting", { name: user?.name.split(" ")[0] ?? "" })}</h1>
      <p className="mb-8 leading-relaxed">{t(`${area}.intro`)}</p>
      {user && <AccountNotice user={user} />}
      {area === "learner" ? <LearnerHome fallback={<Empty area={area} />} /> : area === "admin" ? <AdminDashboard /> : <Empty area={area} />}
    </div>
  );
}

function Empty({ area }: { area: Area }) {
  const t = useTranslations("dashboard");
  const { icon, ctaHref } = CONFIG[area];
  return (
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
  );
}

/** NTF-1 starts here: the learner's next classes, soonest first. Empty state until they enrol. */
function LearnerHome({ fallback }: { fallback: React.ReactNode }) {
  const t = useTranslations("dashboard.learner");
  const enrolments = useMyEnrolments();
  const { data: user } = useSession();
  if (enrolments.isPending) return <LoadingState />;
  const now = new Date();
  const zone = user?.timezone ?? browserTimeZone();
  const upcoming = (enrolments.data?.items ?? [])
    .filter((i) => i.enrolment.status === "CONFIRMED")
    .map((i) => ({ item: i, next: nextSession(i.cohort, now) }))
    .filter((x): x is { item: (typeof x)["item"]; next: string } => x.next !== null && x.item.cohort.status !== "CANCELLED")
    .sort((a, b) => a.next.localeCompare(b.next));
  if (upcoming.length === 0) return <>{fallback}</>;
  return (
    <section aria-labelledby="next-classes">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="next-classes" className="text-section">
          {t("nextTitle")}
        </h2>
        <Link href="/learn/trainings" className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline">
          {t("seeAll")}
        </Link>
      </div>
      <ul className="divide-y divide-border-subtle rounded-lg border border-border-subtle bg-white">
        {upcoming.slice(0, 3).map(({ item, next }) => (
          <li key={item.enrolment.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="min-w-0">
              <p className="font-medium text-heading">{item.training.title}</p>
              <p className="text-sm">{item.cohort.name}</p>
            </div>
            <p className="flex items-center gap-2 text-[15px] text-heading">
              <CalendarClock aria-hidden="true" className="size-4 text-primary" />
              {formatSessionTime(next, zone)}
            </p>
          </li>
        ))}
      </ul>
    </section>
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
