import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui/spinner";
import { TrainingFromUrl } from "./training-from-url";

export const metadata: Metadata = { title: "Training" };

/**
 * Read on the client because the mock API only exists in the browser. Once the backend is live,
 * this can fetch on the server for search engines and set the title from the training.
 */
export default function TrainingPage() {
  return (
    <Suspense fallback={<div className="pt-32"><LoadingState /></div>}>
      <TrainingFromUrl />
    </Suspense>
  );
}
