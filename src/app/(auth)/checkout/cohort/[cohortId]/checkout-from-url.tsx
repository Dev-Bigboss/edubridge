"use client";

import { useParams } from "next/navigation";
import { CohortCheckout } from "@/components/checkout/cohort-checkout";
import { RequireRole } from "@/components/layout/require-role";

/** Learners only; a guest is sent to sign in and brought back here (COH-2). */
export function CheckoutFromUrl() {
  const { cohortId } = useParams<{ cohortId: string }>();
  return <RequireRole role="LEARNER">{(user) => <CohortCheckout cohortId={cohortId} user={user} />}</RequireRole>;
}
