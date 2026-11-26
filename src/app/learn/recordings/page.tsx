import type { Metadata } from "next";
import { Suspense } from "react";
import { LearnerRecordings } from "@/components/recordings/learner-list";
import { LoadingState } from "@/components/ui/spinner";

export const metadata: Metadata = { title: "Recordings" };

export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <LearnerRecordings />
    </Suspense>
  );
}
