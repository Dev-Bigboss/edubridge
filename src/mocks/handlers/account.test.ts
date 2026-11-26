import { beforeEach, describe, expect, it } from "vitest";
import { ApiError, api } from "@/lib/api/client";
import { MyProfileResponse, Preferences } from "@/lib/api/schemas/account";
import { db, mockSession, notify, resetDb } from "../db";

const failure = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error("expected the request to fail");
    },
    (e) => e as ApiError,
  );
const profile = () => api("/me/profile", { schema: MyProfileResponse }).then((r) => r.profile);
const patch = (body: unknown) => api("/me/profile", { method: "PATCH", body, schema: MyProfileResponse });

describe("my account (any role)", () => {
  beforeEach(() => {
    resetDb();
    mockSession.set("usr_learner_1");
  });

  it("reads and updates the profile; learners have no headline or bio", async () => {
    const p = await profile();
    expect(p).toMatchObject({ email: "learner@example.com", name: "Test Learner", headline: null });
    await patch({ name: "Ada Learner", avatar_file_id: null, timezone: "Europe/London", country: "GB", headline: "ignored", bio: "ignored" });
    expect(await profile()).toMatchObject({ name: "Ada Learner", timezone: "Europe/London", country: "GB", headline: null });
    expect(db.users.find((u) => u.id === "usr_learner_1")!.timezone).toBe("Europe/London");
  });

  it("instructors must keep a headline and bio", async () => {
    mockSession.set("usr_instructor_pending");
    const base = { name: "Demo Applicant", avatar_file_id: null, timezone: "Africa/Lagos", country: "NG", headline: null, bio: null };
    expect(Object.keys((await failure(patch(base))).fieldErrors).sort()).toEqual(["bio", "headline"]);
    await patch({ ...base, headline: "Statistician and research tutor", bio: "x".repeat(90) });
    expect((await profile()).headline).toBe("Statistician and research tutor");
  });

  it("changes the password only with the current one", async () => {
    expect((await failure(api("/me/password", { method: "POST", body: { current_password: "nope", new_password: "a much longer one" } }))).fieldErrors).toHaveProperty("current_password");
    await api("/me/password", { method: "POST", body: { current_password: "Password123!", new_password: "a much longer one" } });
    expect(db.users.find((u) => u.id === "usr_learner_1")!.password).toBe("a much longer one");
    expect(db.outbox[0].subject).toBe("Your EduBridge password was changed");
  });

  it("learners turn two-step sign-in on with a code and off with their password; others can't turn it off", async () => {
    await api("/me/mfa/setup", { method: "POST" });
    expect((await failure(api("/me/mfa/enable", { method: "POST", body: { code: "000000" } }))).fieldErrors).toHaveProperty("code");
    await api("/me/mfa/enable", { method: "POST", body: { code: "123456" } });
    expect(db.users.find((u) => u.id === "usr_learner_1")!.mfa_enabled).toBe(true);
    await api("/me/mfa/disable", { method: "POST", body: { password: "Password123!" } });
    expect(db.users.find((u) => u.id === "usr_learner_1")!.mfa_enabled).toBe(false);
    mockSession.set("usr_instructor_1");
    expect((await failure(api("/me/mfa/disable", { method: "POST", body: { password: "Password123!" } }))).code).toBe("MFA_REQUIRED");
  });

  it("NTF-2: saves channel choices, keeps locked ones on, and in-app delivery follows them", async () => {
    const res = await api("/me/notification-preferences", {
      method: "PUT",
      body: { items: [{ group: "payments", in_app: false, email: false }, { group: "reminders", in_app: false, email: true }] },
      schema: Preferences,
    });
    expect(res.items.find((p) => p.group === "payments")).toEqual({ group: "payments", in_app: false, email: true });
    const before = db.notifications.length;
    notify("usr_learner_1", { type: "SESSION_REMINDER", title: "Soon", body: "", link: null });
    expect(db.notifications).toHaveLength(before);
    notify("usr_learner_1", { type: "MESSAGE_RECEIVED", title: "Hi", body: "", link: null });
    expect(db.notifications).toHaveLength(before + 1);
  });

  it("is read-only while an admin views as the user", async () => {
    mockSession.set("usr_admin_1");
    await api("/admin/users/usr_learner_1/impersonate", { method: "POST", body: { reason: "Support question" } });
    expect(await profile()).toMatchObject({ name: "Test Learner" });
    expect((await failure(patch({ name: "Hacked", avatar_file_id: null, timezone: "UTC", country: null }))).code).toBe("IMPERSONATION_READ_ONLY");
  });
});
