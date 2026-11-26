import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui/spinner";
import { LearnerWizard } from "./learner-wizard";

export const metadata: Metadata = { title: "Set up your profile" };

export default function LearnerOnboardingPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <LearnerWizard />
    </Suspense>
  );
}
