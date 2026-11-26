"use client";

import { useParams } from "next/navigation";
import { TrainingEditor } from "@/components/admin/training-editor";

export function EditTraining() {
  const { id } = useParams<{ id: string }>();
  return <TrainingEditor id={id} />;
}
