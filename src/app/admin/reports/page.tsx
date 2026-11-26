import type { Metadata } from "next";
import { ReportsAdmin } from "@/components/admin/reports-admin";

export const metadata: Metadata = { title: "Reports" };

export default function Page() {
  return <ReportsAdmin />;
}
