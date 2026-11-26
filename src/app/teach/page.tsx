import type { Metadata } from "next";
import { TeachDashboardPage } from "@/components/teach/teach-dashboard-page";

export const metadata: Metadata = { title: "Instructor dashboard" };

export default function Page() {
  return <TeachDashboardPage />;
}
