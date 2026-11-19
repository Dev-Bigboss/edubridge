import { delay } from "msw";
import { http, HttpResponse } from "msw/http";
import { NewPricingRule } from "@/lib/api/schemas/pricing";
import { addRuleVersion, resolvePrice } from "@/lib/domain/pricing";
import { formatPriceTag } from "@/lib/domain/money";
import { audit, db, findUser, mockSession, newId, save } from "../db";
import { apiError, requireUser, url, validationError } from "./util";

export const pricingHandlers = [
  http.get(url("/admin/pricing/rules"), async () => {
    await delay(200);
    const user = requireUser("ADMIN");
    if (user instanceof Response) return user;
    return HttpResponse.json({ items: db.pricingRules });
  }),

  /** PRC-5: always adds a version. Existing versions are never edited. */
  http.post(url("/admin/pricing/rules"), async ({ request }) => {
    await delay(400);
    const user = requireUser("ADMIN");
    if (user instanceof Response) return user;
    const parsed = NewPricingRule.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const input = parsed.data;
    const modality = db.modalities.find((m) => m.id === input.modality_id);
    const category = db.categories.find((c) => c.id === input.category_id);
    if (!modality || !category) return apiError(404, "NOT_FOUND", "That modality or category doesn't exist.");
    if (!modality.pricing_units.includes(input.unit)) {
      return apiError(422, "VALIDATION_FAILED", "Check the form.", { unit: [`${modality.name} can't be priced that way.`] });
    }
    const res = addRuleVersion(db.pricingRules, input, newId("rule"), new Date());
    if (!res.ok) return apiError(422, "VALIDATION_FAILED", res.message, { [res.field]: [res.message] });
    const now = new Date().toISOString();
    db.pricingRules = res.rules.map((r) => (r.id === res.rule.id ? { ...r, created_by: user.id, created_at: now } : r)) as typeof db.pricingRules;
    const when = new Date(input.effective_from) > new Date() ? `from ${input.effective_from.slice(0, 10)}` : "now";
    audit(user, "pricing_rule.created", "pricing_rule", res.rule.id, `${modality.name} × ${category.name}: ${formatPriceTag(input, input.unit)} ${when}`);
    save();
    return HttpResponse.json({ rule: db.pricingRules.find((r) => r.id === res.rule.id) }, { status: 201 });
  }),

  /**
   * PRC-4/7: the price a learner would pay. Public for published trainings; admins can quote
   * drafts and a future date (`at`) to preview scheduled prices.
   */
  http.get(url("/pricing/quote"), async ({ request }) => {
    await delay(150);
    const p = new URL(request.url).searchParams;
    const training = db.trainings.find((t) => t.id === p.get("training_id"));
    const isAdmin = findUser(mockSession.get())?.role === "ADMIN";
    if (!training || (training.status !== "PUBLISHED" && !isAdmin)) return apiError(404, "NOT_FOUND", "That training isn't available.");
    const at = isAdmin && p.get("at") ? new Date(p.get("at")!) : new Date();
    const instructorId = p.get("instructor_id");
    const price = resolvePrice(training, db.pricingRules, { instructorId, at });
    if (!price) return apiError(409, "NO_PRICE", "No price is set for this training yet.");
    return HttpResponse.json({ training_id: training.id, instructor_id: instructorId, ...price, at: at.toISOString() });
  }),
];
