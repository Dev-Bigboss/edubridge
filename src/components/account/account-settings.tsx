"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/spinner";
import { useSession } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { NotificationsTab } from "./notifications-tab";
import { PrivacyTab } from "./privacy-tab";
import { ProfileTab } from "./profile-tab";
import { SecurityTab } from "./security-tab";

const TABS = ["profile", "security", "notifications", "privacy"] as const;
type Tab = (typeof TABS)[number];

/**
 * <area>/settings (admins: /admin/account): the person's own profile, sign-in security and
 * notification channels, and their data (ONB-2/3 edits, NFR Security, NTF-2, NFR Privacy). The tab lives in the URL.
 */
export function AccountSettings() {
  const t = useTranslations("account");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { data: user } = useSession();
  const tab: Tab = TABS.includes(params.get("tab") as Tab) ? (params.get("tab") as Tab) : "profile";

  if (!user) return <LoadingState />;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("title")} description={t("intro")} />
      <nav aria-label={t("sections")} className="mb-6 border-b border-border">
        <ul className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map((key) => (
            <li key={key}>
              <button
                type="button"
                aria-current={tab === key ? "page" : undefined}
                onClick={() => router.replace(`${pathname}?tab=${key}`, { scroll: false })}
                className={cn(
                  "min-h-11 border-b-2 px-4 font-heading text-[15px] font-medium whitespace-nowrap transition-colors duration-150",
                  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
                  tab === key ? "border-primary text-primary" : "border-transparent text-heading hover:text-primary",
                )}
              >
                {t(`tabs.${key}`)}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      {tab === "profile" && <ProfileTab user={user} />}
      {tab === "security" && <SecurityTab user={user} />}
      {tab === "notifications" && <NotificationsTab user={user} />}
      {tab === "privacy" && <PrivacyTab user={user} />}
    </div>
  );
}
