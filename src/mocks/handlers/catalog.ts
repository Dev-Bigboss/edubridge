import { delay } from "msw";
import { http, HttpResponse } from "msw/http";
import { CATALOG_SORTS, type CatalogSort, type PublicCohort, type PublicTrainingCard, type PublicTrainingDetail, type Training, type TrainingInstructor } from "@/lib/api/schemas/catalog";
import type { Cohort } from "@/lib/api/schemas/cohort";
import { searchCatalog } from "@/lib/domain/catalog";
import { lowestPrice, resolvePrice, type Price } from "@/lib/domain/pricing";
import { db, findUser } from "../db";
import { sweepCohorts } from "./cohorts";
import { apiError, url } from "./util";

/** Cohort states a guest can see (COH-3). Drafts, finished and cancelled cohorts stay hidden. */
export const VISIBLE_COHORTS = new Set(["OPEN", "FULL", "CLOSED", "IN_PROGRESS"]);

/** Name and headline from the user's profile, falling back to what the training stored at assignment. */
const instructorOf = (id: string, assigned?: TrainingInstructor) => {
  const u = findUser(id);
  return {
    id,
    name: u?.name ?? assigned?.name ?? "Instructor",
    avatar_url: u?.avatar_url ?? assigned?.avatar_url ?? null,
    headline: u?.headline ?? db.onboarding[id]?.sections.profile?.headline ?? assigned?.headline ?? null,
  };
};

/** Strips how the price was resolved; guests see the amount and unit only. */
const price = (p: Price | null): Price | null => (p ? { amount: p.amount, currency: p.currency, unit: p.unit } : null);

export function toCard(t: Training, now: Date): PublicTrainingCard & { keywords: string[] } {
  const category = db.categories.find((c) => c.id === t.category_id)!;
  const modality = db.modalities.find((m) => m.id === t.modality_id)!;
  const nextCohort = db.cohorts
    .filter((c) => c.training_id === t.id && c.status === "OPEN" && new Date(c.enrolment_deadline) > now)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
  return {
    id: t.id,
    slug: t.slug,
    title: t.title,
    summary: t.summary,
    thumbnail: t.thumbnail,
    level: t.level,
    language: t.language,
    duration_hours: t.duration_hours,
    category: { id: category.id, name: category.name, slug: category.slug },
    modality: { id: modality.id, code: modality.code, name: modality.name },
    instructors: t.instructors.map((i) => instructorOf(i.instructor_id, i)),
    from_price: price(lowestPrice(t, db.pricingRules, now)),
    next_start_date: nextCohort?.start_date ?? null,
    published_at: t.published_at ?? t.created_at,
    // Search only: category details such as "ICAN" or "MTH 101" (not part of the response).
    keywords: Object.values(t.metadata).flat(),
  };
}

export const published = () => db.trainings.filter((t) => t.status === "PUBLISHED");

export function toPublicCohort(t: Training, c: Cohort, now: Date): PublicCohort {
  return {
    ...omit(c, "training_id"),
    price: price(resolvePrice(t, db.pricingRules, { instructorId: c.instructor_id, at: now })),
    instructor: instructorOf(c.instructor_id, t.instructors.find((i) => i.instructor_id === c.instructor_id)),
  };
}

function toDetail(t: Training, now: Date): PublicTrainingDetail {
  const card = omit(toCard(t, now), "keywords");
  const category = db.categories.find((c) => c.id === t.category_id)!;
  const cohorts: PublicCohort[] = db.cohorts
    .filter((c) => c.training_id === t.id && VISIBLE_COHORTS.has(c.status))
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .map((c) => toPublicCohort(t, c, now));
  return {
    ...card,
    description: t.description,
    details: category.metadata_fields
      .map((f) => ({ key: f.key, label: f.label, value: t.metadata[f.key] }))
      .filter((d): d is { key: string; label: string; value: string | string[] } =>
        Array.isArray(d.value) ? d.value.length > 0 : !!d.value?.trim(),
      ),
    instructors: t.instructors.map((i) => ({
      ...instructorOf(i.instructor_id, i),
      price: price(resolvePrice(t, db.pricingRules, { instructorId: i.instructor_id, at: now })),
    })),
    cohorts,
  };
}

export function omit<T extends object, K extends keyof T>(obj: T, key: K): Omit<T, K> {
  const copy = { ...obj };
  delete copy[key];
  return copy;
}

const num = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : undefined);

export const catalogHandlers = [
  http.get(url("/catalog/categories"), async ({ request }) => {
    await delay(150);
    const all = new URL(request.url).searchParams.get("include_inactive") === "true";
    return HttpResponse.json({ items: db.categories.filter((c) => all || c.active) });
  }),

  http.get(url("/catalog/modalities"), async () => {
    await delay(100);
    return HttpResponse.json({ items: db.modalities });
  }),

  /** TRN-6: published trainings only (TRN-7 hides archived ones). */
  http.get(url("/catalog/trainings"), async ({ request }) => {
    await delay(250);
    const p = new URL(request.url).searchParams;
    const sort = p.get("sort");
    if (sort && !CATALOG_SORTS.includes(sort as CatalogSort)) {
      return apiError(422, "VALIDATION_FAILED", "Unknown sort.", { sort: [`Use one of ${CATALOG_SORTS.join(", ")}.`] });
    }
    const now = new Date();
    const cards = published().map((t) => toCard(t, now));
    const items = searchCatalog(cards, {
      q: p.get("q") ?? undefined,
      category: p.get("category") ?? undefined,
      modality: p.get("modality") ?? undefined,
      language: p.get("language") ?? undefined,
      instructor: p.get("instructor") ?? undefined,
      price_min: num(p.get("price_min")),
      price_max: num(p.get("price_max")),
      sort: (sort as CatalogSort) ?? undefined,
    }).map((card) => omit(card, "keywords"));
    const instructors = new Map(cards.flatMap((c) => c.instructors).map((i) => [i.id, { id: i.id, name: i.name }]));
    return HttpResponse.json({
      items,
      // The mock returns one page; the contract allows cursors.
      next_cursor: null,
      total: items.length,
      facets: {
        instructors: [...instructors.values()].sort((a, b) => a.name.localeCompare(b.name)),
        languages: [...new Set(cards.map((c) => c.language))].sort(),
      },
    });
  }),

  http.get(url("/catalog/trainings/:slug"), async ({ params }) => {
    await delay(200);
    sweepCohorts();
    const training = published().find((t) => t.slug === params.slug);
    if (!training) return apiError(404, "NOT_FOUND", "That training isn't in the catalogue. It may have been archived or renamed.");
    return HttpResponse.json({ training: toDetail(training, new Date()) });
  }),

  /** Checkout page (COH-2, PAY-2): a visible cohort of a published training. */
  http.get(url("/catalog/cohorts/:id"), async ({ params }) => {
    await delay(200);
    const cohort = db.cohorts.find((c) => c.id === params.id && VISIBLE_COHORTS.has(c.status));
    const training = cohort && published().find((t) => t.id === cohort.training_id);
    if (!cohort || !training) return apiError(404, "NOT_FOUND", "That cohort isn't available. It may have been cancelled or removed.");
    const now = new Date();
    return HttpResponse.json({ cohort: toPublicCohort(training, cohort, now), training: omit(toCard(training, now), "keywords") });
  }),
];
