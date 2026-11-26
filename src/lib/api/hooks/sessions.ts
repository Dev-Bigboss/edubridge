"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/query";
import { ScheduleResponse, SessionDetail, type AttendanceInput } from "@/lib/api/schemas/sessions";

/** The last week (for attendance still to take) and the next four. Refreshed every minute for join buttons. */
export function useSchedule() {
  return useApiQuery({
    queryKey: ["teach", "schedule"],
    refetchInterval: 60_000,
    queryFn: ({ signal }) => api("/teach/schedule", { query: { days: 35 }, schema: ScheduleResponse, signal }).then((r) => r.items),
  });
}

export function useTeachingSession(id: string) {
  return useApiQuery({
    queryKey: ["session", id],
    queryFn: ({ signal }) => api(`/sessions/${encodeURIComponent(id)}`, { schema: SessionDetail, signal }),
  });
}

export function useSaveAttendance(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AttendanceInput) => api(`/sessions/${encodeURIComponent(id)}/attendance`, { method: "PUT", body, schema: SessionDetail }),
    onSuccess: (res) => {
      qc.setQueryData(["session", id], res);
      void qc.invalidateQueries({ queryKey: ["teach"] });
    },
  });
}
