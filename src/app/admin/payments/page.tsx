import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentsAdmin } from "@/components/admin/payments-admin";
import { LoadingState } from "@/components/ui/spinner";

export const metadata: Metadata = { title: "Payments and refunds" };

export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PaymentsAdmin />
    </Suspense>
  );
}
