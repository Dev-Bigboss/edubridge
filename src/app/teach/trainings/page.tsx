import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "My trainings" };

/**
 * /teach/trainings (COH-1, RES-1): placeholder until the PO decides whether instructors
 * can create cohorts themselves. The nav is visible but this page is not yet built.
 */
export default function TeachTrainingsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="My trainings"
        description="Trainings you teach, with their cohorts and resources."
      />
      <EmptyState
        icon={GraduationCap}
        title="Coming soon"
        description="This page is in progress. Check back once your programme coordinator confirms how cohorts are assigned."
        action={
          <Button asChild variant="outline">
            <Link href="/teach/schedule">Go to your schedule</Link>
          </Button>
        }
      />
    </div>
  );
}
