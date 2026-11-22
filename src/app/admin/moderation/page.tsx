import type { Metadata } from "next";
import { Suspense } from "react";
import { ModerationAdmin } from "@/components/admin/moderation-admin";
import { LoadingState } from "@/components/ui/spinner";

export const metadata: Metadata = { title: "Moderation" };

export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ModerationAdmin />
    </Suspense>
  );
}
