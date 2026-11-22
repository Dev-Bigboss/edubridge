import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui/spinner";
import { CohortFromUrl } from "./cohort-from-url";

export const metadata: Metadata = { title: "Cohort" };

export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CohortFromUrl />
    </Suspense>
  );
}
