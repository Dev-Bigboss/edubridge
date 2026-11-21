"use client";

import { useParams } from "next/navigation";
import { RecordingPlayer } from "@/components/recordings/player";

export function RecordingFromUrl() {
  const { id } = useParams<{ id: string }>();
  return <RecordingPlayer id={id} backHref="/learn/recordings" />;
}
