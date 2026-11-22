"use client";

import { Star } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/cn";
import { ratingLabel } from "@/lib/domain/reviews";

/** Read-only stars; the number in words is what screen readers get. */
export function Stars({ value, className, size = "md" }: { value: number; className?: string; size?: "sm" | "md" }) {
  const box = size === "sm" ? "size-4" : "size-5";
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      <span className="sr-only">{ratingLabel(value)}</span>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.max(0, Math.min(1, value - n + 1));
        return (
          <span key={n} aria-hidden="true" className={cn("relative inline-block", box)}>
            <Star className={cn("absolute inset-0 text-border", box)} />
            {fill > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star className={cn("fill-accent text-[#b77c00]", box)} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

const WORDS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

/** 1–5 stars as real radio buttons: arrow keys move between them, the label says the number and a word. */
export function StarInput({ legend, value, onChange, error }: { legend: string; value: number; onChange: (n: number) => void; error?: string }) {
  const id = useId();
  return (
    <fieldset aria-describedby={error ? `${id}-err` : undefined}>
      <legend className="mb-1.5 font-heading text-[15px] font-medium text-heading">{legend}</legend>
      <div className="flex flex-wrap items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="flex size-11 cursor-pointer items-center justify-center rounded-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary hover:bg-surface-1">
            <input type="radio" name={id} value={n} checked={value === n} onChange={() => onChange(n)} className="sr-only" aria-label={`${n} ${n === 1 ? "star" : "stars"}, ${WORDS[n]}`} />
            <Star aria-hidden="true" className={cn("size-7", n <= value ? "fill-accent text-[#b77c00]" : "text-body/60")} />
          </label>
        ))}
        <span className="ml-2 min-w-[5rem] text-[15px] text-heading" aria-hidden="true">
          {value ? WORDS[value] : ""}
        </span>
      </div>
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
