import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui/spinner";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create your account" };

export default function RegisterPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <RegisterForm />
    </Suspense>
  );
}
