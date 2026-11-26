import type { Metadata } from "next";
import { RubricsAdmin } from "@/components/admin/rubrics-admin";

export const metadata: Metadata = { title: "Feedback rubrics" };

export default function Page() {
  return <RubricsAdmin />;
}
