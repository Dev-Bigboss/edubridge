import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiError, api } from "@/lib/api/client";
import { Category, TrainingPage, TrainingResponse, type TrainingInput } from "@/lib/api/schemas/catalog";
import { PriceQuote, PricingRule, PricingRuleList } from "@/lib/api/schemas/pricing";
import { db, mockSession, resetDb } from "../db";

const failure = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error("expected the request to fail");
    },
    (e) => e as ApiError,
  );

const draft: TrainingInput = {
  title: "IELTS Academic Writing",
  summary: "Live classes on Task 1 and Task 2 with marked practice essays.",
  description: "",
  category_id: "cat_prof_exam",
  modality_id: "mod_cohort",
  level: "INTERMEDIATE",
  language: "en",
  duration_hours: 12,
  thumbnail_file_id: null,
  metadata: {},
  instructors: [],
  price_override: null,
};

describe("admin catalogue mock (catalog.yaml)", () => {
  beforeEach(() => {
    resetDb();
    mockSession.set("usr_admin_1");
  });

  it("keeps non-admins out", async () => {
    mockSession.set("usr_learner_1");
    expect((await failure(api("/admin/trainings"))).status).toBe(403);
  });

  it("TRN-3 acceptance: a new category is offered for trainings with no code change", async () => {
    await api("/admin/categories", {
      method: "POST",
      body: { name: "Language Certification", description: null, active: true, metadata_fields: [] },
      schema: z.object({ category: Category }),
    });
    const list = await api("/catalog/categories", { schema: z.object({ items: z.array(Category) }) });
    expect(list.items.map((c) => c.name)).toContain("Language Certification");
  });

  it("creates a draft, refuses to publish until the checklist passes, then publishes", async () => {
    const { training } = await api("/admin/trainings", { method: "POST", body: draft, schema: TrainingResponse });
    expect(training).toMatchObject({ status: "DRAFT", slug: "ielts-academic-writing" });

    const early = await failure(api(`/admin/trainings/${training.id}/publish`, { method: "POST" }));
    expect(early.code).toBe("NOT_READY_TO_PUBLISH");
    expect(early.fieldErrors.checks).toEqual(expect.arrayContaining(["description", "metadata", "instructors"]));

    await api(`/admin/trainings/${training.id}`, {
      method: "PATCH",
      body: {
        ...draft,
        description: "Twelve hours of live classes on both IELTS writing tasks, with two essays marked against the official band descriptors.",
        metadata: { exam_body: "British Council" },
        instructors: [{ instructor_id: "usr_instructor_1", custom_rate: null }],
      },
    });
    const done = await api(`/admin/trainings/${training.id}/publish`, { method: "POST", schema: TrainingResponse });
    expect(done.training.status).toBe("PUBLISHED");
    expect(db.audit.map((a) => a.action)).toEqual(expect.arrayContaining(["training.created", "training.updated", "training.published"]));
  });

  it("locks the modality after publishing (BR-1)", async () => {
    const err = await failure(api("/admin/trainings/trn_ican_sfr", { method: "PATCH", body: { ...draft, modality_id: "mod_1on1" } }));
    expect(err.code).toBe("MODALITY_LOCKED");
    expect(err.fieldErrors.modality_id).toBeDefined();
  });

  it("only assigns approved instructors and units the modality allows", async () => {
    const notApproved = await failure(
      api("/admin/trainings", { method: "POST", body: { ...draft, instructors: [{ instructor_id: "usr_learner_1", custom_rate: null }] } }),
    );
    expect(notApproved.status).toBe(422);
    const wrongUnit = await failure(
      api("/admin/trainings", { method: "POST", body: { ...draft, price_override: { amount: 1000, currency: "USD", unit: "PER_HOUR" } } }),
    );
    expect(wrongUnit.status).toBe(422);
  });

  it("filters trainings", async () => {
    const res = await api("/admin/trainings", { query: { status: "DRAFT" }, schema: TrainingPage });
    expect(res.items.every((t) => t.status === "DRAFT")).toBe(true);
  });
});

describe("pricing mock (pricing.yaml)", () => {
  beforeEach(() => {
    resetDb();
    mockSession.set("usr_admin_1");
  });

  it("adds a version and quotes the new price; scheduled prices only apply from their date", async () => {
    const future = new Date(Date.now() + 7 * 864e5).toISOString();
    await api("/admin/pricing/rules", {
      method: "POST",
      body: { modality_id: "mod_cohort", category_id: "cat_prof_exam", unit: "PER_SEAT", amount: 50000, currency: "USD", effective_from: future },
      schema: z.object({ rule: PricingRule }),
    });
    const today = await api("/pricing/quote", { query: { training_id: "trn_ican_sfr" }, schema: PriceQuote });
    expect(today).toMatchObject({ amount: 45000, source: "RULE" });
    const later = await api("/pricing/quote", {
      query: { training_id: "trn_ican_sfr", at: new Date(Date.now() + 8 * 864e5).toISOString() },
      schema: PriceQuote,
    });
    expect(later.amount).toBe(50000);
    const rules = await api("/admin/pricing/rules", { schema: PricingRuleList });
    expect(rules.items.find((r) => r.id === "rule_c_exam")?.effective_to).toBe(future);
    expect(db.audit[0].action).toBe("pricing_rule.created");
  });

  it("rejects backdated prices and units the modality can't use", async () => {
    const past = await failure(
      api("/admin/pricing/rules", {
        method: "POST",
        body: { modality_id: "mod_cohort", category_id: "cat_topic", unit: "PER_SEAT", amount: 100, currency: "USD", effective_from: "2020-01-01T00:00:00Z" },
      }),
    );
    expect(past.fieldErrors.effective_from).toBeDefined();
    const unit = await failure(
      api("/admin/pricing/rules", {
        method: "POST",
        body: { modality_id: "mod_cohort", category_id: "cat_topic", unit: "PER_HOUR", amount: 100, currency: "USD", effective_from: new Date().toISOString() },
      }),
    );
    expect(unit.fieldErrors.unit).toBeDefined();
  });

  it("uses the instructor's rate for that instructor (PRC-4)", async () => {
    const q = await api("/pricing/quote", { query: { training_id: "trn_acca_sbr", instructor_id: "usr_instructor_1" }, schema: PriceQuote });
    expect(q).toMatchObject({ amount: 7500, source: "INSTRUCTOR_RATE", unit: "PER_HOUR" });
  });

  it("hides drafts from public quotes", async () => {
    mockSession.set(null);
    expect((await failure(api("/pricing/quote", { query: { training_id: "trn_python_da" } }))).status).toBe(404);
  });
});
