import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui/spinner";
import { GatewayFromUrl } from "./gateway-from-url";

export const metadata: Metadata = { title: "Test payment", robots: { index: false } };

/** Exists only in demo builds (NEXT_PUBLIC_API_MOCKING=on). With a real backend, Stripe hosts this page. */
export default function MockGatewayPage() {
  if (process.env.NEXT_PUBLIC_API_MOCKING !== "on") notFound();
  return (
    <Suspense fallback={<LoadingState />}>
      <GatewayFromUrl />
    </Suspense>
  );
}
