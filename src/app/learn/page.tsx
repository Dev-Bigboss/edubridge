import type { Metadata } from "next";
import { DashboardHome } from "@/components/dashboard/dashboard-home";

export const metadata: Metadata = { title: "Learner dashboard" };

export default function Page() {
  return <DashboardHome area="learner" />;
}
