"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch, type UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FormError } from "@/components/auth/auth-card";
import { ThumbnailUpload } from "@/components/uploads/thumbnail-upload";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Select, Textarea } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/spinner";
import { TagInput } from "@/components/ui/tag-input";
import { applyApiError } from "@/lib/api/form-errors";
import { useAdminInstructors, useAdminTraining, usePricingRules, useSaveTraining } from "@/lib/api/hooks/admin-catalog";
import { useCategories, useModalities } from "@/lib/api/hooks/catalog";
import { type Category, type Modality, type Training, type TrainingInput } from "@/lib/api/schemas/catalog";
import type { StoredFile } from "@/lib/api/schemas/uploads";
import { PRICING_UNITS, TRAINING_LEVELS, type PricingUnit } from "@/lib/domain/enums";
import { DEFAULT_CURRENCY, formatPriceTag, moneyInputValue, parseMoneyInput, unitLabel } from "@/lib/domain/money";
import { ruleAt } from "@/lib/domain/pricing";
import { TRAINING_LANGUAGES, languageName } from "@/lib/domain/training";
import { LoadError } from "./catalog-admin";
import { TrainingSidebar } from "./training-sidebar";

const CURRENCY = DEFAULT_CURRENCY;

const money = (msg: string) => z.string().refine((v) => (parseMoneyInput(v, CURRENCY) ?? 0) > 0, { error: msg });

/** Form shape: amounts and hours are typed text, converted to the API body on save. */
const FormSchema = z
  .object({
    title: z.string().trim().min(5, { error: "Use at least 5 characters." }).max(120),
    summary: z.string().trim().min(20, { error: "Write a one-line summary, at least 20 characters." }).max(200),
    description: z.string().max(5000),
    category_id: z.string().min(1, { error: "Choose a category." }),
    modality_id: z.string().min(1, { error: "Choose how it's taught." }),
    level: z.string().min(1, { error: "Choose a level." }),
    language: z.string().min(1, { error: "Choose a language." }),
    duration_hours: z.string().refine((v) => !v || (Number(v) > 0 && Number(v) <= 1000), { error: "Enter hours between 1 and 1000, or leave empty." }),
    // Drafts may leave category details empty; required ones are enforced at publish (TRN-4).
    metadata: z.record(z.string(), z.union([z.string(), z.array(z.string())]).optional()),
    instructors: z.array(
      z.object({ instructor_id: z.string(), name: z.string(), has_rate: z.boolean(), rate_amount: z.string(), rate_unit: z.string() }),
    ),
    override_on: z.boolean(),
    override_amount: z.string(),
    override_unit: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.override_on) {
      const r = money("Enter a price above zero.").safeParse(v.override_amount);
      if (!r.success) ctx.addIssue({ code: "custom", path: ["override_amount"], message: "Enter a price above zero." });
    }
    v.instructors.forEach((i, n) => {
      if (i.has_rate && !((parseMoneyInput(i.rate_amount, CURRENCY) ?? 0) > 0)) {
        ctx.addIssue({ code: "custom", path: ["instructors", n, "rate_amount"], message: "Enter a rate above zero." });
      }
    });
  });
type FormValues = z.infer<typeof FormSchema>;

function toForm(t: Training | null, defaultUnit: PricingUnit): FormValues {
  return {
    title: t?.title ?? "",
    summary: t?.summary ?? "",
    description: t?.description ?? "",
    category_id: t?.category_id ?? "",
    modality_id: t?.modality_id ?? "",
    level: t?.level ?? "",
    language: t?.language ?? "en",
    duration_hours: t?.duration_hours ? String(t.duration_hours) : "",
    metadata: t?.metadata ?? {},
    instructors:
      t?.instructors.map((i) => ({
        instructor_id: i.instructor_id,
        name: i.name,
        has_rate: !!i.custom_rate,
        rate_amount: i.custom_rate ? moneyInputValue(i.custom_rate.amount, i.custom_rate.currency) : "",
        rate_unit: i.custom_rate?.unit ?? defaultUnit,
      })) ?? [],
    override_on: !!t?.price_override,
    override_amount: t?.price_override ? moneyInputValue(t.price_override.amount, t.price_override.currency) : "",
    override_unit: t?.price_override?.unit ?? defaultUnit,
  };
}

function toInput(v: FormValues, thumbnail: StoredFile | null): TrainingInput {
  const price = (amount: string, unit: string) => ({ amount: parseMoneyInput(amount, CURRENCY)!, currency: CURRENCY, unit: unit as PricingUnit });
  return {
    title: v.title.trim(),
    summary: v.summary.trim(),
    description: v.description.trim(),
    category_id: v.category_id,
    modality_id: v.modality_id,
    level: v.level as TrainingInput["level"],
    language: v.language,
    duration_hours: v.duration_hours ? Number(v.duration_hours) : null,
    thumbnail_file_id: thumbnail?.id ?? null,
    metadata: Object.fromEntries(
      Object.entries(v.metadata).filter((e): e is [string, string | string[]] => {
        const value = e[1];
        return Array.isArray(value) ? value.length > 0 : !!value?.trim();
      }),
    ),
    instructors: v.instructors.map((i) => ({ instructor_id: i.instructor_id, custom_rate: i.has_rate ? price(i.rate_amount, i.rate_unit) : null })),
    price_override: v.override_on ? price(v.override_amount, v.override_unit) : null,
  };
}

/** TRN-1, TRN-4, TRN-5, PRC-3. `id` null = create. */
export function TrainingEditor({ id }: { id: string | null }) {
  const t = useTranslations("admin.editor");
  const training = useAdminTraining(id);
  const categories = useCategories({ includeInactive: true });
  const modalities = useModalities();

  if ((id && training.isPending) || categories.isPending || modalities.isPending) return <LoadingState />;
  if (training.isError || categories.isError || modalities.isError) {
    return (
      <div className="mx-auto max-w-6xl">
        <LoadError onRetry={() => void Promise.all([training.refetch(), categories.refetch(), modalities.refetch()])} />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/trainings" className="mb-4 inline-flex min-h-11 items-center gap-2 font-medium text-primary underline-offset-4 hover:underline">
        <ArrowLeft aria-hidden="true" className="size-4" /> {t("back")}
      </Link>
      <EditorForm key={training.data?.updated_at ?? "new"} training={training.data ?? null} categories={categories.data} modalities={modalities.data} />
    </div>
  );
}

function EditorForm({ training, categories, modalities }: { training: Training | null; categories: Category[]; modalities: Modality[] }) {
  const t = useTranslations("admin.editor");
  const router = useRouter();
  const save = useSaveTraining(training?.id ?? null);
  const [formError, setFormError] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<StoredFile | null>(training?.thumbnail ?? null);
  const form = useForm<FormValues>({ resolver: zodResolver(FormSchema), mode: "onTouched", defaultValues: toForm(training, "PER_SEAT") });
  const { errors, isDirty } = form.formState;
  const thumbDirty = (thumbnail?.id ?? null) !== (training?.thumbnail?.id ?? null);
  const dirty = isDirty || thumbDirty;

  const categoryId = useWatch({ control: form.control, name: "category_id" });
  const modalityId = useWatch({ control: form.control, name: "modality_id" });
  const category = categories.find((c) => c.id === categoryId);
  const modality = modalities.find((m) => m.id === modalityId);
  const units = modality?.pricing_units ?? [...PRICING_UNITS];

  // Prices must use a unit the modality allows (PRC-2), so snap them when the modality changes.
  useEffect(() => {
    if (!modality) return;
    const allowed = modality.pricing_units;
    if (!allowed.includes(form.getValues("override_unit") as PricingUnit)) form.setValue("override_unit", allowed[0]);
    form.getValues("instructors").forEach((i, n) => {
      if (!allowed.includes(i.rate_unit as PricingUnit)) form.setValue(`instructors.${n}.rate_unit`, allowed[0]);
    });
  }, [modality, form]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const res = await save.mutateAsync(toInput(values, thumbnail));
      if (training) {
        toast.success(t("saved"));
      } else {
        toast.success(t("created"));
        router.replace(`/admin/trainings/${res.training.id}`);
      }
    } catch (err) {
      setFormError(applyApiError(err, form.setError));
    }
  }, () => setFormError(t("fixErrors")));

  const section = "space-y-5 rounded-md border border-border bg-white p-6";
  const locked = !!training && training.status !== "DRAFT";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
      <form onSubmit={onSubmit} noValidate className="min-w-0 space-y-6">
        <div>
          <h1 className="text-[28px]">{training ? training.title : t("newTitle")}</h1>
          {!training && <p className="mt-1 leading-relaxed">{t("newIntro")}</p>}
        </div>
        <FormError message={formError} />

        <section aria-labelledby="s-basics" className={section}>
          <h2 id="s-basics" className="text-lg">
            {t("basics")}
          </h2>
          <Field label={t("titleLabel")} error={errors.title?.message}>
            {(a) => <Input {...a} maxLength={120} {...form.register("title")} />}
          </Field>
          <Field label={t("summary")} hint={t("summaryHint")} error={errors.summary?.message}>
            {(a) => <Input {...a} maxLength={200} {...form.register("summary")} />}
          </Field>
          <Field label={t("description")} hint={t("descriptionHint")} error={errors.description?.message}>
            {(a) => <Textarea {...a} rows={7} maxLength={5000} {...form.register("description")} />}
          </Field>
        </section>

        <section aria-labelledby="s-class" className={section}>
          <h2 id="s-class" className="text-lg">
            {t("classification")}
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label={t("category")} error={errors.category_id?.message}>
              {(a) => (
                <Select {...a} {...form.register("category_id")}>
                  <option value="">{t("choose")}</option>
                  {categories
                    .filter((c) => c.active || c.id === training?.category_id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {!c.active ? ` (${t("disabled")})` : ""}
                      </option>
                    ))}
                </Select>
              )}
            </Field>
            <Field label={t("modality")} hint={locked ? t("modalityLocked") : t("modalityHint")} error={errors.modality_id?.message}>
              {(a) => (
                <Select {...a} disabled={locked} {...form.register("modality_id")}>
                  <option value="">{t("choose")}</option>
                  {modalities
                    .filter((m) => m.active || m.id === training?.modality_id)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                </Select>
              )}
            </Field>
          </div>
          {category && category.metadata_fields.length > 0 && <MetadataFields category={category} form={form} />}
        </section>

        <section aria-labelledby="s-delivery" className={section}>
          <h2 id="s-delivery" className="text-lg">
            {t("delivery")}
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
            <Field label={t("level")} error={errors.level?.message}>
              {(a) => (
                <Select {...a} {...form.register("level")}>
                  <option value="">{t("choose")}</option>
                  {TRAINING_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {t(`levels.${l}`)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={t("language")} error={errors.language?.message}>
              {(a) => (
                <Select {...a} {...form.register("language")}>
                  {TRAINING_LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {languageName(l)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={t("duration")} hint={t("durationHint")} error={errors.duration_hours?.message}>
              {(a) => <Input {...a} inputMode="decimal" {...form.register("duration_hours")} />}
            </Field>
          </div>
          <div>
            <p className="mb-2 font-heading text-[15px] font-medium text-heading">{t("thumbnail")}</p>
            <ThumbnailUpload value={thumbnail} onChange={setThumbnail} />
          </div>
        </section>

        <InstructorsSection form={form} units={units} />
        <PricingSection form={form} units={units} modality={modality} category={category} />

        <div className="sticky bottom-0 z-10 -mx-4 flex flex-col-reverse gap-3 border-t border-border bg-white px-4 py-4 shadow-[0_-8px_24px_rgba(8,42,94,0.06)] sm:flex-row sm:items-center sm:justify-end lg:mx-0 lg:rounded-md lg:border">
          {dirty && <p className="text-sm sm:mr-auto">{t("unsaved")}</p>}
          <Button type="submit" loading={save.isPending} disabled={!!training && !dirty}>
            {save.isPending ? t("saving") : training ? t("save") : t("createDraft")}
          </Button>
        </div>
      </form>

      {training && <TrainingSidebar training={training} categories={categories} dirty={dirty} />}
    </div>
  );
}

/** TRN-4: the selected category's own fields. */
function MetadataFields({ category, form }: { category: Category; form: UseFormReturn<FormValues> }) {
  const t = useTranslations("admin.editor");
  return (
    <fieldset className="space-y-4 border-t border-border pt-5">
      <legend className="sr-only">{t("categoryDetails", { name: category.name })}</legend>
      <p aria-hidden="true" className="font-heading font-medium text-heading">
        {t("categoryDetails", { name: category.name })}
      </p>
      <div className="grid gap-5 md:grid-cols-2">
        {category.metadata_fields.map((f) => {
          const label = f.required ? f.label : `${f.label} ${t("optional")}`;
          return (
            <Controller
              key={f.key}
              control={form.control}
              name={`metadata.${f.key}`}
              render={({ field }) =>
                f.type === "TAGS" ? (
                  <TagInput label={label} max={15} value={Array.isArray(field.value) ? field.value : []} onChange={field.onChange} />
                ) : f.type === "SELECT" ? (
                  <Field label={label}>
                    {(a) => (
                      <Select {...a} value={typeof field.value === "string" ? field.value : ""} onChange={field.onChange} onBlur={field.onBlur}>
                        <option value="">{t("choose")}</option>
                        {f.options?.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </Select>
                    )}
                  </Field>
                ) : (
                  <Field label={label}>
                    {(a) => <Input {...a} value={typeof field.value === "string" ? field.value : ""} onChange={field.onChange} onBlur={field.onBlur} />}
                  </Field>
                )
              }
            />
          );
        })}
      </div>
      <p className="text-sm">{t("metadataHint")}</p>
    </fieldset>
  );
}

/** TRN-5 assignment, PRC-3 per-instructor rate. */
function InstructorsSection({ form, units }: { form: UseFormReturn<FormValues>; units: PricingUnit[] }) {
  const t = useTranslations("admin.editor");
  const instructors = useAdminInstructors();
  const list = useFieldArray({ control: form.control, name: "instructors" });
  const [pick, setPick] = useState("");
  const assigned = useWatch({ control: form.control, name: "instructors" });
  const available = (instructors.data ?? []).filter((i) => !assigned.some((a) => a.instructor_id === i.id));
  const errors = form.formState.errors.instructors;

  return (
    <section aria-labelledby="s-instructors" className="space-y-5 rounded-md border border-border bg-white p-6">
      <div>
        <h2 id="s-instructors" className="text-lg">
          {t("instructors")}
        </h2>
        <p className="leading-relaxed">{t("instructorsHint")}</p>
      </div>
      {list.fields.length === 0 && <p className="rounded-sm bg-surface-1 px-4 py-3">{t("noInstructors")}</p>}
      <ul className="space-y-3">
        {list.fields.map((f, i) => (
          <li key={f.id} className="space-y-3 rounded-sm border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-heading">{f.name}</p>
              <Button type="button" variant="ghost" onClick={() => list.remove(i)} aria-label={t("removeInstructor", { name: f.name })}>
                <Trash2 aria-hidden="true" className="size-4" /> {t("remove")}
              </Button>
            </div>
            <label className="flex min-h-11 items-center gap-3">
              <input type="checkbox" className="size-5 accent-primary" {...form.register(`instructors.${i}.has_rate`)} />
              {t("customRate")}
            </label>
            {assigned[i]?.has_rate && (
              <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                <Field label={t("rate", { name: f.name })} error={errors?.[i]?.rate_amount?.message}>
                  {(a) => <MoneyInput currency={CURRENCY} {...a} {...form.register(`instructors.${i}.rate_amount`)} />}
                </Field>
                <Field label={t("unit")}>
                  {(a) => (
                    <Select {...a} {...form.register(`instructors.${i}.rate_unit`)}>
                      {units.map((u) => (
                        <option key={u} value={u}>
                          {unitLabel(u)}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Select aria-label={t("chooseInstructor")} value={pick} onChange={(e) => setPick(e.target.value)} className="sm:w-[320px]">
          <option value="">{instructors.isPending ? t("loadingInstructors") : available.length ? t("chooseInstructor") : t("noneAvailable")}</option>
          {available.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
              {i.headline ? `, ${i.headline}` : ""}
            </option>
          ))}
        </Select>
        <Button
          type="button"
          variant="outline"
          disabled={!pick}
          onClick={() => {
            const i = available.find((x) => x.id === pick);
            if (i) list.append({ instructor_id: i.id, name: i.name, has_rate: false, rate_amount: "", rate_unit: units[0] });
            setPick("");
          }}
        >
          <Plus aria-hidden="true" className="size-4" /> {t("addInstructor")}
        </Button>
      </div>
    </section>
  );
}

/** PRC-1/3/4: shows the rule price this training gets, with an optional override. */
function PricingSection({
  form,
  units,
  modality,
  category,
}: {
  form: UseFormReturn<FormValues>;
  units: PricingUnit[];
  modality?: Modality;
  category?: Category;
}) {
  const t = useTranslations("admin.editor");
  const rules = usePricingRules();
  const overrideOn = useWatch({ control: form.control, name: "override_on" });
  const rule = useMemo(
    () => (modality && category && rules.data ? ruleAt(rules.data, modality.id, category.id, new Date()) : null),
    [modality, category, rules.data],
  );
  const errors = form.formState.errors;

  return (
    <section aria-labelledby="s-pricing" className="space-y-5 rounded-md border border-border bg-white p-6">
      <div>
        <h2 id="s-pricing" className="text-lg">
          {t("pricing")}
        </h2>
        <p className="leading-relaxed">{t("pricingHint")}</p>
      </div>
      <p className="rounded-sm bg-surface-1 px-4 py-3 leading-relaxed">
        {!modality || !category
          ? t("rulePending")
          : rule
            ? t.rich("ruleIs", {
                pair: `${modality.name} × ${category.name}`,
                price: formatPriceTag(rule, rule.unit),
                strong: (c) => <strong className="text-heading">{c}</strong>,
              })
            : t.rich("noRule", {
                pair: `${modality.name} × ${category.name}`,
                link: (c) => (
                  <Link href="/admin/pricing" className="font-medium text-primary underline underline-offset-4">
                    {c}
                  </Link>
                ),
              })}
      </p>
      <label className="flex min-h-11 items-start gap-3 leading-relaxed">
        <input type="checkbox" className="mt-1 size-5 accent-primary" {...form.register("override_on")} />
        <span>
          <span className="block font-medium text-heading">{t("override")}</span>
          <span className="text-sm">{t("overrideHint")}</span>
        </span>
      </label>
      {overrideOn && (
        <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
          <Field label={t("overridePrice")} error={errors.override_amount?.message}>
            {(a) => <MoneyInput currency={CURRENCY} {...a} {...form.register("override_amount")} />}
          </Field>
          <Field label={t("unit")}>
            {(a) => (
              <Select {...a} {...form.register("override_unit")}>
                {units.map((u) => (
                  <option key={u} value={u}>
                    {unitLabel(u)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      )}
    </section>
  );
}
