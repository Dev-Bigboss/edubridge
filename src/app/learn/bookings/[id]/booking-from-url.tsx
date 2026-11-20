"use client";

import { useParams } from "next/navigation";
import { BookingDetail } from "@/components/booking/booking-detail";
import { LoadingState } from "@/components/ui/spinner";
import { useSession } from "@/lib/auth/session";

export function BookingFromUrl() {
  const { id } = useParams<{ id: string }>();
  const { data: user } = useSession();
  return user ? <BookingDetail id={id} user={user} /> : <LoadingState />;
}
