"use client";

import { Eye, EyeOff, Trash2, Video } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { TableCard, td, th } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/status-badge";
import { ApiError } from "@/lib/api/client";
import { useAdminDeleteRecording, useAdminRecordings, useAdminUpdateRecording } from "@/lib/api/hooks/recordings";
import type { Recording } from "@/lib/api/schemas/recordings";
import { formatCalendarDate } from "@/lib/domain/cohort-schedule";
import { formatClock, playableRange } from "@/lib/domain/recordings";
import { formatInZone } from "@/lib/domain/time";
import { LoadError } from "./catalog-admin";

/** /admin/moderation?tab=recordings (REC-3): admins can hide or delete any recording. */
export function RecordingsModeration() {
  const t = useTranslations("admin.moderation.recordings");
  const query = useAdminRecordings();
  const [toDelete, setToDelete] = useState<Recording | null>(null);

  return (
    <div>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <LoadError onRetry={query.refetch} />
      ) : query.data.length === 0 ? (
        <EmptyState icon={Video} title={t("empty")} description={t("emptyBody")} />
      ) : (
        <TableCard label={t("title")}>
          <table className="w-full min-w-[800px] text-[15px]">
            <thead className="border-b border-border bg-surface-1">
              <tr>
                <th className={th}>{t("colSession")}</th>
                <th className={th}>{t("colInstructor")}</th>
                <th className={th}>{t("colLength")}</th>
                <th className={th}>{t("colVisibility")}</th>
                <th className={th}>{t("colDeletes")}</th>
                <th className={th}>
                  <span className="sr-only">{t("colActions")}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {query.data.map((r) => (
                <RecordingRow key={r.id} recording={r} onDelete={() => setToDelete(r)} />
              ))}
            </tbody>
          </table>
        </TableCard>
      )}
      {toDelete && <DeleteDialog r={toDelete} onClose={() => setToDelete(null)} />}
    </div>
  );
}

function RecordingRow({ recording: r, onDelete }: { recording: Recording; onDelete: () => void }) {
  const t = useTranslations("admin.moderation.recordings");
  const update = useAdminUpdateRecording(r.id);
  const range = playableRange(r.duration_sec, r.trim);

  const toggle = async () => {
    try {
      await update.mutateAsync({ hidden: !r.hidden });
      toast.success(r.hidden ? t("shown") : t("hidden"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("failed"));
    }
  };

  return (
    <tr className="hover:bg-surface-1">
      <td className={td}>
        <div>
          <Link
            href={`/teach/recordings/${r.id}`}
            className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {r.training.title}
          </Link>
          <p className="text-sm">{r.subtitle}</p>
        </div>
      </td>
      <td className={`${td} text-sm`}>{formatInZone(r.recorded_at, "UTC", "d MMM yyyy")}</td>
      <td className={`${td} tabular-nums`}>{formatClock(range.end - range.start)}</td>
      <td className={td}>
        {r.hidden ? (
          <Badge tone="neutral">Hidden</Badge>
        ) : (
          <Badge tone="success">Visible</Badge>
        )}
      </td>
      <td className={`${td} text-sm`}>{formatCalendarDate(r.delete_at.slice(0, 10))}</td>
      <td className={td}>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            loading={update.isPending}
            onClick={() => void toggle()}
            aria-label={r.hidden ? t("showLabel", { title: r.training.title }) : t("hideLabel", { title: r.training.title })}
          >
            {r.hidden ? <Eye aria-hidden="true" className="size-4" /> : <EyeOff aria-hidden="true" className="size-4" />}
            {r.hidden ? t("show") : t("hide")}
          </Button>
          <Button
            variant="ghost"
            className="text-danger hover:bg-danger-soft"
            onClick={onDelete}
            aria-label={t("deleteLabel", { title: r.training.title })}
          >
            <Trash2 aria-hidden="true" className="size-4" />
            {t("delete")}
          </Button>
        </div>
      </td>
    </tr>
  );
}

function DeleteDialog({ r, onClose }: { r: Recording; onClose: () => void }) {
  const t = useTranslations("admin.moderation.recordings");
  const del = useAdminDeleteRecording(r.id);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setError(null);
    try {
      await del.mutateAsync();
      toast.success(t("deleted"));
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("failed"));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t("deleteTitle")} description={t("deleteBody", { title: r.training.title })}>
      <div className="space-y-5">
        <FormError message={error} />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button variant="danger" loading={del.isPending} onClick={() => void confirm()}>
            {t("deleteCta")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
