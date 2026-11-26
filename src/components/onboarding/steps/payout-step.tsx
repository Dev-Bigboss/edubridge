"use client";

import { CircleCheck, ExternalLink, Landmark } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { FormError } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { applyApiError } from "@/lib/api/form-errors";
import { usePayoutLink } from "@/lib/api/hooks/onboarding";
import { StepActions } from "../wizard-frame";
import type { StepProps } from "./types";

/**
 * ONB-3 payout details via Stripe Connect (D8). Bank details are entered on Stripe's pages,
 * so EduBridge never stores them (PCI SAQ-A, NFR Privacy minimisation).
 */
export function PayoutStep({ state, onDone, onBack }: StepProps) {
  const t = useTranslations("onboarding.payout");
  const status = state.sections.payout?.status ?? "NOT_STARTED";
  const link = usePayoutLink();
  const [formError, setFormError] = useState<string | null>(null);

  const connect = async () => {
    setFormError(null);
    try {
      const { url } = await link.mutateAsync();
      window.location.assign(url);
    } catch (err) {
      setFormError(applyApiError(err, () => {}));
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onDone();
      }}
      className="space-y-5"
    >
      <FormError message={formError} />
      <p className="leading-relaxed">{t("intro")}</p>
      {status === "COMPLETE" ? (
        <p role="status" className="flex items-start gap-3 rounded-sm border border-success/30 bg-success-soft px-4 py-3 leading-relaxed text-heading">
          <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
          {t("complete")}
        </p>
      ) : (
        <div className="rounded-sm border border-border p-5">
          <p className="mb-4 flex items-start gap-3 leading-relaxed">
            <Landmark aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
            {status === "PENDING" ? t("pending") : t("notStarted")}
          </p>
          <Button type="button" onClick={connect} loading={link.isPending}>
            {link.isPending ? t("opening") : status === "PENDING" ? t("continueSetup") : t("connect")}
            {!link.isPending && <ExternalLink aria-hidden="true" className="size-4" />}
          </Button>
        </div>
      )}
      {/* Continuing without payouts is allowed only once Stripe confirms the account. */}
      {status === "COMPLETE" ? <StepActions onBack={onBack} pending={false} submitLabel={t("next")} /> : (
        <div className="mt-8 border-t border-border pt-6">
          <Button type="button" variant="ghost" onClick={onBack}>
            {t("back")}
          </Button>
        </div>
      )}
    </form>
  );
}
