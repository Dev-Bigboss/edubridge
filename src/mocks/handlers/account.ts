import { delay } from "msw";
import { http, HttpResponse } from "msw/http";
import { ChangePassword, Preferences } from "@/lib/api/schemas/account";
import { ProfileInput } from "@/lib/api/schemas/onboarding";
import { effectivePreferences, groupsFor } from "@/lib/domain/notification-groups";
import { MOCK_MFA_CODE, db, save, sendMail, toUser, type MockUser } from "../db";
import { getUploadedFile } from "./uploads";
import { apiError, blockWhileImpersonating, requireUser, url, validationError } from "./util";
import { z } from "zod";

/** Everyone except learners must keep two-step sign-in on (NFR Security). */
const mfaRequired = (u: MockUser) => u.role !== "LEARNER";

function profileOf(u: MockUser) {
  const p = db.onboarding[u.id]?.sections.profile;
  return {
    email: u.email,
    name: u.name,
    avatar: p?.avatar ?? null,
    timezone: u.timezone,
    country: p?.country ?? null,
    headline: u.role === "INSTRUCTOR" ? (p?.headline ?? u.headline ?? null) : null,
    bio: u.role === "INSTRUCTOR" ? (p?.bio ?? null) : null,
  };
}

const ProfileUpdate = ProfileInput.extend({
  country: ProfileInput.shape.country.nullable(),
  headline: z.string().trim().min(10, { error: "Write a short headline, at least 10 characters." }).max(120).nullable(),
  bio: z.string().trim().min(80, { error: "Tell learners a little more: at least 80 characters." }).max(2000).nullable(),
});

/** A signed-in person's own account, any role. Writes are refused while an admin is viewing as them. */
function me(): MockUser | Response {
  return requireUser();
}
function meWriting(): MockUser | Response {
  const user = requireUser();
  if (user instanceof Response) return user;
  return blockWhileImpersonating() ?? user;
}

export const accountHandlers = [
  http.get(url("/me/profile"), async () => {
    await delay(200);
    const user = me();
    if (user instanceof Response) return user;
    return HttpResponse.json({ profile: profileOf(user) });
  }),

  http.patch(url("/me/profile"), async ({ request }) => {
    await delay(350);
    const user = meWriting();
    if (user instanceof Response) return user;
    const body = (await request.json()) as Record<string, unknown>;
    // Learners and admins have no public profile, so headline and bio don't apply to them.
    const parsed = ProfileUpdate.safeParse(user.role === "INSTRUCTOR" ? body : { ...body, headline: null, bio: null });
    if (!parsed.success) return validationError(parsed.error);
    const v = parsed.data;
    if (user.role === "INSTRUCTOR" && (!v.headline || !v.bio)) {
      return apiError(422, "VALIDATION_FAILED", "Check the form.", {
        ...(!v.headline && { headline: ["Learners see this on your profile."] }),
        ...(!v.bio && { bio: ["Learners see this on your profile."] }),
      });
    }
    const rec = (db.onboarding[user.id] ??= { completed_steps: [], sections: { profile: null } });
    const avatar = v.avatar_file_id ? (getUploadedFile(v.avatar_file_id) ?? rec.sections.profile?.avatar ?? null) : null;
    rec.sections.profile = {
      ...(rec.sections.profile ?? {}),
      name: v.name,
      avatar,
      timezone: v.timezone,
      country: v.country,
      ...(user.role === "INSTRUCTOR" && { headline: v.headline!, bio: v.bio! }),
    };
    user.name = v.name;
    user.timezone = v.timezone;
    user.avatar_url = avatar?.url ?? null;
    if (user.role === "INSTRUCTOR") user.headline = v.headline;
    save();
    return HttpResponse.json({ profile: profileOf(user), user: toUser(user) });
  }),

  /** Changing the password signs out every other device and emails a heads-up. */
  http.post(url("/me/password"), async ({ request }) => {
    await delay(400);
    const user = meWriting();
    if (user instanceof Response) return user;
    const parsed = ChangePassword.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    if (parsed.data.current_password !== user.password) {
      return apiError(422, "VALIDATION_FAILED", "Check the form.", { current_password: ["That isn't your current password."] });
    }
    user.password = parsed.data.new_password;
    sendMail(user.email, "Your EduBridge password was changed", "/forgot-password");
    save();
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(url("/me/mfa/setup"), async () => {
    await delay(250);
    const user = meWriting();
    if (user instanceof Response) return user;
    if (user.mfa_enabled) return apiError(409, "MFA_ALREADY_ON", "Two-step sign-in is already on.");
    const secret = "JBSWY3DPEHPK3PXP";
    db.mfaSetup[user.id] = secret;
    save();
    return HttpResponse.json({ secret, otpauth_uri: `otpauth://totp/EduBridge:${encodeURIComponent(user.email)}?secret=${secret}&issuer=EduBridge` });
  }),

  http.post(url("/me/mfa/enable"), async ({ request }) => {
    await delay(300);
    const user = meWriting();
    if (user instanceof Response) return user;
    const { code } = (await request.json()) as { code?: string };
    if (!db.mfaSetup[user.id]) return apiError(409, "MFA_NOT_STARTED", "Start the set-up again.");
    if (code !== MOCK_MFA_CODE) return apiError(422, "VALIDATION_FAILED", "Check the code.", { code: ["That code didn't match. Use the latest 6 digits from your app."] });
    delete db.mfaSetup[user.id];
    user.mfa_enabled = true;
    sendMail(user.email, "Two-step sign-in is on", "/learn/settings?tab=security");
    save();
    return HttpResponse.json({ user: toUser(user) });
  }),

  http.post(url("/me/mfa/disable"), async ({ request }) => {
    await delay(300);
    const user = meWriting();
    if (user instanceof Response) return user;
    if (mfaRequired(user)) return apiError(403, "MFA_REQUIRED", "Two-step sign-in is required for your role.");
    const { password } = (await request.json()) as { password?: string };
    if (password !== user.password) return apiError(422, "VALIDATION_FAILED", "Check the form.", { password: ["That isn't your current password."] });
    user.mfa_enabled = false;
    sendMail(user.email, "Two-step sign-in was turned off", "/learn/settings?tab=security");
    save();
    return HttpResponse.json({ user: toUser(user) });
  }),

  /** The mock has one session per browser, so "other devices" is a count the backend would know. */
  http.post(url("/me/sessions/revoke-others"), async () => {
    await delay(300);
    const user = meWriting();
    if (user instanceof Response) return user;
    return HttpResponse.json({ revoked: 2 });
  }),

  /* ---------- NTF-2 ---------- */
  http.get(url("/me/notification-preferences"), async () => {
    await delay(200);
    const user = me();
    if (user instanceof Response) return user;
    return HttpResponse.json({ items: effectivePreferences(user.role, db.notificationPrefs[user.id]) });
  }),

  http.put(url("/me/notification-preferences"), async ({ request }) => {
    await delay(300);
    const user = meWriting();
    if (user instanceof Response) return user;
    const parsed = Preferences.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const allowed = new Set(groupsFor(user.role).map((g) => g.key));
    const saved: Record<string, { in_app: boolean; email: boolean }> = {};
    for (const p of parsed.data.items) if (allowed.has(p.group)) saved[p.group] = { in_app: p.in_app, email: p.email };
    db.notificationPrefs[user.id] = saved;
    save();
    // Locked channels come back on, so the UI shows what really applies.
    return HttpResponse.json({ items: effectivePreferences(user.role, saved) });
  }),
];
