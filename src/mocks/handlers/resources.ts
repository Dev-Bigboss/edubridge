import { delay } from "msw";
import { http, HttpResponse } from "msw/http";
import { ResourceInput, type Resource } from "@/lib/api/schemas/resources";
import { cohortSessions } from "@/lib/domain/cohort-schedule";
import { formatInZone } from "@/lib/domain/time";
import { audienceProblem, cleanAudience } from "@/lib/domain/resources";
import { db, findUser, newId, notify, save, type MockUser, type StoredResource } from "../db";
import { omit } from "./catalog";
import { getUploadedFile } from "./uploads";
import { apiError, blockWhileImpersonating, requireUser, url, validationError } from "./util";

const BOOKED = new Set(["ACCEPTED", "RESCHEDULE_REQUESTED", "COMPLETED", "NO_SHOW"]);

const teaches = (userId: string, trainingId: string) =>
  db.trainings.some((t) => t.id === trainingId && t.instructors.some((i) => i.instructor_id === userId));

function learnersOf(r: StoredResource): string[] {
  const enrolled = (cohortIds: string[]) =>
    db.enrolments.filter((e) => cohortIds.includes(e.cohort_id) && e.status === "CONFIRMED").map((e) => e.learner_id);
  switch (r.scope) {
    case "TRAINING": {
      const cohorts = db.cohorts.filter((c) => c.training_id === r.training_id).map((c) => c.id);
      const oneOnOne = db.bookings.filter((b) => b.training_id === r.training_id && b.instructor_id === r.owner_id && BOOKED.has(b.status)).map((b) => b.learner_id);
      return [...new Set([...enrolled(cohorts), ...oneOnOne])];
    }
    case "COHORT":
    case "SESSION":
      return enrolled(r.cohort_id ? [r.cohort_id] : []);
    case "LEARNER":
      return r.learner_id ? [r.learner_id] : [];
  }
}

function label(r: StoredResource, viewer: MockUser): string {
  const cohort = db.cohorts.find((c) => c.id === r.cohort_id);
  switch (r.scope) {
    case "TRAINING":
      return "Everyone in this training";
    case "COHORT":
      return cohort?.name ?? "A cohort";
    case "SESSION": {
      const s = cohort && cohortSessions(cohort).find((x) => x.id === r.session_id);
      return s ? `${cohort!.name}, class on ${formatInZone(s.start_utc, viewer.timezone, "EEE d MMM")}` : "One class";
    }
    case "LEARNER":
      return `${findUser(r.learner_id)?.name ?? "One learner"} (one-on-one)`;
  }
}

/** RES-5: instructors get the opened/audience counts, learners their own first access. */
function toResource(r: StoredResource, viewer: MockUser): Resource {
  const isOwner = viewer.id === r.owner_id;
  const audience = isOwner ? learnersOf(r) : [];
  return {
    ...omit(r, "owner_id"),
    audience_label: label(r, viewer),
    access: isOwner ? { opened: db.resourceOpens.filter((o) => o.resource_id === r.id && audience.includes(o.learner_id)).length, audience: audience.length } : null,
    opened_at: isOwner ? null : (db.resourceOpens.find((o) => o.resource_id === r.id && o.learner_id === viewer.id)?.first_opened_at ?? null),
  };
}

/** RES-2 checks: the audience must be the instructor's own cohort, class or 1:1 learner on this training. */
function audienceError(input: ResourceInput, ownerId: string): string | null {
  const problem = audienceProblem(input);
  if (problem) return problem;
  if (input.cohort_id) {
    const c = db.cohorts.find((x) => x.id === input.cohort_id && x.training_id === input.training_id && x.instructor_id === ownerId);
    if (!c) return "Choose one of your cohorts on this training.";
    if (input.session_id && !cohortSessions(c).some((s) => s.id === input.session_id)) return "Choose a class from that cohort.";
  }
  if (input.learner_id && !db.bookings.some((b) => b.learner_id === input.learner_id && b.training_id === input.training_id && b.instructor_id === ownerId && BOOKED.has(b.status))) {
    return "Choose one of your one-on-one learners on this training.";
  }
  return null;
}

export const resourceHandlers = [
  /** The trainings this instructor teaches, for the resource picker. */
  http.get(url("/teach/trainings"), async () => {
    await delay(150);
    const user = requireUser("INSTRUCTOR");
    if (user instanceof Response) return user;
    const items = db.trainings
      .filter((t) => t.status !== "DRAFT" && teaches(user.id, t.id))
      .map((t) => ({ id: t.id, title: t.title, modality_code: db.modalities.find((m) => m.id === t.modality_id)?.code ?? "" }));
    return HttpResponse.json({ items });
  }),

  http.get(url("/teach/trainings/:id/audiences"), async ({ params }) => {
    await delay(150);
    const user = requireUser("INSTRUCTOR");
    if (user instanceof Response) return user;
    const trainingId = params.id as string;
    if (!teaches(user.id, trainingId)) return apiError(404, "NOT_FOUND", "You don't teach that training.");
    const cohorts = db.cohorts
      .filter((c) => c.training_id === trainingId && c.instructor_id === user.id && !["DRAFT", "CANCELLED"].includes(c.status))
      .map((c) => ({ id: c.id, name: c.name, sessions: cohortSessions(c).map((s) => ({ id: s.id, start_utc: s.start_utc })) }));
    const learnerIds = [...new Set(db.bookings.filter((b) => b.training_id === trainingId && b.instructor_id === user.id && BOOKED.has(b.status)).map((b) => b.learner_id))];
    const folders = [...new Set(db.resources.filter((r) => r.training_id === trainingId && r.folder).map((r) => r.folder!))];
    return HttpResponse.json({ cohorts, learners: learnerIds.map((id) => ({ id, name: findUser(id)?.name ?? "Learner" })), folders });
  }),

  http.get(url("/teach/resources"), async ({ request }) => {
    await delay(200);
    const user = requireUser("INSTRUCTOR");
    if (user instanceof Response) return user;
    const trainingId = new URL(request.url).searchParams.get("training_id");
    const items = db.resources
      .filter((r) => r.owner_id === user.id && (!trainingId || r.training_id === trainingId))
      .sort((a, b) => a.position - b.position)
      .map((r) => toResource(r, user));
    return HttpResponse.json({ items });
  }),

  /** RES-1/4: add a file (already uploaded and scanned) or a link; tell the people who can now see it. */
  http.post(url("/teach/resources"), async ({ request }) => {
    await delay(350);
    const user = requireUser("INSTRUCTOR");
    if (user instanceof Response) return user;
    const readOnly = blockWhileImpersonating();
    if (readOnly) return readOnly;
    const parsed = ResourceInput.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const input = { ...parsed.data, ...cleanAudience(parsed.data) };
    if (!teaches(user.id, input.training_id)) return apiError(404, "NOT_FOUND", "You don't teach that training.");
    const bad = audienceError(input, user.id);
    if (bad) return apiError(422, "VALIDATION_FAILED", bad, { scope: [bad] });
    const file = input.kind === "FILE" ? getUploadedFile(input.file_id) : null;
    if (input.kind === "FILE" && (!file || file.purpose !== "RESOURCE")) return apiError(422, "VALIDATION_FAILED", "Upload the file first.", { file_id: ["Upload the file first. Files are virus-scanned before anyone can open them."] });
    if (input.kind === "LINK" && !input.link_url) return apiError(422, "VALIDATION_FAILED", "Add the web address.", { link_url: ["Add the web address."] });
    const r: StoredResource = {
      id: newId("res"),
      training_id: input.training_id,
      owner_id: user.id,
      kind: input.kind,
      title: input.title,
      description: input.description || null,
      folder: input.folder || null,
      position: Math.max(-1, ...db.resources.filter((x) => x.training_id === input.training_id).map((x) => x.position)) + 1,
      scope: input.scope,
      cohort_id: input.cohort_id,
      session_id: input.session_id,
      learner_id: input.learner_id,
      file,
      link_url: input.kind === "LINK" ? input.link_url : null,
      created_at: new Date().toISOString(),
    };
    db.resources.push(r);
    const training = db.trainings.find((t) => t.id === r.training_id)?.title ?? "your training";
    for (const learnerId of learnersOf(r)) {
      notify(learnerId, { type: "RESOURCE_ADDED", title: "New material", body: `${user.name} added "${r.title}" to ${training}.`, link: `/learn/resources?training=${r.training_id}` });
    }
    save();
    return HttpResponse.json({ resource: toResource(r, user) }, { status: 201 });
  }),

  http.patch(url("/resources/:id"), async ({ params, request }) => {
    await delay(300);
    const user = requireUser("INSTRUCTOR");
    if (user instanceof Response) return user;
    const readOnly = blockWhileImpersonating();
    if (readOnly) return readOnly;
    const r = db.resources.find((x) => x.id === params.id && x.owner_id === user.id);
    if (!r) return apiError(404, "NOT_FOUND", "That resource doesn't exist.");
    const body = (await request.json()) as Partial<ResourceInput>;
    const merged = { ...r, ...body, training_id: r.training_id, kind: r.kind, file_id: r.file?.id ?? null, link_url: body.link_url ?? r.link_url };
    const parsed = ResourceInput.safeParse(merged);
    if (!parsed.success) return validationError(parsed.error);
    const input = { ...parsed.data, ...cleanAudience(parsed.data) };
    const bad = audienceError(input, user.id);
    if (bad) return apiError(422, "VALIDATION_FAILED", bad, { scope: [bad] });
    Object.assign(r, {
      title: input.title,
      description: input.description || null,
      folder: input.folder || null,
      scope: input.scope,
      cohort_id: input.cohort_id,
      session_id: input.session_id,
      learner_id: input.learner_id,
      link_url: r.kind === "LINK" ? input.link_url : null,
    });
    save();
    return HttpResponse.json({ resource: toResource(r, user) });
  }),

  http.delete(url("/resources/:id"), async ({ params }) => {
    await delay(250);
    const user = requireUser("INSTRUCTOR");
    if (user instanceof Response) return user;
    const readOnly = blockWhileImpersonating();
    if (readOnly) return readOnly;
    const before = db.resources.length;
    db.resources = db.resources.filter((x) => !(x.id === params.id && x.owner_id === user.id));
    if (db.resources.length === before) return apiError(404, "NOT_FOUND", "That resource doesn't exist.");
    db.resourceOpens = db.resourceOpens.filter((o) => o.resource_id !== params.id);
    save();
    return new HttpResponse(null, { status: 204 });
  }),

  /** RES-3: the new order of one folder's items (moved with up/down buttons). */
  http.post(url("/teach/resources/reorder"), async ({ request }) => {
    await delay(200);
    const user = requireUser("INSTRUCTOR");
    if (user instanceof Response) return user;
    const readOnly = blockWhileImpersonating();
    if (readOnly) return readOnly;
    const { ids } = (await request.json()) as { ids?: string[] };
    const items = (ids ?? []).map((id) => db.resources.find((r) => r.id === id && r.owner_id === user.id));
    if (!ids?.length || items.some((r) => !r) || new Set(items.map((r) => `${r!.training_id}|${r!.folder}`)).size !== 1) {
      return apiError(422, "VALIDATION_FAILED", "Send the ids of one folder's resources.");
    }
    const slots = items.map((r) => r!.position).sort((a, b) => a - b);
    items.forEach((r, i) => (r!.position = slots[i]));
    save();
    return HttpResponse.json({ items: items.map((r) => toResource(r!, user)) });
  }),

  /** RES-5: a learner opened or downloaded it. Not recorded while an admin views as them. */
  http.post(url("/resources/:id/opens"), async ({ params }) => {
    await delay(80);
    const user = requireUser("LEARNER");
    if (user instanceof Response) return user;
    const r = db.resources.find((x) => x.id === params.id);
    if (!r || !learnersOf(r).includes(user.id) || (r.kind === "FILE" && r.file?.scan_status !== "CLEAN")) return apiError(404, "NOT_FOUND", "That resource doesn't exist.");
    if (db.impersonation) return new HttpResponse(null, { status: 204 });
    const now = new Date().toISOString();
    const open = db.resourceOpens.find((o) => o.resource_id === r.id && o.learner_id === user.id);
    if (open) Object.assign(open, { last_opened_at: now, count: open.count + 1 });
    else db.resourceOpens.push({ resource_id: r.id, learner_id: user.id, first_opened_at: now, last_opened_at: now, count: 1 });
    save();
    return new HttpResponse(null, { status: 204 });
  }),

  /** RES-5: who in the current audience has opened it, opened ones first (most recent first), then by name. */
  http.get(url("/resources/:id/opens"), async ({ params }) => {
    await delay(200);
    const user = requireUser("INSTRUCTOR");
    if (user instanceof Response) return user;
    const r = db.resources.find((x) => x.id === params.id && x.owner_id === user.id);
    if (!r) return apiError(404, "NOT_FOUND", "That resource doesn't exist.");
    const items = learnersOf(r)
      .map((id) => {
        const o = db.resourceOpens.find((x) => x.resource_id === r.id && x.learner_id === id);
        return { learner_id: id, name: findUser(id)?.name ?? "Learner", first_opened_at: o?.first_opened_at ?? null, last_opened_at: o?.last_opened_at ?? null, count: o?.count ?? 0 };
      })
      .sort((a, b) => (b.last_opened_at ?? "").localeCompare(a.last_opened_at ?? "") || a.name.localeCompare(b.name));
    return HttpResponse.json({ items });
  }),

  /** RES-2: what this learner can open: files only once they've passed the virus scan (RES-4). */
  http.get(url("/me/resources"), async ({ request }) => {
    await delay(200);
    const user = requireUser("LEARNER");
    if (user instanceof Response) return user;
    const trainingId = new URL(request.url).searchParams.get("training_id");
    const items = db.resources
      .filter((r) => (!trainingId || r.training_id === trainingId) && learnersOf(r).includes(user.id))
      .filter((r) => r.kind === "LINK" || r.file?.scan_status === "CLEAN")
      .sort((a, b) => a.position - b.position)
      .map((r) => toResource(r, user));
    return HttpResponse.json({ items });
  }),
];
