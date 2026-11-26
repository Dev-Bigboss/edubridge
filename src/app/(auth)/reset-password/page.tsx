import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui/spinner";
import { ResetPasswordForm } from "./reset-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
