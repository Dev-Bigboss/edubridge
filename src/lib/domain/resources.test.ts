import { describe, expect, it } from "vitest";
import { audienceProblem, cleanAudience, groupByFolder, moveInFolder } from "./resources";

const none = { cohort_id: null, session_id: null, learner_id: null };

describe("resource audiences (RES-2)", () => {
  it("needs the ids its scope uses", () => {
    expect(audienceProblem({ scope: "TRAINING", ...none })).toBeNull();
    expect(audienceProblem({ scope: "COHORT", ...none })).toBe("Choose the cohort.");
    expect(audienceProblem({ scope: "SESSION", ...none, cohort_id: "c" })).toBe("Choose the cohort and the class.");
    expect(audienceProblem({ scope: "LEARNER", ...none })).toBe("Choose the learner.");
  });

  it("drops ids the scope doesn't use", () => {
    expect(cleanAudience({ scope: "TRAINING", cohort_id: "c", session_id: "s", learner_id: "l" })).toEqual({ scope: "TRAINING", ...none });
    expect(cleanAudience({ scope: "SESSION", cohort_id: "c", session_id: "s", learner_id: "l" })).toEqual({ scope: "SESSION", cohort_id: "c", session_id: "s", learner_id: null });
  });
});

describe("folders and order (RES-3)", () => {
  const items = [
    { id: "a", folder: "Week 1", position: 0 },
    { id: "b", folder: "Week 1", position: 1 },
    { id: "c", folder: null, position: 2 },
    { id: "d", folder: "Past papers", position: 3 },
  ];

  it("groups by folder in first-used order, unfiled last", () => {
    expect(groupByFolder(items).map((g) => [g.folder, g.items.map((i) => i.id)])).toEqual([
      ["Week 1", ["a", "b"]],
      ["Past papers", ["d"]],
      [null, ["c"]],
    ]);
  });

  it("moves within a folder, not past its edges", () => {
    expect(moveInFolder(items, "b", -1)).toEqual(["b", "a"]);
    expect(moveInFolder(items, "a", -1)).toBeNull();
    expect(moveInFolder(items, "d", 1)).toBeNull();
  });
});
