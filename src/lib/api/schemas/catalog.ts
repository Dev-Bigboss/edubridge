import { z } from "zod";
import { PRICING_UNITS, TRAINING_LEVELS, TRAINING_STATUSES } from "@/lib/domain/enums";
import { StoredFile } from "./uploads";

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

/* ---------- trainings (TRN-1, TRN-5) ---------- */

export const PriceSchema = z.object({
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  unit: z.enum(PRICING_UNITS),
});

export const TrainingInstructor = z.object({
  instructor_id: z.string(),
  name: z.string(),
  avatar_url: z.string().nullable(),
  headline: z.string().nullable(),
  /** PRC-3: this instructor's rate on this training, if different from the rule. */
  custom_rate: PriceSchema.nullable(),
});
export type TrainingInstructor = z.infer<typeof TrainingInstructor>;

export const MetadataValues = z.record(z.string(), z.union([z.string(), z.array(z.string())]));

export const Training = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  description: z.string(),
  category_id: z.string(),
  modality_id: z.string(),
  level: z.enum(TRAINING_LEVELS),
  language: z.string(),
  /** Total live teaching hours (cohorts) or typical programme length (1:1). Null when open-ended. */
  duration_hours: z.number().positive().nullable(),
  thumbnail: StoredFile.nullable(),
  status: z.enum(TRAINING_STATUSES),
  metadata: MetadataValues,
  instructors: z.array(TrainingInstructor),
  /** PRC-3: replaces the rule (and instructor rates) for this training. */
  price_override: PriceSchema.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  published_at: z.string().nullable(),
});
export type Training = z.infer<typeof Training>;

export const TrainingPage = z.object({ items: z.array(Training), next_cursor: z.string().nullable(), total: z.number().int() });
export const TrainingResponse = z.object({ training: Training });

/** Admin form body. Thumbnail by upload id; instructors by id with optional rate. */
export const TrainingInput = z.object({
  title: z.string().trim().min(5, { error: "Use at least 5 characters." }).max(120, { error: "Keep the title under 120 characters." }),
  summary: z.string().trim().min(20, { error: "Write a one-line summary, at least 20 characters." }).max(200),
  description: z.string().trim().max(5000),
  category_id: z.string().min(1, { error: "Choose a category." }),
  modality_id: z.string().min(1, { error: "Choose how it's taught." }),
  level: z.enum(TRAINING_LEVELS, { error: "Choose a level." }),
  language: z.string().min(2, { error: "Choose a language." }),
  duration_hours: z.number().positive({ error: "Enter a number of hours above zero." }).max(1000).nullable(),
  thumbnail_file_id: z.string().nullable(),
  metadata: MetadataValues,
  instructors: z.array(z.object({ instructor_id: z.string(), custom_rate: PriceSchema.nullable() })),
  price_override: PriceSchema.nullable(),
});
export type TrainingInput = z.infer<typeof TrainingInput>;

/** Approved instructors an admin can assign (TRN-5, ONB-3). */
export const InstructorSummary = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  avatar_url: z.string().nullable(),
  headline: z.string().nullable(),
});
export type InstructorSummary = z.infer<typeof InstructorSummary>;
export const InstructorList = z.object({ items: z.array(InstructorSummary) });

export const CategoryInput = z.object({
  name: z.string().trim().min(2, { error: "Enter a name." }).max(60),
  description: z.string().trim().max(200).nullable(),
  active: z.boolean(),
  metadata_fields: z.array(MetadataField),
});
export type CategoryInput = z.infer<typeof CategoryInput>;

export const ModalityInput = z.object({
  code: z.string().regex(/^[A-Z][A-Z0-9_]*$/, { error: "Use capitals, digits and underscores, e.g. WORKSHOP." }),
  name: z.string().trim().min(2, { error: "Enter a name." }).max(40),
  active: z.boolean(),
  pricing_units: z.array(z.enum(PRICING_UNITS)).min(1, { error: "Pick at least one pricing unit." }),
});
export type ModalityInput = z.infer<typeof ModalityInput>;
