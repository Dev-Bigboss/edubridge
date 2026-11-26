import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui/spinner";
import { UserFromUrl } from "./user-from-url";

export const metadata: Metadata = { title: "User" };

export default function AdminUserPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <UserFromUrl />
    </Suspense>
  );
}
