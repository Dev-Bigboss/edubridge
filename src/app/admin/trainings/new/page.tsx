import type { Metadata } from "next";
import { TrainingEditor } from "@/components/admin/training-editor";

export const metadata: Metadata = { title: "New training" };

export default function NewTrainingPage() {
  return <TrainingEditor id={null} />;
}
