"use client";

import { Search, SearchX, UserPlus, Users } from "lucide-react";
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
import { useAdminUsers } from "@/lib/api/hooks/admin-users";
import type { UserFilters } from "@/lib/api/schemas/admin-users";
import { formatCalendarDate } from "@/lib/domain/cohort-schedule";
import { ROLES, USER_STATUSES } from "@/lib/domain/enums";
import { timeAgo } from "@/lib/domain/time";
import { LoadError } from "./catalog-admin";
import { ApprovalBadge, UserStatusBadge } from "./user-badges";

const FILTER_KEYS = ["q", "role", "status", "approval"] as const;

/** /admin/users (ADM-2): find anyone; applications waiting for approval come first (ONB-3). */
export function UsersAdmin() {
  const t = useTranslations("admin.users");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? undefined])) as UserFilters;
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

  const users = useAdminUsers(filters);
  const filtered = FILTER_KEYS.some((k) => filters[k]);
  const pending = users.data?.pending_approvals ?? 0;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("title")} description={t("intro")} />

      {pending > 0 && filters.approval !== "PENDING" && (
        <div role="status" className="mb-5 flex flex-col gap-3 rounded-md border border-primary/25 bg-surface-2 p-4 sm:flex-row sm:items-center">
          <UserPlus aria-hidden="true" className="size-6 shrink-0 text-primary" />
          <p className="flex-1 text-heading">{t("pendingBanner", { count: pending })}</p>
          <Button variant="outline" onClick={() => setFilters({ approval: "PENDING", role: "", status: "" })}>
            {t("review")}
          </Button>
        </div>
      )}

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px_200px_220px]" role="search" aria-label={t("filters")}>
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-body" />
          <Input type="search" aria-label={t("search")} placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-11" />
        </div>
        <Select aria-label={t("role")} value={filters.role ?? ""} onChange={(e) => setFilters({ role: e.target.value })}>
          <option value="">{t("allRoles")}</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {t(`roles.${r}`)}
            </option>
          ))}
        </Select>
        <Select aria-label={t("status")} value={filters.status ?? ""} onChange={(e) => setFilters({ status: e.target.value })}>
          <option value="">{t("allStatuses")}</option>
          {USER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`statuses.${s}`)}
            </option>
          ))}
        </Select>
        <Select aria-label={t("approval")} value={filters.approval ?? ""} onChange={(e) => setFilters({ approval: e.target.value })}>
          <option value="">{t("anyApproval")}</option>
          {(["PENDING", "APPROVED", "REJECTED"] as const).map((a) => (
            <option key={a} value={a}>
              {t(`approvals.${a}`)}
            </option>
          ))}
        </Select>
      </div>

      {users.isPending ? (
        <LoadingState />
      ) : users.isError ? (
        <LoadError onRetry={users.refetch} />
      ) : users.data.items.length === 0 ? (
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
          <EmptyState icon={Users} title={t("empty")} description={t("emptyBody")} />
        )
      ) : (
        <>
          <p className="mb-2 text-sm" aria-live="polite">
            {t("count", { count: users.data.total })}
          </p>
          <TableCard label={t("title")}>
            <table className="w-full min-w-[860px] text-[15px]">
              <thead className="border-b border-border bg-surface-1">
                <tr>
                  <th className={th}>{t("person")}</th>
                  <th className={th}>{t("role")}</th>
                  <th className={th}>{t("status")}</th>
                  <th className={th}>{t("joined")}</th>
                  <th className={th}>{t("lastSignIn")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.data.items.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-1">
                    <td className={td}>
                      <Link href={`/admin/users/${u.id}`} className="font-medium text-heading underline-offset-4 hover:text-primary hover:underline">
                        {u.name}
                      </Link>
                      <p className="text-sm">{u.email}</p>
                    </td>
                    <td className={td}>{t(`roles.${u.role}`)}</td>
                    <td className={td}>
                      <span className="flex flex-wrap gap-1.5">
                        <UserStatusBadge status={u.status} />
                        {u.approval_status && u.approval_status !== "APPROVED" && <ApprovalBadge status={u.approval_status} />}
                      </span>
                    </td>
                    <td className={`${td} whitespace-nowrap`}>{formatCalendarDate(u.created_at.slice(0, 10))}</td>
                    <td className={`${td} whitespace-nowrap`}>{u.last_sign_in_at ? timeAgo(u.last_sign_in_at) : t("never")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        </>
      )}
    </div>
  );
}
