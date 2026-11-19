"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export type WizardStep = { key: string; title: string };

/** Progress rail (desktop), compact progress bar (mobile) and the active step's card. */
export function WizardFrame({
  title,
  intro,
  steps,
  current,
  completed,
  onGoTo,
  children,
}: {
  title: string;
  intro: string;
  steps: WizardStep[];
  current: string;
  completed: string[];
  onGoTo: (key: string) => void;
  children: ReactNode;
}) {
  const t = useTranslations("onboarding");
  const index = Math.max(0, steps.findIndex((s) => s.key === current));
  const step = steps[index];

  return (
    <div className="w-full max-w-[960px]">
      <header className="mb-8">
        <h1 className="mb-2 text-page">{title}</h1>
        <p className="max-w-[60ch] leading-relaxed">{intro}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <nav aria-label={t("progress")} className="hidden lg:block">
          <ol className="space-y-1">
            {steps.map((s, i) => {
              const done = completed.includes(s.key);
              const active = s.key === current;
              // You can jump back to any finished step, or to the next one you've reached.
              const reachable = done || i <= index || steps.slice(0, i).every((p) => completed.includes(p.key));
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    disabled={!reachable || active}
                    onClick={() => onGoTo(s.key)}
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "flex min-h-[48px] w-full items-center gap-3 rounded-sm px-3 text-left transition-colors duration-150",
                      active ? "bg-white font-medium text-heading shadow-[0_4px_14px_rgba(8,42,94,0.06)]" : "text-body",
                      reachable && !active && "hover:bg-white/70 hover:text-heading",
                      !reachable && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                        done ? "border-success-fill bg-success-fill text-white" : active ? "border-primary text-primary" : "border-border",
                      )}
                    >
                      {done ? <Check aria-hidden="true" className="size-4" /> : i + 1}
                    </span>
                    <span>
                      {s.title}
                      {done && <span className="sr-only"> ({t("stepDone")})</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <section aria-labelledby="step-title" className="min-w-0">
          <div className="mb-4 lg:hidden">
            <p className="mb-2 text-sm font-medium text-heading">
              {t("stepOf", { current: index + 1, total: steps.length })}
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
              <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
            </div>
          </div>
          <div className="rounded-md border border-border bg-white p-6 shadow-[0_10px_30px_rgba(8,42,94,0.06)] md:p-8">
            <h2 id="step-title" className="mb-6 text-section">
              {step.title}
            </h2>
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}

/** Back / finish later / save and continue, in that order on wide screens; primary first on phones. */
export function StepActions({
  onBack,
  onLater,
  laterLabel,
  submitLabel,
  pending,
}: {
  onBack?: () => void;
  onLater?: () => void;
  laterLabel?: string;
  submitLabel?: string;
  pending: boolean;
}) {
  const t = useTranslations("onboarding");
  return (
    <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
      {onBack && (
        <Button type="button" variant="ghost" onClick={onBack} disabled={pending}>
          {t("back")}
        </Button>
      )}
      <div className="flex flex-col-reverse gap-3 sm:ml-auto sm:flex-row sm:items-center">
        {onLater && (
          <Button type="button" variant="link" onClick={onLater} disabled={pending}>
            {laterLabel ?? t("finishLater")}
          </Button>
        )}
        <Button type="submit" loading={pending}>
          {pending ? t("saving") : (submitLabel ?? t("saveAndContinue"))}
        </Button>
      </div>
    </div>
  );
}
