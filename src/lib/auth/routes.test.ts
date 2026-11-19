import { describe, expect, it } from "vitest";
import { afterSignInPath, postLoginPath, roleForPath, safeNextPath } from "./routes";

describe("safeNextPath", () => {
  it("accepts internal paths", () => {
    expect(safeNextPath("/learn/bookings?tab=pending")).toBe("/learn/bookings?tab=pending");
  });
  it("rejects external and protocol-relative targets", () => {
    expect(safeNextPath("https://evil.example")).toBeNull();
    expect(safeNextPath("//evil.example")).toBeNull();
    expect(safeNextPath("/\\evil.example")).toBeNull();
    expect(safeNextPath(null)).toBeNull();
  });
});

describe("roleForPath", () => {
  it("maps role areas", () => {
    expect(roleForPath("/learn")).toBe("LEARNER");
    expect(roleForPath("/teach/requests")).toBe("INSTRUCTOR");
    expect(roleForPath("/admin/pricing")).toBe("ADMIN");
    expect(roleForPath("/learning-paths")).toBeNull();
    expect(roleForPath("/")).toBeNull();
  });
});

describe("postLoginPath", () => {
  it("honours next when it belongs to the user's role", () => {
    expect(postLoginPath("LEARNER", "/learn/payments")).toBe("/learn/payments");
  });
  it("ignores next that belongs to another role", () => {
    expect(postLoginPath("LEARNER", "/admin/users")).toBe("/learn");
  });
  it("falls back to the role home", () => {
    expect(postLoginPath("INSTRUCTOR", undefined)).toBe("/teach");
    expect(postLoginPath("ADMIN", "https://evil.example")).toBe("/admin");
  });
});

describe("afterSignInPath", () => {
  const done = { consent_required: false, onboarding_status: "COMPLETED" };

  it("goes to next or home once every gate is passed", () => {
    expect(afterSignInPath({ role: "LEARNER", ...done }, "/learn/payments")).toBe("/learn/payments");
    expect(afterSignInPath({ role: "ADMIN", ...done }, null)).toBe("/admin");
  });

  it("asks for consent first and keeps the destination", () => {
    expect(afterSignInPath({ role: "LEARNER", consent_required: true, onboarding_status: "NOT_STARTED" }, "/learn/payments")).toBe(
      "/consent?next=%2Flearn%2Fpayments",
    );
  });

  it("sends new learners to onboarding once, but lets them finish later", () => {
    expect(afterSignInPath({ role: "LEARNER", consent_required: false, onboarding_status: "NOT_STARTED" }, null)).toBe(
      "/onboarding/learner?next=%2Flearn",
    );
    expect(afterSignInPath({ role: "LEARNER", consent_required: false, onboarding_status: "IN_PROGRESS" }, null)).toBe("/learn");
  });

  it("keeps instructors in onboarding until it is complete", () => {
    expect(afterSignInPath({ role: "INSTRUCTOR", consent_required: false, onboarding_status: "IN_PROGRESS" }, null)).toBe(
      "/onboarding/instructor?next=%2Fteach",
    );
  });

  it("never gives admins an onboarding step", () => {
    expect(afterSignInPath({ role: "ADMIN", consent_required: false, onboarding_status: "NOT_STARTED" }, null)).toBe("/admin");
  });
});
