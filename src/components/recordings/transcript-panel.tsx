"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { LoadError } from "@/components/admin/catalog-admin";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { LoadingState } from "@/components/ui/spinner";
import { useTranscript } from "@/lib/api/hooks/recordings";
import { cn } from "@/lib/cn";
import { activeSegmentIndex, formatClock } from "@/lib/domain/recordings";

/**
 * REC-4: the recording's transcript beside the player. Each line seeks the video; the line being spoken
 * is highlighted and kept in view inside the panel (never scrolling the page). Search filters the lines.
 */
export function TranscriptPanel({ recordingId, currentSec, onSeek }: { recordingId: string; currentSec: number; onSeek: (sec: number) => void }) {
  const t = useTranslations("recordings.transcript");
  const query = useTranscript(recordingId, true);
  const [q, setQ] = useState("");
  const list = useRef<HTMLOListElement>(null);

  const segments = useMemo(() => query.data?.segments ?? [], [query.data]);
  const active = activeSegmentIndex(segments, currentSec);
  const needle = q.trim().toLocaleLowerCase();
  const shown = needle ? segments.map((s, i) => ({ s, i })).filter(({ s }) => s.text.toLocaleLowerCase().includes(needle)) : segments.map((s, i) => ({ s, i }));

  // Keep the spoken line visible while nobody is searching.
  useEffect(() => {
    const box = list.current;
    if (!box || needle || active < 0) return;
    const el = box.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (el.offsetTop < box.scrollTop || el.offsetTop + el.offsetHeight > box.scrollTop + box.clientHeight) {
      box.scrollTo({ top: el.offsetTop - box.clientHeight / 3, behavior: reduce ? "auto" : "smooth" });
    }
  }, [active, needle]);

  return (
    <section aria-labelledby="transcript-title" className="mt-6 rounded-lg border border-border-subtle bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
        <h2 id="transcript-title" className="text-lg">
          {t("title")}
        </h2>
        {segments.length > 0 && (
          <div className="relative w-full sm:w-64">
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-body" />
            <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("search")} placeholder={t("search")} className="pl-9" />
          </div>
        )}
      </div>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <div className="p-4">
          <LoadError onRetry={query.refetch} />
        </div>
      ) : segments.length === 0 ? (
        <EmptyState icon={Search} title={t("empty")} description={t("emptyBody")} className="border-0" />
      ) : (
        <>
          <p aria-live="polite" className="sr-only">
            {needle ? t("matches", { count: shown.length }) : ""}
          </p>
          {shown.length === 0 ? (
            <p className="px-4 py-6 text-center text-[15px]">{t("noMatches", { q: q.trim() })}</p>
          ) : (
            <ol ref={list} className="relative max-h-80 overflow-y-auto overscroll-contain py-1">
              {shown.map(({ s, i }) => (
                <li key={i} data-index={i}>
                  <button
                    type="button"
                    onClick={() => onSeek(s.start_sec)}
                    aria-current={i === active ? "true" : undefined}
                    aria-label={t("seekLabel", { at: formatClock(s.start_sec), text: s.text })}
                    className={cn(
                      "flex min-h-11 w-full items-start gap-3 px-4 py-2 text-left text-[15px] leading-relaxed transition-colors duration-150",
                      "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
                      i === active ? "bg-surface-1 text-heading" : "hover:bg-surface-1",
                    )}
                  >
                    <span className={cn("shrink-0 pt-px font-mono text-sm tabular-nums", i === active ? "font-semibold text-primary" : "text-body")}>{formatClock(s.start_sec)}</span>
                    <span>{s.text}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
          <p className="border-t border-border-subtle px-4 py-2 text-sm">{t("source")}</p>
        </>
      )}
    </section>
  );
}
