import type { Metadata } from "next";
import { Suspense } from "react";
import { Catalogue } from "@/components/catalog/catalogue";
import { LoadingState } from "@/components/ui/spinner";

export const metadata: Metadata = {
  title: "Browse trainings",
  description: "Live cohorts and one-on-one sessions for professional exams, university courses and specific topics.",
};

/** Filters are read from the URL on the client, inside Suspense, so the page shell still prerenders. */
export default function TrainingsPage() {
  return (
    <Suspense fallback={<div className="pt-32"><LoadingState /></div>}>
      <Catalogue />
    </Suspense>
  );
}
