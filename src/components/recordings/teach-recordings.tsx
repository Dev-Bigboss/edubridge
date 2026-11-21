"use client";

import { Eye, EyeOff, Scissors, Trash2, Video } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { LoadError } from "@/components/admin/catalog-admin";
import { FormError } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/field";
import { PageHeader, TableCard, td, th } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/status-badge";
import { ApiError } from "@/lib/api/client";
import { useDeleteRecording, useTeachRecordings, useUpdateRecording } from "@/lib/api/hooks/recordings";
import type { Recording } from "@/lib/api/schemas/recordings";
import { useSession } from "@/lib/auth/session";
import { formatCalendarDate } from "@/lib/domain/cohort-schedule";
import { TRIM_PROBLEMS, formatClock, parseClock, playableRange, trimProblem } from "@/lib/domain/recordings";
import { formatInZone } from "@/lib/domain/time";

/** /teach/recordings (REC-5): hide, trim or delete recordings of my sessions. */
export function TeachRecordings() {
  const t = useTranslations("recordings.teach");
  const query = useTeachRecordings();
  const { data: user } = useSession();
  const [dialog, setDialog] = useState<{ r: Recording; kind: "trim" | "delete" } | null>(null);
  const zone = user?.timezone ?? "UTC";

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("title")} description={t("intro")} />
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <LoadError onRetry={query.refetch} />
      ) : query.data.length === 0 ? (
        <EmptyState icon={Video} title={t("empty")} description={t("emptyBody")} />
      ) : (
        <TableCard label={t("title")}>
          <table className="w-full min-w-[860px] text-[15px]">
            <thead className="border-b border-border bg-surface-1">
              <tr>
                <th className={th}>{t("session")}</th>
                <th className={th}>{t("length")}</th>
                <th className={th}>{t("status")}</th>
                <th className={th}>{t("deletes")}</th>
                <th className={th}>
                  <span className="sr-only">{t("actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {query.data.map((r) => (
                <Row key={r.id} r={r} zone={zone} onTrim={() => setDialog({ r, kind: "trim" })} onDelete={() => setDialog({ r, kind: "delete" })} />
              ))}
            </tbody>
          </table>
        </TableCard>
      )}
      {dialog?.kind === "trim" && <TrimDialog r={dialog.r} onClose={() => setDialog(null)} />}
      {dialog?.kind === "delete" && <DeleteDialog r={dialog.r} zone={zone} onClose={() => setDialog(null)} />}
    </div>
  );
}

function Row({ r, zone, onTrim, onDelete }: { r: Recording; zone: string; onTrim: () => void; onDelete: () => void }) {
  const t = useTranslations("recordings.teach");
  const update = useUpdateRecording(r.id);
  const range = playableRange(r.duration_sec, r.trim);
  const when = formatInZone(r.recorded_at, zone, "EEE d MMM, HH:mm");
  const toggle = async () => {
    try {
      await update.mutateAsync({ hidden: !r.hidden });
      toast.success(r.hidden ? t("shown") : t("hiddenToast"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("failed"));
    }
  };
  return (
    <tr className="align-top">
      <td className={td}>
        {r.status === "READY" ? (
          <Link href={`/teach/recordings/${r.id}`} className="font-medium text-heading underline-offset-4 hover:text-primary hover:underline">
            {when}
          </Link>
        ) : (
          <span className="font-medium text-heading">{when}</span>
        )}
        <span className="block text-sm">
          {r.training.title} · {r.subtitle}
        </span>
      </td>
      <td className={`${td} whitespace-nowrap`}>
        {formatClock(range.end - range.start)}
        {r.trim && <span className="block text-sm">{t("trimmed", { start: formatClock(range.start), end: formatClock(range.end) })}</span>}
      </td>
      <td className={td}>
        {r.status === "PROCESSING" ? (
          <Badge tone="warning">{t("processing")}</Badge>
        ) : r.status === "FAILED" ? (
          <Badge tone="danger">{t("failedBadge")}</Badge>
        ) : r.hidden ? (
          <Badge tone="neutral">{t("hidden")}</Badge>
        ) : (
          <Badge tone="success">{t("visible")}</Badge>
        )}
      </td>
      <td className={`${td} whitespace-nowrap`}>{formatCalendarDate(r.delete_at.slice(0, 10))}</td>
      <td className={`${td} text-right`}>
        {r.status === "READY" && (
          <span className="inline-flex flex-wrap justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => void toggle()} loading={update.isPending} aria-label={r.hidden ? t("showLabel", { when }) : t("hideLabel", { when })}>
              {r.hidden ? <Eye aria-hidden="true" className="size-4" /> : <EyeOff aria-hidden="true" className="size-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={onTrim} aria-label={t("trimLabel", { when })}>
              <Scissors aria-hidden="true" className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-danger hover:bg-danger-soft" onClick={onDelete} aria-label={t("deleteLabel", { when })}>
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
          </span>
        )}
      </td>
    </tr>
  );
}

function TrimDialog({ r, onClose }: { r: Recording; onClose: () => void }) {
  const t = useTranslations("recordings.teach");
  const update = useUpdateRecording(r.id);
  const range = playableRange(r.duration_sec, r.trim);
  const [start, setStart] = useState(formatClock(range.start));
  const [end, setEnd] = useState(formatClock(range.end));
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    const s = parseClock(start);
    const e = parseClock(end);
    if (s === null || e === null) return setError(t("clockFormat"));
    const problem = trimProblem(s, e, r.duration_sec);
    if (problem) return setError(TRIM_PROBLEMS[problem]);
    try {
      await update.mutateAsync({ trim: { start_sec: s, end_sec: e } });
      toast.success(t("trimSaved"));
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("failed"));
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t("trimTitle")} description={t("trimBody", { length: formatClock(r.duration_sec) })}>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label={t("from")} hint={t("clockHint")}>
            {(a) => <Input {...a} inputMode="numeric" value={start} onChange={(e) => setStart(e.target.value)} />}
          </Field>
          <Field label={t("to")}>
            {(a) => <Input {...a} inputMode="numeric" value={end} onChange={(e) => setEnd(e.target.value)} />}
          </Field>
        </div>
        <FormError message={error} />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {r.trim && (
            <Button variant="link" className="sm:mr-auto" onClick={() => (setStart("0:00"), setEnd(formatClock(r.duration_sec)))}>
              {t("undoTrim")}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            {t("goBack")}
          </Button>
          <Button loading={update.isPending} onClick={() => void submit()}>
            {t("saveTrim")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function DeleteDialog({ r, zone, onClose }: { r: Recording; zone: string; onClose: () => void }) {
  const t = useTranslations("recordings.teach");
  const del = useDeleteRecording(r.id);
  const confirm = async () => {
    try {
      await del.mutateAsync();
      toast.success(t("deleted"));
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("failed"));
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t("deleteTitle")} description={t("deleteBody", { when: formatInZone(r.recorded_at, zone, "EEEE d MMMM") })}>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose}>
          {t("goBack")}
        </Button>
        <Button variant="danger" loading={del.isPending} onClick={() => void confirm()}>
          {t("deleteCta")}
        </Button>
      </div>
    </Dialog>
  );
}
