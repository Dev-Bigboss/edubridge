"use client";

import { CircleAlert, Download } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { LoadError } from "@/components/admin/catalog-admin";
import { FormError } from "@/components/auth/auth-card";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { LoadingState } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/client";
import { useDataExport, useDeleteAccount, useDeletionCheck } from "@/lib/api/hooks/account";
import type { User } from "@/lib/api/schemas/auth";

/** NFR Privacy (GDPR/UK GDPR): download my data, delete my account. */
export function PrivacyTab({ user }: { user: User }) {
  const t = useTranslations("account.privacy");
  const exportData = useDataExport();
  const readOnly = !!user.impersonated_by;

  return (
    <div className="space-y-6">
      <section aria-labelledby="privacy-export" className="rounded-lg border border-border-subtle bg-white p-5 md:p-6">
        <h2 id="privacy-export" className="mb-1 text-lg">
          {t("exportTitle")}
        </h2>
        <p className="mb-4 max-w-[60ch] leading-relaxed">{t("exportBody")}</p>
        <Button
          variant="outline"
          loading={exportData.isPending}
          disabled={readOnly}
          onClick={() =>
            exportData.mutate(undefined, {
              onSuccess: () => toast.success(t("exported")),
              onError: () => toast.error(t("exportFailed")),
            })
          }
        >
          <Download aria-hidden="true" className="size-4" />
          {t("exportCta")}
        </Button>
      </section>
      <DeleteCard user={user} readOnly={readOnly} />
    </div>
  );
}

function DeleteCard({ user, readOnly }: { user: User; readOnly: boolean }) {
  const t = useTranslations("account.privacy");
  const check = useDeletionCheck();
  const [open, setOpen] = useState(false);

  return (
    <section aria-labelledby="privacy-delete" className="rounded-lg border border-danger/40 bg-white p-5 md:p-6">
      <h2 id="privacy-delete" className="mb-1 text-lg">
        {t("deleteTitle")}
      </h2>
      <p className="mb-4 max-w-[60ch] leading-relaxed">{t("deleteBody")}</p>
      {check.isPending ? (
        <LoadingState />
      ) : check.isError ? (
        <LoadError onRetry={check.refetch} />
      ) : check.data.blockers.length > 0 ? (
        <div role="status" className="rounded-md border border-warning/40 bg-warning-soft p-4">
          <p className="mb-2 flex items-center gap-2 font-medium text-heading">
            <CircleAlert aria-hidden="true" className="size-5 shrink-0 text-warning" />
            {t("blockedTitle")}
          </p>
          <ul className="space-y-2 text-[15px]">
            {check.data.blockers.map((b, i) => (
              <li key={`${b.code}-${i}`}>
                <span className="text-heading">{t(`blockers.${b.code}`)}</span> {b.detail}
                {b.link && (
                  <>
                    {" "}
                    <Link href={b.link} className="font-medium text-primary underline-offset-4 hover:underline">
                      {t("sortItOut")}
                    </Link>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <Button variant="danger" disabled={readOnly} onClick={() => setOpen(true)}>
          {t("deleteCta")}
        </Button>
      )}
      {open && check.data && <DeleteDialog email={user.email} hasPassword={check.data.has_password} onClose={() => setOpen(false)} />}
    </section>
  );
}

function DeleteDialog({ email, hasPassword, onClose }: { email: string; hasPassword: boolean; onClose: () => void }) {
  const t = useTranslations("account.privacy");
  const router = useRouter();
  const del = useDeleteAccount();
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ confirm_email?: string; password?: string; form?: string }>({});

  const submit = async () => {
    const next: typeof errors = {};
    if (confirmEmail.trim().toLowerCase() !== email.toLowerCase()) next.confirm_email = t("emailMismatch");
    if (hasPassword && !password) next.password = t("passwordRequired");
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      await del.mutateAsync({ confirm_email: confirmEmail.trim(), password: hasPassword ? password : null });
      toast.success(t("deleted"));
      router.replace("/");
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        setErrors({ confirm_email: err.fieldErrors.confirm_email?.[0], password: err.fieldErrors.password?.[0] });
      } else if (err instanceof ApiError && err.code === "DELETION_BLOCKED") {
        setErrors({ form: t("blockedNow") });
      } else {
        setErrors({ form: t("failed") });
      }
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !del.isPending && onClose()} title={t("dialogTitle")} description={t("dialogBody")}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="space-y-4"
      >
        <ul className="list-disc space-y-1 pl-5 text-[15px] leading-relaxed">
          <li>{t("erased")}</li>
          <li>{t("kept")}</li>
          <li>{t("final")}</li>
        </ul>
        {errors.form && <FormError message={errors.form} />}
        <Field label={t("emailLabel", { email })} error={errors.confirm_email}>
          {(a11y) => <Input {...a11y} type="email" autoComplete="off" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} />}
        </Field>
        {hasPassword && (
          <Field label={t("passwordLabel")} error={errors.password}>
            {(a11y) => <PasswordInput {...a11y} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
          </Field>
        )}
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={del.isPending}>
            {t("keep")}
          </Button>
          <Button type="submit" variant="danger" loading={del.isPending}>
            {t("confirmCta")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
