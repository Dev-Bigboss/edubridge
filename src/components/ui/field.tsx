import { CircleAlert } from "lucide-react";
import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export const inputClass = cn(
  "block h-12 w-full rounded-sm border border-border bg-white px-4 text-[16px] text-heading",
  "placeholder:text-body/60 transition-colors duration-150",
  "hover:border-body/50 focus:border-primary focus:outline-2 focus:outline-offset-0 focus:outline-primary/25",
  "disabled:cursor-not-allowed disabled:bg-surface-1 disabled:text-body/70",
  "aria-invalid:border-danger aria-invalid:focus:outline-danger/25",
);

type FieldProps = {
  label: string;
  error?: string;
  hint?: ReactNode;
  className?: string;
  /** Renders the control. Receives the ids/aria props to spread onto the input. */
  children: (control: {
    id: string;
    "aria-invalid": true | undefined;
    "aria-describedby": string | undefined;
  }) => ReactNode;
  labelAction?: ReactNode;
};

/** Label + control + hint + inline error, wired for screen readers (aria-invalid, aria-describedby). */
export function Field({ label, error, hint, className, children, labelAction }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="font-heading text-[15px] font-medium text-heading">
          {label}
        </label>
        {labelAction}
      </div>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {hint && !error && (
        <p id={hintId} className="text-sm leading-relaxed text-body">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-sm leading-relaxed text-danger">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...props} />;
}
