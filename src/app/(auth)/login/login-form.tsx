"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AuthCard, AuthFooterLink, FormError } from "@/components/auth/auth-card";
import { DemoAccounts } from "@/components/auth/demo-accounts";
import { GoogleButton, OrDivider } from "@/components/auth/google-button";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { ApiError } from "@/lib/api/client";
import { applyApiError } from "@/lib/api/form-errors";
import { LoginRequest, MfaVerifyRequest, type User } from "@/lib/api/schemas/auth";
import { afterSignInPath } from "@/lib/auth/routes";
import { useLogin, useSession, useVerifyMfa } from "@/lib/auth/session";

const MOCKING = process.env.NEXT_PUBLIC_API_MOCKING === "on";

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const googleError = params.get("error");
  const { data: currentUser } = useSession();
  const [challengeId, setChallengeId] = useState<string | null>(null);

  // Already signed in (e.g. pressed Back after signing in): skip the form.
  useEffect(() => {
    if (currentUser) router.replace(afterSignInPath(currentUser, next));
  }, [currentUser, next, router]);

  const finish = (user: User) => {
    toast.success(t("login.success", { name: user.name.split(" ")[0] }));
    router.replace(afterSignInPath(user, next));
  };

  return (
    <AuthCard
      icon={LockKeyhole}
      title={challengeId ? t("mfa.title") : t("login.title")}
      subtitle={challengeId ? t("mfa.subtitle") : t("login.subtitle")}
      footer={
        <>
          {!challengeId && (
            <AuthFooterLink prompt={t("login.noAccount")} href="/register" label={t("login.createAccount")} />
          )}
          {MOCKING && !challengeId && <DemoAccounts onDone={finish} />}
        </>
      }
    >
      {challengeId ? (
        <MfaStep challengeId={challengeId} onDone={finish} onBack={() => setChallengeId(null)} />
      ) : (
        <>
          <GoogleButton role="LEARNER" next={next} />
          <OrDivider />
          <PasswordStep
            onMfa={setChallengeId}
            onDone={finish}
            initialError={googleError ? t("login.googleFailed") : null}
          />
        </>
      )}
    </AuthCard>
  );
}

function PasswordStep({
  onMfa,
  onDone,
  initialError,
}: {
  onMfa: (id: string) => void;
  onDone: (u: User) => void;
  initialError: string | null;
}) {
  const t = useTranslations("auth.login");
  const login = useLogin();
  const [formError, setFormError] = useState<string | null>(initialError);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const form = useForm<LoginRequest>({ resolver: zodResolver(LoginRequest), mode: "onTouched" });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    setUnverifiedEmail(null);
    try {
      const res = await login.mutateAsync(values);
      if (res.mfa_required) onMfa(res.mfa_challenge_id);
      else onDone(res.user);
    } catch (err) {
      // Keep what they typed; show the reason next to the form.
      if (err instanceof ApiError && err.code === "EMAIL_NOT_VERIFIED") setUnverifiedEmail(values.email);
      setFormError(applyApiError(err, form.setError));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormError message={formError} />
      {unverifiedEmail && (
        <Link
          href={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}
          className="block font-medium text-primary underline underline-offset-4"
        >
          {t("resendVerification")}
        </Link>
      )}
      <Field label={t("email")} error={errors.email?.message}>
        {(a) => <Input {...a} type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} {...form.register("email")} />}
      </Field>
      <Field
        label={t("password")}
        error={errors.password?.message}
        labelAction={
          <Link href="/forgot-password" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            {t("forgot")}
          </Link>
        }
      >
        {(a) => <PasswordInput {...a} autoComplete="current-password" {...form.register("password")} />}
      </Field>
      <Button type="submit" className="h-12 w-full" loading={login.isPending}>
        {login.isPending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}

function MfaStep({ challengeId, onDone, onBack }: { challengeId: string; onDone: (u: User) => void; onBack: () => void }) {
  const t = useTranslations("auth.mfa");
  const verify = useVerifyMfa();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<MfaVerifyRequest>({
    resolver: zodResolver(MfaVerifyRequest),
    defaultValues: { mfa_challenge_id: challengeId, code: "" },
  });
  const { ref, ...codeField } = form.register("code");
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => inputRef.current?.focus(), []);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      onDone((await verify.mutateAsync(values)).user);
    } catch (err) {
      setFormError(applyApiError(err, form.setError));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormError message={formError} />
      <Field label={t("code")} error={form.formState.errors.code?.message}>
        {(a) => (
          <Input
            {...a}
            {...codeField}
            ref={(el) => {
              ref(el);
              inputRef.current = el;
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className="text-center font-heading text-xl tracking-[0.4em]"
          />
        )}
      </Field>
      <Button type="submit" className="h-12 w-full" loading={verify.isPending}>
        {verify.isPending ? t("submitting") : t("submit")}
      </Button>
      <Button type="button" variant="ghost" className="w-full" onClick={onBack} disabled={verify.isPending}>
        {t("back")}
      </Button>
    </form>
  );
}
