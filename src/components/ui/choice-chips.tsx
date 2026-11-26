"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Multi-select as a group of checkbox pills. Real checkboxes underneath, so it works with
 * keyboard (Tab, Space) and screen readers without extra ARIA.
 */
export function ChoiceChips({
  legend,
  options,
  value,
  onChange,
  error,
  hint,
}: {
  legend: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
  hint?: string;
}) {
  const errorId = `${legend.replace(/\W+/g, "-").toLowerCase()}-error`;
  return (
    <fieldset aria-describedby={error ? errorId : undefined} aria-invalid={error ? true : undefined}>
      <legend className="mb-1.5 font-heading text-[15px] font-medium text-heading">{legend}</legend>
      {hint && <p className="mb-2 text-sm leading-relaxed">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const checked = value.includes(o.value);
          return (
            <label
              key={o.value}
              className={cn(
                "inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border px-4 text-[15px] transition-colors duration-150",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary has-[:focus-visible]:ring-offset-2",
                checked ? "border-primary bg-surface-2 text-heading" : "border-border bg-white hover:border-body/50",
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={(e) => onChange(e.target.checked ? [...value, o.value] : value.filter((v) => v !== o.value))}
              />
              {checked && <Check aria-hidden="true" className="size-4 text-primary" />}
              {o.label}
            </label>
          );
        })}
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
