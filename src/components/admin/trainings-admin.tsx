"use client";

import { BookOpen, Plus, Search, SearchX } from "lucide-react";
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
import { StatusBadge } from "@/components/ui/status-badge";
import { useAdminTrainings, usePricingRules, type TrainingFilters } from "@/lib/api/hooks/admin-catalog";
import { useCategories, useModalities } from "@/lib/api/hooks/catalog";
import { TRAINING_STATUSES } from "@/lib/domain/enums";
import { formatPriceTag } from "@/lib/domain/money";
import { lowestPrice } from "@/lib/domain/pricing";
import { LoadError } from "./catalog-admin";

const FILTER_KEYS = ["q", "status", "category_id", "modality_id"] as const;

export function TrainingsAdmin() {
  const t = useTranslations("admin.trainings");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filters: TrainingFilters = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? undefined]));
  const [search, setSearch] = useState(filters.q ?? "");

  const setFilter = (key: (typeof FILTER_KEYS)[number], value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  };

  // Search as you type, without a request per keystroke.
  useEffect(() => {
    if ((filters.q ?? "") === search) return;
    const id = setTimeout(() => setFilter("q", search.trim()), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the typed text should restart the timer
  }, [search]);

  const trainings = useAdminTrainings(filters);
  const categories = useCategories({ includeInactive: true });
  const modalities = useModalities();
  const rules = usePricingRules();
  const name = (list: { id: string; name: string }[] | undefined, id: string) => list?.find((x) => x.id === id)?.name ?? "";
  const filtered = FILTER_KEYS.some((k) => filters[k]);
  const now = new Date();

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("title")}
        description={t("intro")}
        actions={
          <Button asChild>
            <Link href="/admin/trainings/new">
              <Plus aria-hidden="true" className="size-4" /> {t("new")}
            </Link>
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px_200px_180px]" role="search" aria-label={t("filters")}>
        <div className="relative">
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
        <Select aria-label={t("status")} value={filters.status ?? ""} onChange={(e) => setFilter("status", e.target.value)}>
          <option value="">{t("allStatuses")}</option>
          {TRAINING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`statuses.${s}`)}
            </option>
          ))}
        </Select>
        <Select aria-label={t("category")} value={filters.category_id ?? ""} onChange={(e) => setFilter("category_id", e.target.value)}>
          <option value="">{t("allCategories")}</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select aria-label={t("modality")} value={filters.modality_id ?? ""} onChange={(e) => setFilter("modality_id", e.target.value)}>
          <option value="">{t("allModalities")}</option>
          {modalities.data?.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </div>

      {trainings.isPending ? (
        <LoadingState />
      ) : trainings.isError ? (
        <LoadError onRetry={trainings.refetch} />
      ) : trainings.data.items.length === 0 ? (
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
          <EmptyState
            icon={BookOpen}
            title={t("empty")}
            description={t("emptyBody")}
            action={
              <Button asChild>
                <Link href="/admin/trainings/new">{t("new")}</Link>
              </Button>
            }
          />
        )
      ) : (
        <>
          <p className="mb-2 text-sm" aria-live="polite">
            {t("count", { count: trainings.data.total })}
          </p>
          <TableCard label={t("title")}>
            <table className="w-full min-w-[820px] text-[15px]">
              <thead className="border-b border-border bg-surface-1">
                <tr>
                  <th className={th}>{t("training")}</th>
                  <th className={th}>{t("modality")}</th>
                  <th className={th}>{t("instructors")}</th>
                  <th className={th}>{t("price")}</th>
                  <th className={th}>{t("status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {trainings.data.items.map((tr) => {
                  const price = rules.data ? lowestPrice(tr, rules.data, now) : null;
                  return (
                    <tr key={tr.id} className="hover:bg-surface-1">
                      <td className={td}>
                        <Link href={`/admin/trainings/${tr.id}`} className="font-medium text-heading underline-offset-4 hover:text-primary hover:underline">
                          {tr.title}
                        </Link>
                        <p className="text-sm">{name(categories.data, tr.category_id)}</p>
                      </td>
                      <td className={td}>{name(modalities.data, tr.modality_id)}</td>
                      <td className={td}>
                        {tr.instructors.length ? tr.instructors.map((i) => i.name).join(", ") : <span className="text-danger">{t("noInstructors")}</span>}
                      </td>
                      <td className={`${td} whitespace-nowrap`}>
                        {price ? (
                          <>
                            {tr.instructors.length > 1 && `${t("from")} `}
                            {formatPriceTag(price, price.unit)}
                          </>
                        ) : rules.data ? (
                          <span className="text-danger">{t("noPrice")}</span>
                        ) : null}
                      </td>
                      <td className={td}>
                        <StatusBadge status={tr.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableCard>
        </>
      )}
    </div>
  );
}
