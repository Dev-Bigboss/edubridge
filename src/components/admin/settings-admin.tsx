"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormError } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/client";
import { applyApiError } from "@/lib/api/form-errors";
import { useSaveSettings, useSettings } from "@/lib/api/hooks/settings";
import { SettingsInput, type SettingsResponse } from "@/lib/api/schemas/settings";
import { formatMoney } from "@/lib/domain/money";
import { describeTiers, refundPercent, tierProblems } from "@/lib/domain/policy";
import { timeAgo } from "@/lib/domain/time";
import { LoadError } from "./catalog-admin";

const FormSchema = SettingsInput.superRefine((v, ctx) => {
  for (const p of tierProblems(v.learner_cancellation.tiers)) {
    ctx.addIssue({ code: "custom", path: ["learner_cancellation", "tiers", p.index, p.field], message: p.message });
  }
});

/** /admin/settings (ADM-3): commission, 1:1 request expiry and the two cancellation policies. */
export function SettingsAdmin() {
  const t = useTranslations("admin.settings");
  const query = useSettings();
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("title")} description={t("intro")} />
      {query.isPending ? <LoadingState /> : query.isError ? <LoadError onRetry={query.refetch} /> : <SettingsForm data={query.data} />}
    </div>
  );
}

function SettingsForm({ data }: { data: SettingsResponse }) {
  const t = useTranslations("admin.settings");
  const save = useSaveSettings();
  const [formError, setFormError] = useState<string | null>(null);
  const { settings, history } = data;
  const defaults: SettingsInput = {
    commission_percent: settings.commission_percent,
    booking_expiry_hours: settings.booking_expiry_hours,
    learner_cancellation: settings.learner_cancellation,
    instructor_cancellation: settings.instructor_cancellation,
    recording_retention_months: settings.recording_retention_months,
  };
  const form = useForm<SettingsInput>({ resolver: zodResolver(FormSchema), defaultValues: defaults });
  const tiers = useFieldArray({ control: form.control, name: "learner_cancellation.tiers" });
  const values = useWatch({ control: form.control });
  const { errors, isDirty } = form.formState;
  const [tryHours, setTryHours] = useState("30");

  // Leaving with unsaved policy changes asks first.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    try {
      const res = await save.mutateAsync({ ...v, version: settings.version });
      form.reset({
        commission_percent: res.settings.commission_percent,
        booking_expiry_hours: res.settings.booking_expiry_hours,
        learner_cancellation: res.settings.learner_cancellation,
        instructor_cancellation: res.settings.instructor_cancellation,
        recording_retention_months: res.settings.recording_retention_months,
      });
      toast.success(t("saved", { version: res.settings.version }));
    } catch (err) {
      setFormError(err instanceof ApiError && err.code === "VERSION_CONFLICT" ? err.message : applyApiError(err, form.setError));
    }
  });

  const commission = Number(values.commission_percent) || 0;
  const sample = 45000;
  const currentTiers = (values.learner_cancellation?.tiers ?? []).filter(
    (x): x is { min_hours_before: number; refund_percent: number } => Number.isFinite(x?.min_hours_before) && Number.isFinite(x?.refund_percent),
  );
  const tryNumber = Number(tryHours);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
      <form onSubmit={onSubmit} noValidate className="min-w-0 space-y-6">
        {!settings.updated_by && (
          <p role="status" className="flex items-start gap-3 rounded-sm border border-accent/60 bg-accent/10 px-4 py-3 leading-relaxed text-heading">
            <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            {t("unreviewed")}
          </p>
        )}
        <FormError message={formError} />

        <Section title={t("commission")} description={t("commissionBody")}>
          <Field label={t("commissionLabel")} error={errors.commission_percent?.message} hint={t("commissionExample", { price: formatMoney({ amount: sample, currency: "USD" }), platform: formatMoney({ amount: Math.round((sample * commission) / 100), currency: "USD" }), instructor: formatMoney({ amount: sample - Math.round((sample * commission) / 100), currency: "USD" }) })}>
            {(a) => <Suffixed suffix="%"><Input {...a} type="number" inputMode="decimal" step={0.5} min={0} max={50} className="pr-10" {...form.register("commission_percent", { valueAsNumber: true })} /></Suffixed>}
          </Field>
        </Section>

        <Section title={t("expiry")} description={t("expiryBody")}>
          <Field label={t("expiryLabel")} error={errors.booking_expiry_hours?.message}>
            {(a) => <Suffixed suffix={t("hours")}><Input {...a} type="number" inputMode="numeric" min={1} max={168} className="pr-20" {...form.register("booking_expiry_hours", { valueAsNumber: true })} /></Suffixed>}
          </Field>
        </Section>

        <Section title={t("learnerCancel")} description={t("learnerCancelBody")}>
          <fieldset className="space-y-3">
            <legend className="sr-only">{t("learnerCancel")}</legend>
            {tiers.fields.map((f, i) => {
              const e = errors.learner_cancellation?.tiers?.[i];
              return (
                <div key={f.id} className="grid gap-3 rounded-sm border border-border p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
                  <Field label={t("atLeast")} error={e?.min_hours_before?.message}>
                    {(a) => <Suffixed suffix={t("hoursBefore")}><Input {...a} type="number" inputMode="numeric" min={0} className="pr-28" {...form.register(`learner_cancellation.tiers.${i}.min_hours_before`, { valueAsNumber: true })} /></Suffixed>}
                  </Field>
                  <Field label={t("refund")} error={e?.refund_percent?.message}>
                    {(a) => <Suffixed suffix="%"><Input {...a} type="number" inputMode="numeric" min={0} max={100} className="pr-10" {...form.register(`learner_cancellation.tiers.${i}.refund_percent`, { valueAsNumber: true })} /></Suffixed>}
                  </Field>
                  <Button type="button" variant="ghost" size="icon" className="sm:mt-7" aria-label={t("removeRule", { n: i + 1 })} disabled={tiers.fields.length === 1} onClick={() => tiers.remove(i)}>
                    <Trash2 aria-hidden="true" className="size-4" />
                  </Button>
                </div>
              );
            })}
            {tiers.fields.length < 6 && (
              <Button type="button" variant="outline" onClick={() => tiers.append({ min_hours_before: 12, refund_percent: 25 })}>
                <Plus aria-hidden="true" className="size-4" /> {t("addRule")}
              </Button>
            )}
          </fieldset>

          {currentTiers.length > 0 && (
            <div className="mt-5 rounded-sm bg-surface-1 p-4">
              <p className="mb-2 font-heading text-[15px] font-medium text-heading">{t("learnersSee")}</p>
              <ul className="mb-4 list-disc space-y-1 pl-5 text-[15px]">
                {describeTiers(currentTiers).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <div className="flex flex-wrap items-end gap-3">
                <Field label={t("tryIt")} className="w-40">
                  {(a) => <Input {...a} type="number" inputMode="numeric" min={0} value={tryHours} onChange={(e) => setTryHours(e.target.value)} />}
                </Field>
                <p role="status" className="min-h-12 py-3 text-heading">
                  {Number.isFinite(tryNumber) && tryHours !== "" ? t("tryResult", { percent: refundPercent(currentTiers, tryNumber) }) : ""}
                </p>
              </div>
            </div>
          )}
        </Section>

        <Section title={t("instructorCancel")} description={t("instructorCancelBody")}>
          <Field label={t("instructorRefund")} error={errors.instructor_cancellation?.refund_percent?.message}>
            {(a) => <Suffixed suffix="%"><Input {...a} type="number" inputMode="numeric" min={0} max={100} className="pr-10" {...form.register("instructor_cancellation.refund_percent", { valueAsNumber: true })} /></Suffixed>}
          </Field>
        </Section>

        <Section title={t("retention")} description={t("retentionBody")}>
          <Field label={t("retentionLabel")} error={errors.recording_retention_months?.message}>
            {(a) => <Suffixed suffix={t("months")}><Input {...a} type="number" inputMode="numeric" min={1} max={60} className="pr-24" {...form.register("recording_retention_months", { valueAsNumber: true })} /></Suffixed>}
          </Field>
        </Section>

        <div className="sticky bottom-0 z-10 -mx-4 flex flex-col-reverse gap-3 border-t border-border bg-white px-4 py-4 shadow-[0_-8px_24px_rgba(8,42,94,0.06)] sm:flex-row sm:items-center sm:justify-end lg:mx-0 lg:rounded-md lg:border">
          <p className="text-sm sm:mr-auto">{isDirty ? t("unsaved") : t("appliesTo")}</p>
          {isDirty && (
            <Button type="button" variant="ghost" onClick={() => form.reset(defaults)}>
              {t("discard")}
            </Button>
          )}
          <Button type="submit" loading={save.isPending} disabled={!isDirty}>
            {t("save")}
          </Button>
        </div>
      </form>

      <aside aria-labelledby="versions" className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-lg border border-border-subtle bg-white p-5">
          <h2 id="versions" className="mb-1 text-lg">
            {t("versions")}
          </h2>
          <p className="mb-4 text-sm">{t("current", { version: settings.version })}</p>
          <ol className="space-y-4 text-[15px]">
            {history.map((h) => (
              <li key={h.version}>
                <p className="font-medium text-heading">
                  {t("version", { version: h.version })} · {h.updated_by_name}
                </p>
                <p className="leading-relaxed">{h.summary}</p>
                <p className="text-sm">
                  <time dateTime={h.updated_at}>{timeAgo(h.updated_at)}</time>
                </p>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-lg border border-border-subtle bg-white p-5 md:p-6">
      <h2 className="mb-1 text-lg">{title}</h2>
      <p className="mb-4 max-w-[68ch] leading-relaxed">{description}</p>
      {children}
    </section>
  );
}

/** Unit shown inside the input's right edge, outside the accessible name. */
function Suffixed({ suffix, children }: { suffix: string; children: ReactNode }) {
  return (
    <div className="relative max-w-[260px]">
      {children}
      <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-[15px]">
        {suffix}
      </span>
    </div>
  );
}
