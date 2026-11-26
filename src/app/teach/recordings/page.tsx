import type { Metadata } from "next";
import { TeachRecordings } from "@/components/recordings/teach-recordings";

export const metadata: Metadata = { title: "Recordings" };

export default function Page() {
  return <TeachRecordings />;
}
