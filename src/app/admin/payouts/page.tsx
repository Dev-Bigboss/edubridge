import type { Metadata } from "next";
import { PayoutsAdmin } from "@/components/admin/payouts-admin";

export const metadata: Metadata = { title: "Payouts and reconciliation" };

export default function Page() {
  return <PayoutsAdmin />;
}
