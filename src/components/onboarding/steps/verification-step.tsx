"use client";

import { LockKeyhole } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { FormError } from "@/components/auth/auth-card";
import { DocumentUpload } from "@/components/uploads/document-upload";
import { applyApiError } from "@/lib/api/form-errors";
import { useSaveSection } from "@/lib/api/hooks/onboarding";
import type { StoredFile } from "@/lib/api/schemas/uploads";
import { StepActions } from "../wizard-frame";
import type { StepProps } from "./types";

/** ONB-3: ID and credentials for the admin's review. Private: only admins can open them. */
export function VerificationStep({ state, onDone, onBack }: StepProps) {
  const t = useTranslations("onboarding.verification");
  const save = useSaveSection("verification");
  const saved = state.sections.verification;
  const [idDoc, setIdDoc] = useState<StoredFile[]>(saved?.id_document ? [saved.id_document] : []);
  const [creds, setCreds] = useState<StoredFile[]>(saved?.credentials ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!idDoc.length) {
      setErrors({ id_document_file_id: t("idRequired") });
      return;
    }
    setErrors({});
    try {
      await save.mutateAsync({ id_document_file_id: idDoc[0].id, credential_file_ids: creds.map((c) => c.id) });
      onDone();
    } catch (err) {
      const fieldErrors: Record<string, string> = {};
      setFormError(applyApiError(err, (field, { message }) => (fieldErrors[String(field)] = message ?? "")));
      setErrors(fieldErrors);
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormError message={formError} />
      <p className="flex items-start gap-3 rounded-sm bg-surface-1 px-4 py-3 text-[15px] leading-relaxed">
        <LockKeyhole aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
        {t("privacy")}
      </p>
      <DocumentUpload
        label={t("idLabel")}
        description={t("idDescription")}
        purpose="ID_DOCUMENT"
        files={idDoc}
        onChange={(f) => {
          setIdDoc(f);
          if (f.length) setErrors((e) => ({ ...e, id_document_file_id: "" }));
        }}
        max={1}
        error={errors.id_document_file_id || undefined}
      />
      <DocumentUpload
        label={t("credLabel")}
        description={t("credDescription")}
        purpose="CREDENTIAL"
        files={creds}
        onChange={setCreds}
        max={5}
        error={errors.credential_file_ids || undefined}
      />
      <StepActions onBack={onBack} pending={save.isPending} />
    </form>
  );
}
