import { delay } from "msw";
import { http, HttpResponse } from "msw/http";
import {
  AvailabilityInput,
  BackgroundInput,
  ExpertiseInput,
  GoalsInput,
  INSTRUCTOR_STEPS,
  InstructorProfileInput,
  LEARNER_STEPS,
  ProfileInput,
  VerificationInput,
  type OnboardingState,
} from "@/lib/api/schemas/onboarding";
import { db, save, toUser, type MockUser } from "../db";
import { getUploadedFile } from "./uploads";
import { apiError, requireUser, url, validationError } from "./util";

function record(user: MockUser) {
  db.onboarding[user.id] ??= {
    completed_steps: [],
    sections: {
      profile: { name: user.name, avatar: null, timezone: user.timezone, country: null },
      ...(user.role === "INSTRUCTOR" && { payout: { status: "NOT_STARTED" as const } }),
    },
  };
  return db.onboarding[user.id];
}

const state = (user: MockUser): OnboardingState => ({
  role: user.role as "LEARNER" | "INSTRUCTOR",
  status: user.onboarding_status,
  ...record(user),
});


function markDone(user: MockUser, step: string) {
  const rec = record(user);
  if (!rec.completed_steps.includes(step)) rec.completed_steps.push(step);
  if (user.onboarding_status === "NOT_STARTED") user.onboarding_status = "IN_PROGRESS";
}

const onboardingUser = () => requireUser("LEARNER", "INSTRUCTOR");

export const onboardingHandlers = [
  http.get(url("/onboarding"), async () => {
    await delay(200);
    const user = onboardingUser();
    if (user instanceof Response) return user;
    return HttpResponse.json(state(user));
  }),

  http.put(url("/onboarding/sections/:section"), async ({ params, request }) => {
    await delay(350);
    const user = onboardingUser();
    if (user instanceof Response) return user;
    const section = String(params.section);
    const steps: readonly string[] = user.role === "LEARNER" ? LEARNER_STEPS : INSTRUCTOR_STEPS;
    if (!steps.includes(section) || section === "payout") return apiError(404, "NOT_FOUND", "Unknown step.");

    const body = await request.json();
    const rec = record(user);

    if (section === "profile") {
      const parsed = (user.role === "INSTRUCTOR" ? InstructorProfileInput : ProfileInput).safeParse(body);
      if (!parsed.success) return validationError(parsed.error);
      const { avatar_file_id, ...rest } = parsed.data;
      const avatar = avatar_file_id ? (getUploadedFile(avatar_file_id) ?? rec.sections.profile?.avatar ?? null) : null;
      rec.sections.profile = { ...rest, avatar };
      user.name = rest.name;
      user.timezone = rest.timezone;
      user.avatar_url = avatar?.url ?? null;
    } else if (section === "goals") {
      const parsed = GoalsInput.safeParse(body);
      if (!parsed.success) return validationError(parsed.error);
      rec.sections.goals = parsed.data;
    } else if (section === "background") {
      const parsed = BackgroundInput.safeParse(body);
      if (!parsed.success) return validationError(parsed.error);
      rec.sections.background = parsed.data;
    } else if (section === "expertise") {
      const parsed = ExpertiseInput.safeParse(body);
      if (!parsed.success) return validationError(parsed.error);
      rec.sections.expertise = parsed.data;
    } else if (section === "verification") {
      const parsed = VerificationInput.safeParse(body);
      if (!parsed.success) return validationError(parsed.error);
      const prev = rec.sections.verification;
      const keep = (id: string) => getUploadedFile(id) ?? [prev?.id_document, ...(prev?.credentials ?? [])].find((f) => f?.id === id) ?? null;
      const id_document = keep(parsed.data.id_document_file_id);
      if (!id_document) {
        return apiError(422, "VALIDATION_FAILED", "Upload your ID again.", { id_document_file_id: ["That upload has expired. Upload it again."] });
      }
      rec.sections.verification = {
        id_document,
        credentials: parsed.data.credential_file_ids.map(keep).filter((f) => f !== null),
      };
    } else if (section === "availability") {
      const parsed = AvailabilityInput.safeParse(body);
      if (!parsed.success) return validationError(parsed.error);
      rec.sections.availability = parsed.data;
    }
    markDone(user, section);
    save();
    return HttpResponse.json(state(user));
  }),

  /** Stripe Connect onboarding (ONB-3 payout details). Card and bank data never touch our servers. */
  http.post(url("/onboarding/payout-link"), async () => {
    await delay(600);
    const user = requireUser("INSTRUCTOR");
    if (user instanceof Response) return user;
    // The mock skips Stripe: it marks the account ready and "returns" straight away.
    record(user).sections.payout = { status: "COMPLETE" };
    markDone(user, "payout");
    save();
    return HttpResponse.json({ url: "/onboarding/instructor?step=payout&payout=return" });
  }),

  http.post(url("/onboarding/defer"), async () => {
    const user = onboardingUser();
    if (user instanceof Response) return user;
    if (user.role !== "LEARNER") return apiError(403, "FORBIDDEN", "Instructors need to finish onboarding before teaching.");
    if (user.onboarding_status === "NOT_STARTED") user.onboarding_status = "IN_PROGRESS";
    save();
    return HttpResponse.json({ user: toUser(user) });
  }),

  http.post(url("/onboarding/submit"), async () => {
    await delay(500);
    const user = onboardingUser();
    if (user instanceof Response) return user;
    const required: readonly string[] = user.role === "LEARNER" ? LEARNER_STEPS : INSTRUCTOR_STEPS;
    const missing = required.filter((s) => !record(user).completed_steps.includes(s));
    if (missing.length) {
      return apiError(422, "ONBOARDING_INCOMPLETE", `Finish these steps first: ${missing.join(", ")}.`, {
        steps: missing,
      });
    }
    user.onboarding_status = "COMPLETED";
    // ONB-3: instructors now wait for an admin to approve them.
    if (user.role === "INSTRUCTOR") user.approval_status = "PENDING";
    save();
    return HttpResponse.json({ user: toUser(user) });
  }),
];
