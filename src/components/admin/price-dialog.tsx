"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FormError } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Select } from "@/components/ui/select";
import { applyApiError } from "@/lib/api/form-errors";
import { useAddPricingRule } from "@/lib/api/hooks/admin-catalog";
import type { Category, Modality } from "@/lib/api/schemas/catalog";
import type { PricingUnit } from "@/lib/domain/enums";
import { DEFAULT_CURRENCY, formatPriceTag, moneyInputValue, parseMoneyInput, unitLabel } from "@/lib/domain/money";
import { ruleHistory, type PricingRule } from "@/lib/domain/pricing";
import { formatDay } from "./format";

const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in the admin's zone

const Schema = z
  .object({
    amount: z.string().refine((v) => (parseMoneyInput(v, DEFAULT_CURRENCY) ?? 0) > 0, { error: "Enter a price above zero." }),
    unit: z.string(),
    when: z.enum(["now", "date"]),
    date: z.string(),
  })
  .refine((v) => v.when === "now" || (v.date && v.date > today()), {
    error: "Pick a date after today, or choose Now.",
    path: ["date"],
  });
type Values = z.infer<typeof Schema>;

/** PRC-5: adds a new version. The dialog shows the history so nobody edits blind. */
export function PriceDialog({
  modality,
  category,
  rules,
  onClose,
}: {
  modality: Modality;
  category: Category;
  rules: PricingRule[];
  onClose: () => void;
}) {
  const t = useTranslations("admin.pricing");
  const add = useAddPricingRule();
  const [formError, setFormError] = useState<string | null>(null);
  const history = ruleHistory(rules, modality.id, category.id);
  const latest = history[0];
  const form = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: {
      amount: latest ? moneyInputValue(latest.amount, latest.currency) : "",
      unit: latest?.unit ?? modality.pricing_units[0],
      when: "now",
      date: "",
    },
  });
  const when = useWatch({ control: form.control, name: "when" });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    try {
      // A dated change starts at midnight in the admin's own time zone.
      const effective_from = v.when === "now" ? new Date().toISOString() : new Date(`${v.date}T00:00:00`).toISOString();
      await add.mutateAsync({
        modality_id: modality.id,
        category_id: category.id,
        unit: v.unit as PricingUnit,
        amount: parseMoneyInput(v.amount, DEFAULT_CURRENCY)!,
        currency: DEFAULT_CURRENCY,
        effective_from,
      });
      toast.success(v.when === "now" ? t("savedNow") : t("savedScheduled", { date: formatDay(effective_from) }));
      onClose();
    } catch (err) {
      setFormError(applyApiError(err, (f, e) => form.setError(f === "effective_from" ? "date" : (f as keyof Values), e)));
    }
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={`${modality.name} × ${category.name}`} description={t("dialogIntro")} wide>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormError message={formError} />
        <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
          <Field label={t("newPrice")} error={errors.amount?.message}>
            {(a) => <MoneyInput currency={DEFAULT_CURRENCY} {...a} {...form.register("amount")} />}
          </Field>
          <Field label={t("unit")}>
            {(a) => (
              <Select {...a} {...form.register("unit")}>
                {modality.pricing_units.map((u) => (
                  <option key={u} value={u}>
                    {unitLabel(u)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <fieldset className="space-y-2">
          <legend className="mb-1 font-heading text-[15px] font-medium text-heading">{t("startsLegend")}</legend>
          <label className="flex min-h-11 items-center gap-3">
            <input type="radio" value="now" className="size-5 accent-primary" {...form.register("when")} />
            {t("startNow")}
          </label>
          <label className="flex min-h-11 items-center gap-3">
            <input type="radio" value="date" className="size-5 accent-primary" {...form.register("when")} />
            {t("startOn")}
          </label>
          {when === "date" && (
            <Field label={t("startDate")} error={errors.date?.message} className="pl-8 sm:max-w-[280px]">
              {(a) => <Input {...a} type="date" min={today()} {...form.register("date")} />}
            </Field>
          )}
        </fieldset>
        <p className="rounded-sm bg-surface-1 px-4 py-3 text-[15px] leading-relaxed">{t("frozenNote")}</p>

        {history.length > 0 && (
          <details className="rounded-sm border border-border">
            <summary className="min-h-11 cursor-pointer px-4 py-3 font-medium text-heading">{t("history", { count: history.length })}</summary>
            <ol className="divide-y divide-border border-t border-border">
              {history.map((r) => (
                <li key={r.id} className="flex flex-wrap justify-between gap-2 px-4 py-2 text-[15px]">
                  <span className="text-heading">{formatPriceTag(r, r.unit)}</span>
                  <span>
                    {formatDay(r.effective_from)} – {r.effective_to ? formatDay(r.effective_to) : t("open")}
                  </span>
                </li>
              ))}
            </ol>
          </details>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose} disabled={add.isPending}>
            {t("cancel")}
          </Button>
          <Button type="submit" loading={add.isPending}>
            {when === "now" ? t("applyNow") : t("schedule")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
