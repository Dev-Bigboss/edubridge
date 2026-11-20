import type { Metadata } from "next";
import { Requests } from "@/components/teach/requests";

export const metadata: Metadata = { title: "Session requests" };

export default function Page() {
  return <Requests />;
}
