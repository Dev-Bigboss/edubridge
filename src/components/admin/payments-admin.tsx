"use client";

import { CreditCard, Search, SearchX } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { PageHeader, TableCard, td, th } from "@/components/ui/page-header";
import { Select, Textarea } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import { ApiError } from "@/lib/api/client";
import { useAdminPayments, useRefund } from "@/lib/api/hooks/admin-payments";
import type { AdminPaymentFilters, AdminPaymentRow } from "@/lib/api/schemas/payments";
import { refundable } from "@/lib/domain/checkout";
import { formatCalendarDate } from "@/lib/domain/cohort-schedule";
import { formatMoney, moneyInputValue, parseMoneyInput } from "@/lib/domain/money";
import { LoadError } from "./catalog-admin";

const FILTER_KEYS = ["q", "status", "from", "to"] as const;
const STATUSES = ["CAPTURED", "PARTIALLY_REFUNDED", "REFUNDED", "FAILED"] as const;

/** /admin/payments (PAY-5): every payment that reached the gateway, with refunds. */
export function PaymentsAdmin() {
  const t = useTranslations("admin.payments");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? undefined])) as AdminPaymentFilters;
  const [search, setSearch] = useState(filters.q ?? "");
  const [refunding, setRefunding] = useState<AdminPaymentRow | null>(null);

  const setFilters = (changes: Partial<Record<(typeof FILTER_KEYS)[number], string>>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  };

  useEffect(() => {
    if ((filters.q ?? "") === search.trim()) return;
    const id = setTimeout(() => setFilters({ q: search.trim() }), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the typed text restarts the timer
  }, [search]);

  const payments = useAdminPayments(filters);
  const first = payments.data?.pages[0];
  const items = payments.data?.pages.flatMap((p) => p.items) ?? [];
  const filtered = FILTER_KEYS.some((k) => filters[k]);
  const usd = (amount: number) => formatMoney({ amount, currency: "USD" });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("title")} description={t("intro")} />

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px] lg:grid-cols-[1fr_220px_160px_160px]" role="search" aria-label={t("filters")}>
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-body" />
          <Input type="search" aria-label={t("search")} placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-11" />
        </div>
        <Select aria-label={t("status")} value={filters.status ?? ""} onChange={(e) => setFilters({ status: e.target.value })}>
          <option value="">{t("allStatuses")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`statuses.${s}`)}
            </option>
          ))}
        </Select>
        <Input type="date" aria-label={t("from")} value={filters.from ?? ""} max={filters.to} onChange={(e) => setFilters({ from: e.target.value })} />
        <Input type="date" aria-label={t("to")} value={filters.to ?? ""} min={filters.from} onChange={(e) => setFilters({ to: e.target.value })} />
      </div>

      {payments.isPending ? (
        <LoadingState />
      ) : payments.isError ? (
        <LoadError onRetry={payments.refetch} />
      ) : items.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={SearchX}
            title={t("noMatches")}
            description={t("noMatchesBody")}
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  router.replace(pathname);
                }}
              >
                {t("clearFilters")}
              </Button>
            }
          />
        ) : (
          <EmptyState icon={CreditCard} title={t("empty")} description={t("emptyBody")} />
        )
      ) : (
        <>
          {first && (
            <dl className="mb-4 flex flex-wrap gap-x-8 gap-y-1 text-[15px]" aria-live="polite">
              <div className="flex gap-2">
                <dt>{t("count")}</dt>
                <dd className="font-medium text-heading">{first.total}</dd>
              </div>
              <div className="flex gap-2">
                <dt>{t("taken")}</dt>
                <dd className="font-medium text-heading">{usd(first.sums.captured)}</dd>
              </div>
              <div className="flex gap-2">
                <dt>{t("refundedSum")}</dt>
                <dd className="font-medium text-heading">{usd(first.sums.refunded)}</dd>
              </div>
            </dl>
          )}
          <TableCard label={t("title")}>
            <table className="w-full min-w-[900px] text-[15px]">
              <thead className="border-b border-border bg-surface-1">
                <tr>
                  <th className={th}>{t("date")}</th>
                  <th className={th}>{t("learner")}</th>
                  <th className={th}>{t("for")}</th>
                  <th className={`${th} text-right`}>{t("amount")}</th>
                  <th className={th}>{t("status")}</th>
                  <th className={th}>
                    <span className="sr-only">{t("actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((p) => (
                  <tr key={p.id} className="align-top">
                    <td className={`${td} whitespace-nowrap`}>
                      {formatCalendarDate(p.created_at.slice(0, 10))}
                      {p.receipt_number && <span className="block font-mono text-xs">{p.receipt_number}</span>}
                    </td>
                    <td className={td}>
                      <Link href={`/admin/users/${p.learner.id}`} className="font-medium text-heading underline-offset-4 hover:text-primary hover:underline">
                        {p.learner.name}
                      </Link>
                      <span className="block text-sm break-all">{p.learner.email}</span>
                    </td>
                    <td className={td}>
                      <span className="text-heading">{p.description}</span>
                      {p.enrolment_status !== "CONFIRMED" && p.captured_at && <span className="block text-sm">{t("enrolmentEnded")}</span>}
                    </td>
                    <td className={`${td} text-right whitespace-nowrap`}>
                      <span className="font-medium text-heading">{formatMoney({ amount: p.breakdown.total, currency: p.breakdown.currency })}</span>
                      {p.refunded_amount > 0 && (
                        <span className="block text-sm">{t("refundedAmount", { amount: formatMoney({ amount: p.refunded_amount, currency: p.breakdown.currency }) })}</span>
                      )}
                    </td>
                    <td className={td}>
                      <StatusBadge status={p.status} />
                    </td>
                    <td className={`${td} text-right`}>
                      {refundable(p) > 0 && (
                        <Button variant="outline" onClick={() => setRefunding(p)} aria-label={t("refundFor", { what: p.description, name: p.learner.name })}>
                          {t("refund")}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
          {payments.hasNextPage && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={() => void payments.fetchNextPage()} loading={payments.isFetchingNextPage}>
                {t("more")}
              </Button>
            </div>
          )}
        </>
      )}

      {refunding && <RefundDialog payment={refunding} onClose={() => setRefunding(null)} />}
    </div>
  );
}

/** Full by default; partial by editing the amount. Cancelling the enrolment is offered only for a full refund. */
function RefundDialog({ payment, onClose }: { payment: AdminPaymentRow; onClose: () => void }) {
  const t = useTranslations("admin.payments");
  const currency = payment.breakdown.currency;
  const left = refundable(payment);
  const refund = useRefund(payment.id);
  const [amountText, setAmountText] = useState(moneyInputValue(left, currency));
  const [reason, setReason] = useState("");
  const [cancelEnrolment, setCancelEnrolment] = useState(payment.enrolment_status === "CONFIRMED");
  const [errors, setErrors] = useState<{ amount?: string; reason?: string; form?: string }>({});
  const money = (amount: number) => formatMoney({ amount, currency });

  const amount = parseMoneyInput(amountText, currency);
  const full = amount === left;
  const canCancel = full && payment.enrolment_status === "CONFIRMED";

  const submit = async () => {
    const next: typeof errors = {};
    if (amount === null || amount <= 0) next.amount = t("amountInvalid");
    else if (amount > left) next.amount = t("amountTooHigh", { max: money(left) });
    if (reason.trim().length < 5) next.reason = t("reasonRequired");
    setErrors(next);
    if (Object.keys(next).length || amount === null) return;
    try {
      await refund.mutateAsync({ amount, reason: reason.trim(), cancel_enrolment: canCancel && cancelEnrolment });
      toast.success(t("done", { amount: money(amount), name: payment.learner.name }));
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors({ amount: err.fieldErrors.amount?.[0], reason: err.fieldErrors.reason?.[0], form: err.fieldErrors.amount || err.fieldErrors.reason ? undefined : err.message });
      } else setErrors({ form: t("failed") });
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t("dialogTitle", { name: payment.learner.name })} description={payment.description}>
      <div className="space-y-5">
        <dl className="grid grid-cols-3 gap-3 rounded-sm bg-surface-1 p-4 text-[15px]">
          <div>
            <dt className="text-sm">{t("paid")}</dt>
            <dd className="font-medium text-heading">{money(payment.breakdown.total)}</dd>
          </div>
          <div>
            <dt className="text-sm">{t("alreadyRefunded")}</dt>
            <dd className="font-medium text-heading">{money(payment.refunded_amount)}</dd>
          </div>
          <div>
            <dt className="text-sm">{t("canRefund")}</dt>
            <dd className="font-medium text-heading">{money(left)}</dd>
          </div>
        </dl>
        <FormError message={errors.form} />
        <Field label={t("amountLabel")} error={errors.amount} hint={full ? t("fullHint") : t("partialHint")}>
          {(a) => <MoneyInput {...a} currency={currency} value={amountText} onChange={(e) => setAmountText(e.target.value)} className="max-w-[220px]" />}
        </Field>
        {payment.enrolment_status === "CONFIRMED" && (
          <label className={`flex min-h-11 items-start gap-3 leading-relaxed ${canCancel ? "" : "opacity-60"}`}>
            <input
              type="checkbox"
              className="mt-1 size-5 accent-primary"
              checked={canCancel && cancelEnrolment}
              disabled={!canCancel}
              onChange={(e) => setCancelEnrolment(e.target.checked)}
            />
            <span>
              <span className="block font-medium text-heading">{t("cancelEnrolment")}</span>
              <span className="text-sm">{canCancel ? t("cancelEnrolmentHint") : t("cancelEnrolmentFullOnly")}</span>
            </span>
          </label>
        )}
        <Field label={t("reason")} hint={t("reasonHint")} error={errors.reason}>
          {(a) => <Textarea {...a} rows={3} className="min-h-[96px]" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            {t("goBack")}
          </Button>
          <Button variant="danger" loading={refund.isPending} onClick={() => void submit()}>
            {amount !== null && amount > 0 && amount <= left ? t("confirm", { amount: money(amount) }) : t("refund")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
