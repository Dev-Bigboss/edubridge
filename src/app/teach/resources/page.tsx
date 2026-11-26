import type { Metadata } from "next";
import { Suspense } from "react";
import { TeachResources } from "@/components/resources/teach-resources";
import { LoadingState } from "@/components/ui/spinner";

export const metadata: Metadata = { title: "Resources" };

export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <TeachResources />
    </Suspense>
  );
}
