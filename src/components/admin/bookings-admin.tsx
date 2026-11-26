"use client";

import { CalendarClock, Search, SearchX } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { PageHeader, TableCard, td, th } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAdminBookings } from "@/lib/api/hooks/bookings";
import type { Booking } from "@/lib/api/schemas/bookings";
import { BOOKING_STATUSES } from "@/lib/domain/enums";
import { formatMoney } from "@/lib/domain/money";
import { formatInZone } from "@/lib/domain/time";
import { LoadError } from "./catalog-admin";

type FilterKey = "status" | "q";

/** /admin/bookings: list and inspect one-on-one booking requests in any state. */
export function BookingsAdmin() {
  const t = useTranslations("admin.bookings");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const status = params.get("status") ?? "";
  const q = params.get("q") ?? "";
  const [search, setSearch] = useState(q);

  const setFilters = (changes: Partial<Record<FilterKey, string>>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  };

  useEffect(() => {
    if ((q ?? "") === search.trim()) return;
    const id = setTimeout(() => setFilters({ q: search.trim() }), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const bookings = useAdminBookings({ status: status || undefined, q: q || undefined });
  const filtered = !!(status || q);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title={t("title")} description={t("intro")} />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row" role="search" aria-label={t("filters")}>
        <div className="relative flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-body" />
          <Input
            type="search"
            aria-label={t("search")}
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11"
          />
        </div>
        <Select
          aria-label={t("statusFilter")}
          value={status}
          onChange={(e) => setFilters({ status: e.target.value })}
          className="w-full sm:w-56"
        >
          <option value="">{t("allStatuses")}</option>
          {BOOKING_STATUSES.filter((s) => s !== "DRAFT").map((s) => (
            <option key={s} value={s}>
              {t(`statuses.${s}`)}
            </option>
          ))}
        </Select>
      </div>

      {bookings.isPending ? (
        <LoadingState />
      ) : bookings.isError ? (
        <LoadError onRetry={bookings.refetch} />
      ) : bookings.data?.items.length === 0 ? (
        <EmptyState
          icon={filtered ? SearchX : CalendarClock}
          title={filtered ? t("emptyFiltered") : t("empty")}
          description={filtered ? t("emptyFilteredBody") : t("emptyBody")}
        />
      ) : (
        <BookingsTable items={bookings.data?.items ?? []} t={t} />
      )}
    </div>
  );
}

function BookingsTable({
  items,
  t,
}: {
  items: Booking[];
  t: ReturnType<typeof useTranslations<"admin.bookings">>;
}) {
  return (
    <TableCard label={t("title")}>
      <table className="w-full text-[15px]">
        <thead>
          <tr className="border-b border-border">
            <th className={th}>{t("colLearner")}</th>
            <th className={th}>{t("colInstructor")}</th>
            <th className={th}>{t("colTraining")}</th>
            <th className={th}>{t("colWhen")}</th>
            <th className={th}>{t("colStatus")}</th>
            <th className={`${th} text-right`}>{t("colAmount")}</th>
            <th className={th}>
              <span className="sr-only">{t("colActions")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((b) => (
            <BookingRow key={b.id} booking={b} t={t} />
          ))}
        </tbody>
      </table>
    </TableCard>
  );
}

function BookingRow({ booking: b, t }: { booking: Booking; t: ReturnType<typeof useTranslations<"admin.bookings">> }) {
  return (
    <tr className="border-b border-border-subtle last:border-0 hover:bg-surface-1">
      <td className={td}>
        <Link href={`/admin/users/${b.learner.id}`} className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary">
          {b.learner.name}
        </Link>
      </td>
      <td className={td}>
        <Link href={`/admin/users/${b.instructor.id}`} className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary">
          {b.instructor.name}
        </Link>
      </td>
      <td className={td}>{b.training.title}</td>
      <td className={`${td} whitespace-nowrap text-sm`}>
        {formatInZone(b.start_utc, "UTC", "d MMM yyyy, HH:mm")} UTC
      </td>
      <td className={td}>
        <StatusBadge status={b.status} />
      </td>
      <td className={`${td} text-right tabular-nums`}>
        {formatMoney({ amount: b.breakdown.total, currency: b.breakdown.currency })}
      </td>
      <td className={td}>
        <Link
          href={`/admin/users/${b.learner.id}`}
          className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
          aria-label={t("viewLabel", { name: b.learner.name })}
        >
          {t("view")}
        </Link>
      </td>
    </tr>
  );
}
