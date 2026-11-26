"use client";

import { CircleCheck, CircleDashed } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { ApiError } from "@/lib/api/client";
import { usePricingRules, useTrainingAction } from "@/lib/api/hooks/admin-catalog";
import type { Category, Training } from "@/lib/api/schemas/catalog";
import { formatPriceTag } from "@/lib/domain/money";
import { resolvePrice } from "@/lib/domain/pricing";
import { missingMetadata, publishChecks } from "@/lib/domain/training";

/** Status, publish checklist (same rules as the API) and what learners will pay. */
export function TrainingSidebar({ training, categories, dirty }: { training: Training; categories: Category[]; dirty: boolean }) {
  const t = useTranslations("admin.editor");
  const rules = usePricingRules();
  const action = useTrainingAction(training.id);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const now = new Date();
  const category = categories.find((c) => c.id === training.category_id);

  const prices = rules.data
    ? (training.instructors.length ? training.instructors : [{ instructor_id: null, name: t("anyInstructor") }]).map((i) => ({
        name: i.name,
        price: resolvePrice(training, rules.data, { instructorId: i.instructor_id, at: now }),
      }))
    : [];

  const checks = publishChecks({
    description: training.description,
    instructorCount: training.instructors.length,
    categoryActive: !!category?.active,
    missingMetadata: missingMetadata(category?.metadata_fields ?? [], training.metadata),
    hasPrice: prices.some((p) => p.price),
  });
  const ready = checks.every((c) => c.ok);

  const run = (a: "publish" | "unpublish" | "archive") =>
    action.mutate(a, {
      onSuccess: () => {
        setConfirmArchive(false);
        toast.success(t(`done.${a}`));
      },
      onError: (err) => toast.error(err instanceof ApiError ? err.message : t("actionFailed")),
    });

  return (
    <aside className="space-y-4 lg:sticky lg:top-24" aria-label={t("statusPanel")}>
      <div className="space-y-4 rounded-md border border-border bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg">{t("status")}</h2>
          <StatusBadge status={training.status} />
        </div>
        {training.status === "PUBLISHED" && (
          <p className="text-sm leading-relaxed">
            {t("liveAt")}{" "}
            <Link href={`/trainings/${training.slug}`} className="font-medium break-all text-primary underline underline-offset-4">
              /trainings/{training.slug}
            </Link>
          </p>
        )}
        {training.status === "ARCHIVED" && <p className="text-sm leading-relaxed">{t("archivedNote")}</p>}

        {training.status !== "PUBLISHED" && (
          <>
            <ul className="space-y-2" aria-label={t("checklist")}>
              {checks.map((c) => (
                <li key={c.key} className="flex items-start gap-2 text-[15px]">
                  {c.ok ? (
                    <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
                  ) : (
                    <CircleDashed aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-body" />
                  )}
                  <span>
                    {t(`checks.${c.key}`)}
                    <span className="sr-only">: {c.ok ? t("checkDone") : t("checkTodo")}</span>
                  </span>
                </li>
              ))}
            </ul>
            {dirty && <p className="text-sm text-danger">{t("saveFirst")}</p>}
            <Button className="w-full" disabled={!ready || dirty} loading={action.isPending && action.variables === "publish"} onClick={() => run("publish")}>
              {training.status === "ARCHIVED" ? t("restore") : t("publish")}
            </Button>
          </>
        )}
        {training.status === "PUBLISHED" && (
          <Button variant="outline" className="w-full" loading={action.isPending && action.variables === "unpublish"} onClick={() => run("unpublish")}>
            {t("unpublish")}
          </Button>
        )}
        {training.status !== "ARCHIVED" && (
          <Button variant="ghost" className="w-full text-danger" disabled={action.isPending} onClick={() => setConfirmArchive(true)}>
            {t("archive")}
          </Button>
        )}
      </div>

      <div className="space-y-3 rounded-md border border-border bg-white p-5">
        <h2 className="text-lg">{t("learnersPay")}</h2>
        {prices.length === 0 ? null : (
          <ul className="space-y-2">
            {prices.map((p) => (
              <li key={p.name} className="text-[15px]">
                <span className="block text-heading">{p.name}</span>
                {p.price ? (
                  <span>
                    <strong className="text-heading">{formatPriceTag(p.price, p.price.unit)}</strong>
                    {training.instructors.length > 0 && <> · {t(`source.${p.price.source}`)}</>}
                  </span>
                ) : (
                  <span className="text-danger">{t("noPriceYet")}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={confirmArchive} onOpenChange={setConfirmArchive} title={t("archiveTitle")} description={t("archiveBody")}>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setConfirmArchive(false)} disabled={action.isPending}>
            {t("cancel")}
          </Button>
          <Button variant="danger" loading={action.isPending} onClick={() => run("archive")}>
            {t("archiveConfirm")}
          </Button>
        </div>
      </Dialog>
    </aside>
  );
}
