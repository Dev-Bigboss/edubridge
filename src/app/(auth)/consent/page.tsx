import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui/spinner";
import { ConsentForm } from "./consent-form";

export const metadata: Metadata = { title: "Review our terms" };

export default function ConsentPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ConsentForm />
    </Suspense>
  );
}
