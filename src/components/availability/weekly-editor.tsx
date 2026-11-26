"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFieldArray, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import type { AvailabilityInput } from "@/lib/api/schemas/onboarding";
import { cn } from "@/lib/cn";

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

/**
 * Weekly recurring availability (OTO-1). One flat list of slots underneath, shown grouped by day,
 * so validation paths like `weekly.3.end` from the API land on the right row.
 */
export function WeeklyEditor({
  control,
  register,
  errors,
}: {
  control: Control<AvailabilityInput>;
  register: UseFormRegister<AvailabilityInput>;
  errors: FieldErrors<AvailabilityInput>;
}) {
  const t = useTranslations("availability");
  const { fields, append, remove } = useFieldArray({ control, name: "weekly" });

  return (
    <div className="divide-y divide-border rounded-sm border border-border">
      {DAYS.map((day) => {
        const rows = fields.map((f, index) => ({ ...f, index })).filter((f) => f.weekday === day);
        const dayName = t(`days.${day}`);
        return (
          <fieldset key={day} className="grid gap-3 p-4 md:grid-cols-[120px_1fr] md:items-start">
            <legend className="sr-only">{dayName}</legend>
            <p aria-hidden="true" className="pt-2.5 font-heading font-medium text-heading">
              {dayName}
            </p>
            <div className="space-y-2">
              {rows.length === 0 && <p className="pt-2.5 text-body">{t("unavailable")}</p>}
              {rows.map((r) => {
                const err = errors.weekly?.[r.index];
                const message = err?.start?.message ?? err?.end?.message;
                return (
                  <div key={r.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="time"
                        step={1800}
                        aria-label={t("from", { day: dayName })}
                        aria-invalid={err?.start ? true : undefined}
                        className={cn(inputClass, "h-11 w-[132px]")}
                        {...register(`weekly.${r.index}.start`)}
                      />
                      <span aria-hidden="true">–</span>
                      <input
                        type="time"
                        step={1800}
                        aria-label={t("to", { day: dayName })}
                        aria-invalid={err?.end ? true : undefined}
                        className={cn(inputClass, "h-11 w-[132px]")}
                        {...register(`weekly.${r.index}.end`)}
                      />
                      <Button type="button" variant="ghost" size="icon" aria-label={t("remove", { day: dayName })} onClick={() => remove(r.index)}>
                        <Trash2 aria-hidden="true" className="size-4" />
                      </Button>
                    </div>
                    {message && <p className="mt-1 text-sm text-danger">{message}</p>}
                  </div>
                );
              })}
              <Button
                type="button"
                variant="link"
                className="min-h-11"
                onClick={() => {
                  const last = rows.at(-1);
                  // Suggest the slot after the last one, else a sensible working-hours default.
                  append(last ? { weekday: day, start: last.end, end: last.end < "22:00" ? addHours(last.end, 2) : "23:30" } : { weekday: day, start: "09:00", end: "17:00" });
                }}
              >
                <Plus aria-hidden="true" className="size-4" /> {t("add")}
              </Button>
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

function addHours(hhmm: string, hours: number) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${String(Math.min(23, h + hours)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
