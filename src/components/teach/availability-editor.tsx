"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarOff, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useFieldArray, useForm, useWatch, type Control } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { LoadError } from "@/components/admin/catalog-admin";
import { FormError } from "@/components/auth/auth-card";
import { WeeklyEditor } from "@/components/availability/weekly-editor";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/client";
import { useMyAvailability, useSaveAvailability } from "@/lib/api/hooks/bookings";
import type { AvailabilityInput } from "@/lib/api/schemas/bookings";
import type { AvailabilityInput as WeeklyOnly } from "@/lib/api/schemas/onboarding";
import { formatCalendarDate } from "@/lib/domain/cohort-schedule";
import { timeZoneOptions } from "@/lib/domain/places";
import { availabilityProblems, todayIn } from "@/lib/domain/slots";

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Use a time like 09:00." });

/** The form keeps one optional range per exception date: simpler to read than a nested list. */
const FormSchema = z
  .object({
    timezone: z.string().min(1),
    weekly: z.array(z.object({ weekday: z.number(), start: hhmm, end: hhmm })),
    overrides: z.array(z.object({ date: z.string().min(1, { error: "Choose a date." }), blocked: z.boolean(), start: z.string(), end: z.string() })),
    notice_hours: z.number({ error: "Enter a number of hours." }).int().min(0, { error: "Use 0 to 168 hours." }).max(168, { error: "Use 0 to 168 hours." }),
  })
  .superRefine((v, ctx) => {
    for (const p of availabilityProblems(toInput(v))) {
      // Exception rows have a single range; point its errors at the row's own fields.
      const path = p.path.replace(/^overrides\.(\d+)\.ranges\.0\./, "overrides.$1.").split(".").map((x) => (/^\d+$/.test(x) ? Number(x) : x));
      ctx.addIssue({ code: "custom", path, message: p.message });
    }
    v.overrides.forEach((o, i) => {
      if (!o.blocked && !(hhmm.safeParse(o.start).success && hhmm.safeParse(o.end).success)) {
        ctx.addIssue({ code: "custom", path: ["overrides", i, "start"], message: "Enter the hours you're available that day." });
      }
    });
  });
type FormValues = z.infer<typeof FormSchema>;

function toInput(v: FormValues): AvailabilityInput {
  return {
    timezone: v.timezone,
    weekly: v.weekly,
    notice_hours: v.notice_hours,
    overrides: v.overrides.map((o) => ({ date: o.date, ranges: o.blocked ? [] : [{ start: o.start, end: o.end }] })),
  };
}

function toForm(a: AvailabilityInput): FormValues {
  return {
    timezone: a.timezone,
    weekly: a.weekly,
    notice_hours: a.notice_hours,
    overrides: a.overrides.map((o) => ({ date: o.date, blocked: o.ranges.length === 0, start: o.ranges[0]?.start ?? "", end: o.ranges[0]?.end ?? "" })),
  };
}

/** /teach/availability (OTO-1): weekly hours, date exceptions and minimum notice, in the instructor's zone. */
export function AvailabilityEditor() {
  const t = useTranslations("teach.availability");
  const query = useMyAvailability();
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("title")} description={t("intro")} />
      {query.isPending ? <LoadingState /> : query.isError ? <LoadError onRetry={query.refetch} /> : <Editor initial={query.data} />}
    </div>
  );
}

function Editor({ initial }: { initial: AvailabilityInput }) {
  const t = useTranslations("teach.availability");
  const save = useSaveAvailability();
  const zones = useMemo(() => timeZoneOptions(), []);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: toForm(initial) });
  const overrides = useFieldArray({ control: form.control, name: "overrides" });
  const values = useWatch({ control: form.control });
  const { errors, isDirty } = form.formState;
  const today = todayIn(values.timezone ?? initial.timezone);

  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    try {
      const res = await save.mutateAsync(toInput(v));
      form.reset(toForm(res.availability));
      toast.success(t("saved"));
    } catch (err) {
      if (err instanceof ApiError) {
        for (const [path, messages] of Object.entries(err.fieldErrors)) {
          form.setError(path.replace(/^overrides\.(\d+)\.ranges\.0\./, "overrides.$1.") as "timezone", { type: "server", message: messages[0] });
        }
        if (!Object.keys(err.fieldErrors).length) setFormError(err.message);
      } else setFormError(t("failed"));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormError message={formError} />

      <Section title={t("zoneTitle")} description={t("zoneBody")}>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label={t("timezone")}>
            {(a) => (
              <Select {...a} {...form.register("timezone")}>
                {zones.map((z) => (
                  <option key={z.zone} value={z.zone}>
                    {z.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t("notice")} hint={t("noticeHint")} error={errors.notice_hours?.message}>
            {(a) => <Input {...a} type="number" inputMode="numeric" min={0} max={168} {...form.register("notice_hours", { valueAsNumber: true })} />}
          </Field>
        </div>
      </Section>

      <Section title={t("weeklyTitle")} description={t("weeklyBody")}>
        <WeeklyEditor
          control={form.control as unknown as Control<WeeklyOnly>}
          register={form.register as unknown as Parameters<typeof WeeklyEditor>[0]["register"]}
          errors={errors as Parameters<typeof WeeklyEditor>[0]["errors"]}
        />
      </Section>

      <Section title={t("exceptionsTitle")} description={t("exceptionsBody")}>
        {overrides.fields.length === 0 ? (
          <p className="mb-4 flex items-center gap-2 text-[15px]">
            <CalendarOff aria-hidden="true" className="size-5 text-body" />
            {t("noExceptions")}
          </p>
        ) : (
          <ul className="mb-4 space-y-3">
            {overrides.fields.map((f, i) => {
              const row = values.overrides?.[i];
              const e = errors.overrides?.[i];
              return (
                <li key={f.id} className="rounded-sm border border-border p-4">
                  <fieldset className="grid gap-3 md:grid-cols-[180px_1fr_auto] md:items-start">
                    <legend className="sr-only">{row?.date ? formatCalendarDate(row.date) : t("newException")}</legend>
                    <Field label={t("date")} error={e?.date?.message}>
                      {(a) => <Input {...a} type="date" min={today} {...form.register(`overrides.${i}.date`)} />}
                    </Field>
                    <div className="space-y-2">
                      <label className="flex min-h-11 items-center gap-3">
                        <input type="checkbox" className="size-5 accent-primary" {...form.register(`overrides.${i}.blocked`)} />
                        {t("blocked")}
                      </label>
                      {!row?.blocked && (
                        <div className="grid grid-cols-2 gap-3">
                          <Field label={t("from")} error={e?.start?.message}>
                            {(a) => <Input {...a} type="time" step={1800} {...form.register(`overrides.${i}.start`)} />}
                          </Field>
                          <Field label={t("to")} error={e?.end?.message}>
                            {(a) => <Input {...a} type="time" step={1800} {...form.register(`overrides.${i}.end`)} />}
                          </Field>
                        </div>
                      )}
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="md:mt-7" aria-label={t("removeException", { n: i + 1 })} onClick={() => overrides.remove(i)}>
                      <Trash2 aria-hidden="true" className="size-4" />
                    </Button>
                  </fieldset>
                </li>
              );
            })}
          </ul>
        )}
        <Button type="button" variant="outline" onClick={() => overrides.append({ date: "", blocked: true, start: "09:00", end: "12:00" })}>
          <Plus aria-hidden="true" className="size-4" /> {t("addException")}
        </Button>
      </Section>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-col-reverse gap-3 border-t border-border bg-white px-4 py-4 shadow-[0_-8px_24px_rgba(8,42,94,0.06)] sm:flex-row sm:items-center sm:justify-end lg:mx-0 lg:rounded-md lg:border">
        <p className="text-sm sm:mr-auto">{isDirty ? t("unsaved") : t("appliesTo")}</p>
        <Button type="submit" loading={save.isPending} disabled={!isDirty}>
          {t("save")}
        </Button>
      </div>
    </form>
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
