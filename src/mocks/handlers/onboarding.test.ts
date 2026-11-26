import { beforeEach, describe, expect, it } from "vitest";
import { ApiError, api } from "@/lib/api/client";
import { SessionResponse } from "@/lib/api/schemas/auth";
import { OnboardingState, SubmitResponse } from "@/lib/api/schemas/onboarding";
import { uploadFile } from "@/lib/api/hooks/uploads";
import { db, mockSession, resetDb } from "../db";

const failure = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error("expected the request to fail");
    },
    (e) => e as ApiError,
  );

function signInAsNew(role: "LEARNER" | "INSTRUCTOR") {
  const id = `usr_new_${role}`;
  db.users.push({
    id,
    role,
    email: `${role.toLowerCase()}.new@example.com`,
    name: "New Person",
    timezone: "UTC",
    status: "ACTIVE",
    avatar_url: null,
    onboarding_status: "NOT_STARTED",
    approval_status: role === "INSTRUCTOR" ? "PENDING" : null,
    mfa_enabled: false,
    consent_required: false,
    password: null,
  });
  mockSession.set(id);
}

const put = (section: string, body: unknown) =>
  api(`/onboarding/sections/${section}`, { method: "PUT", body, schema: OnboardingState });

const profile = { name: "Ada Obi", avatar_file_id: null, timezone: "Africa/Lagos", country: "NG" };

describe("onboarding mock follows contracts/openapi/onboarding.yaml", () => {
  beforeEach(() => resetDb());

  it("learner saves steps, can resume, and finishes", async () => {
    signInAsNew("LEARNER");
    const start = await api("/onboarding", { schema: OnboardingState });
    expect(start.completed_steps).toEqual([]);

    const s1 = await put("profile", profile);
    expect(s1.status).toBe("IN_PROGRESS");
    expect((await api("/auth/me", { schema: SessionResponse })).user.timezone).toBe("Africa/Lagos");

    const early = await failure(api("/onboarding/submit", { method: "POST" }));
    expect(early.code).toBe("ONBOARDING_INCOMPLETE");

    await put("goals", { learning_goals: "Pass ICAN Skills in May", interest_category_ids: ["cat_prof_exam"], topics: [] });
    await put("background", { education_level: "UNDERGRADUATE", exam_target_date: null });
    const done = await api("/onboarding/submit", { method: "POST", schema: SubmitResponse });
    expect(done.user.onboarding_status).toBe("COMPLETED");
  });

  it("returns dot-path field errors the form can place", async () => {
    signInAsNew("INSTRUCTOR");
    const err = await failure(
      put("expertise", {
        category_ids: ["cat_topic"],
        subjects: ["Calculus"],
        qualifications: [{ title: "BSc Mathematics", institution: "UNILAG", year: 3000 }],
      }),
    );
    expect(err.fieldErrors["qualifications.0.year"]).toBeDefined();

    const overlap = await failure(
      put("availability", {
        timezone: "Europe/London",
        weekly: [
          { weekday: 1, start: "09:00", end: "12:00" },
          { weekday: 1, start: "11:00", end: "13:00" },
        ],
      }),
    );
    expect(overlap.fieldErrors["weekly.1.start"]).toBeDefined();
  });

  it("instructor completes every section and is queued for approval", async () => {
    signInAsNew("INSTRUCTOR");
    await put("profile", {
      ...profile,
      headline: "Chartered accountant teaching ICAN",
      bio: "I have taught ICAN and ACCA candidates for eight years, in small groups and one-on-one, with a focus on exam technique.",
    });
    await put("expertise", {
      category_ids: ["cat_prof_exam"],
      subjects: ["Financial reporting"],
      qualifications: [{ title: "ACA", institution: "ICAN", year: 2016 }],
    });
    const id = await uploadFile("ID_DOCUMENT", new File(["%PDF-1.4"], "passport.pdf", { type: "application/pdf" }));
    expect(id.scan_status).toBe("CLEAN");
    await put("verification", { id_document_file_id: id.id, credential_file_ids: [] });
    await api("/onboarding/payout-link", { method: "POST" });
    const s = await put("availability", { timezone: "Africa/Lagos", weekly: [{ weekday: 2, start: "17:00", end: "20:00" }] });
    expect(s.completed_steps.sort()).toEqual(["availability", "expertise", "payout", "profile", "verification"]);

    const done = await api("/onboarding/submit", { method: "POST", schema: SubmitResponse });
    expect(done.user).toMatchObject({ onboarding_status: "COMPLETED", approval_status: "PENDING" });
  });

  it("rejects files the rules don't allow before uploading", async () => {
    signInAsNew("INSTRUCTOR");
    const err = await failure(uploadFile("AVATAR", new File(["x"], "cv.pdf", { type: "application/pdf" })));
    expect(err.code).toBe("FILE_REJECTED");
  });

  it("keeps admins out", async () => {
    mockSession.set("usr_admin_1");
    const err = await failure(api("/onboarding"));
    expect(err.status).toBe(403);
  });
});
