import type { Money } from "./money";
import type { PricingUnit } from "./enums";

/**
 * Pricing rules (SRS §4.4). The backend is the source of truth for every charged amount; this
 * module mirrors its rules so the mock API and the admin preview explain prices the same way.
 */

export type Price = Money & { unit: PricingUnit };

/** PRC-1/5: one version of the price for a Modality × Category pair. `effective_to` null = open-ended. */
export type PricingRule = Price & {
  id: string;
  modality_id: string;
  category_id: string;
  effective_from: string;
  effective_to: string | null;
};

export type PriceSource = "TRAINING_OVERRIDE" | "INSTRUCTOR_RATE" | "RULE";
export type ResolvedPrice = Price & { source: PriceSource; rule_id: string | null };

const t = (iso: string) => new Date(iso).getTime();

/** The rule version in force at `at` for a pair, or null if none. */
export function ruleAt(rules: PricingRule[], modalityId: string, categoryId: string, at: Date): PricingRule | null {
  const now = at.getTime();
  return (
    rules.find(
      (r) =>
        r.modality_id === modalityId &&
        r.category_id === categoryId &&
        t(r.effective_from) <= now &&
        (r.effective_to === null || now < t(r.effective_to)),
    ) ?? null
  );
}

/** All versions for a pair, newest first. */
export function ruleHistory(rules: PricingRule[], modalityId: string, categoryId: string): PricingRule[] {
  return rules
    .filter((r) => r.modality_id === modalityId && r.category_id === categoryId)
    .sort((a, b) => t(b.effective_from) - t(a.effective_from));
}

/** A version that starts later than `at` (scheduled), if any. */
export function scheduledRule(rules: PricingRule[], modalityId: string, categoryId: string, at: Date): PricingRule | null {
  return ruleHistory(rules, modalityId, categoryId).find((r) => t(r.effective_from) > at.getTime()) ?? null;
}

export type NewRuleVersion = Price & { modality_id: string; category_id: string; effective_from: string };

/**
 * PRC-5: prices change by adding a version, never by editing one, so past purchases keep their
 * price (BR-4) and the audit trail stays whole. The new version must start now or later and after
 * the latest existing version; the latest version is closed where the new one starts.
 */
export function addRuleVersion(
  rules: PricingRule[],
  input: NewRuleVersion,
  id: string,
  now: Date,
): { ok: true; rules: PricingRule[]; rule: PricingRule } | { ok: false; field: "effective_from" | "amount"; message: string } {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    return { ok: false, field: "amount", message: "Enter a price above zero." };
  }
  const start = t(input.effective_from);
  if (Number.isNaN(start) || start < now.getTime() - 60_000) {
    return { ok: false, field: "effective_from", message: "A new price can start now or later, not in the past." };
  }
  const latest = ruleHistory(rules, input.modality_id, input.category_id)[0];
  if (latest && start <= t(latest.effective_from)) {
    return {
      ok: false,
      field: "effective_from",
      message: "Start after the latest version. To replace a scheduled price, choose a later start date.",
    };
  }
  const rule: PricingRule = { ...input, id, effective_to: null };
  const next = rules.map((r) => (latest && r.id === latest.id ? { ...r, effective_to: input.effective_from } : r));
  return { ok: true, rules: [...next, rule], rule };
}

export type PricedTraining = {
  modality_id: string;
  category_id: string;
  price_override: Price | null;
  instructors: { instructor_id: string; custom_rate: Price | null }[];
};

/**
 * PRC-4: training override, then the instructor's rate on this training, then the rule.
 * Acceptance criterion: a £50 training override beats an £80 rule.
 */
export function resolvePrice(
  training: PricedTraining,
  rules: PricingRule[],
  { instructorId, at }: { instructorId?: string | null; at: Date },
): ResolvedPrice | null {
  if (training.price_override) return { ...training.price_override, source: "TRAINING_OVERRIDE", rule_id: null };
  const rate = instructorId ? training.instructors.find((i) => i.instructor_id === instructorId)?.custom_rate : null;
  if (rate) return { ...rate, source: "INSTRUCTOR_RATE", rule_id: null };
  const rule = ruleAt(rules, training.modality_id, training.category_id, at);
  return rule ? { amount: rule.amount, currency: rule.currency, unit: rule.unit, source: "RULE", rule_id: rule.id } : null;
}

/**
 * The "from" price for a catalogue card: the lowest price any assigned instructor would charge.
 * Units can differ only between instructors of a 1:1 training (per hour vs per session).
 */
export function lowestPrice(training: PricedTraining, rules: PricingRule[], at: Date): ResolvedPrice | null {
  const ids = training.instructors.length ? training.instructors.map((i) => i.instructor_id) : [null];
  const prices = ids.map((id) => resolvePrice(training, rules, { instructorId: id, at })).filter((p) => p !== null);
  return prices.sort((a, b) => a.amount - b.amount)[0] ?? null;
}
