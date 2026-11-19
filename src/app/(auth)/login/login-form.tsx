"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { applyApiError } from "@/lib/api/form-errors";
import { LoginRequest, MfaVerifyRequest, type User } from "@/lib/api/schemas/auth";
import { postLoginPath } from "@/lib/auth/routes";
import { useLogin, useSession, useVerifyMfa } from "@/lib/auth/session";

const MOCKING = process.env.NEXT_PUBLIC_API_MOCKING === "on";

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const next = useSearchParams().get("next");
  const { data: currentUser } = useSession();
  const [challengeId, setChallengeId] = useState<string | null>(null);

  // Already signed in (e.g. pressed Back after signing in): skip the form.
  useEffect(() => {
    if (currentUser) router.replace(postLoginPath(currentUser.role, next));
  }, [currentUser, next, router]);

  const finish = (user: User) => {
    toast.success(t("login.success", { name: user.name.split(" ")[0] }));
    router.replace(postLoginPath(user.role, next));
  };

  return (
    <div className="w-full max-w-[450px]">
      <div className="mb-8 text-center">
        <span className="mb-4 inline-flex size-16 items-center justify-center rounded-full bg-surface-2 text-primary">
          <LockKeyhole aria-hidden="true" className="size-7" />
        </span>
        <h1 className="mb-2 text-[28px]">{challengeId ? t("mfa.title") : t("login.title")}</h1>
        <p className="leading-relaxed">{challengeId ? t("mfa.subtitle") : t("login.subtitle")}</p>
      </div>

      <div className="rounded-md border border-border bg-white p-6 shadow-[0_10px_30px_rgba(8,42,94,0.06)] md:p-8">
        {challengeId ? (
          <MfaStep challengeId={challengeId} onDone={finish} onBack={() => setChallengeId(null)} />
        ) : (
          <PasswordStep onMfa={setChallengeId} onDone={finish} />
        )}
      </div>

      {!challengeId && (
        <p className="mt-6 text-center">
          {t("login.noAccount")}{" "}
          <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
            {t("login.createAccount")}
          </Link>
        </p>
      )}

      {MOCKING && (
        <p className="mt-6 rounded-sm border border-dashed border-border bg-white p-4 text-sm leading-relaxed">
          {t("mockHint")}
        </p>
      )}
    </div>
  );
}

function PasswordStep({ onMfa, onDone }: { onMfa: (id: string) => void; onDone: (u: User) => void }) {
  const t = useTranslations("auth.login");
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<LoginRequest>({ resolver: zodResolver(LoginRequest), mode: "onTouched" });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const res = await login.mutateAsync(values);
      if (res.mfa_required) onMfa(res.mfa_challenge_id);
      else onDone(res.user);
    } catch (err) {
      // Keep what they typed; show the reason next to the form.
      setFormError(applyApiError(err, form.setError));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormError message={formError} />
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
        {(a) => (
          <div className="relative">
            <Input {...a} type={showPassword ? "text" : "password"} autoComplete="current-password" className="pr-12" {...form.register("password")} />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? t("hidePassword") : t("showPassword")}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-sm text-body hover:text-heading"
            >
              {showPassword ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
            </button>
          </div>
        )}
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

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-sm border border-danger/30 bg-danger-soft px-4 py-3 text-[15px] leading-relaxed text-danger">
      {message}
    </div>
  );
}
