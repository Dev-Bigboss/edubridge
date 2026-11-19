import { z } from "zod";
import { PRICING_UNITS } from "@/lib/domain/enums";

/** Mirrors contracts/openapi/catalog.yaml. */

/**
 * TRN-4: each category declares the extra fields its trainings carry
 * (exam body and code, institution and semester, topic tags, …). Admins edit these; no code change.
 */
export const METADATA_FIELD_TYPES = ["TEXT", "TAGS", "SELECT"] as const;
export const MetadataField = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]*$/),
  label: z.string(),
  type: z.enum(METADATA_FIELD_TYPES),
  required: z.boolean(),
  /** SELECT only */
  options: z.array(z.string()).optional(),
});
export type MetadataField = z.infer<typeof MetadataField>;

/** TRN-3: managed list. `active: false` hides it from new trainings but keeps existing ones valid. */
export const Category = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  active: z.boolean(),
  metadata_fields: z.array(MetadataField),
});
export type Category = z.infer<typeof Category>;

/** TRN-2: stored in a table. `pricing_units` are the units a price for this modality may use (PRC-2). */
export const Modality = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  active: z.boolean(),
  pricing_units: z.array(z.enum(PRICING_UNITS)),
});
export type Modality = z.infer<typeof Modality>;

export const CategoryList = z.object({ items: z.array(Category) });
export const ModalityList = z.object({ items: z.array(Modality) });
