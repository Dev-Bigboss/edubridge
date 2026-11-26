import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui/spinner";
import { EditTraining } from "./edit-training";

export const metadata: Metadata = { title: "Edit training" };

/** The id is read on the client inside Suspense, so the shell still prerenders (Cache Components). */
export default function EditTrainingPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <EditTraining />
    </Suspense>
  );
}
