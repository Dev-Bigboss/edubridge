import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui/spinner";
import { BookFromUrl } from "./book-from-url";

export const metadata: Metadata = { title: "Book a session" };

/** Inside /learn, so guests are sent to sign in and brought back here. */
export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <BookFromUrl />
    </Suspense>
  );
}
