"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormError } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { applyApiError } from "@/lib/api/form-errors";
import { useSaveModality } from "@/lib/api/hooks/admin-catalog";
import { ModalityInput, type Modality } from "@/lib/api/schemas/catalog";
import { PRICING_UNITS } from "@/lib/domain/enums";
import { unitLabel } from "@/lib/domain/money";

/** TRN-2: modalities are data. A new one is listed and priceable; booking behaviour exists for COHORT and ONE_ON_ONE. */
export function ModalityDialog({ modality, onClose }: { modality: Modality | null; onClose: () => void }) {
  const t = useTranslations("admin.catalog");
  const save = useSaveModality(modality?.id ?? null);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ModalityInput>({
    resolver: zodResolver(ModalityInput),
    defaultValues: modality ?? { code: "", name: "", active: true, pricing_units: [] },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async ({ code, ...rest }) => {
    setFormError(null);
    try {
      await save.mutateAsync(modality ? rest : { code, ...rest });
      toast.success(t("modalitySaved"));
      onClose();
    } catch (err) {
      setFormError(applyApiError(err, form.setError));
    }
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={modality ? t("editModality") : t("addModality")} description={modality ? undefined : t("modalityWarning")}>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormError message={formError} />
        <Field label={t("name")} error={errors.name?.message}>
          {(a) => <Input {...a} {...form.register("name")} />}
        </Field>
        <Field label={t("code")} hint={modality ? t("codeLocked") : t("codeHint")} error={errors.code?.message}>
          {(a) => <Input {...a} className="font-mono uppercase" disabled={!!modality} autoCapitalize="characters" {...form.register("code")} />}
        </Field>
        <Controller
          control={form.control}
          name="pricing_units"
          render={({ field, fieldState }) => (
            <ChoiceChips
              legend={t("units")}
              options={PRICING_UNITS.map((u) => ({ value: u, label: unitLabel(u) }))}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" className="size-5 accent-primary" {...form.register("active")} />
          {t("activeLabel")}
        </label>
        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose} disabled={save.isPending}>
            {t("cancel")}
          </Button>
          <Button type="submit" loading={save.isPending}>
            {modality ? t("saveChanges") : t("createModality")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
