import type { Metadata } from "next";
import { Suspense } from "react";
import { LearnerFeedback } from "@/components/learner/learner-feedback";
import { LoadingState } from "@/components/ui/spinner";

export const metadata: Metadata = { title: "Feedback" };

export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <LearnerFeedback />
    </Suspense>
  );
}
