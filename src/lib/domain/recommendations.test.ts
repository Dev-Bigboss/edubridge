import { describe, expect, it } from "vitest";
import { levelFits, recommend, topicMatches, type Candidate, type LearnerInterests } from "./recommendations";

const c = (id: string, over: Partial<Candidate> = {}): Candidate => ({
  id, title: id, summary: "", level: "INTERMEDIATE", category: { id: "cat_a", name: "Exams" }, next_start_date: null, keywords: [], ...over,
});
const me: LearnerInterests = { interest_category_ids: ["cat_a"], topics: ["financial reporting", "SQL"], education_level: "PROFESSIONAL", exam_target_date: "2027-05-01" };
const today = "2026-11-26";

describe("recommendations", () => {
  it("matches topics on whole words, ignoring case and accents", () => {
    expect(topicMatches("financial reporting", c("x", { title: "ICAN Skills: Financial Reporting" }))).toBe(true);
    expect(topicMatches("sql", c("x", { summary: "Queries in SQL." }))).toBe(true);
    expect(topicMatches("sql", c("x", { title: "NoSQLish" }))).toBe(false);
    expect(topicMatches("finance", c("x", { title: "Excel pour la fînance" }))).toBe(true);
    expect(topicMatches("ICAN", c("x", { keywords: ["ICAN"] }))).toBe(true);
  });

  it("fits levels to education", () => {
    expect(levelFits("SECONDARY", "ADVANCED")).toBe(false);
    expect(levelFits("SECONDARY", "ALL_LEVELS")).toBe(true);
    expect(levelFits(null, "BEGINNER")).toBe(false);
  });

  it("needs a category or topic match, ranks by score then start date, and leaves out what the learner has", () => {
    const list = [
      c("other", { category: { id: "cat_b", name: "Other" } }),
      c("cat-only", { level: "BEGINNER", next_start_date: "2026-12-01" }),
      c("topic", { title: "Financial reporting", category: { id: "cat_b", name: "Other" }, level: "BEGINNER" }),
      c("best", { title: "Financial reporting", next_start_date: "2027-01-10" }),
      c("owned", { title: "Financial reporting" }),
      c("cat-late", { level: "BEGINNER", next_start_date: "2026-12-05" }),
    ];
    const out = recommend(list, me, { exclude: new Set(["owned"]), today });
    expect(out.map((s) => s.candidate.id)).toEqual(["best", "cat-only", "cat-late", "topic"]);
    expect(out[0].reasons.map((r) => r.code)).toEqual(["CATEGORY", "TOPIC", "LEVEL", "BEFORE_EXAM"]);
    expect(out.find((s) => s.candidate.id === "topic")!.reasons).toEqual([{ code: "TOPIC", value: "financial reporting" }]);
  });

  it("only counts a start before the exam that hasn't passed, and caps the list", () => {
    const late = recommend([c("x", { next_start_date: "2027-06-01" })], me, { exclude: new Set(), today })[0];
    expect(late.reasons.map((r) => r.code)).not.toContain("BEFORE_EXAM");
    const many = Array.from({ length: 10 }, (_, i) => c(`t${i}`));
    expect(recommend(many, me, { exclude: new Set(), today })).toHaveLength(6);
  });
});
