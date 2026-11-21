"use client";

import { ArrowLeft, Captions, Lock, VideoOff } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { LoadError } from "@/components/admin/catalog-admin";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/client";
import { saveProgress, usePlayback, useRecording } from "@/lib/api/hooks/recordings";
import type { Recording } from "@/lib/api/schemas/recordings";
import { useSession } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { formatClock, playableRange, resumeAt } from "@/lib/domain/recordings";
import { formatInZone } from "@/lib/domain/time";

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;

/** Turns the caption track on or off; the browser owns the track object. */
function showCaptions(el: HTMLVideoElement | null, on: boolean) {
  const track = el?.textTracks[0];
  if (track) track.mode = on ? "showing" : "hidden";
}

/** /learn/recordings/[id] and /teach/recordings/[id] (REC-4/6). */
export function RecordingPlayer({ id, backHref }: { id: string; backHref: string }) {
  const t = useTranslations("recordings");
  const query = useRecording(id);
  const { data: user } = useSession();
  if (query.isError) {
    return query.error instanceof ApiError && query.error.status === 404 ? (
      <EmptyState
        icon={VideoOff}
        title={t("notFound")}
        description={t("notFoundBody")}
        action={
          <Button asChild>
            <Link href={backHref}>{t("back")}</Link>
          </Button>
        }
      />
    ) : (
      <LoadError onRetry={query.refetch} />
    );
  }
  if (!query.data || !user) return <LoadingState />;
  return <Player recording={query.data} zone={user.timezone} backHref={backHref} />;
}

function Player({ recording: r, zone, backHref }: { recording: Recording; zone: string; backHref: string }) {
  const t = useTranslations("recordings");
  const ready = r.status === "READY";
  const playback = usePlayback(r.id, ready);
  const video = useRef<HTMLVideoElement>(null);
  const lastSaved = useRef(r.resume_sec);
  const [speed, setSpeed] = useState(1);
  const [captions, setCaptions] = useState(true);
  const [failed, setFailed] = useState(false);
  const range = playableRange(r.duration_sec, r.trim);

  // REC-4: save the position every 10 s of watching, on pause, and when leaving.
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    const save = () => {
      const pos = Math.floor(el.currentTime);
      if (Math.abs(pos - lastSaved.current) >= 1) {
        lastSaved.current = pos;
        void saveProgress(r.id, pos);
      }
    };
    const tick = setInterval(() => !el.paused && save(), 10_000);
    el.addEventListener("pause", save);
    return () => {
      clearInterval(tick);
      el.removeEventListener("pause", save);
      save();
    };
  }, [r.id, playback.data?.url]);

  useEffect(() => {
    if (video.current) video.current.playbackRate = speed;
  }, [speed]);

  useEffect(() => showCaptions(video.current, captions), [captions, playback.data?.captions_url]);

  return (
    <div className="mx-auto max-w-4xl">
      <Link href={backHref} className="mb-4 inline-flex min-h-11 items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline">
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t("back")}
      </Link>
      <header className="mb-4">
        <p className="text-sm font-medium text-primary">{r.subtitle}</p>
        <h1 className="text-[28px] leading-tight">{r.training.title}</h1>
        <p className="text-[15px]">
          {t("recordedOn", { when: formatInZone(r.recorded_at, zone, "EEEE d MMMM yyyy, HH:mm") })} · {formatClock(range.end - range.start)}
        </p>
      </header>

      {!ready ? (
        <p role="status" className="rounded-md border border-border bg-surface-1 p-6 text-center text-heading">
          {r.status === "PROCESSING" ? t("processing") : t("failed")}
        </p>
      ) : playback.isError || failed ? (
        <LoadError onRetry={() => (setFailed(false), void playback.refetch())} />
      ) : !playback.data ? (
        <div className="aspect-video w-full animate-pulse rounded-md bg-ink/90 motion-reduce:animate-none" aria-hidden="true" />
      ) : (
        <>
          {/* REC-6: no download button, no "save video as". */}
          <video
            ref={video}
            src={playback.data.url}
            controls
            controlsList="nodownload noremoteplayback"
            disablePictureInPicture
            onContextMenu={(e) => e.preventDefault()}
            playsInline
            preload="metadata"
            width={640}
            height={360}
            aria-label={t("videoLabel", { title: r.training.title })}
            className="aspect-video w-full rounded-md bg-ink"
            onLoadedMetadata={(e) => {
              e.currentTarget.currentTime = resumeAt(r.resume_sec, range);
              e.currentTarget.playbackRate = speed;
            }}
            onTimeUpdate={(e) => {
              // A trimmed recording plays only its kept part.
              const el = e.currentTarget;
              if (el.currentTime < range.start - 0.5) el.currentTime = range.start;
              if (el.currentTime > range.end) {
                el.pause();
                el.currentTime = range.end;
              }
            }}
            onError={() => {
              // REC-6: a link that has expired gets replaced; any other failure is shown, not retried in a loop.
              if (Date.parse(playback.data!.expires_at) <= Date.now() + 30_000) void playback.refetch();
              else setFailed(true);
            }}
          >
            {playback.data.captions_url && <track kind="captions" src={playback.data.captions_url} srcLang="en" label="English" default />}
          </video>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
            <div role="radiogroup" aria-label={t("speed")} className="inline-flex rounded-sm border border-border bg-white p-0.5">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={speed === s}
                  onClick={() => setSpeed(s)}
                  className={cn(
                    "min-h-10 min-w-12 rounded-[4px] px-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-primary",
                    speed === s ? "bg-primary text-white" : "text-heading hover:bg-surface-1",
                  )}
                >
                  {s}×
                </button>
              ))}
            </div>
            {playback.data.captions_url && (
              <label className="flex min-h-11 items-center gap-2 text-[15px] text-heading">
                <input type="checkbox" className="size-5 accent-primary" checked={captions} onChange={(e) => setCaptions(e.target.checked)} />
                <Captions aria-hidden="true" className="size-5" />
                {t("captions")}
              </label>
            )}
            {resumeAt(r.resume_sec, range) > range.start && <p className="text-sm">{t("resuming", { at: formatClock(resumeAt(r.resume_sec, range)) })}</p>}
          </div>
        </>
      )}

      <p className="mt-6 flex items-start gap-2 text-sm leading-relaxed">
        <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {r.kind === "COHORT" ? t("privacyCohort") : t("privacyOneOnOne")}
      </p>
    </div>
  );
}
