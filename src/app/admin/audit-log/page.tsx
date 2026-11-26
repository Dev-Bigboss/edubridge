import type { Metadata } from "next";
import { Suspense } from "react";
import { AuditLog } from "@/components/admin/audit-log";
import { LoadingState } from "@/components/ui/spinner";

export const metadata: Metadata = { title: "Audit log" };

export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <AuditLog />
    </Suspense>
  );
}
