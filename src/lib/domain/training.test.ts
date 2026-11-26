import { describe, expect, it } from "vitest";
import { languageName, missingMetadata, publishChecks, slugify } from "./training";

describe("missingMetadata (TRN-4)", () => {
  const fields = [
    { key: "exam_body", label: "Exam body", type: "TEXT" as const, required: true },
    { key: "exam_code", label: "Exam code", type: "TEXT" as const, required: false },
    { key: "topic_tags", label: "Tags", type: "TAGS" as const, required: true },
  ];
  it("lists required fields that are blank or empty", () => {
    expect(missingMetadata(fields, { exam_body: "  ", topic_tags: [] })).toEqual(["exam_body", "topic_tags"]);
    expect(missingMetadata(fields, { exam_body: "ICAN", topic_tags: ["tax"] })).toEqual([]);
  });
});

describe("publishChecks", () => {
  it("passes only when everything is in place", () => {
    const ok = publishChecks({ description: "x".repeat(80), instructorCount: 1, categoryActive: true, missingMetadata: [], hasPrice: true });
    expect(ok.every((c) => c.ok)).toBe(true);
    const bad = publishChecks({ description: "short", instructorCount: 0, categoryActive: false, missingMetadata: ["a"], hasPrice: false });
    expect(bad.filter((c) => !c.ok).map((c) => c.key)).toEqual(["description", "category", "metadata", "instructors", "price"]);
  });
});

describe("helpers", () => {
  it("slugifies titles", () => {
    expect(slugify("  ICAN Skills: Financial Reporting (May 2027) ")).toBe("ican-skills-financial-reporting-may-2027");
    expect(slugify("Français élémentaire")).toBe("francais-elementaire");
  });
  it("names languages", () => {
    expect(languageName("yo")).toBe("Yoruba");
    expect(languageName("not a code")).toBe("not a code");
  });
});
