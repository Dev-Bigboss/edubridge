import type { MetadataField } from "@/lib/api/schemas/catalog";

/**
 * Teaching languages offered in the admin form (TRN-1 "language"). BCP 47 codes; names come
 * from Intl.DisplayNames. Plan §8 Q9 (which languages at launch) is still open, so this is a
 * starting list the PO can trim or extend.
 */
export const TRAINING_LANGUAGES = ["en", "fr", "ar", "es", "pt", "de", "yo", "ig", "ha", "sw"] as const;

export function languageName(code: string, locale = "en"): string {
  try {
    return new Intl.DisplayNames([locale], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export type MetadataValue = string | string[];

/** TRN-4: required category fields that are empty, by key. */
export function missingMetadata(fields: MetadataField[], values: Record<string, MetadataValue | undefined>): string[] {
  return fields
    .filter((f) => f.required)
    .filter((f) => {
      const v = values[f.key];
      return Array.isArray(v) ? v.length === 0 : !v?.trim();
    })
    .map((f) => f.key);
}

export type PublishCheck = { key: "description" | "instructors" | "metadata" | "price" | "category"; ok: boolean };

/**
 * What must be true before a training goes into the public catalogue (TRN-1, TRN-6).
 * The backend runs the same checks on POST /admin/trainings/{id}/publish.
 */
export function publishChecks(t: {
  description: string;
  instructorCount: number;
  categoryActive: boolean;
  missingMetadata: string[];
  hasPrice: boolean;
}): PublishCheck[] {
  return [
    { key: "description", ok: t.description.trim().length >= 80 },
    { key: "category", ok: t.categoryActive },
    { key: "metadata", ok: t.missingMetadata.length === 0 },
    { key: "instructors", ok: t.instructorCount > 0 },
    { key: "price", ok: t.hasPrice },
  ];
}

/** Lowercase, hyphenated, ASCII-only slug for URLs (/trainings/[slug]). */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
