import type { Metadata } from "next";
import { MyBookings } from "@/components/booking/my-bookings";

export const metadata: Metadata = { title: "One-on-one sessions" };

export default function Page() {
  return <MyBookings />;
}
