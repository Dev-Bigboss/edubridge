import type { Metadata } from "next";
import { PricingAdmin } from "@/components/admin/pricing-admin";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  return <PricingAdmin />;
}
