"use client";

import { Pencil, Plus, Tags } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, TableCard, td, th } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/status-badge";
import { useCategories, useModalities } from "@/lib/api/hooks/catalog";
import type { Category, Modality } from "@/lib/api/schemas/catalog";
import { unitLabel } from "@/lib/domain/money";
import { CategoryDialog } from "./category-dialog";
import { ModalityDialog } from "./modality-dialog";

/** ADM-3 configuration: categories (TRN-3, TRN-4) and modalities (TRN-2). No code change needed to add either. */
export function CatalogAdmin() {
  const t = useTranslations("admin.catalog");
  return (
    <div className="mx-auto max-w-6xl space-y-12">
      <PageHeader title={t("title")} description={t("intro")} />
      <CategoriesSection />
      <ModalitiesSection />
    </div>
  );
}

function CategoriesSection() {
  const t = useTranslations("admin.catalog");
  const { data, isPending, isError, refetch } = useCategories({ includeInactive: true });
  const [editing, setEditing] = useState<Category | "new" | null>(null);

  return (
    <section aria-labelledby="categories-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="categories-title" className="text-section">
            {t("categories")}
          </h2>
          <p className="leading-relaxed">{t("categoriesHint")}</p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus aria-hidden="true" className="size-4" /> {t("addCategory")}
        </Button>
      </div>
      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <LoadError onRetry={refetch} />
      ) : data.length === 0 ? (
        <EmptyState icon={Tags} title={t("noCategories")} description={t("noCategoriesBody")} />
      ) : (
        <TableCard label={t("categories")}>
          <table className="w-full min-w-[640px] text-[15px]">
            <thead className="border-b border-border bg-surface-1">
              <tr>
                <th className={th}>{t("name")}</th>
                <th className={th}>{t("fields")}</th>
                <th className={th}>{t("status")}</th>
                <th className={th}>
                  <span className="sr-only">{t("actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((c) => (
                <tr key={c.id}>
                  <td className={td}>
                    <p className="font-medium text-heading">{c.name}</p>
                    {c.description && <p className="text-sm">{c.description}</p>}
                  </td>
                  <td className={td}>
                    {c.metadata_fields.length ? c.metadata_fields.map((f) => f.label).join(", ") : <span className="text-body">{t("noFields")}</span>}
                  </td>
                  <td className={td}>{c.active ? <Badge tone="success">{t("active")}</Badge> : <Badge>{t("disabled")}</Badge>}</td>
                  <td className={`${td} text-right`}>
                    <Button variant="ghost" onClick={() => setEditing(c)} aria-label={t("editNamed", { name: c.name })}>
                      <Pencil aria-hidden="true" className="size-4" /> {t("edit")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}
      {editing && <CategoryDialog category={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </section>
  );
}

function ModalitiesSection() {
  const t = useTranslations("admin.catalog");
  const { data, isPending, isError, refetch } = useModalities();
  const [editing, setEditing] = useState<Modality | "new" | null>(null);

  return (
    <section aria-labelledby="modalities-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="modalities-title" className="text-section">
            {t("modalities")}
          </h2>
          <p className="leading-relaxed">{t("modalitiesHint")}</p>
        </div>
        <Button variant="outline" onClick={() => setEditing("new")}>
          <Plus aria-hidden="true" className="size-4" /> {t("addModality")}
        </Button>
      </div>
      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <LoadError onRetry={refetch} />
      ) : (
        <TableCard label={t("modalities")}>
          <table className="w-full min-w-[560px] text-[15px]">
            <thead className="border-b border-border bg-surface-1">
              <tr>
                <th className={th}>{t("name")}</th>
                <th className={th}>{t("code")}</th>
                <th className={th}>{t("units")}</th>
                <th className={th}>{t("status")}</th>
                <th className={th}>
                  <span className="sr-only">{t("actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((m) => (
                <tr key={m.id}>
                  <td className={`${td} font-medium text-heading`}>{m.name}</td>
                  <td className={`${td} font-mono text-sm`}>{m.code}</td>
                  <td className={td}>{m.pricing_units.map(unitLabel).join(", ")}</td>
                  <td className={td}>{m.active ? <Badge tone="success">{t("active")}</Badge> : <Badge>{t("disabled")}</Badge>}</td>
                  <td className={`${td} text-right`}>
                    <Button variant="ghost" onClick={() => setEditing(m)} aria-label={t("editNamed", { name: m.name })}>
                      <Pencil aria-hidden="true" className="size-4" /> {t("edit")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}
      {editing && <ModalityDialog modality={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </section>
  );
}

export function LoadError({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("admin");
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-danger">
      {t("loadError")}
      <Button variant="outline" onClick={onRetry}>
        {t("retry")}
      </Button>
    </div>
  );
}
