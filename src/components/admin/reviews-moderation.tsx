"use client";

import { MessageSquareQuote } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Stars } from "@/components/reviews/stars";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/client";
import { useAdminReviews, useModerateReview } from "@/lib/api/hooks/reviews";
import type { AdminReview } from "@/lib/api/schemas/reviews";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/domain/time";
import { LoadError } from "./catalog-admin";

/** FDB-4 "Admin can moderate": reviews go live at once; admins hide one with a reason the author sees, or restore it. */
export function ReviewsModeration() {
  const t = useTranslations("admin.moderation.reviews");
  const [status, setStatus] = useState<"PUBLISHED" | "HIDDEN">("PUBLISHED");
  const query = useAdminReviews(status);
  const moderate = useModerateReview();
  const [hiding, setHiding] = useState<AdminReview | null>(null);

  const restore = (r: AdminReview) =>
    moderate.mutate(
      { id: r.id, reason: null },
      { onSuccess: () => toast.success(t("restored")), onError: (e) => toast.error(e instanceof ApiError ? e.message : t("failed")) },
    );

  return (
    <>
      <div role="group" aria-label={t("show")} className="mb-5 inline-flex rounded-sm border border-border bg-white p-1">
        {(["PUBLISHED", "HIDDEN"] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            onClick={() => setStatus(s)}
            className={cn(
              "min-h-11 rounded-sm px-4 font-heading text-[15px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-primary",
              status === s ? "bg-primary text-white" : "text-heading hover:bg-surface-1",
            )}
          >
            {t(`status.${s}`)}
          </button>
        ))}
      </div>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <LoadError onRetry={query.refetch} />
      ) : query.data.length === 0 ? (
        <EmptyState icon={MessageSquareQuote} title={status === "PUBLISHED" ? t("emptyLive") : t("emptyHidden")} description={status === "PUBLISHED" ? t("emptyLiveBody") : t("emptyHiddenBody")} />
      ) : (
        <ul className="space-y-3">
          {query.data.map((r) => (
            <li key={r.id}>
              <article aria-labelledby={`rv-${r.id}`} className="rounded-lg border border-border-subtle bg-white p-5">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 id={`rv-${r.id}`} className="text-base font-semibold text-heading">
                      {r.training_title}
                    </h2>
                    <p className="text-sm">
                      {t("byLine", { author: r.author.name, instructor: r.instructor.name })} · <time dateTime={r.created_at}>{timeAgo(r.created_at)}</time>
                    </p>
                    <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-heading">
                      <span className="inline-flex items-center gap-1.5">
                        {t("training")} <Stars value={r.training_rating} size="sm" />
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        {t("instructor")} <Stars value={r.instructor_rating} size="sm" />
                      </span>
                    </p>
                    <p className="mt-2 leading-relaxed whitespace-pre-line text-heading">{r.comment}</p>
                    {r.status === "HIDDEN" && r.moderation && (
                      <p className="mt-2 text-sm text-danger">{t("hiddenBy", { name: r.moderation.by_name, reason: r.hidden_reason ?? "" })}</p>
                    )}
                  </div>
                  {r.status === "PUBLISHED" ? (
                    <Button variant="outline" onClick={() => setHiding(r)} aria-label={`${t("hide")}: ${r.author.name}, ${r.training_title}`}>
                      {t("hide")}
                    </Button>
                  ) : (
                    <Button variant="outline" loading={moderate.isPending && moderate.variables?.id === r.id} onClick={() => restore(r)} aria-label={`${t("restore")}: ${r.author.name}, ${r.training_title}`}>
                      {t("restore")}
                    </Button>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
      {hiding && <HideDialog review={hiding} onClose={() => setHiding(null)} />}
    </>
  );
}

function HideDialog({ review, onClose }: { review: AdminReview; onClose: () => void }) {
  const t = useTranslations("admin.moderation.reviews");
  const moderate = useModerateReview();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submit = () => {
    if (reason.trim().length < 5) return setError(t("reasonRequired"));
    setError(null);
    moderate.mutate(
      { id: review.id, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success(t("hidden"));
          onClose();
        },
        onError: (e) => setError(e instanceof ApiError ? e.message : t("failed")),
      },
    );
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t("hideTitle")} description={t("hideBody", { author: review.author.name })}>
      <form
        noValidate
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label={t("reason")} error={error ?? undefined} hint={t("reasonHint")}>
          {(a) => <Textarea {...a} value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />}
        </Field>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button type="submit" variant="danger" loading={moderate.isPending}>
            {t("hide")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
