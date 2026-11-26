import { delay } from "msw";
import { http, HttpResponse } from "msw/http";
import { NEEDS_REASON, USER_ACTIONS, type UserAction } from "@/lib/api/schemas/admin-users";
import { audit, db, findUser, issueToken, mockSession, notify, save, sendMail, toUser, type MockUser } from "../db";
import { omit } from "./catalog";
import { apiError, requireUser, url } from "./util";

const SEED_CREATED = "2026-10-01T09:00:00.000Z";

function row(u: MockUser) {
  const user = omit(toUser(u), "impersonated_by");
  return { ...user, created_at: u.created_at ?? SEED_CREATED, last_sign_in_at: u.last_sign_in_at ?? null };
}

const isPending = (u: MockUser) => u.role === "INSTRUCTOR" && u.approval_status === "PENDING";

/**
 * ADM-2 and ONB-3. Every action is audited (ADM-5) with its reason. Admins can't act on
 * themselves, and can't view as another admin.
 */
export const adminUserHandlers = [
  http.get(url("/admin/users"), async ({ request }) => {
    await delay(250);
    const admin = requireUser("ADMIN");
    if (admin instanceof Response) return admin;
    const p = new URL(request.url).searchParams;
    const q = p.get("q")?.trim().toLowerCase();
    const items = db.users
      .filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      .filter((u) => !p.get("role") || u.role === p.get("role"))
      .filter((u) => !p.get("status") || u.status === p.get("status"))
      .filter((u) => !p.get("approval") || u.approval_status === p.get("approval"))
      // Applications waiting for a decision first, then newest accounts.
      .sort((a, b) => Number(isPending(b)) - Number(isPending(a)) || (b.created_at ?? SEED_CREATED).localeCompare(a.created_at ?? SEED_CREATED))
      .map(row);
    return HttpResponse.json({ items, next_cursor: null, total: items.length, pending_approvals: db.users.filter(isPending).length });
  }),

  http.get(url("/admin/users/:id"), async ({ params }) => {
    await delay(250);
    const admin = requireUser("ADMIN");
    if (admin instanceof Response) return admin;
    const u = findUser(params.id as string);
    if (!u) return apiError(404, "NOT_FOUND", "That user doesn't exist.");
    const paid = db.payments.filter((p) => p.learner_id === u.id && p.status !== "VOIDED" && p.status !== "FAILED" && p.status !== "PENDING");
    return HttpResponse.json({
      user: row(u),
      onboarding: u.role === "ADMIN" ? null : (db.onboarding[u.id]?.sections ?? { profile: null }),
      stats: {
        enrolments: db.enrolments.filter((e) => e.learner_id === u.id && e.status === "CONFIRMED").length,
        trainings_taught: db.trainings.filter((t) => t.instructors.some((i) => i.instructor_id === u.id)).length,
        payments_total: paid.reduce((sum, p) => sum + p.breakdown.total - p.refunded_amount, 0),
      },
      history: db.audit.filter((a) => a.target_type === "user" && a.target_id === u.id).slice(0, 20),
    });
  }),

  http.post(url("/admin/users/:id/:action"), async ({ params, request }) => {
    await delay(400);
    const admin = requireUser("ADMIN");
    if (admin instanceof Response) return admin;
    const u = findUser(params.id as string);
    if (!u) return apiError(404, "NOT_FOUND", "That user doesn't exist.");
    const action = params.action as UserAction;
    if (!USER_ACTIONS.includes(action)) return apiError(404, "NOT_FOUND", "Unknown action.");
    if (u.id === admin.id) return apiError(409, "SELF_ACTION", "You can't do that to your own account.");
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    const reason = body.reason?.trim() ?? "";
    if (NEEDS_REASON.includes(action) && reason.length < 5) {
      return apiError(422, "VALIDATION_FAILED", "Say why, in a few words.", { reason: ["Say why, in a few words. It's kept in the audit log."] });
    }
    const conflict = (message: string) => apiError(409, "INVALID_TRANSITION", message);

    switch (action) {
      case "approve":
      case "reject": {
        if (!isPending(u)) return conflict("Only instructors waiting for approval can be approved or rejected.");
        u.approval_status = action === "approve" ? "APPROVED" : "REJECTED";
        notify(u.id, action === "approve"
          ? { type: "INSTRUCTOR_APPROVED", title: "You're approved to teach", body: "Your profile is live. Admins can now assign you to trainings.", link: "/teach" }
          : { type: "INSTRUCTOR_REJECTED", title: "Your application wasn't approved", body: reason, link: "/teach" });
        sendMail(u.email, action === "approve" ? "You're approved to teach on EduBridge" : "About your EduBridge instructor application", "/teach");
        audit(admin, `user.${action}`, "user", u.id, action === "approve" ? `Approved instructor ${u.name}` : `Rejected instructor ${u.name}. Reason: ${reason}`);
        break;
      }
      case "suspend": {
        if (u.status === "SUSPENDED") return conflict("This account is already suspended.");
        u.status = "SUSPENDED";
        // Suspension ends every session at once.
        if (db.session === u.id) db.session = null;
        audit(admin, "user.suspend", "user", u.id, `Suspended ${u.name}. Reason: ${reason}`);
        break;
      }
      case "reactivate": {
        if (u.status !== "SUSPENDED") return conflict("Only suspended accounts can be reactivated.");
        u.status = "ACTIVE";
        audit(admin, "user.reactivate", "user", u.id, `Reactivated ${u.name}`);
        break;
      }
      case "reset-access": {
        if (u.status === "SUSPENDED") return conflict("Reactivate the account first.");
        sendMail(u.email, "Reset your EduBridge password", `/reset-password?token=${issueToken("RESET_PASSWORD", u.id)}`);
        audit(admin, "user.reset_access", "user", u.id, `Sent ${u.name} a password reset link and signed them out everywhere`);
        break;
      }
      case "impersonate": {
        if (u.role === "ADMIN") return apiError(403, "FORBIDDEN", "Admins can't view the app as another admin.");
        if (u.status !== "ACTIVE") return conflict("You can only view active accounts.");
        audit(admin, "user.impersonate", "user", u.id, `Started viewing as ${u.name}. Reason: ${reason}`);
        mockSession.set(u.id);
        db.impersonation = { admin_id: admin.id, started_at: new Date().toISOString(), reason };
        save();
        return HttpResponse.json({ user: toUser(u) });
      }
    }
    save();
    return HttpResponse.json({ user: row(u) });
  }),

  /** Back to the admin's own session. Allowed while impersonating (the only write that is). */
  http.post(url("/auth/impersonation/end"), async () => {
    await delay(250);
    const imp = db.impersonation;
    const admin = imp && findUser(imp.admin_id);
    if (!imp || !admin) return apiError(409, "NOT_IMPERSONATING", "You're not viewing as anyone.");
    const target = findUser(db.session);
    mockSession.set(admin.id);
    if (target) audit(admin, "user.impersonate_end", "user", target.id, `Stopped viewing as ${target.name}`);
    save();
    return HttpResponse.json({ user: toUser(admin) });
  }),
];
