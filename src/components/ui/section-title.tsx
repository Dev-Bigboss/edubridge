import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** The pale-blue chip above section titles in the original theme ("About EduBridge"). */
export function Eyebrow({ children, className, light }: { children: ReactNode; className?: string; light?: boolean }) {
  return (
    <span
      className={cn(
        "mb-3 inline-block rounded-[4px] px-[15px] py-[7px] font-medium leading-none",
        light ? "bg-white/15 text-white" : "bg-surface-2 text-primary",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** The yellow hand-drawn underline under a highlighted word (title_shape.svg in the original). */
export function Highlight({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-block whitespace-nowrap">
      <svg
        aria-hidden="true"
        viewBox="0 0 145 25"
        fill="none"
        preserveAspectRatio="none"
        className="pointer-events-none absolute -bottom-3.5 left-1/2 -z-10 h-[25px] w-[105%] -translate-x-1/2 text-accent"
      >
        <path d="M1.00016 15.2711C18.1407 8.34427 70.832 -1.93441 144.473 12.3652" stroke="currentColor" strokeWidth="4" />
        <path d="M26.2943 14.0041C38.9177 9.44643 77.3772 3.50055 130.227 16.1786" stroke="currentColor" strokeWidth="2" />
      </svg>
      {children}
    </span>
  );
}

export function SectionTitle({
  eyebrow,
  children,
  className,
  light,
  as: Tag = "h2",
}: {
  eyebrow?: string;
  children: ReactNode;
  className?: string;
  light?: boolean;
  as?: "h1" | "h2";
}) {
  return (
    <div className={className}>
      {eyebrow && <Eyebrow light={light}>{eyebrow}</Eyebrow>}
      <Tag
        className={cn(
          "relative isolate text-[28px] leading-[1.32] tracking-[-1px] md:text-page",
          light && "text-white",
        )}
      >
        {children}
      </Tag>
    </div>
  );
}
