"use client";

import { Search, SearchX, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useCatalog, useCategories, useModalities } from "@/lib/api/hooks/catalog";
import { CATALOG_SORTS, type CatalogSort } from "@/lib/api/schemas/catalog";
import { priceBand, type CatalogFilters as Query } from "@/lib/domain/catalog";
import { languageName } from "@/lib/domain/training";
import { CatalogFilters, FILTER_KEYS, type FilterKey, type FilterValues } from "./catalog-filters";
import { TrainingCard } from "./training-card";

/**
 * TRN-6 catalogue. Every filter lives in the URL, so a filtered view can be shared or bookmarked
 * and the landing page category tiles link straight into it (/trainings?category=…).
 */
export function Catalogue() {
  const t = useTranslations("catalog");
  const router = useRouter();
  const pathname = usePathname();
  const urlParams = useSearchParams();

  // The URL is the source of truth, but a navigation takes a moment. Show a choice the instant it's
  // made, and drop the stand-in as soon as the URL catches up (adjusting state during render, no effect).
  const urlKey = urlParams.toString();
  const [pending, setPending] = useState<{ base: string; next: string } | null>(null);
  if (pending && pending.base !== urlKey) setPending(null);
  const params = new URLSearchParams(pending?.next ?? urlKey);

  const values: FilterValues = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? undefined]));
  const sortParam = params.get("sort");
  const sort = CATALOG_SORTS.includes(sortParam as CatalogSort) ? (sortParam as CatalogSort) : undefined;
  const q = params.get("q") ?? "";
  const [search, setSearch] = useState(q);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const setParams = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setPending({ base: urlKey, next: next.toString() });
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  };

  // Search as you type, without a request per keystroke.
  useEffect(() => {
    if (q === search.trim()) return;
    const id = setTimeout(() => setParams({ q: search.trim() }), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the typed text restarts the timer
  }, [search]);

  const band = priceBand(values.price);
  const query: Query = {
    q: q || undefined,
    category: values.category,
    modality: values.modality,
    language: values.language,
    instructor: values.instructor,
    price_min: band?.min,
    price_max: band?.max,
    sort,
  };
  const catalog = useCatalog(query);
  const categories = useCategories();
  const modalities = useModalities();
  const facets = catalog.data?.facets;

  const chips = FILTER_KEYS.filter((k) => values[k]).map((k) => ({ key: k, label: chipLabel(k, values[k]!) }));
  function chipLabel(key: FilterKey, value: string) {
    switch (key) {
      case "category":
        return categories.data?.find((c) => c.slug === value)?.name ?? value;
      case "modality":
        return modalities.data?.find((m) => m.code === value)?.name ?? value;
      case "price":
        return t(`filters.bands.${value}` as "filters.bands.under_50");
      case "language":
        return languageName(value);
      case "instructor":
        return facets?.instructors.find((i) => i.id === value)?.name ?? t("filters.instructor");
    }
  }
  const clearAll = () => {
    setSearch("");
    setParams({ q: "", ...Object.fromEntries(FILTER_KEYS.map((k) => [k, ""])) });
  };

  const filters = (
    <CatalogFilters
      values={values}
      onChange={(k, v) => setParams({ [k]: v })}
      categories={categories.data ?? []}
      modalities={modalities.data ?? []}
      facets={facets}
    />
  );

  return (
    <>
      <section className="bg-surface-1 pt-32 pb-12 md:pt-40 md:pb-16">
        <div className="container-site">
          <h1 className="mb-3 text-page">{t("title")}</h1>
          <p className="mb-8 max-w-2xl text-lg leading-relaxed">{t("intro")}</p>
          <form role="search" onSubmit={(e) => (e.preventDefault(), setParams({ q: search.trim() }))} className="max-w-2xl">
            <label htmlFor="catalog-search" className="sr-only">
              {t("searchLabel")}
            </label>
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-body" />
              <Input
                id="catalog-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-14 bg-white pl-12 text-base"
              />
            </div>
          </form>
        </div>
      </section>

      <div className="container-site grid gap-10 py-12 lg:grid-cols-[260px_1fr] lg:py-16">
        <aside aria-label={t("filters.title")} className="hidden lg:block">
          <h2 className="mb-5 text-section">{t("filters.title")}</h2>
          {filters}
        </aside>

        <section aria-labelledby="results-heading" className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 id="results-heading" className="flex items-center gap-2 text-base font-medium text-heading" aria-live="polite">
              {catalog.data ? t("count", { count: catalog.data.total }) : t("loading")}
              {catalog.isFetching && catalog.data && <Spinner className="size-4 text-primary" label={t("updating")} />}
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="lg:hidden" onClick={() => setFiltersOpen(true)}>
                <SlidersHorizontal aria-hidden="true" className="size-4" />
                {chips.length ? t("filters.openCount", { count: chips.length }) : t("filters.open")}
              </Button>
              <label htmlFor="catalog-sort" className="sr-only">
                {t("sort.label")}
              </label>
              <Select id="catalog-sort" value={sort ?? ""} onChange={(e) => setParams({ sort: e.target.value })} className="w-auto">
                <option value="">{q ? t("sort.relevance") : t("sort.newest")}</option>
                {CATALOG_SORTS.filter((s) => s !== (q ? "relevance" : "newest") && (q || s !== "relevance")).map((s) => (
                  <option key={s} value={s}>
                    {t(`sort.${s}`)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {(chips.length > 0 || q) && (
            <ul aria-label={t("filters.active")} className="mb-6 flex flex-wrap items-center gap-2">
              {q && (
                <Chip label={t("filters.searchChip", { q })} onRemove={() => (setSearch(""), setParams({ q: "" }))} removeLabel={t("filters.remove", { label: q })} />
              )}
              {chips.map((c) => (
                <Chip key={c.key} label={c.label} onRemove={() => setParams({ [c.key]: "" })} removeLabel={t("filters.remove", { label: c.label })} />
              ))}
              <li>
                <Button variant="link" onClick={clearAll}>
                  {t("filters.clear")}
                </Button>
              </li>
            </ul>
          )}

          <Results state={catalog} onClear={clearAll} filtered={chips.length > 0 || !!q} />
        </section>
      </div>

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen} title={t("filters.title")}>
        {filters}
        <Button className="mt-6 w-full" onClick={() => setFiltersOpen(false)}>
          {catalog.data ? t("filters.show", { count: catalog.data.total }) : t("filters.done")}
        </Button>
      </Dialog>
    </>
  );
}

function Results({ state, onClear, filtered }: { state: ReturnType<typeof useCatalog>; onClear: () => void; filtered: boolean }) {
  const t = useTranslations("catalog");
  if (state.isError && !state.data) {
    return (
      <EmptyState
        icon={SearchX}
        title={t("error")}
        description={t("errorBody")}
        action={<Button onClick={() => void state.refetch()}>{t("retry")}</Button>}
      />
    );
  }
  if (!state.data) {
    return (
      <ul aria-hidden="true" className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="h-[420px] animate-pulse rounded-lg bg-surface-1 motion-reduce:animate-none" />
        ))}
      </ul>
    );
  }
  if (state.data.items.length === 0) {
    return filtered ? (
      <EmptyState
        icon={SearchX}
        title={t("noMatches")}
        description={t("noMatchesBody")}
        action={<Button variant="outline" onClick={onClear}>{t("filters.clear")}</Button>}
      />
    ) : (
      <EmptyState icon={SearchX} title={t("empty")} description={t("emptyBody")} />
    );
  }
  return (
    <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {state.data.items.map((training) => (
        <li key={training.id}>
          <TrainingCard training={training} />
        </li>
      ))}
    </ul>
  );
}

function Chip({ label, onRemove, removeLabel }: { label: string; onRemove: () => void; removeLabel: string }) {
  return (
    <li className="flex items-center gap-1 rounded-full border border-border bg-white py-1 pr-1 pl-3 text-sm text-heading">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="flex size-8 items-center justify-center rounded-full hover:bg-surface-1 focus-visible:outline-2 focus-visible:outline-primary"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </li>
  );
}
