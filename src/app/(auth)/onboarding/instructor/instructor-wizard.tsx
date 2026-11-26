"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CircleCheck, CircleDashed, Hourglass } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/auth/auth-card";
import { AvailabilityStep } from "@/components/onboarding/steps/availability-step";
import { ExpertiseStep } from "@/components/onboarding/steps/expertise-step";
import { PayoutStep } from "@/components/onboarding/steps/payout-step";
import { ProfileStep } from "@/components/onboarding/steps/profile-step";
import { VerificationStep } from "@/components/onboarding/steps/verification-step";
import { useOnboardingGuard, useWizardStep } from "@/components/onboarding/use-wizard";
import { StepActions, WizardFrame } from "@/components/onboarding/wizard-frame";
import { buttonVariants } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/spinner";
import { onboardingKey, useOnboarding, useSubmitOnboarding } from "@/lib/api/hooks/onboarding";
import { INSTRUCTOR_STEPS } from "@/lib/api/schemas/onboarding";

const STEPS = [...INSTRUCTOR_STEPS, "review"] as const;
type Step = (typeof STEPS)[number];

/** ONB-3 instructor wizard. Ends in "submitted for review"; an admin approves before publishing. */
export function InstructorWizard() {
  const t = useTranslations("onboarding");
  const qc = useQueryClient();
  const params = useSearchParams();
  const [submitted, setSubmitted] = useState(false);
  const user = useOnboardingGuard("INSTRUCTOR", { allowCompleted: submitted });
  const onboarding = useOnboarding();
  const wizard = useWizardStep(STEPS, onboarding.data?.completed_steps);
  const announced = useRef(false);

  // Back from Stripe: refresh the payout status and say so once.
  useEffect(() => {
    if (params.get("payout") !== "return" || announced.current) return;
    announced.current = true;
    void qc.invalidateQueries({ queryKey: onboardingKey });
    toast.success(t("payout.returned"));
  }, [params, qc, t]);

  if (submitted) return <Submitted />;
  if (!user || !onboarding.data) return <LoadingState />;
  const state = onboarding.data;
  const steps = STEPS.map((key) => ({ key, title: t(`instructor.steps.${key}`) }));
  const common = { state, onBack: wizard.back, onDone: wizard.next };

  return (
    <WizardFrame
      title={t("instructor.title")}
      intro={t("instructor.intro")}
      steps={steps}
      current={wizard.current}
      completed={state.completed_steps}
      onGoTo={(k) => wizard.goTo(k as Step)}
    >
      {wizard.current === "profile" && <ProfileStep {...common} instructor />}
      {wizard.current === "expertise" && <ExpertiseStep {...common} />}
      {wizard.current === "verification" && <VerificationStep {...common} />}
      {wizard.current === "payout" && <PayoutStep {...common} />}
      {wizard.current === "availability" && <AvailabilityStep {...common} />}
      {wizard.current === "review" && (
        <Review completed={state.completed_steps} onEdit={(k) => wizard.goTo(k)} onBack={wizard.back} onSubmitted={() => setSubmitted(true)} />
      )}
    </WizardFrame>
  );
}

function Review({
  completed,
  onEdit,
  onBack,
  onSubmitted,
}: {
  completed: string[];
  onEdit: (step: Step) => void;
  onBack?: () => void;
  onSubmitted: () => void;
}) {
  const t = useTranslations("onboarding");
  const submit = useSubmitOnboarding();
  const [formError, setFormError] = useState<string | null>(null);
  const missing = INSTRUCTOR_STEPS.filter((s) => !completed.includes(s));

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setFormError(null);
        submit.mutate(undefined, { onSuccess: onSubmitted, onError: (err) => setFormError(err.message) });
      }}
      className="space-y-5"
    >
      <FormError message={formError ?? (missing.length ? t("review.missing") : null)} />
      <p className="leading-relaxed">{t("review.intro")}</p>
      <ul className="divide-y divide-border rounded-sm border border-border">
        {INSTRUCTOR_STEPS.map((s) => {
          const done = completed.includes(s);
          return (
            <li key={s} className="flex min-h-[56px] items-center gap-3 px-4 py-2">
              {done ? (
                <CircleCheck aria-hidden="true" className="size-5 shrink-0 text-success" />
              ) : (
                <CircleDashed aria-hidden="true" className="size-5 shrink-0 text-danger" />
              )}
              <span className="flex-1 text-heading">
                {t(`instructor.steps.${s}`)}
                <span className="sr-only">: {done ? t("stepDone") : t("stepTodo")}</span>
              </span>
              <button type="button" onClick={() => onEdit(s)} className="min-h-11 px-2 font-medium text-primary underline-offset-4 hover:underline">
                {done ? t("review.edit") : t("review.finish")}
                <span className="sr-only"> {t(`instructor.steps.${s}`)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {missing.length === 0 ? (
        <StepActions onBack={onBack} pending={submit.isPending} submitLabel={t("review.submit")} />
      ) : (
        onBack && (
          <div className="mt-8 border-t border-border pt-6">
            <button type="button" onClick={onBack} className="min-h-11 font-medium text-heading">
              {t("back")}
            </button>
          </div>
        )
      )}
    </form>
  );
}

function Submitted() {
  const t = useTranslations("onboarding.submitted");
  return (
    <div className="w-full max-w-[560px] rounded-md border border-border bg-white p-8 text-center shadow-[0_10px_30px_rgba(8,42,94,0.06)]">
      <span className="mb-4 inline-flex size-16 items-center justify-center rounded-full bg-surface-2 text-primary">
        <Hourglass aria-hidden="true" className="size-7" />
      </span>
      <h1 className="mb-3 text-page">{t("title")}</h1>
      <p className="mb-6 leading-relaxed">{t("body")}</p>
      <Link href="/teach" className={buttonVariants({ variant: "primary" })}>
        {t("cta")}
      </Link>
    </div>
  );
}
