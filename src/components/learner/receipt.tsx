"use client";

import { ArrowLeft, Download, Printer, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import { usePayment } from "@/lib/api/hooks/checkout";
import type { User } from "@/lib/api/schemas/auth";
import { formatCalendarDate } from "@/lib/domain/cohort-schedule";
import { formatMoney } from "@/lib/domain/money";
import { BreakdownLines } from "@/components/checkout/breakdown";

/**
 * PAY-6 receipt. Built from the payment record, so it always shows what was charged (BR-4).
 * Prints on one page; the browser's "Save as PDF" gives the learner a file even before the
 * backend's emailed PDF exists.
 */
export function Receipt({ paymentId, user }: { paymentId: string; user: User }) {
  const t = useTranslations("learner.receipt");
  const query = usePayment(paymentId);

  if (query.isError || (query.data && !query.data.payment.receipt_number)) {
    return (
      <div className="w-full max-w-xl">
        <EmptyState
          icon={ReceiptText}
          title={t("unavailable")}
          description={t("unavailableBody")}
          action={
            <Button asChild>
              <Link href="/learn/payments">{t("back")}</Link>
            </Button>
          }
        />
      </div>
    );
  }
  if (!query.data) return <LoadingState />;
  const { payment } = query.data;
  const money = (amount: number) => formatMoney({ amount, currency: payment.breakdown.currency });

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/learn/payments" className="inline-flex min-h-11 items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline">
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t("back")}
        </Link>
        <div className="flex gap-2">
          {payment.receipt_url && (
            <Button asChild variant="outline">
              <a href={payment.receipt_url} download>
                <Download aria-hidden="true" className="size-4" />
                {t("downloadPdf")}
              </a>
            </Button>
          )}
          <Button onClick={() => window.print()}>
            <Printer aria-hidden="true" className="size-4" />
            {t("print")}
          </Button>
        </div>
      </div>

      <article aria-labelledby="receipt-title" className="rounded-md border border-border bg-white p-6 md:p-10 print:border-0 print:p-0">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 id="receipt-title" className="text-[28px]">
              {t("title")}
            </h1>
            <p className="font-mono text-sm text-heading">{payment.receipt_number}</p>
          </div>
          <StatusBadge status={payment.status} />
        </header>

        <dl className="mb-8 grid gap-4 text-[15px] sm:grid-cols-2">
          <div>
            <dt className="text-sm">{t("billedTo")}</dt>
            <dd className="text-heading">
              {user.name}
              <span className="block">{user.email}</span>
            </dd>
          </div>
          <div>
            <dt className="text-sm">{t("from")}</dt>
            <dd className="text-heading">{t("company")}</dd>
          </div>
          <div>
            <dt className="text-sm">{t("paidOn")}</dt>
            <dd className="text-heading">{formatCalendarDate((payment.captured_at ?? payment.created_at).slice(0, 10))}</dd>
          </div>
          {payment.method && (
            <div>
              <dt className="text-sm">{t("method")}</dt>
              <dd className="text-heading">{payment.method}</dd>
            </div>
          )}
        </dl>

        <h2 className="mb-3 text-lg">{payment.description}</h2>
        <BreakdownLines breakdown={payment.breakdown} />

        {payment.refunded_amount > 0 && (
          <p className="mt-6 rounded-sm bg-surface-1 px-4 py-3 text-[15px] text-heading">
            {t("refunded", { amount: money(payment.refunded_amount) })}
          </p>
        )}

        <p className="mt-8 border-t border-border pt-6 text-sm leading-relaxed">{t("footer")}</p>
      </article>
    </div>
  );
}
