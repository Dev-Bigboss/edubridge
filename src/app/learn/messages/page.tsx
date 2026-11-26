import type { Metadata } from "next";
import { Suspense } from "react";
import { MessagesPage } from "@/components/messages/messages-page";
import { LoadingState } from "@/components/ui/spinner";

export const metadata: Metadata = { title: "Messages" };

export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <MessagesPage base="/learn/messages" />
    </Suspense>
  );
}
