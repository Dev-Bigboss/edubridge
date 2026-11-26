import { describe, expect, it } from "vitest";
import { criterionKey, progress, rubricFor, rubricProblems, scoreProblems } from "./feedback";

const rubric = (id: string, extra: Partial<{ category_ids: string[]; is_default: boolean; archived: boolean }> = {}) => ({
  id, criteria: [], category_ids: [], is_default: false, archived: false, ...extra,
});

describe("criterionKey", () => {
  it("makes stable unique keys", () => {
    expect(criterionKey("Exam technique", [])).toBe("exam_technique");
    expect(criterionKey("Exam technique!", ["exam_technique"])).toBe("exam_technique_2");
    expect(criterionKey("Compréhension", [])).toBe("comprehension");
    expect(criterionKey("???", [])).toBe("criterion");
  });
});

describe("rubricFor", () => {
  const list = [rubric("def", { is_default: true }), rubric("exam", { category_ids: ["cat_exam"] }), rubric("old", { category_ids: ["cat_uni"], archived: true })];
  it("prefers the category's rubric, then the default; archived ones don't count", () => {
    expect(rubricFor(list, "cat_exam")?.id).toBe("exam");
    expect(rubricFor(list, "cat_uni")?.id).toBe("def");
    expect(rubricFor(list, null)?.id).toBe("def");
    expect(rubricFor([], "cat_exam")).toBeNull();
  });
});

describe("rubricProblems and scoreProblems", () => {
  it("needs 2–8 named, distinct criteria", () => {
    expect(rubricProblems([{ label: "A" }])).toMatch(/at least 2/);
    expect(rubricProblems(Array.from({ length: 9 }, (_, i) => ({ label: `C${i}` })))).toMatch(/at most 8/);
    expect(rubricProblems([{ label: "A" }, { label: " " }])).toMatch(/needs a name/);
    expect(rubricProblems([{ label: "Focus" }, { label: "focus " }])).toMatch(/same name/);
    expect(rubricProblems([{ label: "A" }, { label: "B" }])).toBeNull();
  });
  it("needs a 1–4 level for every criterion and nothing else", () => {
    const criteria = [{ key: "a", label: "Accuracy", description: null }, { key: "b", label: "Speed", description: null }];
    expect(scoreProblems(criteria, { a: 3, b: 4 })).toEqual({});
    expect(scoreProblems(criteria, { a: 5, z: 1 })).toEqual({ a: "Choose a level for Accuracy.", b: "Choose a level for Speed.", z: "That isn't part of this rubric." });
  });
});

describe("progress", () => {
  it("tracks first and latest per criterion, oldest first, matching by label", () => {
    const c = (label: string, key = label.toLowerCase()) => ({ key, label, description: null });
    const rows = progress([
      { created_at: "2026-11-10T10:00:00Z", rubric: { criteria: [c("Knowledge", "k2"), c("Timing")] }, scores: { k2: 4, timing: 2 } },
      { created_at: "2026-11-01T10:00:00Z", rubric: { criteria: [c("Knowledge", "k1")] }, scores: { k1: 2 } },
    ]);
    expect(rows).toEqual([
      { key: "k1", label: "Knowledge", first: 2, latest: 4, change: 2, count: 2 },
      { key: "timing", label: "Timing", first: 2, latest: 2, change: 0, count: 1 },
    ]);
  });
});
