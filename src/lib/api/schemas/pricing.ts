import { z } from "zod";
import { PRICING_UNITS } from "@/lib/domain/enums";

/** Mirrors contracts/openapi/pricing.yaml. */

export const PricingRule = z.object({
  id: z.string(),
  modality_id: z.string(),
  category_id: z.string(),
  unit: z.enum(PRICING_UNITS),
  amount: z.number().int(),
  currency: z.string(),
  effective_from: z.string(),
  effective_to: z.string().nullable(),
  created_by: z.string(),
  created_at: z.string(),
});
export type PricingRuleDto = z.infer<typeof PricingRule>;
export const PricingRuleList = z.object({ items: z.array(PricingRule) });

export const NewPricingRule = z.object({
  modality_id: z.string(),
  category_id: z.string(),
  unit: z.enum(PRICING_UNITS),
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  /** UTC ISO. Now or later (PRC-5). */
  effective_from: z.string(),
});
export type NewPricingRule = z.infer<typeof NewPricingRule>;

/** GET /pricing/quote: the price a learner would see (PRC-4), with where it came from. */
export const PriceQuote = z.object({
  training_id: z.string(),
  instructor_id: z.string().nullable(),
  amount: z.number().int(),
  currency: z.string(),
  unit: z.enum(PRICING_UNITS),
  source: z.enum(["TRAINING_OVERRIDE", "INSTRUCTOR_RATE", "RULE"]),
  rule_id: z.string().nullable(),
  at: z.string(),
});
export type PriceQuote = z.infer<typeof PriceQuote>;
