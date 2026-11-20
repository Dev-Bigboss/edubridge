"use client";

import { useParams } from "next/navigation";
import { AttendanceSheet } from "@/components/teach/attendance";

export function SessionFromUrl() {
  const { id } = useParams<{ id: string }>();
  return <AttendanceSheet id={decodeURIComponent(id)} />;
}
