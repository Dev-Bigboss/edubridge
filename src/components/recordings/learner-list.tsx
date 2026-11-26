"use client";

import { PlayCircle, Video } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { LoadError } from "@/components/admin/catalog-admin";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/spinner";
import { useMyRecordings } from "@/lib/api/hooks/recordings";
import { useSession } from "@/lib/auth/session";
import { formatClock, playableRange } from "@/lib/domain/recordings";
import { formatInZone } from "@/lib/domain/time";

/** /learn/recordings (REC-2/3): recordings of my sessions, newest first, with how far I got. */
export function LearnerRecordings() {
  const t = useTranslations("recordings");
  const params = useSearchParams();
  const training = params.get("training");
  const query = useMyRecordings(training);
  const { data: user } = useSession();
  const zone = user?.timezone ?? "UTC";
  const title = query.data?.[0]?.training.title;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={training && title ? t("titleFor", { training: title }) : t("title")} description={t("intro")} />
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <LoadError onRetry={query.refetch} />
      ) : query.data.length === 0 ? (
        <EmptyState
          icon={Video}
          title={t("empty")}
          description={t("emptyBody")}
          action={
            <Button asChild variant="outline">
              <Link href="/learn/trainings">{t("toTrainings")}</Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border-subtle rounded-lg border border-border-subtle bg-white">
          {query.data.map((r) => {
            const range = playableRange(r.duration_sec, r.trim);
            const length = range.end - range.start;
            const watched = Math.min(100, Math.round((Math.max(0, r.resume_sec - range.start) / Math.max(1, length)) * 100));
            return (
              <li key={r.id}>
                <Link
                  href={`/learn/recordings/${r.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors duration-150 hover:bg-surface-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                >
                  <PlayCircle aria-hidden="true" className="size-8 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-heading">{formatInZone(r.recorded_at, zone, "EEEE d MMMM")}</span>
                    <span className="block text-sm">
                      {r.training.title} · {r.subtitle} · {formatClock(length)}
                    </span>
                    {watched > 0 && (
                      <span className="mt-1.5 flex items-center gap-2 text-xs">
                        <span aria-hidden="true" className="h-1.5 w-32 overflow-hidden rounded-full bg-surface-2">
                          <span className="block h-full rounded-full bg-primary" style={{ width: `${watched}%` }} />
                        </span>
                        {t("watched", { percent: watched })}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
