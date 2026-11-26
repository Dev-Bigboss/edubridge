import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui/spinner";
import { GoogleCallback } from "./google-callback";

export const metadata: Metadata = { title: "Signing you in" };

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <GoogleCallback />
    </Suspense>
  );
}
