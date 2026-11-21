"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/query";
import { Playback, RecordingList, RecordingResponse, type RecordingUpdate } from "@/lib/api/schemas/recordings";

export function useMyRecordings(trainingId: string | null) {
  return useApiQuery({
    queryKey: ["me", "recordings", trainingId],
    queryFn: ({ signal }) => api("/me/recordings", { query: { training_id: trainingId }, schema: RecordingList, signal }).then((r) => r.items),
  });
}

export function useTeachRecordings() {
  return useApiQuery({
    queryKey: ["teach", "recordings"],
    refetchInterval: 60_000, // processing ones turn ready
    queryFn: ({ signal }) => api("/teach/recordings", { schema: RecordingList, signal }).then((r) => r.items),
  });
}

export function useRecording(id: string) {
  return useApiQuery({ queryKey: ["recording", id], queryFn: ({ signal }) => api(`/recordings/${id}`, { schema: RecordingResponse, signal }).then((r) => r.recording) });
}

/** REC-6: a fresh signed link each time; never cached past its expiry. */
export function usePlayback(id: string, enabled: boolean) {
  return useApiQuery({
    queryKey: ["playback", id],
    enabled,
    staleTime: 0,
    gcTime: 0,
    queryFn: ({ signal }) => api(`/recordings/${id}/playback`, { schema: Playback, signal }),
  });
}

/** REC-4: fire-and-forget; a lost save only costs a few seconds of resume position. */
export function saveProgress(id: string, positionSec: number) {
  return api(`/recordings/${id}/progress`, { method: "PUT", body: { position_sec: positionSec } }).catch(() => undefined);
}

export function useUpdateRecording(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RecordingUpdate) => api(`/recordings/${id}`, { method: "PATCH", body, schema: RecordingResponse }).then((r) => r.recording),
    onSuccess: (r) => {
      qc.setQueryData(["recording", id], r);
      void qc.invalidateQueries({ queryKey: ["teach", "recordings"] });
    },
  });
}

export function useDeleteRecording(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api(`/recordings/${id}`, { method: "DELETE" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["teach", "recordings"] }),
  });
}
