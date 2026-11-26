import { delay } from "msw";
import { http, HttpResponse } from "msw/http";
import { SettingsInput } from "@/lib/api/schemas/settings";
import { diffSettings, sortTiers, tierProblems } from "@/lib/domain/policy";
import { audit, db, save } from "../db";
import { apiError, requireUser, url, validationError } from "./util";

const PAGE = 25;

export const settingsHandlers = [
  /* ---------- ADM-3 platform settings ---------- */
  http.get(url("/admin/settings"), async () => {
    await delay(200);
    const admin = requireUser("ADMIN");
    if (admin instanceof Response) return admin;
    return HttpResponse.json({ settings: db.settings, history: [...db.settingsHistory].reverse() });
  }),

  /** Full replace with optimistic concurrency: `version` must match, or 409 VERSION_CONFLICT. */
  http.put(url("/admin/settings"), async ({ request }) => {
    await delay(400);
    const admin = requireUser("ADMIN");
    if (admin instanceof Response) return admin;
    const body = (await request.json()) as { version?: number };
    if (body.version !== db.settings.version) {
      return apiError(409, "VERSION_CONFLICT", "Another admin changed these settings while you were editing. Reload to see their version.");
    }
    const parsed = SettingsInput.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const problems = tierProblems(parsed.data.learner_cancellation.tiers);
    if (problems.length) {
      const field_errors: Record<string, string[]> = {};
      for (const p of problems) (field_errors[`learner_cancellation.tiers.${p.index}.${p.field}`] ??= []).push(p.message);
      return apiError(422, "VALIDATION_FAILED", "Check the cancellation rules.", field_errors);
    }
    const next = { ...parsed.data, learner_cancellation: { tiers: sortTiers(parsed.data.learner_cancellation.tiers) } };
    const summary = diffSettings(db.settings, next);
    if (summary === "No changes") return HttpResponse.json({ settings: db.settings, history: [...db.settingsHistory].reverse() });
    const now = new Date().toISOString();
    db.settings = { ...next, version: db.settings.version + 1, updated_at: now, updated_by: { id: admin.id, name: admin.name } };
    db.settingsHistory.push({ version: db.settings.version, updated_at: now, updated_by_name: admin.name, summary });
    // ADM-5: policy changes are audited.
    audit(admin, "settings.updated", "settings", `v${db.settings.version}`, summary);
    save();
    return HttpResponse.json({ settings: db.settings, history: [...db.settingsHistory].reverse() });
  }),

  /* ---------- ADM-5 audit log ---------- */
  http.get(url("/admin/audit-log"), async ({ request }) => {
    await delay(250);
    const admin = requireUser("ADMIN");
    if (admin instanceof Response) return admin;
    const p = new URL(request.url).searchParams;
    const q = p.get("q")?.trim().toLowerCase();
    const from = p.get("from");
    const to = p.get("to");
    const all = [...db.audit].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const list = all
      .filter((e) => !q || e.summary.toLowerCase().includes(q) || e.target_id.toLowerCase().includes(q))
      .filter((e) => !p.get("actor_id") || e.actor_id === p.get("actor_id"))
      .filter((e) => !p.get("target_type") || e.target_type === p.get("target_type"))
      // from/to are calendar days (inclusive) in UTC.
      .filter((e) => !from || e.created_at.slice(0, 10) >= from)
      .filter((e) => !to || e.created_at.slice(0, 10) <= to);
    const cursor = p.get("cursor");
    const start = cursor ? list.findIndex((e) => e.id === cursor) + 1 : 0;
    const items = list.slice(start, start + PAGE);
    const actors = new Map(all.map((e) => [e.actor_id, { id: e.actor_id, name: e.actor_name }]));
    return HttpResponse.json({
      items,
      next_cursor: start + PAGE < list.length ? items.at(-1)!.id : null,
      total: list.length,
      facets: { actors: [...actors.values()], target_types: [...new Set(all.map((e) => e.target_type))].sort() },
    });
  }),
];
