import type { Metadata } from "next";
import { MyTrainings } from "@/components/learner/my-trainings";

export const metadata: Metadata = { title: "My trainings" };

export default function Page() {
  return <MyTrainings />;
}
