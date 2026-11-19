"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { BackgroundStep } from "@/components/onboarding/steps/background-step";
import { GoalsStep } from "@/components/onboarding/steps/goals-step";
import { ProfileStep } from "@/components/onboarding/steps/profile-step";
import { useOnboardingGuard, useWizardStep } from "@/components/onboarding/use-wizard";
import { WizardFrame } from "@/components/onboarding/wizard-frame";
import { LoadingState } from "@/components/ui/spinner";
import { useDeferOnboarding, useOnboarding, useSubmitOnboarding } from "@/lib/api/hooks/onboarding";
import { LEARNER_STEPS } from "@/lib/api/schemas/onboarding";
import { ROLE_HOME } from "@/lib/auth/routes";

/** ONB-2 learner wizard. Every step saves, so leaving and coming back resumes it (ONB-6). */
export function LearnerWizard() {
  const t = useTranslations("onboarding");
  const router = useRouter();
  // While finishing, this page does the redirect itself; the guard would race it.
  const [finishing, setFinishing] = useState(false);
  const user = useOnboardingGuard("LEARNER", { allowCompleted: finishing });
  const onboarding = useOnboarding();
  const wizard = useWizardStep(LEARNER_STEPS, onboarding.data?.completed_steps);
  const defer = useDeferOnboarding();
  const submit = useSubmitOnboarding();
  const destination = wizard.nextParam ?? ROLE_HOME.LEARNER;

  if (!user || !onboarding.data) return <LoadingState />;
  const state = onboarding.data;

  const later = () =>
    defer.mutate(undefined, {
      onSuccess: () => {
        toast.success(t("laterToast"));
        router.replace(destination);
      },
      onError: () => toast.error(t("laterFailed")),
    });

  const finish = () => {
    setFinishing(true);
    submit.mutate(undefined, {
      onSuccess: () => {
        toast.success(t("learner.doneToast"));
        router.replace(destination);
      },
      onError: (err) => {
        setFinishing(false);
        toast.error(err.message);
      },
    });
  };

  const steps = LEARNER_STEPS.map((key) => ({ key, title: t(`learner.steps.${key}`) }));
  const common = { state, onBack: wizard.back, onLater: later };

  return (
    <WizardFrame
      title={t("learner.title")}
      intro={t("learner.intro")}
      steps={steps}
      current={wizard.current}
      completed={state.completed_steps}
      onGoTo={(k) => wizard.goTo(k as (typeof LEARNER_STEPS)[number])}
    >
      {wizard.current === "profile" && <ProfileStep {...common} onDone={wizard.next} />}
      {wizard.current === "goals" && <GoalsStep {...common} onDone={wizard.next} />}
      {wizard.current === "background" && (
        <BackgroundStep {...common} onDone={finish} submitLabel={t("learner.finish")} pending={submit.isPending} />
      )}
    </WizardFrame>
  );
}
