"use client";

import { useParams } from "next/navigation";
import { RequireRole } from "@/components/layout/require-role";
import { Receipt } from "@/components/learner/receipt";

export function ReceiptFromUrl() {
  const { paymentId } = useParams<{ paymentId: string }>();
  return <RequireRole role="LEARNER">{(user) => <Receipt paymentId={paymentId} user={user} />}</RequireRole>;
}
