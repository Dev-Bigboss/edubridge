"use client";

import { EyeOff, Flag, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/client";
import { useMessageReport, useMessageReports, useResolveReport } from "@/lib/api/hooks/messages";
import type { MessageReport } from "@/lib/api/schemas/messages";
import { useSession } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { browserTimeZone, formatInZone, timeAgo } from "@/lib/domain/time";
import { LoadError } from "./catalog-admin";
import { ReviewsModeration } from "./reviews-moderation";

/** /admin/moderation (MSG-6): reported messages, newest first; open one to remove the message or dismiss. */
export function ModerationAdmin() {
  const t = useTranslations("admin.moderation");
  const params = useSearchParams();
  const tab = params.get("tab") === "reviews" ? "reviews" : "messages";
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("title")} description={t("intro")} />
      <nav aria-label={t("sections")} className="mb-6 border-b border-border-subtle">
        <ul className="-mb-px flex gap-1">
          {(["messages", "reviews"] as const).map((k) => (
            <li key={k}>
              <Link
                href={k === "reviews" ? "/admin/moderation?tab=reviews" : "/admin/moderation"}
                aria-current={tab === k ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center border-b-2 px-4 font-heading text-[15px] font-medium focus-visible:outline-2 focus-visible:outline-primary",
                  tab === k ? "border-primary text-primary" : "border-transparent text-heading hover:border-border",
                )}
              >
                {t(`tabs.${k}`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {tab === "reviews" ? <ReviewsModeration /> : <MessageReports />}
    </div>
  );
}

function MessageReports() {
  const t = useTranslations("admin.moderation");
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"OPEN" | "RESOLVED">("OPEN");
  const query = useMessageReports(status);
  const open = params.get("report");
  const setOpen = (id: string | null) => router.replace(id ? `/admin/moderation?report=${id}` : "/admin/moderation", { scroll: false });

  return (
    <div>
      <div role="group" aria-label={t("show")} className="mb-5 inline-flex rounded-sm border border-border bg-white p-1">
        {(["OPEN", "RESOLVED"] as const).map((s) => (
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
        <EmptyState
          icon={ShieldCheck}
          title={status === "OPEN" ? t("emptyOpen") : t("emptyResolved")}
          description={status === "OPEN" ? t("emptyOpenBody") : t("emptyResolvedBody")}
          action={
            status === "OPEN" ? (
              <Button variant="outline" onClick={() => setStatus("RESOLVED")}>
                {t("seeResolved")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {query.data.map((r) => (
            <li key={r.id}>
              <ReportCard r={r} onReview={() => setOpen(r.id)} />
            </li>
          ))}
        </ul>
      )}
      {open && <ReviewDialog id={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function ReportCard({ r, onReview }: { r: MessageReport; onReview: () => void }) {
  const t = useTranslations("admin.moderation");
  const titleId = `report-${r.id}`;
  return (
    <article aria-labelledby={titleId} className="rounded-lg border border-border-subtle bg-white p-5">
      <div className="flex flex-wrap items-start gap-3">
        <Flag aria-hidden="true" className="mt-1 size-5 shrink-0 text-danger" />
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-base font-semibold text-heading">
            {t(`reasons.${r.reason}`)}
            {r.reported && <span className="font-normal">: {r.reported.name}</span>}
          </h2>
          <p className="text-sm">
            {r.conversation.title} · {r.conversation.subtitle}
          </p>
          {r.message && <p className="mt-2 line-clamp-2 rounded-sm bg-surface-1 px-3 py-2 text-[15px] text-heading">{r.message.removed ? t("alreadyRemoved") : r.message.body}</p>}
          <p className="mt-2 text-sm">
            {t("reportedBy", { name: r.reporter.name })} · <time dateTime={r.created_at}>{timeAgo(r.created_at)}</time>
          </p>
          {r.resolution && (
            <p className="mt-1 text-sm text-heading">
              {t(`actions.${r.resolution.action}`)} {t("by", { name: r.resolution.by_name })}: {r.resolution.note}
            </p>
          )}
        </div>
        <Button variant={r.status === "OPEN" ? "primary" : "outline"} onClick={onReview} aria-label={`${r.status === "OPEN" ? t("review") : t("view")}: ${t(`reasons.${r.reason}`)}${r.reported ? `, ${r.reported.name}` : ""}`}>
          {r.status === "OPEN" ? t("review") : t("view")}
        </Button>
      </div>
    </article>
  );
}

/** The report with the messages around it; a note is required for either decision (audited). */
function ReviewDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const t = useTranslations("admin.moderation");
  const query = useMessageReport(id);
  const resolve = useResolveReport(id);
  const { data: user } = useSession();
  const zone = user?.timezone ?? browserTimeZone();
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [acting, setActing] = useState<"REMOVE_MESSAGE" | "DISMISS" | null>(null);

  const act = (action: "REMOVE_MESSAGE" | "DISMISS") => {
    if (note.trim().length < 5) return setNoteError(t("noteRequired"));
    setNoteError(null);
    setFormError(null);
    setActing(action);
    resolve.mutate(
      { action, note: note.trim() },
      {
        onSuccess: () => {
          toast.success(action === "REMOVE_MESSAGE" ? t("removedToast") : t("dismissedToast"));
          onClose();
        },
        onError: (e) => setFormError(e instanceof ApiError ? e.message : t("failed")),
        onSettled: () => setActing(null),
      },
    );
  };

  const r = query.data?.report;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t("reviewTitle")} wide>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError || !r ? (
        <LoadError onRetry={query.refetch} />
      ) : (
        <div className="space-y-5">
          <dl className="grid gap-3 text-[15px] sm:grid-cols-2">
            <div>
              <dt className="text-sm">{t("reason")}</dt>
              <dd className="font-medium text-heading">{t(`reasons.${r.reason}`)}</dd>
            </div>
            <div>
              <dt className="text-sm">{t("reported")}</dt>
              <dd className="font-medium text-heading">{r.reported?.name ?? t("wholeChannel")}</dd>
            </div>
            <div>
              <dt className="text-sm">{t("where")}</dt>
              <dd className="text-heading">{r.conversation.title}</dd>
            </div>
            <div>
              <dt className="text-sm">{t("reporter")}</dt>
              <dd className="text-heading">{r.reporter.name}</dd>
            </div>
            {r.details && (
              <div className="sm:col-span-2">
                <dt className="text-sm">{t("theirWords")}</dt>
                <dd className="leading-relaxed text-heading">{r.details}</dd>
              </div>
            )}
          </dl>

          <section aria-label={t("context")}>
            <h3 className="mb-2 font-heading text-[15px] font-semibold text-heading">{t("context")}</h3>
            <p className="mb-2 text-sm">{t("contextHint")}</p>
            <ol tabIndex={0} aria-label={t("context")} className="max-h-[320px] space-y-2 overflow-y-auto rounded-sm border border-border-subtle bg-surface-1/60 p-3 focus-visible:outline-2 focus-visible:outline-primary">
              {query.data.context.map((m) => {
                const flagged = m.id === r.message?.id;
                return (
                  <li key={m.id} className={cn("rounded-sm bg-white px-3 py-2 text-[15px]", flagged && "border-2 border-danger")}>
                    <p className="text-xs">
                      <span className="font-semibold text-heading">{m.sender.name}</span> · <time dateTime={m.created_at}>{formatInZone(m.created_at, zone, "d MMM, HH:mm")}</time>
                      {flagged && <span className="ml-2 font-semibold text-danger">{t("reportedMessage")}</span>}
                    </p>
                    {m.removed ? (
                      <p className="flex items-center gap-1.5 italic">
                        <EyeOff aria-hidden="true" className="size-4" />
                        {t("alreadyRemoved")}
                      </p>
                    ) : (
                      <p className="leading-relaxed whitespace-pre-wrap text-heading">{m.body || t("fileOnly", { count: m.attachments.length })}</p>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>

          {r.status === "OPEN" ? (
            <>
              <FormError message={formError} />
              <Field label={t("note")} error={noteError ?? undefined} hint={t("noteHint")}>
                {(a) => <Textarea {...a} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />}
              </Field>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="outline" loading={acting === "DISMISS"} disabled={!!acting} onClick={() => act("DISMISS")}>
                  {t("dismiss")}
                </Button>
                {r.message && !r.message.removed && (
                  <Button variant="danger" loading={acting === "REMOVE_MESSAGE"} disabled={!!acting} onClick={() => act("REMOVE_MESSAGE")}>
                    {t("remove")}
                  </Button>
                )}
              </div>
            </>
          ) : (
            r.resolution && (
              <p className="rounded-sm bg-surface-1 px-4 py-3 text-[15px] text-heading">
                {t(`actions.${r.resolution.action}`)} {t("by", { name: r.resolution.by_name })}: {r.resolution.note}
              </p>
            )
          )}
        </div>
      )}
    </Dialog>
  );
}
