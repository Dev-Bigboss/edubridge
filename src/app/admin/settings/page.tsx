import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsAdmin } from "@/components/admin/settings-admin";
import { LoadingState } from "@/components/ui/spinner";

export const metadata: Metadata = { title: "Platform settings" };

export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <SettingsAdmin />
    </Suspense>
  );
}
