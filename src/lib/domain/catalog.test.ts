import { describe, expect, it } from "vitest";
import type { PublicTrainingCard } from "@/lib/api/schemas/catalog";
import { priceBand, relevance, searchCatalog } from "./catalog";

const card = (over: Partial<PublicTrainingCard> & { id: string; keywords?: string[] }): PublicTrainingCard & { keywords?: string[] } => ({
  slug: over.id,
  title: over.id,
  summary: "",
  thumbnail: null,
  level: "BEGINNER",
  language: "en",
  duration_hours: null,
  category: { id: "cat_topic", name: "Specific Topic", slug: "specific-topic" },
  modality: { id: "mod_1on1", code: "ONE_ON_ONE", name: "One-on-one" },
  instructors: [],
  from_price: null,
  next_start_date: null,
  published_at: "2026-11-01T00:00:00Z",
  ...over,
});

const ican = card({
  id: "ican",
  title: "ICAN Skills: Financial Reporting",
  category: { id: "cat_prof_exam", name: "Professional Exam", slug: "professional-exam" },
  modality: { id: "mod_cohort", code: "COHORT", name: "Cohort" },
  from_price: { amount: 45000, currency: "USD", unit: "PER_SEAT" },
  keywords: ["ICAN", "SFR"],
  instructors: [{ id: "i1", name: "Test Instructor", avatar_url: null, headline: null }],
  published_at: "2026-11-02T00:00:00Z",
});
const mth = card({
  id: "mth",
  title: "MTH 101: Elementary Mathematics I",
  summary: "Sets, functions and limits.",
  category: { id: "cat_uni", name: "University Course", slug: "university-course" },
  modality: { id: "mod_cohort", code: "COHORT", name: "Cohort" },
  from_price: { amount: 25000, currency: "USD", unit: "PER_SEAT" },
  keywords: ["University of Lagos", "MTH 101"],
  instructors: [{ id: "i2", name: "Demo Instructor Two", avatar_url: null, headline: null }],
  published_at: "2026-11-03T00:00:00Z",
});
const excel = card({
  id: "excel",
  title: "Excel pour la finance",
  language: "fr",
  from_price: { amount: 3500, currency: "USD", unit: "PER_HOUR" },
  keywords: ["Excel", "Finance"],
  instructors: [{ id: "i3", name: "Demo Instructor Three", avatar_url: null, headline: null }],
  published_at: "2026-11-12T00:00:00Z",
});
const unpriced = card({ id: "unpriced", title: "Statistics", published_at: "2026-11-20T00:00:00Z" });
const all = [ican, mth, excel, unpriced];
const ids = (cards: { id: string }[]) => cards.map((c) => c.id);

describe("catalogue search (TRN-6)", () => {
  it("lists newest first when nothing is searched", () => {
    expect(ids(searchCatalog(all, {}))).toEqual(["unpriced", "excel", "mth", "ican"]);
  });

  it("finds by title, category details and instructor, ignoring case and accents", () => {
    expect(ids(searchCatalog(all, { q: "ican" }))).toEqual(["ican"]);
    expect(ids(searchCatalog(all, { q: "lagos" }))).toEqual(["mth"]);
    expect(ids(searchCatalog(all, { q: "instructor three" }))).toEqual(["excel"]);
    expect(ids(searchCatalog([card({ id: "a", title: "Comptabilité générale" })], { q: "comptabilite" }))).toEqual(["a"]);
  });

  it("needs every word to match and ranks title hits above the rest", () => {
    expect(searchCatalog(all, { q: "ican python" })).toEqual([]);
    const titleHit = card({ id: "t", title: "Finance basics", published_at: "2026-01-01T00:00:00Z" });
    expect(ids(searchCatalog([excel, titleHit], { q: "finance" }))).toEqual(["excel", "t"]);
    expect(relevance(titleHit, "finance")).toBeGreaterThan(relevance(card({ id: "k", keywords: ["finance"] }), "finance"));
  });

  it("filters by category slug, format code, language and instructor", () => {
    expect(ids(searchCatalog(all, { category: "professional-exam" }))).toEqual(["ican"]);
    expect(ids(searchCatalog(all, { modality: "COHORT" }))).toEqual(["mth", "ican"]);
    expect(ids(searchCatalog(all, { language: "fr" }))).toEqual(["excel"]);
    expect(ids(searchCatalog(all, { instructor: "i2" }))).toEqual(["mth"]);
  });

  it("filters by price band on the from price and leaves out unpriced trainings", () => {
    const band = priceBand("150_300")!;
    expect(ids(searchCatalog(all, { price_min: band.min, price_max: band.max }))).toEqual(["mth"]);
    expect(ids(searchCatalog(all, { price_max: priceBand("under_50")!.max }))).toEqual(["excel"]);
    expect(priceBand("nope")).toBeNull();
  });

  it("sorts by price both ways with unpriced trainings last, and by title", () => {
    expect(ids(searchCatalog(all, { sort: "price_asc" }))).toEqual(["excel", "mth", "ican", "unpriced"]);
    expect(ids(searchCatalog(all, { sort: "price_desc" }))).toEqual(["ican", "mth", "excel", "unpriced"]);
    expect(ids(searchCatalog(all, { sort: "title" }))).toEqual(["excel", "ican", "mth", "unpriced"]);
  });
});
