import { z } from "zod";
import { PublicTrainingCard } from "./catalog";

/** Mirrors contracts/openapi/recommendations.yaml. */
export const RecommendationReason = z.discriminatedUnion("code", [
  z.object({ code: z.literal("CATEGORY"), value: z.string() }),
  z.object({ code: z.literal("TOPIC"), value: z.string() }),
  z.object({ code: z.literal("LEVEL"), value: z.null() }),
  z.object({ code: z.literal("BEFORE_EXAM"), value: z.string() }),
]);

export const Recommendation = z.object({ training: PublicTrainingCard, reasons: z.array(RecommendationReason).min(1) });
export type Recommendation = z.infer<typeof Recommendation>;
export const RecommendationList = z.object({ items: z.array(Recommendation), profile_complete: z.boolean() });
