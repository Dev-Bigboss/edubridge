import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui/spinner";
import { BookingFromUrl } from "./booking-from-url";

export const metadata: Metadata = { title: "Session" };

export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <BookingFromUrl />
    </Suspense>
  );
}
