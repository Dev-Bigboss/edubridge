import type { CatalogSort, PublicTrainingCard } from "@/lib/api/schemas/catalog";

/**
 * Public catalogue search (TRN-6). The backend owns the real query; the mock API uses these
 * functions so filters and sorting behave the same in demos and tests as the contract says.
 */

export type CatalogFilters = {
  q?: string;
  category?: string; // category slug
  modality?: string; // modality code
  language?: string;
  instructor?: string; // instructor id
  /** Minor units, inclusive, compared with from_price. */
  price_min?: number;
  price_max?: number;
  sort?: CatalogSort;
};

/**
 * Price bands for the filter control, in USD cents (plan D8). Units differ (per seat vs per hour),
 * so the band applies to the "from" price a learner sees on the card.
 */
export const PRICE_BANDS = [
  { key: "under_50", min: undefined, max: 5000 },
  { key: "50_150", min: 5000, max: 15000 },
  { key: "150_300", min: 15000, max: 30000 },
  { key: "over_300", min: 30000, max: undefined },
] as const;
export type PriceBand = (typeof PRICE_BANDS)[number]["key"];

export function priceBand(key: string | null | undefined) {
  return PRICE_BANDS.find((b) => b.key === key) ?? null;
}

const normalise = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

type Searchable = PublicTrainingCard & { keywords?: string[] };

/**
 * Relevance: every word must appear somewhere; title hits weigh most, then category/details,
 * then summary and instructor names. 0 means "doesn't match".
 */
export function relevance(card: Searchable, q: string): number {
  const words = normalise(q).split(/\s+/).filter(Boolean);
  if (words.length === 0) return 1;
  const title = normalise(card.title);
  const tags = normalise([card.category.name, ...(card.keywords ?? [])].join(" "));
  const rest = normalise([card.summary, ...card.instructors.map((i) => i.name)].join(" "));
  let score = 0;
  for (const w of words) {
    if (title.includes(w)) score += 3;
    else if (tags.includes(w)) score += 2;
    else if (rest.includes(w)) score += 1;
    else return 0;
  }
  return score;
}

export function searchCatalog<T extends Searchable>(cards: T[], f: CatalogFilters): T[] {
  const q = f.q?.trim() ?? "";
  const scored = cards
    .map((card) => ({ card, score: relevance(card, q) }))
    .filter(({ score }) => score > 0)
    .filter(({ card }) => !f.category || card.category.slug === f.category)
    .filter(({ card }) => !f.modality || card.modality.code === f.modality)
    .filter(({ card }) => !f.language || card.language === f.language)
    .filter(({ card }) => !f.instructor || card.instructors.some((i) => i.id === f.instructor))
    .filter(({ card }) => {
      if (f.price_min === undefined && f.price_max === undefined) return true;
      const amount = card.from_price?.amount;
      if (amount === undefined) return false;
      return (f.price_min === undefined || amount >= f.price_min) && (f.price_max === undefined || amount <= f.price_max);
    });

  const sort = f.sort ?? (q ? "relevance" : "newest");
  const price = (c: T) => c.from_price?.amount ?? Number.POSITIVE_INFINITY;
  const newest = (a: T, b: T) => b.published_at.localeCompare(a.published_at) || a.title.localeCompare(b.title);
  const compare: Record<CatalogSort, (a: (typeof scored)[number], b: (typeof scored)[number]) => number> = {
    relevance: (a, b) => b.score - a.score || newest(a.card, b.card),
    newest: (a, b) => newest(a.card, b.card),
    price_asc: (a, b) => price(a.card) - price(b.card) || newest(a.card, b.card),
    price_desc: (a, b) => {
      // Trainings without a price go last in both directions.
      const pa = a.card.from_price?.amount ?? -1;
      const pb = b.card.from_price?.amount ?? -1;
      return pb - pa || newest(a.card, b.card);
    },
    title: (a, b) => a.card.title.localeCompare(b.card.title),
  };
  return scored.sort(compare[sort]).map(({ card }) => card);
}
