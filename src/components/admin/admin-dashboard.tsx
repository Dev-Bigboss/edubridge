"use client";

import { ArrowRight, CircleCheck, Clock, Flag, Landmark, Layers, UserPlus, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TableCard, td, th } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/spinner";
import { useAdminDashboard } from "@/lib/api/hooks/reports";
import type { AdminDashboard as Data } from "@/lib/api/schemas/reports";
import { cn } from "@/lib/cn";
import { DASHBOARD_PERIODS, type DashboardPeriod } from "@/lib/domain/reports";
import { formatInZone } from "@/lib/domain/time";
import { LoadError } from "./catalog-admin";

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usd = (cents: number) => USD.format(cents / 100);
const hours = (h: number | null) => (h === null ? "–" : h < 1 ? `${Math.round(h * 60)} min` : `${Number.isInteger(h) ? h : h.toFixed(1)} h`);

const ATTENTION_ICON: Record<Data["attention"][number]["kind"], LucideIcon> = {
  EXPIRING_REQUESTS: Clock,
  FAILED_PAYOUTS: Landmark,
  APPLICATIONS: UserPlus,
  MESSAGE_REPORTS: Flag,
  BELOW_MINIMUM: Layers,
};

/** ADM-1: the admin home. One period for everything on the page. */
export function AdminDashboard() {
  const t = useTranslations("admin.dashboard");
  const [days, setDays] = useState<DashboardPeriod>(30);
  const query = useAdminDashboard(days);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg">{t("overview")}</h2>
        <div role="group" aria-label={t("period")} className="inline-flex rounded-sm border border-border bg-white p-1">
          {DASHBOARD_PERIODS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={days === d}
              onClick={() => setDays(d)}
              className={cn(
                "min-h-11 rounded-sm px-4 font-heading text-[15px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-primary",
                days === d ? "bg-primary text-white" : "text-heading hover:bg-surface-1",
              )}
            >
              {t("days", { days: d })}
            </button>
          ))}
        </div>
      </div>
      {query.isPending ? <LoadingState /> : query.isError ? <LoadError onRetry={query.refetch} /> : <Body data={query.data} />}
    </div>
  );
}

function Body({ data }: { data: Data }) {
  const t = useTranslations("admin.dashboard");
  const figures = [
    { label: t("revenue"), value: usd(data.revenue.captured), note: t("revenueNote", { refunded: usd(data.revenue.refunded), commission: usd(data.revenue.commission) }) },
    { label: t("enrolments"), value: String(data.enrolments.new_in_period), note: t("enrolmentsNote", { count: data.enrolments.active_learners }) },
    { label: t("learners"), value: String(data.users.learners), note: t("learnersNote", { instructors: data.users.instructors, fresh: data.users.new_in_period }) },
    { label: t("cohorts"), value: String(data.cohorts.active), note: t("cohortsNote", { soon: data.cohorts.starting_within_7_days, below: data.cohorts.below_minimum }) },
  ];

  return (
    <>
      <dl className="grid gap-px overflow-hidden rounded-lg border border-border-subtle bg-border-subtle sm:grid-cols-2 lg:grid-cols-4">
        {figures.map((f) => (
          <div key={f.label} className="bg-white p-5">
            <dt className="text-sm">{f.label}</dt>
            <dd className="font-heading text-[28px] leading-tight font-semibold text-heading tabular-nums">{f.value}</dd>
            <dd className="mt-1 text-sm leading-relaxed">{f.note}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="attention">
        <h2 id="attention" className="mb-3 text-lg">
          {t("attention")}
        </h2>
        {data.attention.length === 0 ? (
          <p className="flex items-center gap-2 rounded-md border border-border-subtle bg-white px-4 py-3 text-heading">
            <CircleCheck aria-hidden="true" className="size-5 text-success" />
            {t("nothing")}
          </p>
        ) : (
          <ul className="divide-y divide-border-subtle rounded-md border border-border-subtle bg-white">
            {data.attention.map((a) => {
              const Icon = ATTENTION_ICON[a.kind];
              return (
                <li key={a.kind} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <Icon aria-hidden="true" className={cn("size-5 shrink-0", a.kind === "EXPIRING_REQUESTS" || a.kind === "FAILED_PAYOUTS" ? "text-danger" : "text-primary")} />
                  <span className="flex-1 text-heading">{t(`attentionItems.${a.kind}`, { count: a.count })}</span>
                  {a.href && (
                    <Link href={a.href} className="inline-flex min-h-11 items-center gap-1 font-medium text-primary underline-offset-4 hover:underline">
                      {t(`attentionCta.${a.kind}`)}
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <RevenueChart data={data} />

      <section aria-labelledby="response">
        <h2 id="response" className="mb-1 text-lg">
          {t("responseTitle")}
        </h2>
        <p className="mb-3 text-[15px]">{t("responseIntro")}</p>
        {data.response_times.answered + data.response_times.expired === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-surface-1 px-4 py-4">{t("noResponses")}</p>
        ) : (
          <>
            <p className="mb-3 text-heading">
              {t("responseSummary", { median: hours(data.response_times.median_hours), answered: data.response_times.answered, expired: data.response_times.expired })}
            </p>
            <TableCard label={t("responseTitle")}>
              <table className="w-full min-w-[480px] text-[15px]">
                <thead className="border-b border-border-subtle bg-surface-1">
                  <tr>
                    <th scope="col" className={th}>{t("instructor")}</th>
                    <th scope="col" className={cn(th, "text-right")}>{t("median")}</th>
                    <th scope="col" className={cn(th, "text-right")}>{t("answered")}</th>
                    <th scope="col" className={cn(th, "text-right")}>{t("expired")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {data.response_times.by_instructor.map((i) => (
                    <tr key={i.instructor_id}>
                      <th scope="row" className={cn(td, "text-left font-medium text-heading")}>{i.name}</th>
                      <td className={cn(td, "text-right tabular-nums")}>{hours(i.median_hours)}</td>
                      <td className={cn(td, "text-right tabular-nums")}>{i.answered}</td>
                      <td className={cn(td, "text-right tabular-nums", i.expired > 0 && "font-medium text-danger")}>{i.expired}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableCard>
          </>
        )}
      </section>

      <p className="flex flex-wrap gap-x-6 gap-y-2">
        <Link href="/admin/reports" className="inline-flex min-h-11 items-center gap-1 font-medium text-primary underline-offset-4 hover:underline">
          {t("toReports")} <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
        <Link href="/admin/payouts" className="inline-flex min-h-11 items-center gap-1 font-medium text-primary underline-offset-4 hover:underline">
          {t("toPayouts")} <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </p>
    </>
  );
}

/** Rounds the top of the scale up to 1, 2 or 5 × a power of ten, in dollars. */
function niceMax(cents: number): number {
  const dollars = Math.max(1, cents / 100);
  const power = 10 ** Math.floor(Math.log10(dollars));
  const step = [1, 2, 5, 10].find((m) => m * power >= dollars)! * power;
  return step * 100;
}

/** Captured revenue per day (or week, for 90 days). One series, so no legend; hover shows the value; a table view is one click away. */
function RevenueChart({ data }: { data: Data }) {
  const t = useTranslations("admin.dashboard");
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const series = data.revenue.series;
  const weekly = data.period.days > 30;
  const W = 720, H = 220, left = 56, right = 12, top = 12, bottom = 28;
  const plotW = W - left - right, plotH = H - top - bottom;
  const max = niceMax(Math.max(0, ...series.map((b) => b.captured)));
  const slot = plotW / series.length;
  const barW = Math.max(2, Math.min(28, slot * 0.6));
  const y = (v: number) => top + plotH - (v / max) * plotH;
  const ticks = [0, max / 2, max];
  const label = (iso: string) => formatInZone(iso, "UTC", "d MMM");
  const xLabels = [0, Math.floor((series.length - 1) / 2), series.length - 1];
  const empty = series.every((b) => b.captured === 0);
  const active = hover === null ? null : series[hover];

  return (
    <section aria-labelledby="revenue-chart">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="revenue-chart" className="text-lg">
          {weekly ? t("chartWeekly") : t("chartDaily")}
        </h2>
        <Button variant="link" onClick={() => setAsTable((v) => !v)} aria-expanded={asTable}>
          {asTable ? t("showChart") : t("showTable")}
        </Button>
      </div>
      {asTable ? (
        <TableCard label={t("chartTable")}>
          <table className="w-full text-[15px]">
            <thead className="border-b border-border-subtle bg-surface-1">
              <tr>
                <th scope="col" className={th}>{weekly ? t("weekOf") : t("day")}</th>
                <th scope="col" className={cn(th, "text-right")}>{t("captured")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {series.map((b) => (
                <tr key={b.start}>
                  <td className={td}>{label(b.start)}</td>
                  <td className={cn(td, "text-right tabular-nums")}>{usd(b.captured)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      ) : (
        <figure className="relative rounded-md border border-border-subtle bg-white p-4">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={t("chartLabel", { total: usd(data.revenue.captured), days: data.period.days })} onMouseLeave={() => setHover(null)}>
            {ticks.map((v) => (
              <g key={v}>
                <line x1={left} x2={W - right} y1={y(v)} y2={y(v)} className="stroke-border-subtle" strokeWidth={1} />
                <text x={left - 8} y={y(v) + 4} textAnchor="end" className="fill-body text-[11px]">
                  {usd(v)}
                </text>
              </g>
            ))}
            {series.map((b, i) => {
              const x = left + i * slot + (slot - barW) / 2;
              const h = Math.max(0, top + plotH - y(b.captured));
              const r = Math.min(4, barW / 2, h);
              const yTop = top + plotH - h;
              return (
                <g key={b.start} onMouseEnter={() => setHover(i)}>
                  <rect x={left + i * slot} y={top} width={slot} height={plotH} fill="transparent" />
                  {h > 0 && (
                    <path
                      d={`M${x} ${top + plotH}V${yTop + r}Q${x} ${yTop} ${x + r} ${yTop}H${x + barW - r}Q${x + barW} ${yTop} ${x + barW} ${yTop + r}V${top + plotH}Z`}
                      className={cn("fill-primary transition-opacity duration-150", hover !== null && hover !== i && "opacity-40")}
                    />
                  )}
                </g>
              );
            })}
            {xLabels.map((i) => (
              <text key={i} x={left + i * slot + slot / 2} y={H - 8} textAnchor="middle" className="fill-body text-[11px]">
                {label(series[i].start)}
              </text>
            ))}
          </svg>
          {empty && <p className="absolute inset-0 flex items-center justify-center text-[15px] text-heading">{t("noRevenue")}</p>}
          {active && (
            <div
              role="status"
              className="pointer-events-none absolute top-2 rounded-sm border border-border-subtle bg-white px-3 py-1.5 text-sm shadow-[0_4px_12px_rgba(8,42,94,0.12)]"
              style={{ left: `clamp(8px, calc(${((left + hover! * slot + slot / 2) / W) * 100}% - 60px), calc(100% - 140px))` }}
            >
              <span className="block text-body">{weekly ? t("weekOfDate", { date: label(active.start) }) : label(active.start)}</span>
              <span className="font-semibold text-heading tabular-nums">{usd(active.captured)}</span>
            </div>
          )}
        </figure>
      )}
    </section>
  );
}
