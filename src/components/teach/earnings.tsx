"use client";

import { Banknote, CircleAlert, Wallet } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { LoadError } from "@/components/admin/catalog-admin";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, TableCard, td, th } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/client";
import { useEarnings, useRequestPayout, useSaveSchedule } from "@/lib/api/hooks/earnings";
import type { EarningsSummary, LedgerEntry } from "@/lib/api/schemas/earnings";
import { useSession } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { PAYOUT_SCHEDULES, type PayoutSchedule } from "@/lib/domain/earnings";
import { browserTimeZone, formatInZone } from "@/lib/domain/time";

/** Ledgers always show cents, so columns line up and add up at a glance. */
const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const usd = (amount: number) => USD.format(amount / 100);

/** /teach/earnings (PAY-7): what I've earned, what I can be paid now, and my payouts. */
export function Earnings() {
  const t = useTranslations("teach.earnings");
  const query = useEarnings();
  const { data: user } = useSession();
  const zone = user?.timezone ?? browserTimeZone();
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t("title")} description={query.data ? t("intro", { percent: query.data.commission_percent, days: query.data.hold_days }) : undefined} />
      {query.isPending ? <LoadingState /> : query.isError ? <LoadError onRetry={query.refetch} /> : <Body data={query.data} zone={zone} />}
    </div>
  );
}

function Body({ data, zone }: { data: EarningsSummary; zone: string }) {
  const t = useTranslations("teach.earnings");
  const payout = useRequestPayout();
  const schedule = useSaveSchedule();
  const b = data.balances;
  const day = (iso: string) => formatInZone(iso, zone, "d MMM yyyy");

  const request = () =>
    payout.mutate(undefined, {
      onSuccess: (p) => toast.success(t("requested", { amount: usd(p.amount) })),
      onError: (e) => toast.error(e instanceof ApiError ? e.message : t("failed")),
    });
  const choose = (s: PayoutSchedule) =>
    schedule.mutate(s, {
      onSuccess: () => toast.success(t(`scheduleSaved.${s}`)),
      onError: () => toast.error(t("failed")),
    });

  return (
    <div className="space-y-8">
      <section aria-labelledby="balance" className="rounded-lg border border-border-subtle bg-white p-5 md:p-6">
        <h2 id="balance" className="sr-only">
          {t("balance")}
        </h2>
        <dl className="grid gap-6 sm:grid-cols-3">
          <div>
            <dt className="text-sm">{t("available")}</dt>
            <dd className="font-heading text-[32px] leading-tight font-semibold text-heading">{usd(Math.max(0, b.available))}</dd>
            {b.available < 0 && <dd className="text-sm text-danger">{t("negative", { amount: usd(-b.available) })}</dd>}
          </div>
          <div>
            <dt className="text-sm">{t("pending")}</dt>
            <dd className="font-heading text-2xl leading-tight font-semibold text-heading">{usd(b.pending)}</dd>
            {data.next_available_at && <dd className="text-sm">{t("nextAvailable", { date: day(data.next_available_at) })}</dd>}
          </div>
          <div>
            <dt className="text-sm">{t("paidOut")}</dt>
            <dd className="font-heading text-2xl leading-tight font-semibold text-heading">{usd(b.paid_out_total)}</dd>
            {b.in_flight > 0 && <dd className="text-sm">{t("inFlight", { amount: usd(b.in_flight) })}</dd>}
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border-subtle pt-5">
          <Button loading={payout.isPending} disabled={!!data.payout_blocked_reason} onClick={request} aria-describedby={data.payout_blocked_reason ? "payout-why" : undefined}>
            <Banknote aria-hidden="true" className="size-4" />
            {t("request", { amount: usd(Math.max(0, b.available)) })}
          </Button>
          {data.payout_blocked_reason && (
            <p id="payout-why" className="flex items-center gap-1.5 text-[15px]">
              <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
              {data.payout_blocked_reason}
              {data.payout_account_status !== "COMPLETE" && (
                <Link href="/onboarding/instructor" className="ml-1 font-medium text-primary underline-offset-4 hover:underline">
                  {t("finishSetup")}
                </Link>
              )}
            </p>
          )}
        </div>

        <fieldset className="mt-5">
          <legend className="mb-2 font-heading text-[15px] font-medium text-heading">{t("scheduleLabel")}</legend>
          <div className="flex flex-wrap gap-2">
            {PAYOUT_SCHEDULES.map((s) => (
              <label
                key={s}
                className={cn(
                  "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-[15px] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary",
                  data.schedule.schedule === s ? "border-primary bg-surface-2 text-heading" : "border-border bg-white hover:border-body/50",
                )}
              >
                <input type="radio" name="schedule" className="sr-only" checked={data.schedule.schedule === s} disabled={schedule.isPending} onChange={() => choose(s)} />
                {t(`schedules.${s}`)}
              </label>
            ))}
          </div>
          {data.schedule.next_run_at && <p className="mt-2 text-sm">{t("nextRun", { date: day(data.schedule.next_run_at) })}</p>}
        </fieldset>
      </section>

      <section aria-labelledby="ledger-heading">
        <h2 id="ledger-heading" className="mb-3 text-lg">
          {t("ledger")}
        </h2>
        {data.entries.length === 0 ? (
          <EmptyState icon={Wallet} title={t("emptyLedger")} description={t("emptyLedgerBody")} />
        ) : (
          <TableCard label={t("ledger")}>
            <table className="w-full min-w-[720px] text-[15px]">
              <thead className="border-b border-border-subtle bg-surface-1">
                <tr>
                  <th scope="col" className={th}>{t("date")}</th>
                  <th scope="col" className={th}>{t("what")}</th>
                  <th scope="col" className={cn(th, "text-right")}>{t("learnerPaid")}</th>
                  <th scope="col" className={cn(th, "text-right")}>{t("commission")}</th>
                  <th scope="col" className={cn(th, "text-right")}>{t("you")}</th>
                  <th scope="col" className={th}>{t("status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {data.entries.map((e) => (
                  <Row key={e.id} e={e} day={day} />
                ))}
              </tbody>
            </table>
          </TableCard>
        )}
      </section>

      <section aria-labelledby="payouts-heading">
        <h2 id="payouts-heading" className="mb-3 text-lg">
          {t("payouts")}
        </h2>
        {data.payouts.length === 0 ? (
          <p className="text-[15px]">{t("noPayouts")}</p>
        ) : (
          <TableCard label={t("payouts")}>
            <table className="w-full min-w-[560px] text-[15px]">
              <thead className="border-b border-border-subtle bg-surface-1">
                <tr>
                  <th scope="col" className={th}>{t("requestedOn")}</th>
                  <th scope="col" className={cn(th, "text-right")}>{t("amount")}</th>
                  <th scope="col" className={th}>{t("status")}</th>
                  <th scope="col" className={th}>{t("reference")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {data.payouts.map((p) => (
                  <tr key={p.id}>
                    <td className={td}>
                      {day(p.requested_at)}
                      {p.trigger === "SCHEDULE" && <span className="block text-sm">{t("automatic")}</span>}
                    </td>
                    <td className={cn(td, "text-right font-medium text-heading tabular-nums")}>{usd(p.amount)}</td>
                    <td className={td}>
                      <span className={cn("rounded-full px-2.5 py-0.5 text-sm font-medium", p.status === "PAID" ? "bg-success-soft text-success" : p.status === "FAILED" ? "bg-danger-soft text-danger" : "bg-info-soft text-primary")}>
                        {t(`payoutStatus.${p.status}`)}
                      </span>
                      {p.paid_at && <span className="ml-2 text-sm">{day(p.paid_at)}</span>}
                      {p.failure_reason && <span className="block text-sm text-danger">{p.failure_reason}</span>}
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

function Row({ e, day }: { e: LedgerEntry; day: (iso: string) => string }) {
  const t = useTranslations("teach.earnings");
  const signed = (n: number) => (n < 0 ? `−${usd(-n)}` : usd(n));
  return (
    <tr>
      <td className={cn(td, "whitespace-nowrap")}>{day(e.created_at)}</td>
      <td className={td}>
        <span className="text-heading">{e.description}</span>
        {e.commission_percent !== null && e.kind === "EARNING" && <span className="block text-sm">{t("rate", { percent: e.commission_percent })}</span>}
      </td>
      <td className={cn(td, "text-right tabular-nums")}>{e.gross === null ? "" : signed(e.kind === "REFUND" ? -e.gross : e.gross)}</td>
      <td className={cn(td, "text-right tabular-nums")}>{e.commission === null ? "" : signed(e.kind === "REFUND" ? e.commission : -e.commission)}</td>
      <td className={cn(td, "text-right font-medium tabular-nums", e.amount < 0 ? "text-heading" : "text-success")}>{signed(e.amount)}</td>
      <td className={td}>{e.kind === "PAYOUT" ? t("paidOutRow") : e.status === "AVAILABLE" ? t("availableRow") : t("pendingRow", { date: day(e.available_at) })}</td>
    </tr>
  );
}
