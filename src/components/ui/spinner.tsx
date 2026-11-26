import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <>
      <LoaderCircle aria-hidden="true" className={cn("size-5 animate-spin", className)} />
      {label && <span className="sr-only">{label}</span>}
    </>
  );
}

/** Full-area loading state with a visible label, for route-level waits. */
export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-body">
      <Spinner className="size-7 text-primary" />
      <p className="text-sm">{label}…</p>
    </div>
  );
}
