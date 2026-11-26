"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck, MailWarning } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AuthCard, AuthFooterLink, FormError, Notice } from "@/components/auth/auth-card";
import { MockInbox } from "@/components/auth/mock-inbox";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { LoadingState } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/client";
import { applyApiError } from "@/lib/api/form-errors";
import { EmailOnly } from "@/lib/api/schemas/auth";
import { afterSignInPath, safeNextPath } from "@/lib/auth/routes";
import { useResendVerification, useVerifyEmail } from "@/lib/auth/session";

/** ONB-1: one page for "check your inbox" (no token) and for redeeming the emailed link (?token=). */
export function VerifyEmail() {
  const params = useSearchParams();
  const token = params.get("token");
  return token ? <Redeem token={token} /> : <CheckInbox email={params.get("email") ?? ""} />;
}

function Redeem({ token }: { token: string }) {
  const t = useTranslations("auth.verify");
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get("next"));
  const verify = useVerifyEmail();
  const started = useRef(false);

  useEffect(() => {
    // Tokens are single use, so never send it twice (React dev mode runs effects twice).
    if (started.current) return;
    started.current = true;
    verify.mutate(token, {
      onSuccess: ({ user }) => {
        toast.success(t("success", { name: user.name.split(" ")[0] }));
        router.replace(afterSignInPath(user, next));
      },
    });
  }, [token, verify, router, next, t]);

  if (verify.isError) {
    return (
      <AuthCard icon={MailWarning} title={t("failedTitle")} subtitle={verify.error instanceof ApiError ? verify.error.message : undefined}>
        <ResendForm defaultEmail="" />
      </AuthCard>
    );
  }
  return (
    <AuthCard icon={MailCheck} title={t("verifyingTitle")} subtitle={t("verifyingSubtitle")}>
      <LoadingState label={t("verifyingTitle")} />
    </AuthCard>
  );
}

function CheckInbox({ email }: { email: string }) {
  const t = useTranslations("auth.verify");
  return (
    <AuthCard
      icon={MailCheck}
      title={t("checkTitle")}
      subtitle={email ? t("checkSubtitle", { email }) : t("checkSubtitleNoEmail")}
      footer={
        <>
          <AuthFooterLink href="/login" label={t("backToSignIn")} />
          {email && <MockInbox email={email} kind="verify" />}
        </>
      }
    >
      <p className="mb-5 leading-relaxed">{t("checkTips")}</p>
      <ResendForm defaultEmail={email} />
    </AuthCard>
  );
}

function ResendForm({ defaultEmail }: { defaultEmail: string }) {
  const t = useTranslations("auth.verify");
  const resend = useResendVerification();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<EmailOnly>({ resolver: zodResolver(EmailOnly), defaultValues: { email: defaultEmail } });

  const onSubmit = form.handleSubmit(async ({ email }) => {
    setFormError(null);
    try {
      await resend.mutateAsync(email);
    } catch (err) {
      setFormError(applyApiError(err, form.setError));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormError message={formError} />
      {resend.isSuccess && <Notice>{t("resent")}</Notice>}
      {/* Known address: keep the form to one button. Otherwise ask for it. */}
      {defaultEmail ? (
        <input type="hidden" {...form.register("email")} />
      ) : (
        <Field label={t("emailLabel")} error={form.formState.errors.email?.message}>
          {(a) => <Input {...a} type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} {...form.register("email")} />}
        </Field>
      )}
      <Button type="submit" variant="outline" className="h-12 w-full" loading={resend.isPending}>
        {resend.isPending ? t("resending") : t("resend")}
      </Button>
    </form>
  );
}
