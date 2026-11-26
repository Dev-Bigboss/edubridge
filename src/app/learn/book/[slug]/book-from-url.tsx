"use client";

import { useParams } from "next/navigation";
import { BookSession } from "@/components/booking/book-session";
import { LoadingState } from "@/components/ui/spinner";
import { useSession } from "@/lib/auth/session";

export function BookFromUrl() {
  const { slug } = useParams<{ slug: string }>();
  const { data: user } = useSession();
  return user ? <BookSession slug={slug} user={user} /> : <LoadingState />;
}
