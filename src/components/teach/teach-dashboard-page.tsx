"use client";

import { useTranslations } from "next-intl";
import { AccountNotice } from "@/components/dashboard/dashboard-home";
import { InstructorDashboard } from "@/components/teach/instructor-dashboard";
import { LoadingState } from "@/components/ui/spinner";
import { useSession } from "@/lib/auth/session";

/** Renders the instructor greeting, any account-level notice, and the live dashboard widgets. */
export function TeachDashboardPage() {
  const t = useTranslations("teach.dashboard");
  const { data: user } = useSession();

  if (!user) return <LoadingState />;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-[28px]">{t("greeting", { name: user.name.split(" ")[0] })}</h1>
      <p className="mb-6 leading-relaxed">{t("intro")}</p>
      <AccountNotice user={user} />
      <InstructorDashboard />
    </div>
  );
}
