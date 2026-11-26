import type { Metadata } from "next";
import { AvailabilityEditor } from "@/components/teach/availability-editor";

export const metadata: Metadata = { title: "Availability" };

export default function Page() {
  return <AvailabilityEditor />;
}
