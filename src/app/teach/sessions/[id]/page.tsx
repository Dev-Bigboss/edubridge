import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui/spinner";
import { SessionFromUrl } from "./session-from-url";

export const metadata: Metadata = { title: "Attendance" };

export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <SessionFromUrl />
    </Suspense>
  );
}
