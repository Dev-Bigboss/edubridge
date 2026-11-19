import { delay } from "msw";
import { http, HttpResponse } from "msw/http";
import { CategoryInput, ModalityInput, TrainingInput, type Training } from "@/lib/api/schemas/catalog";
import { resolvePrice } from "@/lib/domain/pricing";
import { missingMetadata, publishChecks, slugify } from "@/lib/domain/training";
import { audit, db, findUser, newId, save } from "../db";
import { getUploadedFile } from "./uploads";
import { apiError, requireUser, url, validationError } from "./util";

const admin = () => requireUser("ADMIN");
const notFound = (what: string) => apiError(404, "NOT_FOUND", `That ${what} doesn't exist or was removed.`);

function uniqueSlug(base: string, id?: string) {
  let slug = slugify(base) || "training";
  for (let n = 2; db.trainings.some((t) => t.slug === slug && t.id !== id); n++) slug = `${slugify(base)}-${n}`;
  return slug;
}

const instructorHeadline = (id: string) =>
  findUser(id)?.headline ?? db.onboarding[id]?.sections.profile?.headline ?? null;

function checksFor(t: Training) {
  const category = db.categories.find((c) => c.id === t.category_id);
  return publishChecks({
    description: t.description,
    instructorCount: t.instructors.length,
    categoryActive: !!category?.active,
    missingMetadata: missingMetadata(category?.metadata_fields ?? [], t.metadata),
    hasPrice: !!resolvePrice(t, db.pricingRules, { instructorId: t.instructors[0]?.instructor_id, at: new Date() }),
  });
}

export const adminCatalogHandlers = [
  /* ---------- categories (TRN-3, TRN-4) ---------- */
  http.post(url("/admin/categories"), async ({ request }) => {
    await delay(300);
    const user = admin();
    if (user instanceof Response) return user;
    const parsed = CategoryInput.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    if (db.categories.some((c) => c.name.toLowerCase() === parsed.data.name.toLowerCase())) {
      return apiError(409, "DUPLICATE", "A category with that name already exists.", { name: ["That name is already used."] });
    }
    const category = { ...parsed.data, id: newId("cat"), slug: slugify(parsed.data.name) };
    db.categories.push(category);
    audit(user, "category.created", "category", category.id, `Created category "${category.name}"`);
    save();
    return HttpResponse.json({ category }, { status: 201 });
  }),

  http.patch(url("/admin/categories/:id"), async ({ params, request }) => {
    await delay(300);
    const user = admin();
    if (user instanceof Response) return user;
    const category = db.categories.find((c) => c.id === params.id);
    if (!category) return notFound("category");
    const parsed = CategoryInput.partial().safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const before = { ...category };
    Object.assign(category, parsed.data);
    const changes = [
      before.name !== category.name && `renamed "${before.name}" to "${category.name}"`,
      before.active !== category.active && (category.active ? "enabled" : "disabled"),
      JSON.stringify(before.metadata_fields) !== JSON.stringify(category.metadata_fields) && "changed its fields",
    ].filter(Boolean);
    audit(user, "category.updated", "category", category.id, `Category "${category.name}": ${changes.join(", ") || "saved"}`);
    save();
    return HttpResponse.json({ category });
  }),

  /* ---------- modalities (TRN-2) ---------- */
  http.post(url("/admin/modalities"), async ({ request }) => {
    await delay(300);
    const user = admin();
    if (user instanceof Response) return user;
    const parsed = ModalityInput.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    if (db.modalities.some((m) => m.code === parsed.data.code)) {
      return apiError(409, "DUPLICATE", "That code is already used.", { code: ["That code is already used."] });
    }
    const modality = { ...parsed.data, id: newId("mod") };
    db.modalities.push(modality);
    audit(user, "modality.created", "modality", modality.id, `Created modality ${modality.code}`);
    save();
    return HttpResponse.json({ modality }, { status: 201 });
  }),

  http.patch(url("/admin/modalities/:id"), async ({ params, request }) => {
    await delay(300);
    const user = admin();
    if (user instanceof Response) return user;
    const modality = db.modalities.find((m) => m.id === params.id);
    if (!modality) return notFound("modality");
    // The code is what the system keys behaviour on, so it can't change once created.
    const parsed = ModalityInput.omit({ code: true }).partial().safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    Object.assign(modality, parsed.data);
    audit(user, "modality.updated", "modality", modality.id, `Modality ${modality.code} ${modality.active ? "updated" : "disabled"}`);
    save();
    return HttpResponse.json({ modality });
  }),

  /* ---------- instructors to assign (TRN-5) ---------- */
  http.get(url("/admin/instructors"), async ({ request }) => {
    await delay(200);
    const user = admin();
    if (user instanceof Response) return user;
    const q = new URL(request.url).searchParams.get("q")?.toLowerCase() ?? "";
    const items = db.users
      .filter((u) => u.role === "INSTRUCTOR" && u.approval_status === "APPROVED" && u.status === "ACTIVE")
      .filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.includes(q))
      .map((u) => ({ id: u.id, name: u.name, email: u.email, avatar_url: u.avatar_url, headline: instructorHeadline(u.id) }));
    return HttpResponse.json({ items });
  }),

  /* ---------- trainings (TRN-1, TRN-5, TRN-7) ---------- */
  http.get(url("/admin/trainings"), async ({ request }) => {
    await delay(250);
    const user = admin();
    if (user instanceof Response) return user;
    const p = new URL(request.url).searchParams;
    const q = p.get("q")?.toLowerCase();
    const items = db.trainings
      .filter((t) => !p.get("status") || t.status === p.get("status"))
      .filter((t) => !p.get("category_id") || t.category_id === p.get("category_id"))
      .filter((t) => !p.get("modality_id") || t.modality_id === p.get("modality_id"))
      .filter((t) => !q || t.title.toLowerCase().includes(q))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    // The mock returns everything in one page; the contract allows cursors.
    return HttpResponse.json({ items, next_cursor: null, total: items.length });
  }),

  http.get(url("/admin/trainings/:id"), async ({ params }) => {
    await delay(200);
    const user = admin();
    if (user instanceof Response) return user;
    const training = db.trainings.find((t) => t.id === params.id);
    return training ? HttpResponse.json({ training }) : notFound("training");
  }),

  http.post(url("/admin/trainings"), async ({ request }) => {
    await delay(400);
    const user = admin();
    if (user instanceof Response) return user;
    const parsed = TrainingInput.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const now = new Date().toISOString();
    const training = applyInput({
      id: newId("trn"),
      slug: "",
      status: "DRAFT",
      created_at: now,
      updated_at: now,
      published_at: null,
      thumbnail: null,
    } as Training, parsed.data);
    if (training instanceof Response) return training;
    db.trainings.push(training);
    audit(user, "training.created", "training", training.id, `Created training "${training.title}"`);
    save();
    return HttpResponse.json({ training }, { status: 201 });
  }),

  http.patch(url("/admin/trainings/:id"), async ({ params, request }) => {
    await delay(400);
    const user = admin();
    if (user instanceof Response) return user;
    const existing = db.trainings.find((t) => t.id === params.id);
    if (!existing) return notFound("training");
    const parsed = TrainingInput.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    // BR-1: one modality per training. Once learners can see it, changing how it's taught isn't allowed.
    if (existing.status !== "DRAFT" && parsed.data.modality_id !== existing.modality_id) {
      return apiError(409, "MODALITY_LOCKED", "The modality can't change after publishing.", {
        modality_id: ["Archive this training and create a new one to change how it's taught."],
      });
    }
    const priceBefore = JSON.stringify(existing.price_override);
    const updated = applyInput({ ...existing, updated_at: new Date().toISOString() }, parsed.data);
    if (updated instanceof Response) return updated;
    Object.assign(existing, updated);
    audit(user, "training.updated", "training", existing.id, `Edited training "${existing.title}"`);
    if (priceBefore !== JSON.stringify(existing.price_override)) {
      audit(user, "training.price_override_changed", "training", existing.id, `Changed the price override on "${existing.title}"`);
    }
    save();
    return HttpResponse.json({ training: existing });
  }),

  http.post(url("/admin/trainings/:id/:action"), async ({ params }) => {
    await delay(400);
    const user = admin();
    if (user instanceof Response) return user;
    const training = db.trainings.find((t) => t.id === params.id);
    if (!training) return notFound("training");
    const action = String(params.action);
    const transitions: Record<string, { from: Training["status"][]; to: Training["status"] }> = {
      publish: { from: ["DRAFT", "ARCHIVED"], to: "PUBLISHED" },
      unpublish: { from: ["PUBLISHED"], to: "DRAFT" },
      archive: { from: ["DRAFT", "PUBLISHED"], to: "ARCHIVED" },
    };
    const move = transitions[action];
    if (!move) return notFound("action");
    if (!move.from.includes(training.status)) {
      return apiError(409, "INVALID_TRANSITION", `A ${training.status.toLowerCase()} training can't be ${action}ed.`);
    }
    if (action === "publish") {
      const failed = checksFor(training).filter((c) => !c.ok).map((c) => c.key);
      if (failed.length) {
        return apiError(422, "NOT_READY_TO_PUBLISH", "Finish the checklist before publishing.", { checks: failed });
      }
      training.published_at ??= new Date().toISOString();
    }
    training.status = move.to;
    training.updated_at = new Date().toISOString();
    audit(user, `training.${action}ed`, "training", training.id, `${action[0].toUpperCase()}${action.slice(1)}ed "${training.title}"`);
    save();
    return HttpResponse.json({ training });
  }),
];

/** Copies form input onto a training, resolving uploads and instructor details. */
function applyInput(training: Training, input: TrainingInput): Training | Response {
  const modality = db.modalities.find((m) => m.id === input.modality_id);
  if (!modality) return apiError(422, "VALIDATION_FAILED", "Choose how it's taught.", { modality_id: ["Choose a modality."] });
  if (!db.categories.some((c) => c.id === input.category_id)) {
    return apiError(422, "VALIDATION_FAILED", "Choose a category.", { category_id: ["Choose a category."] });
  }
  const prices = [input.price_override, ...input.instructors.map((i) => i.custom_rate)].filter((p) => p !== null);
  if (prices.some((p) => !modality.pricing_units.includes(p.unit))) {
    return apiError(422, "VALIDATION_FAILED", `A ${modality.name} price must be ${modality.pricing_units.join(" or ").toLowerCase().replaceAll("_", " ")}.`);
  }
  const instructors = [];
  for (const i of input.instructors) {
    const u = findUser(i.instructor_id);
    if (!u || u.role !== "INSTRUCTOR" || u.approval_status !== "APPROVED") {
      return apiError(422, "VALIDATION_FAILED", "Only approved instructors can be assigned.");
    }
    instructors.push({ instructor_id: u.id, name: u.name, avatar_url: u.avatar_url, headline: instructorHeadline(u.id), custom_rate: i.custom_rate });
  }
  const { thumbnail_file_id, ...rest } = input;
  return {
    ...training,
    ...rest,
    slug: training.status === "DRAFT" ? uniqueSlug(input.title, training.id) : training.slug,
    instructors,
    thumbnail: thumbnail_file_id ? (getUploadedFile(thumbnail_file_id) ?? (training.thumbnail?.id === thumbnail_file_id ? training.thumbnail : null)) : null,
  };
}

export { checksFor as trainingChecks };
