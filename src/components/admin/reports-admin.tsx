"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { ApiError } from "@/lib/api/client";
import { downloadReport } from "@/lib/api/hooks/reports";
import { REPORT_TYPES, type ReportType } from "@/lib/domain/reports";

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** /admin/reports (ADM-4): pick the dates once, download any of the four CSVs. Every export is audited. */
export function ReportsAdmin() {
  const t = useTranslations("admin.reports");
  const now = new Date();
  const [from, setFrom] = useState(iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))));
  const [to, setTo] = useState(iso(now));
  const [busy, setBusy] = useState<ReportType | null>(null);
  const rangeError = from && to && from > to ? t("rangeError") : undefined;

  const download = async (type: ReportType) => {
    setBusy(type);
    try {
      const rows = await downloadReport(type, from, to);
      toast.success(t("downloaded", { name: t(`types.${type}.name`), count: rows }));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t("failed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("title")} description={t("intro")} />
      <div className="mb-6 flex flex-wrap items-start gap-3">
        <Field label={t("from")} className="w-44" error={rangeError}>
          {(a) => <Input {...a} type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />}
        </Field>
        <Field label={t("to")} className="w-44">
          {(a) => <Input {...a} type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />}
        </Field>
      </div>
      <ul className="divide-y divide-border-subtle rounded-lg border border-border-subtle bg-white">
        {REPORT_TYPES.map((type) => (
          <li key={type} className="flex flex-wrap items-center gap-4 p-5">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-heading">{t(`types.${type}.name`)}</h2>
              <p className="text-[15px] leading-relaxed">{t(`types.${type}.body`)}</p>
            </div>
            <Button variant="outline" loading={busy === type} disabled={!!rangeError || (busy !== null && busy !== type)} onClick={() => void download(type)} aria-label={t("downloadLabel", { name: t(`types.${type}.name`) })}>
              <Download aria-hidden="true" className="size-4" />
              {t("download")}
            </Button>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm leading-relaxed">{t("note")}</p>
    </div>
  );
}
