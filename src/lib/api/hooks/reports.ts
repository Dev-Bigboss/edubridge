"use client";

import { API_BASE_URL, ApiError, api } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/query";
import { AdminDashboard } from "@/lib/api/schemas/reports";
import type { DashboardPeriod, ReportType } from "@/lib/domain/reports";

export function useAdminDashboard(days: DashboardPeriod) {
  return useApiQuery({ queryKey: ["admin", "dashboard", days], queryFn: ({ signal }) => api("/admin/dashboard", { query: { days }, schema: AdminDashboard, signal }) });
}

/** ADM-4: downloads one report and says how many rows it had. */
export async function downloadReport(type: ReportType, from: string, to: string): Promise<number> {
  const res = await fetch(`${API_BASE_URL}/admin/reports/${type}?from=${from}&to=${to}`, { credentials: "include" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, { code: body?.code ?? "EXPORT_FAILED", message: body?.message ?? "The report didn't download. Try again." });
  }
  const href = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = href;
  a.download = `${type}-${from}-to-${to}.csv`;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
  return Number(res.headers.get("X-Row-Count") ?? 0);
}
