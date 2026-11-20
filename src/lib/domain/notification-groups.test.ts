import { describe, expect, it } from "vitest";
import { effectivePreferences, groupOf, groupsFor, wants } from "./notification-groups";

describe("notification preferences (NTF-2)", () => {
  it("offers each role only the groups that reach it", () => {
    expect(groupsFor("LEARNER").map((g) => g.key)).toEqual(["bookings", "reminders", "payments", "cohorts", "content", "messages"]);
    expect(groupsFor("ADMIN").map((g) => g.key)).toEqual(["account"]);
    expect(groupOf("PAYMENT_REFUNDED")?.key).toBe("payments");
  });

  it("starts with everything on and keeps locked channels on whatever was saved", () => {
    const prefs = effectivePreferences("LEARNER", { payments: { in_app: false, email: false }, messages: { in_app: true, email: false } });
    expect(prefs.find((p) => p.group === "payments")).toEqual({ group: "payments", in_app: false, email: true });
    expect(prefs.find((p) => p.group === "messages")).toEqual({ group: "messages", in_app: true, email: false });
    expect(prefs.find((p) => p.group === "reminders")).toEqual({ group: "reminders", in_app: true, email: true });
  });

  it("decides per event and channel; unknown types always go through", () => {
    const saved = { reminders: { in_app: false, email: true } };
    expect(wants("LEARNER", saved, "SESSION_REMINDER", "in_app")).toBe(false);
    expect(wants("LEARNER", saved, "SESSION_REMINDER", "email")).toBe(true);
    expect(wants("LEARNER", saved, "SOMETHING_NEW", "in_app")).toBe(true);
  });
});
