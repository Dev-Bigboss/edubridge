import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui/spinner";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    // The form reads ?next= from the URL, which is request data, so it streams in behind Suspense.
    <Suspense fallback={<LoadingState />}>
      <LoginForm />
    </Suspense>
  );
}
