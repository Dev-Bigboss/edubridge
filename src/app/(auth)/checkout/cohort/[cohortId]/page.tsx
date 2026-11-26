import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui/spinner";
import { CheckoutFromUrl } from "./checkout-from-url";

export const metadata: Metadata = { title: "Checkout" };

export default function CohortCheckoutPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CheckoutFromUrl />
    </Suspense>
  );
}
