import { beforeEach, describe, expect, it } from "vitest";
import { ApiError, api } from "@/lib/api/client";
import { CatalogPage, PublicCohortResponse, PublicTrainingResponse } from "@/lib/api/schemas/catalog";
import { db, mockSession, resetDb } from "../db";

const failure = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error("expected the request to fail");
    },
    (e) => e as ApiError,
  );

const list = (query: Record<string, string | number> = {}) => api("/catalog/trainings", { query, schema: CatalogPage });
const detail = (slug: string) => api(`/catalog/trainings/${slug}`, { schema: PublicTrainingResponse }).then((r) => r.training);

describe("public catalogue mock (catalog.yaml, TRN-6/7)", () => {
  beforeEach(() => {
    resetDb();
    mockSession.set(null);
  });

  it("lists published trainings only, for guests, without admin fields", async () => {
    const page = await list();
    const slugs = page.items.map((t) => t.slug);
    expect(slugs).toContain("ican-skills-financial-reporting");
    expect(slugs).not.toContain("python-for-data-analysis"); // draft
    expect(slugs).not.toContain("ican-audit-and-assurance-2025-syllabus"); // archived (TRN-7)
    expect(page.total).toBe(page.items.length);
    expect(page.items[0]).not.toHaveProperty("status");
    expect(page.items[0]).not.toHaveProperty("price_override");
    expect(page.items[0]).not.toHaveProperty("keywords");
  });

  it("shows the lowest price a learner can pay and the next open cohort", async () => {
    const { items } = await list();
    const ican = items.find((t) => t.id === "trn_ican_sfr")!;
    expect(ican.from_price).toEqual({ amount: 45000, currency: "USD", unit: "PER_SEAT" });
    // The open evening cohort, not the full weekend one that starts sooner.
    expect(ican.next_start_date).toBe(db.cohorts.find((c) => c.id === "coh_sfr_jan")!.start_date);
    const excel = items.find((t) => t.id === "trn_excel_fr")!;
    expect(excel.from_price).toEqual({ amount: 3500, currency: "USD", unit: "PER_HOUR" }); // training override
  });

  it("searches category details, filters and sorts", async () => {
    expect((await list({ q: "MTH 101" })).items.map((t) => t.id)).toEqual(["trn_mth101"]);
    expect((await list({ category: "specific-topic" })).items.every((t) => t.category.slug === "specific-topic")).toBe(true);
    expect((await list({ modality: "ONE_ON_ONE", language: "fr" })).items.map((t) => t.id)).toEqual(["trn_excel_fr"]);
    expect((await list({ instructor: "usr_instructor_2" })).items.map((t) => t.id)).toEqual(["trn_mth101"]);
    expect((await list({ price_max: 5000 })).items.map((t) => t.id)).toEqual(["trn_excel_fr", "trn_sql_1on1"]); // $35 and $40 per hour
    const asc = (await list({ sort: "price_asc" })).items.map((t) => t.from_price!.amount);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    expect((await failure(list({ sort: "cheapest" }))).status).toBe(422);
  });

  it("offers filter options from published trainings only", async () => {
    const { facets } = await list({ category: "professional-exam" });
    expect(facets.languages).toEqual(["en", "fr"]);
    // Options cover the whole published catalogue, not just the current filter, so a filter can be widened.
    expect(facets.instructors.map((i) => i.name)).toEqual(["Demo Instructor Three", "Demo Instructor Two", "Test Instructor"]);
  });

  it("returns a cohort training with its details, visible cohorts and the price per cohort", async () => {
    const t = await detail("ican-skills-financial-reporting");
    expect(t.details).toEqual([
      { key: "exam_body", label: "Exam body", value: "ICAN" },
      { key: "exam_code", label: "Exam code", value: "SFR" },
    ]);
    expect(t.cohorts.map((c) => c.id)).toEqual(["coh_sfr_weekend", "coh_sfr_jan"]); // soonest first, draft hidden
    expect(t.cohorts[1]).toMatchObject({ status: "OPEN", capacity: 20, enrolled_count: 14, price: { amount: 45000, unit: "PER_SEAT" } });
    expect(t.cohorts[1].instructor.name).toBe("Test Instructor");
    expect(t.cohorts[1]).not.toHaveProperty("training_id");
  });

  it("hides past cohorts and leaves out empty detail fields", async () => {
    const t = await detail("mth-101-elementary-mathematics-i");
    expect(t.cohorts.map((c) => c.id)).toEqual(["coh_mth_sem1"]);
    db.trainings.find((x) => x.id === "trn_mth101")!.metadata.semester = "";
    expect((await detail("mth-101-elementary-mathematics-i")).details.map((d) => d.key)).toEqual(["institution", "course_code"]);
  });

  it("gives each instructor's price on a 1:1 training (PRC-3)", async () => {
    const t = await detail("acca-strategic-business-reporting-one-on-one");
    expect(t.instructors).toHaveLength(1);
    expect(t.instructors[0].price).toEqual({ amount: 7500, currency: "USD", unit: "PER_HOUR" });
    expect(t.cohorts).toEqual([]);
  });

  it("returns 404 for drafts, archived trainings and unknown slugs", async () => {
    for (const slug of ["python-for-data-analysis", "ican-audit-and-assurance-2025-syllabus", "nope"]) {
      expect((await failure(detail(slug))).status).toBe(404);
    }
  });

  it("returns one visible cohort with its training for checkout, and 404 for hidden ones", async () => {
    const res = await api("/catalog/cohorts/coh_mth_sem1", { schema: PublicCohortResponse });
    expect(res.cohort).toMatchObject({ id: "coh_mth_sem1", price: { amount: 25000, unit: "PER_SEAT" } });
    expect(res.training.slug).toBe("mth-101-elementary-mathematics-i");
    for (const id of ["coh_mth_past", "coh_sfr_next", "nope"]) {
      expect((await failure(api(`/catalog/cohorts/${id}`))).status).toBe(404);
    }
  });
});
