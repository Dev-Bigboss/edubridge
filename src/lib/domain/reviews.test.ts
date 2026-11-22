import { describe, expect, it } from "vitest";
import { averageRating, ratingLabel, reviewerName } from "./reviews";

describe("reviews", () => {
  it("averages to one decimal from three reviews", () => {
    expect(averageRating([5, 4])).toBeNull();
    expect(averageRating([5, 4, 4])).toBe(4.3);
    expect(averageRating([5, 5, 5, 4])).toBe(4.8);
    expect(averageRating([], 0)).toBeNull();
  });
  it("shows first name and last initial", () => {
    expect(reviewerName("Ada Demo")).toBe("Ada D.");
    expect(reviewerName("  Mary  Jane   watson ")).toBe("Mary W.");
    expect(reviewerName("Cher")).toBe("Cher");
    expect(reviewerName(" ")).toBe("A learner");
  });
  it("labels ratings in words", () => {
    expect(ratingLabel(4)).toBe("4 out of 5");
    expect(ratingLabel(4.25)).toBe("4.3 out of 5");
  });
});
