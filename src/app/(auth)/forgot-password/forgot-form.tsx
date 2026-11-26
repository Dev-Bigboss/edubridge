"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { AuthCard, AuthFooterLink, FormError, Notice } from "@/components/auth/auth-card";
import { MockInbox } from "@/components/auth/mock-inbox";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { applyApiError } from "@/lib/api/form-errors";
import { EmailOnly } from "@/lib/api/schemas/auth";
import { useForgotPassword } from "@/lib/auth/session";

export function ForgotPasswordForm() {
  const t = useTranslations("auth.forgot");
  const forgot = useForgotPassword();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<EmailOnly>({ resolver: zodResolver(EmailOnly), mode: "onTouched" });

  const onSubmit = form.handleSubmit(async ({ email }) => {
    setFormError(null);
    try {
      await forgot.mutateAsync(email);
      setSentTo(email);
    } catch (err) {
      setFormError(applyApiError(err, form.setError));
    }
  });

  return (
    <AuthCard
      icon={KeyRound}
      title={t("title")}
      subtitle={t("subtitle")}
      footer={
        <>
          <AuthFooterLink prompt={t("remembered")} href="/login" label={t("signIn")} />
          {sentTo && <MockInbox email={sentTo} kind="reset" />}
        </>
      }
    >
      {sentTo ? (
        <div className="space-y-4">
          {/* Same message whether or not the account exists, so this can't be used to probe emails. */}
          <Notice>{t("sent", { email: sentTo })}</Notice>
          <Button variant="outline" className="h-12 w-full" onClick={() => setSentTo(null)}>
            {t("tryAnother")}
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <FormError message={formError} />
          <Field label={t("email")} error={form.formState.errors.email?.message}>
            {(a) => (
              <Input {...a} type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} {...form.register("email")} />
            )}
          </Field>
          <Button type="submit" className="h-12 w-full" loading={forgot.isPending}>
            {forgot.isPending ? t("submitting") : t("submit")}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
