import type { PricingUnit } from "./enums";

/**
 * Money is always an integer amount in minor units (cents) plus an ISO 4217 currency.
 * Never floats. Plan §3 conventions. Launch currency is USD (plan D8).
 */
export type Money = { amount: number; currency: string };

export const DEFAULT_CURRENCY = "USD";

export function formatMoney(money: Money, locale = "en-US"): string {
  const digits = minorDigits(money.currency);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
    minimumFractionDigits: money.amount % 10 ** digits === 0 ? 0 : digits,
    maximumFractionDigits: digits,
  }).format(money.amount / 10 ** digits);
}

/** Number of minor-unit digits for a currency (USD 2, JPY 0). */
export function minorDigits(currency: string): number {
  return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions()
    .maximumFractionDigits ?? 2;
}

const UNIT_LABEL: Record<PricingUnit, string> = {
  PER_SEAT: "per seat",
  PER_SESSION: "per session",
  PER_HOUR: "per hour",
};

export function unitLabel(unit: PricingUnit): string {
  return UNIT_LABEL[unit];
}

/**
 * Price as shown on cards: "$40 per hour". Price breakdowns (subtotal, discount, tax, total)
 * come from the API quote, never computed here, so the UI can't drift from what is charged (PRC-7).
 */
export function formatPriceTag(money: Money, unit: PricingUnit, locale = "en-US"): string {
  return `${formatMoney(money, locale)} ${unitLabel(unit)}`;
}

/**
 * 1:1 session lengths the learner can pick: 1 h to 4 h in 30-minute steps, 60 min default.
 * Carried over from the original EduBridge booking modal (plan §2.1).
 */
export const ONE_ON_ONE_DURATIONS_MIN = [60, 90, 120, 150, 180, 210, 240] as const;
export const DEFAULT_DURATION_MIN = 60;

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return h === 1 ? "1 hour" : `${h} hours`;
  return `${h} h ${m} min`;
}
