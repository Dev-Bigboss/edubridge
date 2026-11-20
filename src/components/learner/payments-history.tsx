"use client";

import { CreditCard, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { LoadError } from "@/components/admin/catalog-admin";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, TableCard, td, th } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import { useMyPayments } from "@/lib/api/hooks/me";
import type { Payment } from "@/lib/api/schemas/payments";
import { formatCalendarDate } from "@/lib/domain/cohort-schedule";
import { formatMoney } from "@/lib/domain/money";

/** /learn/payments (PAY-6): every payment, its status, refunds and the receipt. */
export function PaymentsHistory() {
  const t = useTranslations("learner.payments");
  const query = useMyPayments();
  const money = (p: Payment, amount: number) => formatMoney({ amount, currency: p.breakdown.currency });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t("title")} description={t("intro")} />
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <LoadError onRetry={query.refetch} />
      ) : query.data.items.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={t("empty")}
          description={t("emptyBody")}
          action={
            <Button asChild>
              <Link href="/trainings">{t("browse")}</Link>
            </Button>
          }
        />
      ) : (
        <TableCard label={t("title")}>
          <table className="w-full min-w-[720px] text-[15px]">
            <thead className="border-b border-border bg-surface-1">
              <tr>
                <th className={th}>{t("date")}</th>
                <th className={th}>{t("for")}</th>
                <th className={`${th} text-right`}>{t("amount")}</th>
                <th className={th}>{t("status")}</th>
                <th className={th}>
                  <span className="sr-only">{t("receipt")}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {query.data.items.map((p) => (
                <tr key={p.id}>
                  <td className={`${td} whitespace-nowrap`}>{formatCalendarDate(p.created_at.slice(0, 10))}</td>
                  <td className={td}>
                    <span className="text-heading">{p.description}</span>
                    {p.method && <p className="text-sm">{p.method}</p>}
                    {p.failure_message && <p className="text-sm">{p.failure_message}</p>}
                  </td>
                  <td className={`${td} text-right whitespace-nowrap`}>
                    <span className="font-medium text-heading">{money(p, p.breakdown.total)}</span>
                    {p.refunded_amount > 0 && <p className="text-sm text-success">{t("refunded", { amount: money(p, p.refunded_amount) })}</p>}
                  </td>
                  <td className={td}>
                    <StatusBadge status={p.status} />
                  </td>
                  <td className={`${td} text-right`}>
                    {p.receipt_number ? (
                      <Link
                        href={`/receipts/${p.id}`}
                        aria-label={t("receiptFor", { what: p.description })}
                        className="inline-flex min-h-11 items-center gap-1.5 font-medium whitespace-nowrap text-primary underline-offset-4 hover:underline"
                      >
                        <ReceiptText aria-hidden="true" className="size-4" />
                        {t("receipt")}
                      </Link>
                    ) : (
                      <span className="text-sm">{t("noReceipt")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}
    </div>
  );
}
