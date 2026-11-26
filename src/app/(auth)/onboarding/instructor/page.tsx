import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui/spinner";
import { InstructorWizard } from "./instructor-wizard";

export const metadata: Metadata = { title: "Set up your teaching profile" };

export default function InstructorOnboardingPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <InstructorWizard />
    </Suspense>
  );
}
