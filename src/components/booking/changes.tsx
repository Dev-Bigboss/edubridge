"use client";

import { CalendarClock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/client";
import { useBookingAction, useSlots } from "@/lib/api/hooks/bookings";
import type { Booking } from "@/lib/api/schemas/bookings";
import { formatDuration, formatMoney } from "@/lib/domain/money";
import { cancellationRefund, describeTiers } from "@/lib/domain/policy";
import { formatInZone, formatSessionTime, formatTimeRange } from "@/lib/domain/time";
import { SlotPicker } from "./slot-picker";

type Side = "LEARNER" | "INSTRUCTOR";

/** OTO-9: either side asks to move a confirmed session to another of the instructor's free times. */
export function RescheduleDialog({ booking: b, zone, onClose }: { booking: Booking; zone: string; onClose: () => void }) {
  const t = useTranslations("booking.changes");
  const slots = useSlots(b.training.id, b.instructor.id, b.duration_min);
  const action = useBookingAction(b.id);
  const [start, setStart] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!start) return setError(t("pickTime"));
    try {
      await action.mutateAsync({ action: "reschedule", body: { start_utc: start, note: note.trim() || null } });
      toast.success(t("rescheduleSent"));
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("failed"));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t("rescheduleTitle")} description={t("rescheduleBody", { length: formatDuration(b.duration_min) })} wide>
      <div className="space-y-5">
        <p className="text-[15px]">
          {t("currently")} <span className="font-medium text-heading">{formatSessionTime(b.start_utc, zone)}</span>
        </p>
        {slots.isPending ? (
          <LoadingState label={t("loadingTimes")} />
        ) : (slots.data?.slots.length ?? 0) === 0 ? (
          <p className="text-heading">{t("noTimes")}</p>
        ) : (
          <SlotPicker slots={slots.data!.slots} zone={zone} value={start} onChange={setStart} />
        )}
        <Field label={t("note")} hint={t("noteHint")}>
          {(a) => <Textarea {...a} rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />}
        </Field>
        <FormError message={error} />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            {t("goBack")}
          </Button>
          <Button loading={action.isPending} onClick={() => void submit()}>
            {t("sendReschedule")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

/** OTO-9, PAY-5: say what will come back before anyone confirms, under the rules the session was booked with. */
export function CancelDialog({ booking: b, side, onClose }: { booking: Booking; side: Side; onClose: () => void }) {
  const t = useTranslations("booking.changes");
  const action = useBookingAction(b.id);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Judged at the moment the dialog opens; the server recomputes on submit.
  const [refund] = useState(() => cancellationRefund({ policy: b.policy, total: b.breakdown.total, startUtc: b.start_utc, by: side }));
  const money = (amount: number) => formatMoney({ amount, currency: b.breakdown.currency });
  const other = side === "LEARNER" ? b.instructor.name : b.learner.name;

  const submit = async () => {
    if (reason.trim().length < 5) return setError(t("reasonRequired"));
    try {
      const res = await action.mutateAsync({ action: "cancel", body: { reason: reason.trim() } });
      toast.success(t("cancelled", { amount: money(res.cancellation?.refund_amount ?? 0) }));
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? (err.fieldErrors.reason?.[0] ?? err.message) : t("failed"));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t("cancelTitle")} description={t("cancelBody", { name: other })}>
      <div className="space-y-5">
        <div className="rounded-sm bg-surface-1 p-4">
          <p className="font-heading text-lg font-semibold text-heading">
            {side === "LEARNER"
              ? t("youGetBack", { amount: money(refund.amount), percent: refund.percent })
              : t("theyGetBack", { name: other, amount: money(refund.amount), percent: refund.percent })}
          </p>
          <p className="text-sm">
            {t("ofPaid", { total: money(b.breakdown.total) })} ·{" "}
            {t("notice", { hours: Math.floor(refund.hours_before) })}
          </p>
          {side === "LEARNER" && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-medium text-primary">{t("policy")}</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {describeTiers(b.policy.learner_tiers).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
        <Field label={t("reason")} hint={t("reasonHint", { name: other })} error={error ?? undefined}>
          {(a) => <Textarea {...a} rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            {t("keep")}
          </Button>
          <Button variant="danger" loading={action.isPending} onClick={() => void submit()}>
            {refund.amount > 0 ? t("cancelAndRefund", { amount: money(refund.amount) }) : t("cancelNoRefund")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

/** A pending reschedule: the asker waits; the other side accepts or keeps the original time. */
export function ReschedulePanel({ booking: b, side, zone }: { booking: Booking; side: Side; zone: string }) {
  const t = useTranslations("booking.changes");
  const action = useBookingAction(b.id);
  if (!b.reschedule) return null;
  const mine = b.reschedule.requested_by === side;
  const other = side === "LEARNER" ? b.instructor.name : b.learner.name;
  const respond = async (name: "accept-reschedule" | "decline-reschedule") => {
    try {
      await action.mutateAsync({ action: name });
      toast.success(name === "accept-reschedule" ? t("moved") : t("kept"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("failed"));
    }
  };
  return (
    <section aria-label={t("rescheduleRegion")} className="rounded-md border border-primary/25 bg-surface-2 p-5">
      <p className="mb-1 flex items-center gap-2 font-heading text-lg font-semibold text-heading">
        <CalendarClock aria-hidden="true" className="size-5 text-primary" />
        {mine ? t("youAsked") : t("theyAsked", { name: other })}
      </p>
      <p className="font-medium text-heading">
        {formatInZone(b.reschedule.start_utc, zone, "EEEE d MMMM")}, {formatTimeRange(b.reschedule.start_utc, b.reschedule.end_utc, zone)}
      </p>
      {b.reschedule.note && <p className="mt-1 leading-relaxed">“{b.reschedule.note}”</p>}
      <p className="mt-2 mb-3 text-sm">{mine ? t("waitingFor", { name: other }) : t("orKeep", { when: formatSessionTime(b.start_utc, zone) })}</p>
      {!mine && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void respond("accept-reschedule")} loading={action.isPending && action.variables?.action === "accept-reschedule"}>
            {t("acceptNew")}
          </Button>
          <Button variant="outline" onClick={() => void respond("decline-reschedule")} loading={action.isPending && action.variables?.action === "decline-reschedule"}>
            {t("keepOriginal")}
          </Button>
        </div>
      )}
    </section>
  );
}
