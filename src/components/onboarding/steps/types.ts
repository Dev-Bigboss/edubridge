import type { OnboardingState } from "@/lib/api/schemas/onboarding";

export type StepProps = {
  state: OnboardingState;
  /** Called after the step saved successfully. */
  onDone: () => void;
  onBack?: () => void;
  onLater?: () => void;
};
