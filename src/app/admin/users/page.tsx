import type { Metadata } from "next";
import { Suspense } from "react";
import { UsersAdmin } from "@/components/admin/users-admin";
import { LoadingState } from "@/components/ui/spinner";

export const metadata: Metadata = { title: "Users" };

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <UsersAdmin />
    </Suspense>
  );
}
