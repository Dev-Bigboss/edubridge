import type { Metadata } from "next";
import { Suspense } from "react";
import { CohortsAdmin } from "@/components/admin/cohorts-admin";
import { LoadingState } from "@/components/ui/spinner";

export const metadata: Metadata = { title: "Cohorts" };

export default function AdminCohortsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CohortsAdmin />
    </Suspense>
  );
}
