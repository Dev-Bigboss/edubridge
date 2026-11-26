import { delay } from "msw";
import { http, HttpResponse } from "msw/http";
import { DeleteAccount, type DeletionBlocker } from "@/lib/api/schemas/account";
import { audit, db, findUser, save, sendMail, toUser, type MockUser } from "../db";
import { apiError, blockWhileImpersonating, requireUser, url, validationError } from "./util";

const LIVE_BOOKING = new Set(["PENDING_INSTRUCTOR", "COUNTER_PROPOSED", "ACCEPTED", "RESCHEDULE_REQUESTED"]);
const LIVE_TEACHING = new Set(["OPEN", "FULL", "CLOSED", "IN_PROGRESS"]);
const nameOf = (id: string | null | undefined) => (id ? (findUser(id)?.name ?? "Someone") : null);
const trainingTitle = (id: string) => db.trainings.find((t) => t.id === id)?.title ?? "a training";

/** NFR Privacy: everything that must be wrapped up before the account can go. */
export function deletionBlockers(u: MockUser): DeletionBlocker[] {
  const out: DeletionBlocker[] = [];
  if (u.role === "ADMIN") out.push({ code: "ADMIN_ACCOUNT", detail: "Admin accounts are removed by another admin.", link: null });
  for (const e of db.enrolments.filter((x) => x.learner_id === u.id && x.status === "CONFIRMED")) {
    const c = db.cohorts.find((x) => x.id === e.cohort_id);
    if (c && c.status !== "COMPLETED" && c.status !== "CANCELLED") {
      out.push({ code: "ACTIVE_ENROLMENT", detail: `${trainingTitle(c.training_id)}, ${c.name}`, link: "/learn/trainings" });
    }
  }
  for (const b of db.bookings.filter((x) => (x.learner_id === u.id || x.instructor_id === u.id) && LIVE_BOOKING.has(x.status))) {
    const asLearner = b.learner_id === u.id;
    out.push({
      code: "ACTIVE_BOOKING",
      detail: `${trainingTitle(b.training_id)} with ${nameOf(asLearner ? b.instructor_id : b.learner_id)}`,
      link: asLearner ? `/learn/bookings/${b.id}` : "/teach/requests",
    });
  }
  if (u.role === "INSTRUCTOR") {
    for (const c of db.cohorts.filter((x) => x.instructor_id === u.id && LIVE_TEACHING.has(x.status))) {
      out.push({ code: "TEACHING_COHORT", detail: `${trainingTitle(c.training_id)}, ${c.name}`, link: "/teach/cohorts" });
    }
    const balance = db.ledger.filter((l) => l.instructor_id === u.id).reduce((sum, l) => sum + l.amount, 0);
    if (balance > 0) out.push({ code: "UNPAID_EARNINGS", detail: `$${(balance / 100).toFixed(2)} not yet paid out`, link: "/teach/earnings" });
  }
  return out;
}

const without = <T extends object>(obj: T, keys: string[]) => Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k)));

/** Everything held about the person. Other people appear by name only. */
function exportFor(u: MockUser) {
  const conversationIds = new Set(db.conversations.filter((c) => c.member_ids.includes(u.id)).map((c) => c.id));
  const sections: Record<string, unknown[]> = {
    enrolments: db.enrolments
      .filter((e) => e.learner_id === u.id)
      .map((e) => {
        const c = db.cohorts.find((x) => x.id === e.cohort_id);
        return { ...e, training: c ? trainingTitle(c.training_id) : null, cohort: c?.name ?? null };
      }),
    payments: db.payments.filter((p) => p.learner_id === u.id).map((p) => without(p, ["mock", "idempotency_key"])),
    bookings: db.bookings
      .filter((b) => b.learner_id === u.id || b.instructor_id === u.id)
      .map((b) => ({ ...without(b, ["learner_id", "instructor_id"]), learner: nameOf(b.learner_id), instructor: nameOf(b.instructor_id), training: trainingTitle(b.training_id) })),
    messages_sent: db.messages
      .filter((m) => m.sender_id === u.id && conversationIds.has(m.conversation_id))
      .map((m) => ({ ...without(m, ["sender_id", "client_id"]), attachments: m.attachments.map((a) => a.name) })),
    feedback: db.feedback
      .filter((f) => f.learner_id === u.id || f.instructor_id === u.id)
      .map((f) => ({ ...without(f, ["learner_id", "instructor_id"]), learner: nameOf(f.learner_id), instructor: nameOf(f.instructor_id) })),
    reviews: db.reviews.filter((r) => r.learner_id === u.id).map((r) => without(r, ["moderation"])),
    notifications: db.notifications.filter((n) => n.user_id === u.id),
    resource_access: db.resourceOpens
      .filter((o) => o.learner_id === u.id)
      .map((o) => ({ ...without(o, ["learner_id"]), resource: db.resources.find((r) => r.id === o.resource_id)?.title ?? null })),
    recording_positions: Object.entries(db.recordingProgress[u.id] ?? {}).map(([recording_id, seconds]) => ({ recording_id, seconds })),
  };
  if (u.role === "INSTRUCTOR") {
    sections.earnings = db.ledger.filter((l) => l.instructor_id === u.id);
    sections.payouts = db.payouts.filter((p) => p.instructor_id === u.id);
    sections.resources = db.resources.filter((r) => r.owner_id === u.id);
  }
  return {
    exported_at: new Date().toISOString(),
    format_version: 1,
    account: {
      user: toUser(u),
      created_at: u.created_at ?? null,
      last_sign_in_at: u.last_sign_in_at ?? null,
      onboarding: db.onboarding[u.id] ?? null,
      notification_preferences: db.notificationPrefs[u.id] ?? {},
      availability: db.availability[u.id] ?? null,
    },
    sections: Object.fromEntries(Object.entries(sections).filter(([, v]) => v.length > 0)),
  };
}

const dropKey = <T,>(rec: Record<string, T>, key: string) => Object.fromEntries(Object.entries(rec).filter(([k]) => k !== key)) as Record<string, T>;

/** Erase personal data; keep anonymised records others or the law rely on (payments, ledger, reviews, messages). */
function erase(u: MockUser) {
  const id = u.id;
  db.onboarding = dropKey(db.onboarding, id);
  db.notificationPrefs = dropKey(db.notificationPrefs, id);
  db.mfaSetup = dropKey(db.mfaSetup, id);
  db.pendingMfa = dropKey(db.pendingMfa, id);
  db.recordingProgress = dropKey(db.recordingProgress, id);
  db.availability = dropKey(db.availability, id);
  db.notifications = db.notifications.filter((n) => n.user_id !== id);
  db.resourceOpens = db.resourceOpens.filter((o) => o.learner_id !== id);
  const enrolmentIds = new Set(db.enrolments.filter((e) => e.learner_id === id).map((e) => e.id));
  db.checklists = Object.fromEntries(Object.entries(db.checklists).filter(([k]) => !enrolmentIds.has(k)));
  db.tokens = Object.fromEntries(Object.entries(db.tokens).filter(([, t]) => t.user_id !== id));
  Object.assign(u, {
    name: "Deleted user",
    email: `deleted+${id}@invalid.edubridge`,
    password: null,
    avatar_url: null,
    headline: null,
    mfa_enabled: false,
    status: "SUSPENDED",
  });
}

export const privacyHandlers = [
  http.get(url("/me/data-export"), async () => {
    await delay(400);
    const user = requireUser();
    if (user instanceof Response) return user;
    if (db.impersonation) return apiError(403, "IMPERSONATION_READ_ONLY", "You're viewing as this user, so you can't download their data.");
    const day = new Date().toISOString().slice(0, 10);
    return HttpResponse.json(exportFor(user), { headers: { "Content-Disposition": `attachment; filename="edubridge-data-${day}.json"` } });
  }),

  http.get(url("/me/deletion"), async () => {
    await delay(200);
    const user = requireUser();
    if (user instanceof Response) return user;
    return HttpResponse.json({ blockers: deletionBlockers(user), has_password: user.password !== null });
  }),

  http.post(url("/me/deletion"), async ({ request }) => {
    await delay(500);
    const user = requireUser();
    if (user instanceof Response) return user;
    const readOnly = blockWhileImpersonating();
    if (readOnly) return readOnly;
    const parsed = DeleteAccount.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    if (parsed.data.confirm_email.toLowerCase() !== user.email.toLowerCase()) {
      return apiError(422, "VALIDATION_FAILED", "That isn't your email address.", { confirm_email: ["Type the email address you sign in with."] });
    }
    if (user.password !== null && parsed.data.password !== user.password) {
      return apiError(422, "VALIDATION_FAILED", "That password isn't right.", { password: ["That password isn't right."] });
    }
    const blockers = deletionBlockers(user);
    if (blockers.length) return apiError(409, "DELETION_BLOCKED", "Some things need to be finished first.", { blockers: blockers.map((b) => b.code) });
    const oldEmail = user.email;
    erase(user);
    audit(user, "user.self_deleted", "user", user.id, "Account deleted at the user's request; personal data erased");
    sendMail(oldEmail, "Your EduBridge account has been deleted", "/");
    db.session = null;
    save();
    return new HttpResponse(null, { status: 204 });
  }),
];
