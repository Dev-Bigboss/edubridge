import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui/spinner";
import { ReceiptFromUrl } from "./receipt-from-url";

export const metadata: Metadata = { title: "Receipt", robots: { index: false } };

/** Outside the dashboard shell so it prints as a clean page. */
export default function ReceiptPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ReceiptFromUrl />
    </Suspense>
  );
}
