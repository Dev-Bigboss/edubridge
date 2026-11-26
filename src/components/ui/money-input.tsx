import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { Input } from "./field";

/** Amount box with the currency shown as a prefix. Value is the typed text; parse with parseMoneyInput. */
export function MoneyInput({ currency, className, ...props }: ComponentProps<"input"> & { currency: string }) {
  const symbol =
    new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "narrowSymbol" })
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value ?? currency;
  return (
    <div className="relative">
      <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-body">
        {symbol}
      </span>
      <Input inputMode="decimal" autoComplete="off" className={cn("pl-9", className)} {...props} />
    </div>
  );
}
