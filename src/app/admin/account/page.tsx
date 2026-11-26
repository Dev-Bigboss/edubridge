import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountSettings } from "@/components/account/account-settings";
import { LoadingState } from "@/components/ui/spinner";

export const metadata: Metadata = { title: "Account settings" };

export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <AccountSettings />
    </Suspense>
  );
}
