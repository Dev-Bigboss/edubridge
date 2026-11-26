import type { Metadata } from "next";
import { Schedule } from "@/components/teach/schedule";

export const metadata: Metadata = { title: "Schedule" };

export default function Page() {
  return <Schedule />;
}
