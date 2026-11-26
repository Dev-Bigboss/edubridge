"use client";

import { useSearchParams } from "next/navigation";
import { MockGateway } from "@/components/checkout/mock-gateway";

export function GatewayFromUrl() {
  return <MockGateway paymentId={useSearchParams().get("payment_id") ?? ""} />;
}
