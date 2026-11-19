import type { ReactNode } from "react";

/** Compact tool header: title, one line of context, and the page's primary action on the right. */
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[28px]">{title}</h1>
        {description && <p className="mt-1 max-w-[70ch] leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/**
 * Wraps a table so a wide one scrolls inside its card instead of widening the page.
 * `relative` matters: without it, visually hidden (absolutely positioned) header text escapes
 * the scroll box and makes the whole page wider than a phone screen.
 */
export function TableCard({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div role="region" aria-label={label} tabIndex={0} className="relative overflow-x-auto rounded-md border border-border bg-white focus-visible:outline-2 focus-visible:outline-primary">
      {children}
    </div>
  );
}

export const th = "px-4 py-3 text-left font-heading text-sm font-medium whitespace-nowrap text-heading";
export const td = "px-4 py-3 align-middle";
