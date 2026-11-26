"use client";

import { CreditCard, FlaskConical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/client";
import { useMockGateway, useMockGatewayOutcome } from "@/lib/api/hooks/checkout";

/**
 * Demo mode only. Stands in for Stripe's hosted Checkout page so the whole flow can be tried
 * without a gateway: pay, decline or walk away. Not translated on purpose: it never ships.
 */
export function MockGateway({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const session = useMockGateway(paymentId);
  const outcome = useMockGatewayOutcome(paymentId);
  const [error, setError] = useState<string | null>(null);
  const [choice, setChoice] = useState<string | null>(null);

  if (session.isError) return <FormError message="This test checkout session doesn't exist." />;
  if (!session.data) return <LoadingState />;
  const { payment, success_url, cancel_url, authorise_only, total } = session.data;
  const finished = payment.status !== "PENDING";

  const go = async (result: "success" | "decline" | "cancel") => {
    setError(null);
    setChoice(result);
    try {
      await outcome.mutateAsync(result);
      // Stripe redirects to success_url / cancel_url the same way.
      router.push(result === "cancel" ? cancel_url : success_url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  };

  return (
    <div className="w-full max-w-[450px]">
      <p className="mb-4 flex items-start gap-3 rounded-sm border border-accent/60 bg-accent/10 px-4 py-3 text-[15px] leading-relaxed text-heading">
        <FlaskConical aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        Demo mode. This page stands in for Stripe&apos;s secure checkout. No real card is charged.
      </p>
      <div className="rounded-md border border-border bg-white p-6 md:p-8">
        <h1 className="mb-1 text-[26px]">Test payment</h1>
        <p className="mb-6 leading-relaxed">{payment.description}</p>
        <p className="mb-2 font-heading text-3xl font-semibold text-heading">{total}</p>
        <p className="mb-6 text-[15px] leading-relaxed">
          {authorise_only
            ? "Held on your card now and charged only if the instructor accepts. Released if they decline or don't answer."
            : "Charged now."}
        </p>
        <div className="mb-6 flex items-center gap-3 rounded-sm border border-border bg-surface-1 px-4 py-3 text-heading">
          <CreditCard aria-hidden="true" className="size-5 text-primary" />
          Test card 4242 4242 4242 4242
        </div>
        <FormError message={error ?? (finished ? "This checkout session has already finished." : null)} />
        <div className="mt-4 flex flex-col gap-3">
          <Button size="lg" disabled={finished || outcome.isPending} loading={outcome.isPending && choice === "success"} onClick={() => void go("success")}>
            {authorise_only ? `Authorise ${total}` : `Pay ${total}`}
          </Button>
          <Button variant="outline" disabled={finished || outcome.isPending} loading={outcome.isPending && choice === "decline"} onClick={() => void go("decline")}>
            Simulate a declined card
          </Button>
          <Button variant="ghost" disabled={finished || outcome.isPending} onClick={() => void go("cancel")}>
            Back to EduBridge without paying
          </Button>
        </div>
      </div>
    </div>
  );
}
