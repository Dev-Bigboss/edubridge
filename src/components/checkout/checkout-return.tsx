"use client";

import { CircleCheck, CircleX, LoaderCircle, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { usePayment } from "@/lib/api/hooks/checkout";
import { formatMoney } from "@/lib/domain/money";
import { BreakdownLines } from "./breakdown";

/** After this long without a webhook, stop implying it's instant and promise an email instead. */
const SLOW_AFTER_MS = 30_000;

/**
 * /checkout/return (PAY-2). Coming back from the gateway proves nothing, so the page waits for
 * the backend to confirm the payment by webhook, then shows the outcome with the next step.
 */
export function CheckoutReturn({ paymentId }: { paymentId: string | null }) {
  const t = useTranslations("checkout.return");
  const query = usePayment(paymentId);
  const [slow, setSlow] = useState(false);
  const pending = !query.data || query.data.payment.status === "PENDING";
  const qc = useQueryClient();

  // Once settled, seats, "My trainings" and payment history have all changed.
  useEffect(() => {
    if (pending) return;
    void qc.invalidateQueries({ queryKey: ["me"] });
    void qc.invalidateQueries({ queryKey: ["catalog"] });
  }, [pending, qc]);

  useEffect(() => {
    if (!pending) return;
    const id = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(id);
  }, [pending]);

  if (!paymentId || query.isError) {
    return (
      <div className="w-full max-w-xl">
        <EmptyState
          icon={CircleX}
          title={t("unknown")}
          description={t("unknownBody")}
          action={
            <Button asChild>
              <Link href="/learn">{t("dashboard")}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (pending) {
    return (
      <AuthCard icon={LoaderCircle} title={t("pendingTitle")} subtitle={slow ? t("slowBody") : t("pendingBody")}>
        <div role="status" className="flex items-center justify-center gap-3 text-heading">
          <LoaderCircle aria-hidden="true" className="size-6 animate-spin text-primary motion-reduce:animate-none" />
          {t("checking")}
        </div>
        {slow && (
          <Button asChild variant="outline" className="mt-5 w-full">
            <Link href="/learn">{t("dashboard")}</Link>
          </Button>
        )}
      </AuthCard>
    );
  }

  const { payment, enrolment, cohort_id, training_slug } = query.data;
  const paid = formatMoney({ amount: payment.breakdown.total, currency: payment.breakdown.currency });

  if (payment.status === "CAPTURED" && enrolment.status === "CONFIRMED") {
    return (
      <AuthCard icon={CircleCheck} title={t("successTitle")} subtitle={t("successBody", { what: payment.description })}>
        <div className="space-y-5">
          <BreakdownLines breakdown={payment.breakdown} />
          {payment.method && <p className="text-sm">{t("paidWith", { method: payment.method })}</p>}
          <p className="rounded-sm bg-success-soft px-4 py-3 text-[15px] leading-relaxed text-heading">{t("emailSent")}</p>
          <Button asChild className="w-full">
            <Link href="/learn/trainings">{t("myTrainings")}</Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  if (payment.status === "REFUNDED" || payment.status === "PARTIALLY_REFUNDED") {
    return (
      <AuthCard icon={RotateCcw} title={t("refundedTitle")} subtitle={payment.failure_message ?? t("refundedBody", { amount: paid })}>
        <Button asChild className="w-full">
          <Link href={`/trainings/${training_slug}#cohorts`}>{t("otherCohorts")}</Link>
        </Button>
      </AuthCard>
    );
  }

  // FAILED or VOIDED: nothing was charged.
  return (
    <AuthCard icon={CircleX} title={t("failedTitle")} subtitle={payment.failure_message ?? t("failedBody")}>
      <div className="flex flex-col gap-3">
        <Button asChild className="w-full">
          <Link href={`/checkout/cohort/${cohort_id}`}>{t("tryAgain")}</Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href={`/trainings/${training_slug}`}>{t("backToTraining")}</Link>
        </Button>
      </div>
    </AuthCard>
  );
}
