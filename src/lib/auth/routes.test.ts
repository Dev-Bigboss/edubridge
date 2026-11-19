import { describe, expect, it } from "vitest";
import { postLoginPath, roleForPath, safeNextPath } from "./routes";

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
