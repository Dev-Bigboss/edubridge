import { beforeEach, describe, expect, it } from "vitest";
import { ApiError, api } from "@/lib/api/client";
import { AdminUserDetail, AdminUserPage } from "@/lib/api/schemas/admin-users";
import { SessionResponse } from "@/lib/api/schemas/auth";
import { db, mockSession, resetDb } from "../db";

const failure = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error("expected the request to fail");
    },
    (e) => e as ApiError,
  );
const list = (query: Record<string, string> = {}) => api("/admin/users", { query, schema: AdminUserPage });
const act = (id: string, action: string, reason?: string) =>
  api(`/admin/users/${id}/${action}`, { method: "POST", body: reason ? { reason } : {} });
const me = () => api("/auth/me", { schema: SessionResponse }).then((r) => r.user);

describe("admin users (ADM-2, ONB-3)", () => {
  beforeEach(() => {
    resetDb();
    mockSession.set("usr_admin_1");
  });

  it("is admin-only and lists applicants first, with a pending count", async () => {
    const page = await list();
    expect(page.items[0].id).toBe("usr_instructor_pending");
    expect(page.pending_approvals).toBe(1);
    expect(page.items[0]).not.toHaveProperty("password");
    mockSession.set("usr_learner_1");
    expect((await failure(list())).status).toBe(403);
  });

  it("searches and filters", async () => {
    expect((await list({ q: "applicant" })).items.map((u) => u.id)).toEqual(["usr_instructor_pending"]);
    expect((await list({ status: "SUSPENDED" })).items.map((u) => u.id)).toEqual(["usr_learner_suspended"]);
    expect((await list({ role: "ADMIN" })).total).toBe(1);
    expect((await list({ approval: "PENDING" })).total).toBe(1);
  });

  it("shows an applicant's submitted onboarding for review", async () => {
    const d = await api("/admin/users/usr_instructor_pending", { schema: AdminUserDetail });
    expect(d.onboarding?.expertise?.subjects).toContain("Statistics");
    expect(d.onboarding?.verification?.id_document?.name).toBe("national-id.pdf");
    const learner = await api("/admin/users/usr_learner_1", { schema: AdminUserDetail });
    expect(learner.stats).toMatchObject({ enrolments: 2, payments_total: 65000 });
  });

  it("ONB-3: approves an applicant, notifies and audits; reject needs a reason", async () => {
    expect((await failure(act("usr_instructor_pending", "reject"))).fieldErrors).toHaveProperty("reason");
    await act("usr_instructor_pending", "approve");
    expect(db.users.find((u) => u.id === "usr_instructor_pending")!.approval_status).toBe("APPROVED");
    expect(db.notifications[0]).toMatchObject({ user_id: "usr_instructor_pending", type: "INSTRUCTOR_APPROVED" });
    expect(db.audit[0]).toMatchObject({ action: "user.approve", target_id: "usr_instructor_pending" });
    expect((await failure(act("usr_instructor_pending", "approve"))).code).toBe("INVALID_TRANSITION");
  });

  it("suspends with a reason, signs the user out and blocks sign-in; reactivates", async () => {
    await act("usr_learner_1", "suspend", "Repeated chargebacks.");
    expect(db.users.find((u) => u.id === "usr_learner_1")!.status).toBe("SUSPENDED");
    mockSession.set(null);
    const login = await failure(api("/auth/login", { method: "POST", body: { email: "learner@example.com", password: "Password123!" } }));
    expect(login.code).toBe("ACCOUNT_SUSPENDED");
    mockSession.set("usr_admin_1");
    await act("usr_learner_1", "reactivate");
    expect(db.users.find((u) => u.id === "usr_learner_1")!.status).toBe("ACTIVE");
  });

  it("resets access by email and won't let admins act on themselves", async () => {
    await act("usr_learner_1", "reset-access");
    expect(db.outbox[0]).toMatchObject({ to: "learner@example.com", subject: "Reset your EduBridge password" });
    expect((await failure(act("usr_admin_1", "suspend", "Testing myself"))).code).toBe("SELF_ACTION");
  });

  it("views as a learner read-only, then returns to the admin session", async () => {
    expect((await failure(act("usr_learner_1", "impersonate"))).fieldErrors).toHaveProperty("reason");
    await act("usr_learner_1", "impersonate", "Learner reports a missing receipt.");
    const viewed = await me();
    expect(viewed).toMatchObject({ id: "usr_learner_1", impersonated_by: { id: "usr_admin_1", name: "Test Admin" } });

    const write = await failure(api("/checkout/sessions", { method: "POST", body: { cohort_id: "coh_mth_sem1" }, idempotencyKey: "x" }));
    expect(write.code).toBe("IMPERSONATION_READ_ONLY");
    expect((await failure(api("/me/notifications/read-all", { method: "POST" }))).code).toBe("IMPERSONATION_READ_ONLY");

    await api("/auth/impersonation/end", { method: "POST" });
    expect(await me()).toMatchObject({ id: "usr_admin_1", impersonated_by: null });
    expect(db.audit.slice(0, 2).map((a) => a.action)).toEqual(["user.impersonate_end", "user.impersonate"]);
  });

  it("never views as another admin or a suspended account", async () => {
    db.users.push({ ...db.users.find((u) => u.id === "usr_admin_1")!, id: "usr_admin_2", email: "admin2@example.com" });
    expect((await failure(act("usr_admin_2", "impersonate", "Checking something"))).status).toBe(403);
    expect((await failure(act("usr_learner_suspended", "impersonate", "Checking something"))).code).toBe("INVALID_TRANSITION");
  });
});
