import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui/spinner";
import { ReturnFromUrl } from "./return-from-url";

export const metadata: Metadata = { title: "Payment" };

export default function CheckoutReturnPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ReturnFromUrl />
    </Suspense>
  );
}
