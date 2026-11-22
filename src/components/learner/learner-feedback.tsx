"use client";

import { ArrowDown, ArrowUp, Download, MessageSquareText, Minus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { LoadError } from "@/components/admin/catalog-admin";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { PageHeader, TableCard, td, th } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/spinner";
import { useMyFeedback } from "@/lib/api/hooks/feedback";
import type { Feedback } from "@/lib/api/schemas/feedback";
import { useSession } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { LEVEL_LABEL, progress, type RubricLevel } from "@/lib/domain/feedback";
import { browserTimeZone, formatInZone } from "@/lib/domain/time";
import { formatBytes } from "@/lib/domain/uploads";

const level = (n: number) => `${n} · ${LEVEL_LABEL[n as RubricLevel] ?? ""}`;

/** /learn/feedback (FDB-2): progress per criterion, then every piece of feedback, newest first, per training. */
export function LearnerFeedback() {
  const t = useTranslations("learner.feedback");
  const params = useSearchParams();
  const router = useRouter();
  const query = useMyFeedback(null);
  const { data: user } = useSession();
  const zone = user?.timezone ?? browserTimeZone();

  const trainings = useMemo(() => {
    const seen = new Map<string, string>();
    for (const f of query.data ?? []) if (!seen.has(f.training_id)) seen.set(f.training_id, f.training_title);
    return [...seen.entries()].map(([id, title]) => ({ id, title }));
  }, [query.data]);
  const selected = trainings.find((x) => x.id === params.get("training"))?.id ?? trainings[0]?.id ?? null;
  const items = (query.data ?? []).filter((f) => f.training_id === selected);
  const rows = progress(items);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("title")} description={t("intro")} />
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <LoadError onRetry={query.refetch} />
      ) : trainings.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title={t("empty")}
          description={t("emptyBody")}
          action={
            <Button asChild variant="outline">
              <Link href="/learn/trainings">{t("toTrainings")}</Link>
            </Button>
          }
        />
      ) : (
        <>
          {trainings.length > 1 && (
            <Field label={t("training")} className="mb-6 max-w-md">
              {(a) => (
                <Select {...a} value={selected ?? ""} onChange={(e) => router.replace(`/learn/feedback?training=${e.target.value}`, { scroll: false })}>
                  {trainings.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.title}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}

          <section aria-labelledby="progress" className="mb-8">
            <h2 id="progress" className="mb-1 text-lg">
              {t("progress")}
            </h2>
            <p className="mb-3 text-[15px]">{t("progressHint", { count: items.length })}</p>
            <TableCard label={t("progress")}>
              <table className="w-full text-[15px]">
              <thead className="border-b border-border-subtle bg-surface-1">
                <tr>
                  <th scope="col" className={th}>{t("criterion")}</th>
                  <th scope="col" className={th}>{t("first")}</th>
                  <th scope="col" className={th}>{t("latest")}</th>
                  <th scope="col" className={th}>{t("change")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {rows.map((r) => (
                  <tr key={r.label}>
                    <th scope="row" className={cn(td, "text-left font-medium text-heading")}>{r.label}</th>
                    <td className={td}>{level(r.first)}</td>
                    <td className={cn(td, "font-medium text-heading")}>{level(r.latest)}</td>
                    <td className={td}>
                      <span className={cn("inline-flex items-center gap-1 font-medium", r.change > 0 ? "text-success" : r.change < 0 ? "text-danger" : "text-body")}>
                        {r.change > 0 ? <ArrowUp aria-hidden="true" className="size-4" /> : r.change < 0 ? <ArrowDown aria-hidden="true" className="size-4" /> : <Minus aria-hidden="true" className="size-4" />}
                        {r.count < 2 ? t("oneSoFar") : r.change === 0 ? t("same") : t(r.change > 0 ? "up" : "down", { n: Math.abs(r.change) })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </TableCard>
          </section>

          <section aria-labelledby="history">
            <h2 id="history" className="mb-3 text-lg">
              {t("history")}
            </h2>
            <ol className="space-y-4">
              {items.map((f) => (
                <li key={f.id}>
                  <FeedbackCard f={f} zone={zone} />
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </div>
  );
}

function FeedbackCard({ f, zone }: { f: Feedback; zone: string }) {
  const t = useTranslations("learner.feedback");
  const when = formatInZone(f.session_start_utc || f.created_at, zone, "EEEE d MMMM");
  const titleId = `fb-${f.id}`;
  const block = (label: string, text: string) =>
    text ? (
      <div>
        <h4 className="font-heading text-sm font-semibold text-heading">{label}</h4>
        <p className="leading-relaxed whitespace-pre-line">{text}</p>
      </div>
    ) : null;
  return (
    <article aria-labelledby={titleId} className="rounded-lg border border-border-subtle bg-white p-5 md:p-6">
      <header className="mb-3">
        <h3 id={titleId} className="text-base font-semibold text-heading">
          {t(f.session_kind === "COHORT" ? "classOn" : "sessionOn", { date: when })}
        </h3>
        <p className="text-sm">
          {t("from", { name: f.instructor.name })}
          {f.updated_at !== f.created_at && ` · ${t("edited")}`}
        </p>
      </header>
      <ul aria-label={t("scores")} className="mb-4 flex flex-wrap gap-2">
        {f.rubric.criteria.map((c) => (
          <li key={c.key} className="rounded-full bg-surface-2 px-3 py-1 text-sm text-heading">
            {c.label}: <span className="font-semibold">{level(f.scores[c.key])}</span>
          </li>
        ))}
      </ul>
      <div className="space-y-3 text-[15px]">
        <p className="leading-relaxed whitespace-pre-line text-heading">{f.comment}</p>
        {block(t("strengths"), f.strengths)}
        {block(t("improvements"), f.improvements)}
        <div className="rounded-sm border-l-4 border-primary bg-surface-1 px-4 py-3">
          <h4 className="font-heading text-sm font-semibold text-heading">{t("nextSteps")}</h4>
          <p className="leading-relaxed whitespace-pre-line text-heading">{f.next_steps}</p>
        </div>
        {(f.assignment_title || f.attachment) && (
          <div className="flex flex-wrap items-center gap-3">
            {f.assignment_title && <p className="flex-1 text-heading">{t("about", { title: f.assignment_title })}</p>}
            {f.attachment?.url && (
              <Button asChild variant="outline">
                <a href={f.attachment.url} download={f.attachment.name}>
                  <Download aria-hidden="true" className="size-4" />
                  <span className="sr-only">{t("download")} </span>
                  {f.attachment.name} ({formatBytes(f.attachment.size_bytes)})
                </a>
              </Button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
