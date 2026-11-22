"use client";

import { Download, Landmark } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/field";
import { PageHeader, TableCard, td, th } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/client";
import { downloadReconciliationCsv, useAdminPayouts, useReconciliation } from "@/lib/api/hooks/earnings";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/domain/time";
import { LoadError } from "./catalog-admin";

/** Ledgers always show cents, so columns line up and add up at a glance. */
const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const usd = (amount: number) => USD.format(amount / 100);
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** /admin/payouts (PAY-7/8): reconciliation for a period, with a CSV export, and every payout. */
export function PayoutsAdmin() {
  const t = useTranslations("admin.payouts");
  const now = new Date();
  const [from, setFrom] = useState(iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1))));
  const [to, setTo] = useState(iso(now));
  const [status, setStatus] = useState("");
  const [exporting, setExporting] = useState(false);
  const report = useReconciliation(from, to);
  const payouts = useAdminPayouts(status || null);
  const rangeError = from && to && from > to ? t("rangeError") : undefined;

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadReconciliationCsv(from, to);
      toast.success(t("exported"));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t("exportFailed"));
    } finally {
      setExporting(false);
    }
  };

  const rows = report.data
    ? ([
        ["captured", report.data.totals.captured],
        ["refunded", -report.data.totals.refunded],
        ["netRevenue", report.data.totals.net_revenue],
        ["commission", report.data.totals.commission],
        ["instructorEarnings", report.data.totals.instructor_earnings],
        ["paidOut", report.data.totals.paid_out],
        ["owed", report.data.totals.owed_to_instructors],
      ] as const)
    : [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("title")} description={t("intro")} />

      <section aria-labelledby="recon" className="mb-10">
        <h2 id="recon" className="mb-3 text-lg">
          {t("reconciliation")}
        </h2>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <Field label={t("from")} className="w-44" error={rangeError}>
            {(a) => <Input {...a} type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />}
          </Field>
          <Field label={t("to")} className="w-44">
            {(a) => <Input {...a} type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />}
          </Field>
          <Button variant="outline" loading={exporting} disabled={!!rangeError} onClick={() => void exportCsv()}>
            <Download aria-hidden="true" className="size-4" />
            {t("csv")}
          </Button>
        </div>
        {report.isError ? (
          <LoadError onRetry={report.refetch} />
        ) : !report.data ? (
          rangeError ? null : <LoadingState />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <TableCard label={t("totals")}>
              <table className="w-full text-[15px]">
                <tbody className="divide-y divide-border-subtle">
                  {rows.map(([k, v]) => (
                    <tr key={k} className={k === "netRevenue" || k === "owed" ? "bg-surface-1" : undefined}>
                      <th scope="row" className={cn(td, "text-left font-normal")}>{t(`rows.${k}`)}</th>
                      <td className={cn(td, "text-right font-medium text-heading tabular-nums")}>{v < 0 ? `−${usd(-v)}` : usd(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableCard>
            <TableCard label={t("byInstructor")}>
              <table className="w-full min-w-[560px] text-[15px]">
                <thead className="border-b border-border-subtle bg-surface-1">
                  <tr>
                    <th scope="col" className={th}>{t("instructor")}</th>
                    <th scope="col" className={cn(th, "text-right")}>{t("earned")}</th>
                    <th scope="col" className={cn(th, "text-right")}>{t("refunds")}</th>
                    <th scope="col" className={cn(th, "text-right")}>{t("paid")}</th>
                    <th scope="col" className={cn(th, "text-right")}>{t("balanceNow")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {report.data.instructors.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={cn(td, "text-center")}>
                        {t("noActivity")}
                      </td>
                    </tr>
                  ) : (
                    report.data.instructors.map((i) => (
                      <tr key={i.instructor_id}>
                        <th scope="row" className={cn(td, "text-left font-medium text-heading")}>{i.name}</th>
                        <td className={cn(td, "text-right tabular-nums")}>{usd(i.earned)}</td>
                        <td className={cn(td, "text-right tabular-nums")}>{i.refunded ? `−${usd(i.refunded)}` : usd(0)}</td>
                        <td className={cn(td, "text-right tabular-nums")}>{usd(i.paid_out)}</td>
                        <td className={cn(td, "text-right font-medium text-heading tabular-nums")}>{usd(i.balance)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </TableCard>
          </div>
        )}
      </section>

      <section aria-labelledby="payouts-list">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 id="payouts-list" className="text-lg">
            {t("payouts")}
          </h2>
          <Field label={t("status")} className="w-52">
            {(a) => (
              <Select {...a} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">{t("allStatuses")}</option>
                {(["REQUESTED", "PAID", "FAILED"] as const).map((s) => (
                  <option key={s} value={s}>
                    {t(`payoutStatus.${s}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        {payouts.isPending ? (
          <LoadingState />
        ) : payouts.isError ? (
          <LoadError onRetry={payouts.refetch} />
        ) : payouts.data.items.length === 0 ? (
          <EmptyState icon={Landmark} title={t("empty")} description={t("emptyBody")} />
        ) : (
          <TableCard label={t("payouts")}>
            <table className="w-full min-w-[640px] text-[15px]">
              <thead className="border-b border-border-subtle bg-surface-1">
                <tr>
                  <th scope="col" className={th}>{t("instructor")}</th>
                  <th scope="col" className={cn(th, "text-right")}>{t("amount")}</th>
                  <th scope="col" className={th}>{t("status")}</th>
                  <th scope="col" className={th}>{t("requested")}</th>
                  <th scope="col" className={th}>{t("reference")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {payouts.data.items.map((p) => (
                  <tr key={p.id}>
                    <th scope="row" className={cn(td, "text-left font-medium text-heading")}>{p.instructor.name}</th>
                    <td className={cn(td, "text-right tabular-nums")}>{usd(p.amount)}</td>
                    <td className={td}>
                      {t(`payoutStatus.${p.status}`)}
                      {p.failure_reason && <span className="block text-sm text-danger">{p.failure_reason}</span>}
                    </td>
                    <td className={td}>
                      <time dateTime={p.requested_at}>{timeAgo(p.requested_at)}</time>
                      {p.trigger === "SCHEDULE" && <span className="block text-sm">{t("automatic")}</span>}
                    </td>
                    <td className={cn(td, "font-mono text-sm")}>{p.reference ?? t("noReference")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        )}
      </section>
    </div>
  );
}
