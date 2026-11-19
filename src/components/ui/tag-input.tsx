"use client";

import { X } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { inputClass } from "./field";

/** Free-text tags: type and press Enter or comma. Each tag has its own remove button. */
export function TagInput({
  label,
  value,
  onChange,
  max,
  error,
  hint,
  placeholder,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  max: number;
  error?: string;
  hint?: string;
  placeholder?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const full = value.length >= max;

  /** Adds each new, non-duplicate tag up to the limit. */
  const commit = (raw: string[]) => {
    const next = [...value];
    for (const r of raw) {
      const tag = r.trim().slice(0, 40);
      if (tag && next.length < max && !next.some((v) => v.toLowerCase() === tag.toLowerCase())) next.push(tag);
    }
    if (next.length !== value.length) onChange(next);
  };
  const add = () => {
    commit([draft]);
    setDraft("");
  };

  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="font-heading text-[15px] font-medium text-heading">
        {label}
      </label>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={`${label}: ${value.length} added`}>
          {value.map((tag) => (
            <li key={tag} className="inline-flex items-center gap-1 rounded-full bg-surface-2 py-1 pr-1 pl-3 text-[15px] text-heading">
              {tag}
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== tag))}
                aria-label={`Remove ${tag}`}
                className="flex size-8 items-center justify-center rounded-full hover:bg-white"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        id={id}
        value={draft}
        disabled={full}
        placeholder={full ? `Limit of ${max} reached` : placeholder}
        onChange={(e) => {
          // Typing or pasting "a, b, c" adds a and b and keeps c in the box.
          const parts = e.target.value.split(",");
          const rest = parts.pop() ?? "";
          if (parts.length) commit(parts);
          setDraft(rest);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={add}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(inputClass)}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="text-sm leading-relaxed">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
