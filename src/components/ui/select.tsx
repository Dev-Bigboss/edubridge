import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { inputClass } from "./field";

/** Native select: best keyboard, screen reader and mobile picker support for long lists (countries, zones). */
export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(inputClass, "appearance-none pr-11", className)} {...props}>
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-body" />
    </div>
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClass, "h-auto min-h-[120px] py-3 leading-relaxed", className)} {...props} />;
}
