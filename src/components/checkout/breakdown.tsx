"use client";

import { useTranslations } from "next-intl";
import type { PriceBreakdown } from "@/lib/api/schemas/payments";
import { formatDuration, formatMoney, formatPriceTag } from "@/lib/domain/money";

/** PRC-7: the API's lines as they are. Nothing here adds or rounds anything. */
export function BreakdownLines({ breakdown }: { breakdown: PriceBreakdown }) {
  const t = useTranslations("checkout");
  const money = (amount: number) => formatMoney({ amount, currency: breakdown.currency });
  return (
    <dl className="space-y-2 text-[15px]">
      <div className="flex justify-between gap-4">
        <dt>
          {breakdown.unit_price.unit === "PER_SEAT"
            ? t("seat", { count: breakdown.quantity })
            : breakdown.duration_min
              ? t("sessionHourly", { duration: formatDuration(breakdown.duration_min), rate: formatPriceTag(breakdown.unit_price, breakdown.unit_price.unit) })
              : t("sessionFlat")}
        </dt>
        <dd className="text-heading">{money(breakdown.subtotal)}</dd>
      </div>
      {breakdown.discount > 0 && (
        <div className="flex justify-between gap-4">
          <dt>{t("discount")}</dt>
          <dd className="text-success">−{money(breakdown.discount)}</dd>
        </div>
      )}
      <div className="flex justify-between gap-4">
        <dt>{t("tax")}</dt>
        <dd className="text-heading">{money(breakdown.tax)}</dd>
      </div>
      <div className="flex justify-between gap-4 border-t border-border pt-3 font-heading text-lg font-semibold text-heading">
        <dt>{t("total")}</dt>
        <dd>
          {money(breakdown.total)} <span className="text-sm font-normal text-body">{breakdown.currency}</span>
        </dd>
      </div>
    </dl>
  );
}
