"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { groupByLocalDay } from "@/lib/domain/slots";
import { formatInZone } from "@/lib/domain/time";

/**
 * Days that have free times, then the times on the chosen day, in `zone` (OTO-2). Both rows
 * are radio groups, so arrow keys and screen readers work as people expect.
 */
export function SlotPicker({ slots, zone, value, onChange }: { slots: string[]; zone: string; value: string | null; onChange: (start: string) => void }) {
  const t = useTranslations("booking");
  const days = useMemo(() => groupByLocalDay(slots, zone), [slots, zone]);
  const [day, setDay] = useState<string | null>(null);
  const selected = days.find((d) => d.date === day) ?? days.find((d) => value && d.starts.includes(value)) ?? days[0];
  if (!selected) return null;

  return (
    <>
      <div role="radiogroup" aria-label={t("day")} className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-2">
        {days.map((d) => {
          const active = d.date === selected.date;
          const date = new Date(`${d.date}T12:00:00Z`);
          return (
            <button
              key={d.date}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}, ${t("timesCount", { count: d.starts.length })}`}
              onClick={() => setDay(d.date)}
              className={cn(
                "flex min-w-[76px] shrink-0 flex-col items-center rounded-md border px-3 py-2 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-primary",
                active ? "border-primary bg-primary text-white" : "border-border bg-white text-heading hover:border-body/50",
              )}
            >
              <span className="text-xs uppercase">{date.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })}</span>
              <span className="font-heading text-lg font-semibold">{date.getUTCDate()}</span>
              <span className="text-xs">{date.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })}</span>
            </button>
          );
        })}
      </div>
      <div role="radiogroup" aria-label={t("time")} className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {selected.starts.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={value === s}
            onClick={() => onChange(s)}
            className={cn(
              "min-h-11 rounded-sm border text-[15px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-primary",
              value === s ? "border-primary bg-primary font-medium text-white" : "border-border bg-white text-heading hover:border-primary",
            )}
          >
            {formatInZone(s, zone, "HH:mm")}
          </button>
        ))}
      </div>
    </>
  );
}
