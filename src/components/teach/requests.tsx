"use client";

import { CalendarCheck, Clock, Inbox, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { LoadError } from "@/components/admin/catalog-admin";
import { FormError } from "@/components/auth/auth-card";
import { CalendarButton, joinState } from "@/components/booking/calendar-button";
import { SlotPicker } from "@/components/booking/slot-picker";
import { useCountdown } from "@/components/booking/booking-detail";
import { PersonAvatar } from "@/components/catalog/bits";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/client";
import { useBookingAction, useSlots, useTeachBookings, type BookingActionName } from "@/lib/api/hooks/bookings";
import type { Booking } from "@/lib/api/schemas/bookings";
import type { User } from "@/lib/api/schemas/auth";
import { useSession } from "@/lib/auth/session";
import { formatDuration, formatMoney } from "@/lib/domain/money";
import { formatInZone, formatSessionTime, formatTimeRange } from "@/lib/domain/time";

/** /teach/requests (OTO-4/6): what's waiting for me, what's waiting for the learner, what's coming up. */
export function Requests() {
  const t = useTranslations("teach.requests");
  const query = useTeachBookings();
  const { data: user } = useSession();
  // "Coming up" is judged against when the page opened; it refreshes every minute with the list.
  const [now] = useState(() => Date.now());
  if (!user) return <LoadingState />;
  const items = query.data?.items ?? [];
  const groups = [
    { key: "forYou", items: items.filter((b) => b.status === "PENDING_INSTRUCTOR").sort((a, b) => (a.expires_at ?? "").localeCompare(b.expires_at ?? "")) },
    { key: "forLearner", items: items.filter((b) => b.status === "COUNTER_PROPOSED") },
    { key: "upcoming", items: items.filter((b) => b.status === "ACCEPTED" && Date.parse(b.end_utc) > now) },
  ] as const;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("title")} description={t("intro")} />
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <LoadError onRetry={query.refetch} />
      ) : groups.every((g) => g.items.length === 0) ? (
        <EmptyState icon={Inbox} title={t("empty")} description={t("emptyBody")} />
      ) : (
        groups.map(
          (g) =>
            g.items.length > 0 && (
              <section key={g.key} aria-labelledby={`req-${g.key}`} className="mb-8">
                <h2 id={`req-${g.key}`} className="mb-3 text-section">
                  {t(`groups.${g.key}`)} <span className="text-base font-normal text-body">({g.items.length})</span>
                </h2>
                <ul className="space-y-4">
                  {g.items.map((b) => (
                    <li key={b.id}>
                      <RequestCard booking={b} user={user} />
                    </li>
                  ))}
                </ul>
              </section>
            ),
        )
      )}
    </div>
  );
}

function RequestCard({ booking: b, user }: { booking: Booking; user: User }) {
  const t = useTranslations("teach.requests");
  const zone = user.timezone;
  const countdown = useCountdown(b.status === "PENDING_INSTRUCTOR" || b.status === "COUNTER_PROPOSED" ? b.expires_at : null);
  const [dialog, setDialog] = useState<"decline" | "propose" | null>(null);
  const action = useBookingAction(b.id);
  const titleId = `req-${b.id}`;
  const join = joinState(b);

  const accept = async () => {
    try {
      await action.mutateAsync({ action: "accept" });
      toast.success(t("accepted", { name: b.learner.name }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("failed"));
    }
  };

  return (
    <article aria-labelledby={titleId} className="rounded-lg border border-border-subtle bg-white p-5 md:p-6">
      <div className="mb-4 flex flex-wrap items-start gap-4">
        <PersonAvatar name={b.learner.name} url={null} />
        <div className="min-w-0 flex-1">
          <h3 id={titleId} className="text-lg">
            {b.learner.name}
          </h3>
          <p className="text-[15px]">{b.training.title}</p>
        </div>
        {countdown && (
          <p className="flex items-center gap-1.5 rounded-full bg-warning-soft px-3 py-1 text-sm font-medium text-warning">
            <Clock aria-hidden="true" className="size-4" />
            {b.status === "PENDING_INSTRUCTOR" ? t("answerWithin", { countdown }) : t("learnerHas", { countdown })}
          </p>
        )}
      </div>

      <dl className="mb-4 grid gap-3 text-[15px] sm:grid-cols-3">
        <Fact label={b.status === "COUNTER_PROPOSED" ? t("theyAsked") : t("when")}>
          {formatInZone(b.start_utc, zone, "EEE d MMM")}, {formatTimeRange(b.start_utc, b.end_utc, zone)}
        </Fact>
        <Fact label={t("length")}>{formatDuration(b.duration_min)}</Fact>
        <Fact label={t("price")}>{formatMoney({ amount: b.breakdown.total, currency: b.breakdown.currency })}</Fact>
        {b.proposal && (
          <Fact label={t("youProposed")}>
            {formatInZone(b.proposal.start_utc, zone, "EEE d MMM")}, {formatTimeRange(b.proposal.start_utc, b.proposal.end_utc, zone)}
          </Fact>
        )}
      </dl>
      {b.note && <p className="mb-4 rounded-sm bg-surface-1 px-4 py-3 leading-relaxed whitespace-pre-line text-heading">“{b.note}”</p>}

      {b.status === "PENDING_INSTRUCTOR" && (
        <div className="flex flex-wrap gap-2 border-t border-border-subtle pt-4">
          <Button onClick={() => void accept()} loading={action.isPending && action.variables?.action === "accept"}>
            {t("accept")}
          </Button>
          <Button variant="outline" onClick={() => setDialog("propose")}>
            {t("propose")}
          </Button>
          <Button variant="ghost" className="text-danger hover:bg-danger-soft" onClick={() => setDialog("decline")}>
            {t("decline")}
          </Button>
        </div>
      )}
      {b.status === "ACCEPTED" && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle pt-4">
          {join === "OPEN" ? (
            <Button asChild>
              <a href={b.meeting_url!} target="_blank" rel="noreferrer">
                <Video aria-hidden="true" className="size-4" />
                {t("join")}
              </a>
            </Button>
          ) : (
            <p className="flex items-center gap-2 text-sm">
              <CalendarCheck aria-hidden="true" className="size-4 text-success" />
              {t("joinOpens")}
            </p>
          )}
          <CalendarButton booking={b} withName={b.learner.name} />
        </div>
      )}

      {dialog === "decline" && <DeclineDialog booking={b} onClose={() => setDialog(null)} />}
      {dialog === "propose" && <ProposeDialog booking={b} user={user} onClose={() => setDialog(null)} />}
    </article>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm">{label}</dt>
      <dd className="text-heading">{children}</dd>
    </div>
  );
}

function DeclineDialog({ booking: b, onClose }: { booking: Booking; onClose: () => void }) {
  const t = useTranslations("teach.requests");
  const action = useBookingAction(b.id);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    if (reason.trim().length < 5) return setError(t("reasonRequired"));
    try {
      await action.mutateAsync({ action: "decline", body: { reason: reason.trim() } });
      toast.success(t("declined"));
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? (err.fieldErrors.reason?.[0] ?? err.message) : t("failed"));
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t("declineTitle", { name: b.learner.name })} description={t("declineBody")}>
      <div className="space-y-5">
        <Field label={t("reason")} hint={t("reasonHint")} error={error ?? undefined}>
          {(a) => <Textarea {...a} rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
        <Actions onClose={onClose} pending={action.isPending} onConfirm={() => void submit()} cta={t("declineCta")} danger />
      </div>
    </Dialog>
  );
}

function ProposeDialog({ booking: b, user, onClose }: { booking: Booking; user: User; onClose: () => void }) {
  const t = useTranslations("teach.requests");
  const slots = useSlots(b.training.id, user.id, b.duration_min);
  const action = useBookingAction(b.id);
  const [start, setStart] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const options = (slots.data?.slots ?? []).filter((s) => s !== b.start_utc);
  const submit = async () => {
    if (!start) return setError(t("pickTime"));
    try {
      await action.mutateAsync({ action: "propose" as BookingActionName, body: { start_utc: start, note: note.trim() || null } });
      toast.success(t("proposed", { name: b.learner.name }));
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("failed"));
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t("proposeTitle")} description={t("proposeBody", { length: formatDuration(b.duration_min), name: b.learner.name })} wide>
      <div className="space-y-5">
        {slots.isPending ? (
          <LoadingState label={t("loadingTimes")} />
        ) : options.length === 0 ? (
          <p className="text-heading">{t("noTimes")}</p>
        ) : (
          <SlotPicker slots={options} zone={user.timezone} value={start} onChange={setStart} />
        )}
        {start && <p className="text-[15px] text-heading">{t("youllPropose", { when: formatSessionTime(start, user.timezone) })}</p>}
        <Field label={t("noteLabel")} hint={t("noteHint")}>
          {(a) => <Textarea {...a} rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />}
        </Field>
        <FormError message={error} />
        <Actions onClose={onClose} pending={action.isPending} onConfirm={() => void submit()} cta={t("proposeCta")} />
      </div>
    </Dialog>
  );
}

function Actions({ onClose, onConfirm, pending, cta, danger }: { onClose: () => void; onConfirm: () => void; pending: boolean; cta: string; danger?: boolean }) {
  const t = useTranslations("teach.requests");
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <Button variant="ghost" onClick={onClose}>
        {t("goBack")}
      </Button>
      <Button variant={danger ? "danger" : "primary"} loading={pending} onClick={onConfirm}>
        {cta}
      </Button>
    </div>
  );
}
