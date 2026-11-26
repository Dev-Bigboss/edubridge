"use client";

import { useParams } from "next/navigation";
import { TrainingDetail } from "@/components/catalog/training-detail";

export function TrainingFromUrl() {
  const { slug } = useParams<{ slug: string }>();
  return <TrainingDetail slug={slug} />;
}
