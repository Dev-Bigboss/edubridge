"use client";

import { Check, Circle } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { PersonAvatar } from "@/components/catalog/bits";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { MessageButton } from "@/components/messages/message-button";
import { useChecklist } from "@/lib/api/hooks/me";
import type { LearnerEnrolment } from "@/lib/api/schemas/payments";
import { cn } from "@/lib/cn";

/**
 * The video provider's "test your audio and video" page (Zoom has one at zoom.us/test). Placeholder
 * until the provider is confirmed (plan §8 Q1).
 */
const JOIN_TEST_URL = "https://meet.example.com/test";

/** ONB-5: getting ready for the first class. Each step ticks itself when the learner does it. */
export function EnrolmentChecklist({ item }: { item: LearnerEnrolment }) {
  const t = useTranslations("learner.checklist");
  const ti = useTranslations("inbox");
  const step = useChecklist(item.enrolment.id);
  const [meeting, setMeeting] = useState(false);
  const c = item.checklist;
  if (!c) return null;
  const done = [c.join_tested, c.resources_opened, c.met_instructor].filter(Boolean).length;
  const instructor = item.cohort.instructor;

  return (
    <section aria-label={t("title")} className="mb-4 rounded-md border border-primary/20 bg-surface-2 p-4">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="font-heading text-[15px] font-semibold text-heading">{t("title")}</h4>
        <p className="text-sm" aria-live="polite">
          {t("progress", { done, total: 3 })}
        </p>
      </div>
      <ul className="space-y-1">
        <Step done={c.join_tested} label={t("join")}>
          <a href={JOIN_TEST_URL} target="_blank" rel="noopener noreferrer" onClick={() => step.mutate({ item: "join_tested" })} className="font-medium text-primary underline-offset-4 hover:underline">
            {t("joinCta")}
          </a>
        </Step>
        <Step done={c.resources_opened} label={t("resources")}>
          <Link href={`/learn/resources?training=${item.training.id}`} onClick={() => step.mutate({ item: "resources_opened" })} className="font-medium text-primary underline-offset-4 hover:underline">
            {t("resourcesCta")}
          </Link>
        </Step>
        <Step done={c.met_instructor} label={t("instructor", { name: instructor.name })}>
          <Button variant="link" onClick={() => (setMeeting(true), step.mutate({ item: "met_instructor" }))}>
            {t("instructorCta")}
          </Button>
        </Step>
      </ul>
      <Button variant="link" className="mt-2 text-sm" onClick={() => step.mutate({ dismiss: true })}>
        {done === 3 ? t("doneHide") : t("hide")}
      </Button>
      {meeting && (
        <Dialog open onOpenChange={setMeeting} title={t("meetTitle", { name: instructor.name })}>
          <div className="flex items-start gap-4">
            <PersonAvatar name={instructor.name} url={instructor.avatar_url} size="lg" />
            <div>
              <p className="font-heading text-lg font-semibold text-heading">{instructor.name}</p>
              {instructor.headline && <p className="leading-relaxed">{instructor.headline}</p>}
              <p className="mt-3 text-[15px] leading-relaxed">{t("meetBody", { cohort: item.cohort.name })}</p>
              <div className="mt-4">
                <MessageButton role="LEARNER" userId={instructor.id}>
                  {ti("messageInstructor", { name: instructor.name })}
                </MessageButton>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </section>
  );
}

function Step({ done, label, children }: { done: boolean; label: string; children: ReactNode }) {
  const t = useTranslations("learner.checklist");
  return (
    <li className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1">
      <span className={cn("flex size-6 items-center justify-center rounded-full", done ? "bg-success text-white" : "text-body")}>
        {done ? <Check aria-hidden="true" className="size-4" /> : <Circle aria-hidden="true" className="size-5" />}
      </span>
      <span className={cn("flex-1 text-[15px]", done ? "text-body line-through" : "text-heading")}>
        {label}
        <span className="sr-only">{done ? `, ${t("doneLabel")}` : `, ${t("todoLabel")}`}</span>
      </span>
      {children}
    </li>
  );
}
