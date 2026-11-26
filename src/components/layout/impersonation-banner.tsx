"use client";

import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useEndImpersonation } from "@/lib/api/hooks/admin-users";
import { useSession } from "@/lib/auth/session";

/**
 * ADM-2: while an admin views the app as someone, every page says so and offers the way back.
 * Fixed to the bottom so it never covers page headings; a spacer keeps content clear of it.
 */
export function ImpersonationBanner() {
  const t = useTranslations("impersonation");
  const router = useRouter();
  const { data: user } = useSession();
  const end = useEndImpersonation();
  if (!user?.impersonated_by) return null;

  const stop = async () => {
    try {
      await end.mutateAsync();
      router.replace(`/admin/users/${user.id}`);
    } catch {
      toast.error(t("endFailed"));
    }
  };

  return (
    <>
      <div aria-hidden="true" className="h-20 sm:h-16" />
      <div
        role="region"
        aria-label={t("label")}
        className="fixed inset-x-0 bottom-0 z-[60] border-t-2 border-accent bg-ink text-white shadow-[0_-10px_30px_rgba(8,42,94,0.2)]"
      >
        <div className="mx-auto flex max-w-[var(--container-wide)] flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6">
          <p className="flex items-start gap-2 text-[15px] leading-snug">
            <Eye aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-accent" />
            <span>{t("text", { name: user.name, admin: user.impersonated_by.name })}</span>
          </p>
          <Button variant="white" onClick={() => void stop()} loading={end.isPending}>
            {t("end")}
          </Button>
        </div>
      </div>
    </>
  );
}
