import type { Metadata } from "next";
import { DashboardHome } from "@/components/dashboard/dashboard-home";

export const metadata: Metadata = { title: "Admin dashboard" };

export default function Page() {
  return <DashboardHome area="admin" />;
}
