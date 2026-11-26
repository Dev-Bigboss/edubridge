"use client";

import { FileCheck2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthCard, FormError } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/spinner";
import { applyApiError } from "@/lib/api/form-errors";
import { afterSignInPath, safeNextPath } from "@/lib/auth/routes";
import { useAcceptConsent, useLogout, useSession } from "@/lib/auth/session";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";

/**
 * ONB-4: records acceptance of the current terms and privacy versions. Shown after Google sign-up
 * (no checkbox on Google's screen) and whenever a document version changes.
 */
export function ConsentForm() {
  const t = useTranslations("auth.consent");
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get("next"));
  const { data: user, isPending } = useSession();
  const accept = useAcceptConsent();
  const logout = useLogout();
  const [checked, setChecked] = useState(false);
  const [checkboxError, setCheckboxError] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isPending) return;
    if (user === null) router.replace(`/login?next=${encodeURIComponent(`/consent${next ? `?next=${encodeURIComponent(next)}` : ""}`)}`);
    else if (user && !user.consent_required) router.replace(afterSignInPath(user, next));
  }, [user, isPending, next, router]);

  if (!user?.consent_required) return <LoadingState />;

  const isNewUser = user.onboarding_status === "NOT_STARTED";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checked) {
      setCheckboxError(true);
      return;
    }
    setFormError(null);
    try {
      const res = await accept.mutateAsync({ terms_version: LEGAL_VERSIONS.terms, privacy_version: LEGAL_VERSIONS.privacy });
      toast.success(t("success"));
      router.replace(afterSignInPath(res.user, next));
    } catch (err) {
      setFormError(applyApiError(err, () => {}));
    }
  };

  const docs = [
    { href: "/legal/terms", label: t("terms"), version: LEGAL_VERSIONS.terms },
    { href: "/legal/privacy", label: t("privacy"), version: LEGAL_VERSIONS.privacy },
  ];

  return (
    <AuthCard icon={FileCheck2} title={t("title")} subtitle={isNewUser ? t("subtitle") : t("updatedSubtitle")}>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormError message={formError} />
        <ul className="divide-y divide-border rounded-sm border border-border">
          {docs.map((d) => (
            <li key={d.href}>
              <Link
                href={d.href}
                target="_blank"
                className="flex min-h-[56px] items-center justify-between gap-3 px-4 py-3 hover:bg-surface-1"
              >
                <span className="font-heading font-medium text-heading">{d.label}</span>
                <span className="text-sm">{t("version", { date: d.version })}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div>
          <label className="flex min-h-[44px] cursor-pointer items-start gap-3 leading-relaxed">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => {
                setChecked(e.target.checked);
                if (e.target.checked) setCheckboxError(false);
              }}
              className="mt-1 size-5 shrink-0 accent-primary"
              aria-invalid={checkboxError || undefined}
              aria-describedby={checkboxError ? "consent-error" : undefined}
            />
            <span>{t("checkbox")}</span>
          </label>
          {checkboxError && (
            <p id="consent-error" className="mt-1 text-sm text-danger">
              {t("checkboxError")}
            </p>
          )}
        </div>
        <Button type="submit" className="h-12 w-full" loading={accept.isPending}>
          {accept.isPending ? t("submitting") : t("submit")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={accept.isPending || logout.isPending}
          onClick={() => logout.mutate(undefined, { onSettled: () => router.replace("/login") })}
        >
          {t("decline")}
        </Button>
      </form>
    </AuthCard>
  );
}
