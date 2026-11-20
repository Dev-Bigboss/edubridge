import type { RefundTier, SettingsInput } from "@/lib/api/schemas/settings";

/**
 * Cancellation and commission rules (ADM-3, OTO-9, PAY-5/7). The backend applies them; the admin
 * screen uses the same functions to preview and check a policy before saving it. A booking keeps
 * the policy in force when it was made, like prices (BR-4).
 */

/** Starting values until the PO confirms them (plan §8 Q3). Expiry 24 h is the SRS default. */
export const DEFAULT_SETTINGS: SettingsInput = {
  commission_percent: 20,
  booking_expiry_hours: 24,
  learner_cancellation: {
    tiers: [
      { min_hours_before: 48, refund_percent: 100 },
      { min_hours_before: 24, refund_percent: 50 },
      { min_hours_before: 0, refund_percent: 0 },
    ],
  },
  instructor_cancellation: { refund_percent: 100 },
};

export const sortTiers = (tiers: RefundTier[]) => [...tiers].sort((a, b) => b.min_hours_before - a.min_hours_before);

/** Refund percent for a learner cancelling `hoursBefore` hours ahead. Under every threshold: 0. */
export function refundPercent(tiers: RefundTier[], hoursBefore: number): number {
  return sortTiers(tiers).find((t) => hoursBefore >= t.min_hours_before)?.refund_percent ?? 0;
}

export type TierProblem = { index: number; field: "min_hours_before" | "refund_percent"; message: string };

/**
 * A policy is valid when thresholds are distinct, one starts at 0 hours (so every cancellation is
 * covered), and the refund never grows as the session gets closer.
 */
export function tierProblems(tiers: RefundTier[]): TierProblem[] {
  const problems: TierProblem[] = [];
  const seen = new Map<number, number>();
  tiers.forEach((t, i) => {
    if (seen.has(t.min_hours_before)) problems.push({ index: i, field: "min_hours_before", message: "Two rules use the same number of hours." });
    seen.set(t.min_hours_before, i);
  });
  if (!tiers.some((t) => t.min_hours_before === 0)) {
    problems.push({ index: tiers.length - 1, field: "min_hours_before", message: "Add a rule that starts at 0 hours, for last-minute cancellations." });
  }
  const order = tiers.map((t, i) => ({ ...t, i })).sort((a, b) => b.min_hours_before - a.min_hours_before);
  for (let k = 1; k < order.length; k++) {
    if (order[k].refund_percent > order[k - 1].refund_percent) {
      problems.push({ index: order[k].i, field: "refund_percent", message: "Cancelling later can't refund more than cancelling earlier." });
    }
  }
  return problems;
}

/** Plain-language lines for the preview and the audit log: "48 h or more before: 100%". */
export function describeTiers(tiers: RefundTier[]): string[] {
  const sorted = sortTiers(tiers);
  return sorted.map((t, i) => {
    const upper = i > 0 ? sorted[i - 1].min_hours_before : null;
    const when =
      upper === null ? `${t.min_hours_before} h or more before` : t.min_hours_before === 0 ? `Less than ${upper} h before` : `${t.min_hours_before}–${upper} h before`;
    return `${when}: ${t.refund_percent}% back`;
  });
}

/** "Commission 20% → 15%; expiry 24 h → 12 h" for the audit log and version history. */
export function diffSettings(a: SettingsInput, b: SettingsInput): string {
  const parts: string[] = [];
  if (a.commission_percent !== b.commission_percent) parts.push(`Commission ${a.commission_percent}% → ${b.commission_percent}%`);
  if (a.booking_expiry_hours !== b.booking_expiry_hours) parts.push(`1:1 request expiry ${a.booking_expiry_hours} h → ${b.booking_expiry_hours} h`);
  if (JSON.stringify(sortTiers(a.learner_cancellation.tiers)) !== JSON.stringify(sortTiers(b.learner_cancellation.tiers))) {
    parts.push(`Learner cancellation: ${describeTiers(b.learner_cancellation.tiers).join("; ")}`);
  }
  if (a.instructor_cancellation.refund_percent !== b.instructor_cancellation.refund_percent) {
    parts.push(`Instructor cancellation refund ${a.instructor_cancellation.refund_percent}% → ${b.instructor_cancellation.refund_percent}%`);
  }
  return parts.join(". ") || "No changes";
}
