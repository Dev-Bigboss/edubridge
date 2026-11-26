"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormError } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { Select, Textarea } from "@/components/ui/select";
import { TagInput } from "@/components/ui/tag-input";
import { applyApiError } from "@/lib/api/form-errors";
import { useSaveCategory } from "@/lib/api/hooks/admin-catalog";
import { CategoryInput, METADATA_FIELD_TYPES, type Category } from "@/lib/api/schemas/catalog";

const keyFrom = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^(\d)/, "f_$1") || "field";

/** Add or edit a category and the extra fields its trainings carry (TRN-3, TRN-4). */
export function CategoryDialog({ category, onClose }: { category: Category | null; onClose: () => void }) {
  const t = useTranslations("admin.catalog");
  const save = useSaveCategory(category?.id ?? null);
  const [formError, setFormError] = useState<string | null>(null);
  const existingKeys = new Set(category?.metadata_fields.map((f) => f.key));

  const form = useForm<CategoryInput>({
    resolver: zodResolver(
      CategoryInput.superRefine((v, ctx) => {
        const seen = new Set<string>();
        v.metadata_fields.forEach((f, i) => {
          if (seen.has(f.key)) ctx.addIssue({ code: "custom", path: ["metadata_fields", i, "label"], message: t("duplicateField") });
          seen.add(f.key);
          if (f.type === "SELECT" && !f.options?.length) {
            ctx.addIssue({ code: "custom", path: ["metadata_fields", i, "options"], message: t("optionsRequired") });
          }
        });
      }),
    ),
    defaultValues: category
      ? { name: category.name, description: category.description ?? "", active: category.active, metadata_fields: category.metadata_fields }
      : { name: "", description: "", active: true, metadata_fields: [] },
  });
  const fields = useFieldArray({ control: form.control, name: "metadata_fields" });
  const watched = useWatch({ control: form.control, name: "metadata_fields" });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await save.mutateAsync({ ...values, description: values.description?.trim() || null });
      toast.success(category ? t("categorySaved") : t("categoryCreated", { name: values.name }));
      onClose();
    } catch (err) {
      setFormError(applyApiError(err, form.setError));
    }
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={category ? t("editCategory") : t("addCategory")} wide>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormError message={formError} />
        <Field label={t("name")} error={errors.name?.message}>
          {(a) => <Input {...a} {...form.register("name")} />}
        </Field>
        <Field label={t("description")} hint={t("descriptionHint")} error={errors.description?.message}>
          {(a) => <Textarea {...a} rows={2} className="min-h-[72px]" maxLength={200} {...form.register("description")} />}
        </Field>

        <fieldset className="space-y-3">
          <legend className="font-heading text-[15px] font-medium text-heading">{t("fields")}</legend>
          <p className="text-sm leading-relaxed">{t("fieldsHint")}</p>
          {fields.fields.map((f, i) => {
            const type = watched?.[i]?.type;
            // Keys of saved fields are stored on trainings, so they never change.
            const locked = existingKeys.has(f.key);
            return (
              <div key={f.id} className="space-y-3 rounded-sm border border-border p-4">
                <div className="grid gap-3 md:grid-cols-[1fr_160px_auto] md:items-start">
                  <Field label={t("fieldLabel")} error={errors.metadata_fields?.[i]?.label?.message}>
                    {(a) => (
                      <Input
                        {...a}
                        {...form.register(`metadata_fields.${i}.label`, {
                          onChange: (e) => !locked && form.setValue(`metadata_fields.${i}.key`, keyFrom(e.target.value)),
                        })}
                      />
                    )}
                  </Field>
                  <Field label={t("fieldType")}>
                    {(a) => (
                      <Select {...a} {...form.register(`metadata_fields.${i}.type`)}>
                        {METADATA_FIELD_TYPES.map((ty) => (
                          <option key={ty} value={ty}>
                            {t(`types.${ty}`)}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="md:mt-7"
                    aria-label={t("removeField", { n: i + 1 })}
                    onClick={() => fields.remove(i)}
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </Button>
                </div>
                {type === "SELECT" && (
                  <Controller
                    control={form.control}
                    name={`metadata_fields.${i}.options`}
                    render={({ field, fieldState }) => (
                      <TagInput label={t("options")} max={20} value={field.value ?? []} onChange={field.onChange} error={fieldState.error?.message} />
                    )}
                  />
                )}
                <label className="flex min-h-11 items-center gap-3">
                  <input type="checkbox" className="size-5 accent-primary" {...form.register(`metadata_fields.${i}.required`)} />
                  {t("required")}
                </label>
              </div>
            );
          })}
          <Button
            type="button"
            variant="outline"
            onClick={() => fields.append({ key: "field", label: "", type: "TEXT", required: false })}
          >
            <Plus aria-hidden="true" className="size-4" /> {t("addField")}
          </Button>
        </fieldset>

        <label className="flex min-h-11 items-start gap-3 leading-relaxed">
          <input type="checkbox" className="mt-1 size-5 accent-primary" {...form.register("active")} />
          <span>
            <span className="block font-medium text-heading">{t("activeLabel")}</span>
            <span className="text-sm">{t("activeHint")}</span>
          </span>
        </label>

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose} disabled={save.isPending}>
            {t("cancel")}
          </Button>
          <Button type="submit" loading={save.isPending}>
            {category ? t("saveChanges") : t("createCategory")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
