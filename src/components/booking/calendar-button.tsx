"use client";

import { CalendarPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { Booking } from "@/lib/api/schemas/bookings";
import { buildIcs } from "@/lib/domain/ics";

/** OTO-8: the same invite that's emailed, as a download (works with Google, Outlook and Apple calendars). */
export function CalendarButton({ booking, withName }: { booking: Booking; withName: string }) {
  const t = useTranslations("booking.calendar");
  const download = () => {
    const ics = buildIcs({
      uid: booking.id,
      start: booking.start_utc,
      end: booking.end_utc,
      title: t("title", { training: booking.training.title, name: withName }),
      description: booking.note ?? booking.training.title,
      url: booking.meeting_url,
      sequence: booking.timeline.filter((e) => e.event === "RESCHEDULE_ACCEPTED").length,
    });
    const href = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href, download: `edubridge-session-${booking.id}.ics` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  };
  return (
    <Button variant="outline" onClick={download}>
      <CalendarPlus aria-hidden="true" className="size-4" />
      {t("add")}
    </Button>
  );
}

/** COH-4 style: the join link works from 15 minutes before the start until the end. */
export function joinState(b: Pick<Booking, "start_utc" | "end_utc" | "meeting_url">, now = new Date()): "SOON" | "OPEN" | "ENDED" | "NONE" {
  if (!b.meeting_url) return "NONE";
  const t = now.getTime();
  if (t > Date.parse(b.end_utc)) return "ENDED";
  return t >= Date.parse(b.start_utc) - 15 * 60_000 ? "OPEN" : "SOON";
}
