import type { Metadata } from "next";
import { PaymentsHistory } from "@/components/learner/payments-history";

export const metadata: Metadata = { title: "Payments" };

export default function Page() {
  return <PaymentsHistory />;
}
