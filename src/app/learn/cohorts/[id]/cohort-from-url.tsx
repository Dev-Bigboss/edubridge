"use client";

import { useParams } from "next/navigation";
import { CohortSpacePage } from "@/components/messages/cohort-space";

export function CohortFromUrl() {
  const { id } = useParams<{ id: string }>();
  return <CohortSpacePage id={decodeURIComponent(id)} area="learn" />;
}
