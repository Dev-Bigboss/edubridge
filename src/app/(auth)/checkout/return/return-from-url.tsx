"use client";

import { useSearchParams } from "next/navigation";
import { CheckoutReturn } from "@/components/checkout/checkout-return";
import { RequireRole } from "@/components/layout/require-role";

export function ReturnFromUrl() {
  const paymentId = useSearchParams().get("payment_id");
  return <RequireRole role="LEARNER">{() => <CheckoutReturn paymentId={paymentId} />}</RequireRole>;
}
