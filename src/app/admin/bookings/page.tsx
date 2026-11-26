import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingsAdmin } from "@/components/admin/bookings-admin";
import { LoadingState } from "@/components/ui/spinner";

export const metadata: Metadata = { title: "Bookings" };

export default function AdminBookingsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <BookingsAdmin />
    </Suspense>
  );
}
