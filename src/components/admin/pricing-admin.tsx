"use client";

import { CalendarClock, History, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader, TableCard, th } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/spinner";
import { usePricingRules } from "@/lib/api/hooks/admin-catalog";
import { useCategories, useModalities } from "@/lib/api/hooks/catalog";
import type { Category, Modality } from "@/lib/api/schemas/catalog";
import { formatPriceTag } from "@/lib/domain/money";
import { ruleAt, scheduledRule, type PricingRule } from "@/lib/domain/pricing";
import { LoadError } from "./catalog-admin";
import { formatDay } from "./format";
import { PriceDialog } from "./price-dialog";
import { PricePreview } from "./price-preview";

/** PRC-1..5: the Modality × Category price matrix with versions, plus a resolution preview. */
export function PricingAdmin() {
  const t = useTranslations("admin.pricing");
  const rules = usePricingRules();
  const categories = useCategories({ includeInactive: true });
  const modalities = useModalities();
  const [editing, setEditing] = useState<{ modality: Modality; category: Category } | null>(null);

  if (rules.isPending || categories.isPending || modalities.isPending) return <LoadingState />;
  if (rules.isError || categories.isError || modalities.isError) {
    return <LoadError onRetry={() => void Promise.all([rules.refetch(), categories.refetch(), modalities.refetch()])} />;
  }
  const now = new Date();
  const cols = categories.data.filter((c) => c.active || rules.data.some((r) => r.category_id === c.id));
  const rows = modalities.data.filter((m) => m.active);

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <PageHeader title={t("title")} description={t("intro")} />

      <section aria-labelledby="matrix-title">
        <h2 id="matrix-title" className="mb-1 text-section">
          {t("matrix")}
        </h2>
        <p className="mb-4 leading-relaxed">{t("matrixHint")}</p>
        <TableCard label={t("matrix")}>
          <table className="w-full min-w-[720px] text-[15px]">
            <thead className="border-b border-border bg-surface-1">
              <tr>
                <th className={th}>
                  <span className="sr-only">{t("modality")}</span>
                </th>
                {cols.map((c) => (
                  <th key={c.id} scope="col" className={th}>
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((m) => (
                <tr key={m.id}>
                  <th scope="row" className={`${th} align-top`}>
                    {m.name}
                  </th>
                  {cols.map((c) => {
                    const current = ruleAt(rules.data, m.id, c.id, now);
                    const next = scheduledRule(rules.data, m.id, c.id, now);
                    return (
                      <td key={c.id} className="px-4 py-3 align-top">
                        <Cell current={current} next={next} />
                        <Button
                          variant="link"
                          className="mt-1 min-h-11"
                          onClick={() => setEditing({ modality: m, category: c })}
                          aria-label={t("changeFor", { pair: `${m.name} × ${c.name}` })}
                        >
                          <Pencil aria-hidden="true" className="size-4" /> {current || next ? t("change") : t("set")}
                        </Button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
        <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed">
          <History aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t("versionNote")}
        </p>
      </section>

      <PricePreview />

      {editing && (
        <PriceDialog
          modality={editing.modality}
          category={editing.category}
          rules={rules.data}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function Cell({ current, next }: { current: PricingRule | null; next: PricingRule | null }) {
  const t = useTranslations("admin.pricing");
  return (
    <div className="space-y-1">
      {current ? (
        <>
          <p className="font-medium text-heading">{formatPriceTag(current, current.unit)}</p>
          <p className="text-sm">{t("since", { date: formatDay(current.effective_from) })}</p>
        </>
      ) : (
        <p className="text-danger">{t("notSet")}</p>
      )}
      {next && (
        <p className="flex items-start gap-1.5 text-sm text-primary">
          <CalendarClock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t("scheduled", { price: formatPriceTag(next, next.unit), date: formatDay(next.effective_from) })}
        </p>
      )}
    </div>
  );
}
