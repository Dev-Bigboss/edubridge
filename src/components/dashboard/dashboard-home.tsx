"use client";

import { BookOpen, CalendarClock, LayoutDashboard, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useSession } from "@/lib/auth/session";

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
