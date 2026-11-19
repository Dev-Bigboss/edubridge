import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Every empty list says why it's empty and what to do next. No dead ends. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-md border border-dashed border-border bg-surface-1 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-white text-primary shadow-[0_10px_20px_rgba(222,231,243,0.5)]">
        <Icon aria-hidden="true" className="size-6" />
      </span>
      <h3 className="mb-1 text-lg">{title}</h3>
      <p className="mb-5 max-w-md leading-relaxed">{description}</p>
      {action}
    </div>
  );
}
