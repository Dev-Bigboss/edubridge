import { beforeEach, describe, expect, it } from "vitest";
import { ApiError, api } from "@/lib/api/client";
import { DeletionCheck } from "@/lib/api/schemas/account";
import { db, findUser, mockSession, resetDb } from "../db";

const failure = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error("expected the request to fail");
    },
    (e) => e as ApiError,
  );
const blockers = () => api("/me/deletion", { schema: DeletionCheck }).then((r) => r.blockers.map((b) => b.code));
const remove = (body: Record<string, unknown>) => api("/me/deletion", { method: "POST", body });

describe("privacy: data export and account deletion", () => {
  beforeEach(() => {
    resetDb();
    mockSession.set("usr_learner_1");
  });

  it("exports the learner's own data, naming other people instead of exposing their ids", async () => {
    const data = (await api("/me/data-export")) as { account: { user: { email: string }; onboarding: unknown }; sections: Record<string, unknown[]> };
    expect(data.account.user.email).toBe("learner@example.com");
    expect(data.account.onboarding).not.toBeNull();
    expect(data.sections.enrolments.length).toBeGreaterThan(0);
    expect(data.sections.payments.length).toBeGreaterThan(0);
    expect(JSON.stringify(data.sections.feedback)).not.toContain("usr_instructor_1");
    expect(JSON.stringify(data)).not.toContain("idempotency_key");
    expect(data.sections).not.toHaveProperty("earnings");
  });

  it("refuses the export while an admin views as the user", async () => {
    db.impersonation = { admin_id: "usr_admin_1", started_at: new Date().toISOString(), reason: "Support" };
    expect((await failure(api("/me/data-export"))).status).toBe(403);
  });

  it("lists what must be finished first, and refuses deletion until then", async () => {
    expect(await blockers()).toContain("ACTIVE_ENROLMENT");
    const err = await failure(remove({ confirm_email: "learner@example.com", password: findUser("usr_learner_1")!.password }));
    expect(err.status).toBe(409);
    expect(err.code).toBe("DELETION_BLOCKED");
    mockSession.set("usr_admin_1");
    expect(await blockers()).toContain("ADMIN_ACCOUNT");
    mockSession.set("usr_instructor_1");
    expect(await blockers()).toEqual(expect.arrayContaining(["TEACHING_COHORT"]));
  });

  it("checks the email and password, then erases personal data and signs out", async () => {
    // Free the learner: their cohort is finished.
    for (const c of db.cohorts) c.status = "COMPLETED";
    const user = findUser("usr_learner_1")!;
    const password = user.password!;
    expect(await blockers()).toEqual([]);
    expect((await failure(remove({ confirm_email: "someone@else.com", password }))).fieldErrors).toHaveProperty("confirm_email");
    expect((await failure(remove({ confirm_email: user.email, password: "wrong" }))).fieldErrors).toHaveProperty("password");

    const payments = db.payments.filter((p) => p.learner_id === user.id).length;
    await remove({ confirm_email: "LEARNER@example.com", password });
    expect(user).toMatchObject({ name: "Deleted user", password: null, status: "SUSPENDED" });
    expect(user.email).not.toBe("learner@example.com");
    expect(db.onboarding.usr_learner_1).toBeUndefined();
    expect(db.notifications.some((n) => n.user_id === user.id)).toBe(false);
    expect(db.payments.filter((p) => p.learner_id === user.id)).toHaveLength(payments); // kept for the accounts
    expect(db.outbox[0]).toMatchObject({ to: "learner@example.com", subject: "Your EduBridge account has been deleted" });
    expect(db.audit[0].action).toBe("user.self_deleted");
    expect(mockSession.get()).toBeNull();
  });
});
