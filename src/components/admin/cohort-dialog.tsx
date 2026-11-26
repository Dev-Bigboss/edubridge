"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FormError } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api/client";
import { applyApiError } from "@/lib/api/form-errors";
import { useAdminTrainings } from "@/lib/api/hooks/admin-catalog";
import { useModalities } from "@/lib/api/hooks/catalog";
import { useSaveCohort } from "@/lib/api/hooks/cohorts";
import { WEEKDAYS, type AdminCohort, type CohortInput } from "@/lib/api/schemas/cohort";
import { cohortEditable } from "@/lib/domain/cohort-machine";
import { dateInZone, deadlineFromDate, formatCalendarDate, formatWeekdays, planSessions } from "@/lib/domain/cohort-schedule";
import { MODALITY } from "@/lib/domain/enums";
import { formatDuration } from "@/lib/domain/money";
import { timeZoneOptions } from "@/lib/domain/places";
import { formatSessionTime } from "@/lib/domain/time";

const DURATIONS = [60, 90, 120, 150, 180, 240] as const;

const FormSchema = z
  .object({
    training_id: z.string().min(1, { error: "Choose a training." }),
    instructor_id: z.string().min(1, { error: "Choose the instructor." }),
    name: z.string().trim().min(3, { error: "Give the cohort a name learners will recognise." }).max(60),
    start_date: z.string().min(1, { error: "Choose a start date." }),
    end_date: z.string().min(1, { error: "Choose an end date." }),
    schedule: z.object({
      weekdays: z.array(z.enum(WEEKDAYS)).min(1, { error: "Pick at least one day." }),
      start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Enter a time, e.g. 18:00." }),
      duration_min: z.coerce.number<string>(),
      timezone: z.string().min(1),
    }),
    capacity: z.coerce.number<string>({ error: "Enter how many seats." }).int({ error: "Whole seats only." }).min(1, { error: "At least 1 seat." }).max(500, { error: "500 seats at most." }),
    min_enrolment: z.string().regex(/^\d*$/, { error: "Whole numbers only." }),
    deadline_date: z.string().min(1, { error: "Choose the last day to enrol." }),
  })
  .refine((v) => !v.end_date || v.end_date >= v.start_date, { path: ["end_date"], error: "End on or after the start date." })
  .refine((v) => !v.min_enrolment || Number(v.min_enrolment) <= v.capacity, { path: ["min_enrolment"], error: "The minimum can't be more than the seats." })
  .refine((v) => !v.deadline_date || !v.start_date || v.deadline_date <= v.start_date, { path: ["deadline_date"], error: "Enrolment must close by the start date." });
type FormIn = z.input<typeof FormSchema>;
type FormOut = z.output<typeof FormSchema>;

function toInput(v: FormOut): CohortInput {
  return {
    training_id: v.training_id,
    instructor_id: v.instructor_id,
    name: v.name.trim(),
    start_date: v.start_date,
    end_date: v.end_date,
    schedule: v.schedule,
    capacity: v.capacity,
    min_enrolment: v.min_enrolment ? Number(v.min_enrolment) : null,
    enrolment_deadline: deadlineFromDate(v.deadline_date, v.schedule.timezone),
  };
}

/** COH-1: create or edit a cohort. Dates and schedule lock once the cohort starts. */
export function CohortDialog({ cohort, onClose }: { cohort: AdminCohort | null; onClose: () => void }) {
  const t = useTranslations("admin.cohorts");
  const save = useSaveCohort(cohort?.id ?? null);
  const [formError, setFormError] = useState<string | null>(null);
  const zones = useMemo(() => timeZoneOptions(), []);
  const modalities = useModalities();
  const cohortModality = modalities.data?.find((m) => m.code === MODALITY.COHORT)?.id;
  const trainings = useAdminTrainings({ modality_id: cohortModality });
  const choosable = (trainings.data?.items ?? []).filter((tr) => tr.modality_id === cohortModality && (tr.status !== "ARCHIVED" || tr.id === cohort?.training_id));
  const editable = cohort ? cohortEditable(cohort.status) : "ALL";
  const datesLocked = editable !== "ALL";

  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(FormSchema),
    defaultValues: cohort
      ? {
          training_id: cohort.training_id,
          instructor_id: cohort.instructor_id,
          name: cohort.name,
          start_date: cohort.start_date,
          end_date: cohort.end_date,
          schedule: { ...cohort.schedule, duration_min: String(cohort.schedule.duration_min) },
          capacity: String(cohort.capacity),
          min_enrolment: cohort.min_enrolment ? String(cohort.min_enrolment) : "",
          deadline_date: dateInZone(cohort.enrolment_deadline, cohort.schedule.timezone),
        }
      : {
          training_id: "",
          instructor_id: "",
          name: "",
          start_date: "",
          end_date: "",
          schedule: { weekdays: [], start_time: "18:00", duration_min: "120", timezone: "Africa/Lagos" },
          capacity: "20",
          min_enrolment: "",
          deadline_date: "",
        },
  });
  const { errors } = form.formState;
  const values = useWatch({ control: form.control });
  const training = choosable.find((tr) => tr.id === values.training_id);

  // Live preview of what learners will see, in the schedule's own zone.
  const plan =
    values.start_date && values.end_date && values.schedule?.weekdays?.length && values.schedule.start_time && values.schedule.timezone
      ? planSessions(values.start_date, values.end_date, {
          weekdays: values.schedule.weekdays,
          start_time: values.schedule.start_time,
          duration_min: Number(values.schedule.duration_min),
          timezone: values.schedule.timezone,
        })
      : null;

  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    try {
      const { cohort: saved } = await save.mutateAsync(toInput(v));
      toast.success(cohort ? t("saved") : t("created", { name: saved.name }));
      onClose();
    } catch (err) {
      // The API names the deadline instant; the form asks for its date.
      if (err instanceof ApiError && err.fieldErrors.enrolment_deadline) {
        err.fieldErrors.deadline_date = err.fieldErrors.enrolment_deadline;
        delete err.fieldErrors.enrolment_deadline;
      }
      setFormError(applyApiError(err, form.setError));
    }
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={cohort ? t("edit") : t("new")} description={datesLocked && editable !== "NONE" ? t("startedNote") : undefined} wide>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormError message={formError} />
        <div className="grid gap-5 md:grid-cols-2">
          <Field label={t("training")} error={errors.training_id?.message} hint={!cohort && trainings.data && choosable.length === 0 ? t("noCohortTrainings") : undefined}>
            {(a) => (
              <Select
                {...a}
                disabled={!!cohort}
                {...form.register("training_id", { onChange: () => form.setValue("instructor_id", "") })}
              >
                <option value="">{t("chooseTraining")}</option>
                {choosable.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {tr.title}
                    {tr.status === "DRAFT" ? ` (${t("draft")})` : ""}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t("instructor")} error={errors.instructor_id?.message} hint={training && training.instructors.length === 0 ? t("noInstructors") : undefined}>
            {(a) => (
              <Select {...a} disabled={datesLocked || !training} {...form.register("instructor_id")}>
                <option value="">{t("chooseInstructor")}</option>
                {training?.instructors.map((i) => (
                  <option key={i.instructor_id} value={i.instructor_id}>
                    {i.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <Field label={t("name")} hint={t("nameHint")} error={errors.name?.message}>
          {(a) => <Input {...a} maxLength={60} {...form.register("name")} />}
        </Field>

        <fieldset disabled={datesLocked} className="space-y-5">
          <legend className="sr-only">{t("scheduleLegend")}</legend>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label={t("startDate")} error={errors.start_date?.message}>
              {(a) => <Input {...a} type="date" {...form.register("start_date")} />}
            </Field>
            <Field label={t("endDate")} error={errors.end_date?.message}>
              {(a) => <Input {...a} type="date" min={values.start_date || undefined} {...form.register("end_date")} />}
            </Field>
          </div>

          <Controller
            control={form.control}
            name="schedule.weekdays"
            render={({ field, fieldState }) => (
              <ChoiceChips
                legend={t("days")}
                options={WEEKDAYS.map((d) => ({ value: d, label: formatWeekdays([d]) }))}
                value={field.value}
                onChange={(v) => field.onChange(WEEKDAYS.filter((d) => v.includes(d)))}
                error={fieldState.error?.message}
              />
            )}
          />

          <div className="grid gap-5 md:grid-cols-3">
            <Field label={t("startTime")} error={errors.schedule?.start_time?.message}>
              {(a) => <Input {...a} type="time" step={300} {...form.register("schedule.start_time")} />}
            </Field>
            <Field label={t("length")}>
              {(a) => (
                <Select {...a} {...form.register("schedule.duration_min")}>
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {formatDuration(d)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={t("timezone")} hint={t("timezoneHint")}>
              {(a) => (
                <Select {...a} {...form.register("schedule.timezone")}>
                  {zones.map((z) => (
                    <option key={z.zone} value={z.zone}>
                      {z.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          <Field label={t("deadline")} hint={t("deadlineHint")} error={errors.deadline_date?.message}>
            {(a) => <Input {...a} type="date" max={values.start_date || undefined} className="md:max-w-[280px]" {...form.register("deadline_date")} />}
          </Field>
        </fieldset>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label={t("capacity")} error={errors.capacity?.message} hint={cohort?.enrolled_count ? t("enrolledNow", { count: cohort.enrolled_count }) : undefined}>
            {(a) => <Input {...a} inputMode="numeric" {...form.register("capacity")} />}
          </Field>
          <Field label={t("minimum")} hint={t("minimumHint")} error={errors.min_enrolment?.message}>
            {(a) => <Input {...a} inputMode="numeric" placeholder={t("noMinimum")} {...form.register("min_enrolment")} />}
          </Field>
        </div>

        {plan && (
          <p role="status" className="flex items-start gap-3 rounded-sm bg-info-soft px-4 py-3 text-[15px] leading-relaxed text-heading">
            <CalendarDays aria-hidden="true" className="mt-1 size-5 shrink-0 text-primary" />
            {plan.firstSessionAt && values.schedule?.timezone
              ? t("preview", {
                  count: plan.count,
                  first: formatSessionTime(plan.firstSessionAt, values.schedule.timezone),
                  end: formatCalendarDate(values.end_date!),
                })
              : t("previewNone")}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("cancelEdit")}
          </Button>
          <Button type="submit" loading={save.isPending} disabled={editable === "NONE"}>
            {cohort ? t("save") : t("create")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
