import type { Metadata } from "next";
import { Suspense } from "react";
import { TrainingsAdmin } from "@/components/admin/trainings-admin";
import { LoadingState } from "@/components/ui/spinner";

export const metadata: Metadata = { title: "Trainings" };

export default function TrainingsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <TrainingsAdmin />
    </Suspense>
  );
}
