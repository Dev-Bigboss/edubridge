import type { Metadata } from "next";
import { Earnings } from "@/components/teach/earnings";

export const metadata: Metadata = { title: "Earnings" };

export default function Page() {
  return <Earnings />;
}
