"use client";

import { FileClock, Search, SearchX } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { PageHeader, TableCard, td, th } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/spinner";
import { useAuditLog } from "@/lib/api/hooks/settings";
import type { AuditEntry, AuditFilters } from "@/lib/api/schemas/admin-users";
import { timeAgo } from "@/lib/domain/time";
import { LoadError } from "./catalog-admin";

const FILTER_KEYS = ["q", "actor_id", "target_type", "from", "to"] as const;

/** Where an entry's target lives in the admin area, when it has a page. */
function targetHref(e: AuditEntry): string | null {
  switch (e.target_type) {
    case "user":
      return `/admin/users/${e.target_id}`;
    case "training":
      return `/admin/trainings/${e.target_id}`;
    case "cohort":
      return "/admin/cohorts";
    case "pricing_rule":
      return "/admin/pricing";
    case "category":
    case "modality":
      return "/admin/catalog";
    case "settings":
      return "/admin/settings";
    default:
      return null;
  }
}

/** /admin/audit-log (ADM-5): who changed what and when, read-only, newest first. */
export function AuditLog() {
  const t = useTranslations("admin.audit");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? undefined])) as AuditFilters;
  const [search, setSearch] = useState(filters.q ?? "");

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

  const log = useAuditLog(filters);
  const first = log.data?.pages[0];
  const items = log.data?.pages.flatMap((p) => p.items) ?? [];
  const filtered = FILTER_KEYS.some((k) => filters[k]);
  const typeLabel = (type: string) => (t.has(`types.${type}`) ? t(`types.${type}` as "types.user") : type.replace(/_/g, " "));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("title")} description={t("intro")} />

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px_180px] lg:grid-cols-[1fr_170px_170px_160px_160px]" role="search" aria-label={t("filters")}>
        <div className="relative md:col-span-3 lg:col-span-1">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-body" />
          <Input type="search" aria-label={t("search")} placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-11" />
        </div>
        <Select aria-label={t("admin")} value={filters.actor_id ?? ""} onChange={(e) => setFilters({ actor_id: e.target.value })}>
          <option value="">{t("allAdmins")}</option>
          {first?.facets.actors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        <Select aria-label={t("type")} value={filters.target_type ?? ""} onChange={(e) => setFilters({ target_type: e.target.value })}>
          <option value="">{t("allTypes")}</option>
          {first?.facets.target_types.map((type) => (
            <option key={type} value={type}>
              {typeLabel(type)}
            </option>
          ))}
        </Select>
        <Input type="date" aria-label={t("from")} value={filters.from ?? ""} max={filters.to} onChange={(e) => setFilters({ from: e.target.value })} />
        <Input type="date" aria-label={t("to")} value={filters.to ?? ""} min={filters.from} onChange={(e) => setFilters({ to: e.target.value })} />
      </div>

      {log.isPending ? (
        <LoadingState />
      ) : log.isError ? (
        <LoadError onRetry={log.refetch} />
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
          <EmptyState icon={FileClock} title={t("empty")} description={t("emptyBody")} />
        )
      ) : (
        <>
          <p className="mb-2 text-sm" aria-live="polite">
            {t("count", { count: first?.total ?? 0 })}
          </p>
          <TableCard label={t("title")}>
            <table className="w-full min-w-[820px] text-[15px]">
              <thead className="border-b border-border bg-surface-1">
                <tr>
                  <th className={th}>{t("when")}</th>
                  <th className={th}>{t("admin")}</th>
                  <th className={th}>{t("type")}</th>
                  <th className={th}>{t("what")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((e) => {
                  const href = targetHref(e);
                  return (
                    <tr key={e.id} className="align-top">
                      <td className={`${td} whitespace-nowrap`}>
                        <time dateTime={e.created_at} className="block text-heading">
                          {new Date(e.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </time>
                        <span className="text-sm">{timeAgo(e.created_at)}</span>
                      </td>
                      <td className={td}>{e.actor_name}</td>
                      <td className={td}>
                        {typeLabel(e.target_type)}
                        <span className="block font-mono text-xs">{e.action}</span>
                      </td>
                      <td className={td}>
                        <p className="max-w-[60ch] leading-relaxed text-heading">{e.summary}</p>
                        {href && (
                          <Link href={href} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                            {t("open")}
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableCard>
          {log.hasNextPage && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={() => void log.fetchNextPage()} loading={log.isFetchingNextPage}>
                {t("more")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
