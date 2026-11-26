"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormError } from "@/components/auth/auth-card";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { Badge } from "@/components/ui/status-badge";
import { ApiError } from "@/lib/api/client";
import { applyApiError } from "@/lib/api/form-errors";
import { useChangePassword, useMfa, useRevokeOtherSessions } from "@/lib/api/hooks/account";
import { ChangePassword } from "@/lib/api/schemas/account";
import type { User } from "@/lib/api/schemas/auth";

export function SecurityTab({ user }: { user: User }) {
  return (
    <div className="space-y-6">
      <PasswordCard />
      <MfaCard user={user} />
      <SessionsCard />
    </div>
  );
}

function Card({ title, description, children, badge }: { title: string; description: string; children: ReactNode; badge?: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-lg border border-border-subtle bg-white p-5 md:p-6">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h2 className="text-lg">{title}</h2>
        {badge}
      </div>
      <p className="mb-4 max-w-[60ch] leading-relaxed">{description}</p>
      {children}
    </section>
  );
}

function PasswordCard() {
  const t = useTranslations("account.security");
  const change = useChangePassword();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ChangePassword>({ resolver: zodResolver(ChangePassword), defaultValues: { current_password: "", new_password: "" }, mode: "onTouched" });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    try {
      await change.mutateAsync(v);
      form.reset();
      toast.success(t("passwordChanged"));
    } catch (err) {
      setFormError(applyApiError(err, form.setError));
    }
  });

  return (
    <Card title={t("password")} description={t("passwordBody")}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FormError message={formError} />
        <Field label={t("current")} error={errors.current_password?.message}>
          {(a) => <PasswordInput {...a} autoComplete="current-password" {...form.register("current_password")} />}
        </Field>
        <Field label={t("new")} hint={t("newHint")} error={errors.new_password?.message}>
          {(a) => <PasswordInput {...a} autoComplete="new-password" {...form.register("new_password")} />}
        </Field>
        <Button type="submit" loading={change.isPending}>
          {t("changePassword")}
        </Button>
      </form>
    </Card>
  );
}

function MfaCard({ user }: { user: User }) {
  const t = useTranslations("account.security");
  const mfa = useMfa();
  const required = user.role !== "LEARNER";
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [disabling, setDisabling] = useState(false);
  const setup = mfa.setup.data;

  const enable = async () => {
    setCodeError(null);
    if (!/^\d{6}$/.test(code)) return setCodeError(t("codeFormat"));
    try {
      await mfa.enable.mutateAsync(code);
      mfa.setup.reset();
      setCode("");
      toast.success(t("mfaOn"));
    } catch (err) {
      setCodeError(err instanceof ApiError ? (err.fieldErrors.code?.[0] ?? err.message) : t("failed"));
    }
  };

  return (
    <Card
      title={t("mfa")}
      description={required ? t("mfaRequiredBody") : t("mfaBody")}
      badge={user.mfa_enabled ? <Badge tone="success">{t("on")}</Badge> : <Badge tone="neutral">{t("off")}</Badge>}
    >
      {user.mfa_enabled ? (
        required ? (
          <p className="flex items-center gap-2 text-heading">
            <ShieldCheck aria-hidden="true" className="size-5 text-success" />
            {t("requiredForRole")}
          </p>
        ) : (
          <Button variant="outline" onClick={() => setDisabling(true)}>
            {t("turnOff")}
          </Button>
        )
      ) : setup ? (
        <div className="space-y-4">
          <ol className="list-decimal space-y-2 pl-5 leading-relaxed">
            <li>{t("step1")}</li>
            <li>
              {t("step2")} <code className="rounded-sm bg-surface-1 px-2 py-0.5 font-mono text-heading">{setup.secret}</code>
              <a href={setup.otpauth_uri} className="ml-2 font-medium text-primary underline-offset-4 hover:underline">
                {t("openInApp")}
              </a>
            </li>
            <li>{t("step3")}</li>
          </ol>
          <div className="flex flex-wrap items-end gap-3">
            <Field label={t("code")} error={codeError ?? undefined} className="w-48">
              {(a) => <Input {...a} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />}
            </Field>
            <Button onClick={() => void enable()} loading={mfa.enable.isPending} className="mb-[2px]">
              {t("confirmOn")}
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => mfa.setup.mutate()} loading={mfa.setup.isPending}>
          {t("turnOn")}
        </Button>
      )}
      {disabling && <DisableMfaDialog onClose={() => setDisabling(false)} />}
    </Card>
  );
}

function DisableMfaDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations("account.security");
  const { disable } = useMfa();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const confirm = async () => {
    setError(null);
    try {
      await disable.mutateAsync(password);
      toast.success(t("mfaOff"));
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? (err.fieldErrors.password?.[0] ?? err.message) : t("failed"));
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t("turnOffTitle")} description={t("turnOffBody")}>
      <div className="space-y-5">
        <Field label={t("current")} error={error ?? undefined}>
          {(a) => <PasswordInput {...a} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            {t("keepOn")}
          </Button>
          <Button variant="danger" loading={disable.isPending} onClick={() => void confirm()}>
            {t("turnOff")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function SessionsCard() {
  const t = useTranslations("account.security");
  const revoke = useRevokeOtherSessions();
  return (
    <Card title={t("devices")} description={t("devicesBody")}>
      <Button
        variant="outline"
        loading={revoke.isPending}
        onClick={() =>
          revoke.mutate(undefined, {
            onSuccess: ({ revoked }) => toast.success(t("signedOut", { count: revoked })),
            onError: (err) => toast.error(err instanceof ApiError ? err.message : t("failed")),
          })
        }
      >
        {t("signOutOthers")}
      </Button>
    </Card>
  );
}
