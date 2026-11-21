import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui/spinner";
import { RecordingFromUrl } from "./recording-from-url";

export const metadata: Metadata = { title: "Recording" };

export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <RecordingFromUrl />
    </Suspense>
  );
}
