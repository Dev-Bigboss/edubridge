"use client";

import { keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { api } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/query";
import {
  AvailabilityResponse,
  BookingCheckout,
  BookingList,
  BookingQuote,
  BookingResponse,
  SlotsResponse,
  type AvailabilityInput,
  type BookingRequest,
} from "@/lib/api/schemas/bookings";

export function useMyAvailability() {
  return useApiQuery({
    queryKey: ["teach", "availability"],
    queryFn: ({ signal }) => api("/teach/availability", { schema: AvailabilityResponse, signal }).then((r) => r.availability),
  });
}

export function useSaveAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AvailabilityInput) => api("/teach/availability", { method: "PUT", body, schema: AvailabilityResponse }),
    onSuccess: (r) => {
      qc.setQueryData(["teach", "availability"], r.availability);
      void qc.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}

/** OTO-2: free starts for 4 weeks from `from`. Refreshed every minute: slots go as others book. */
export function useSlots(trainingId: string, instructorId: string | null, durationMin: number) {
  return useApiQuery({
    queryKey: ["slots", trainingId, instructorId, durationMin],
    enabled: !!instructorId,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
    queryFn: ({ signal }) =>
      api(`/trainings/${trainingId}/slots`, { query: { instructor_id: instructorId, duration_min: durationMin, days: 28 }, schema: SlotsResponse, signal }),
  });
}

export function useBookingQuote(trainingId: string, instructorId: string | null, durationMin: number) {
  return useApiQuery({
    queryKey: ["booking-quote", trainingId, instructorId, durationMin],
    enabled: !!instructorId,
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) =>
      api("/bookings/quote", { query: { training_id: trainingId, instructor_id: instructorId, duration_min: durationMin }, schema: BookingQuote, signal }),
  });
}

/** PAY-4/8: one key per booking page visit; a refused request gets a new one. */
export function useRequestBooking() {
  const key = useRef<string | null>(null);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BookingRequest) => {
      key.current ??= crypto.randomUUID();
      return api("/bookings", { method: "POST", body, idempotencyKey: key.current, schema: BookingCheckout });
    },
    onError: () => {
      key.current = null;
      void qc.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}

/** Polls while the card authorisation is still landing (the webhook), then stops. */
export function useBooking(id: string) {
  return useApiQuery({
    queryKey: ["booking", id],
    queryFn: ({ signal }) => api(`/bookings/${id}`, { schema: BookingResponse, signal }).then((r) => r.booking),
    refetchInterval: (q) => (q.state.data?.status === "DRAFT" && q.state.data.payment_status === "PENDING" ? 1500 : false),
  });
}

export function useMyBookings() {
  return useApiQuery({ queryKey: ["me", "bookings"], queryFn: ({ signal }) => api("/me/bookings", { schema: BookingList, signal }) });
}

export function useAdminBookings(filters: { status?: string; q?: string }) {
  return useApiQuery({
    queryKey: ["admin", "bookings", filters],
    queryFn: ({ signal }) => api("/admin/bookings", { query: filters, schema: BookingList, signal }),
  });
}

export function useTeachBookings() {
  return useApiQuery({
    queryKey: ["teach", "bookings"],
    refetchInterval: 60_000,
    queryFn: ({ signal }) => api("/teach/bookings", { schema: BookingList, signal }),
  });
}

export type BookingActionName =
  | "accept"
  | "decline"
  | "propose"
  | "accept-proposal"
  | "decline-proposal"
  | "reschedule"
  | "accept-reschedule"
  | "decline-reschedule"
  | "cancel";

/** Accepting captures money, so a double click must not send twice: the state machine refuses the second. */
export function useBookingAction(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ action, body }: { action: BookingActionName; body?: Record<string, unknown> }) =>
      api(`/bookings/${id}/${action}`, { method: "POST", body: body ?? {}, schema: BookingResponse }).then((r) => r.booking),
    onSuccess: (booking) => {
      qc.setQueryData(["booking", id], booking);
      void qc.invalidateQueries({ queryKey: ["teach", "bookings"] });
      void qc.invalidateQueries({ queryKey: ["me", "bookings"] });
      void qc.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}
