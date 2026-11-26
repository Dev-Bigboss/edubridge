import { beforeEach, describe, expect, it } from "vitest";
import { ApiError, api } from "@/lib/api/client";
import { AuditPage } from "@/lib/api/schemas/admin-users";
import { SettingsResponse, type SettingsInput } from "@/lib/api/schemas/settings";
import { db, mockSession, resetDb } from "../db";

const failure = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error("expected the request to fail");
    },
    (e) => e as ApiError,
  );
const get = () => api("/admin/settings", { schema: SettingsResponse });
const put = (body: SettingsInput & { version: number }) => api("/admin/settings", { method: "PUT", body, schema: SettingsResponse });
const audit = (query: Record<string, string> = {}) => api("/admin/audit-log", { query, schema: AuditPage });

describe("platform settings (ADM-3)", () => {
  beforeEach(() => {
    resetDb();
    mockSession.set("usr_admin_1");
  });

  it("starts from unreviewed defaults and is admin-only", async () => {
    const { settings, history } = await get();
    expect(settings).toMatchObject({ version: 1, commission_percent: 20, booking_expiry_hours: 24, updated_by: null });
    expect(history).toHaveLength(1);
    mockSession.set("usr_instructor_1");
    expect((await failure(get())).status).toBe(403);
  });

  it("saves a new version, records who and what, and audits it (ADM-5)", async () => {
    const { settings } = await get();
    const res = await put({ ...settings, commission_percent: 15 });
    expect(res.settings).toMatchObject({ version: 2, commission_percent: 15, updated_by: { name: "Test Admin" } });
    expect(res.history[0]).toMatchObject({ version: 2, summary: "Commission 20% → 15%" });
    expect(db.audit[0]).toMatchObject({ action: "settings.updated", summary: "Commission 20% → 15%" });
  });

  it("refuses a stale version so two admins can't overwrite each other", async () => {
    const { settings } = await get();
    await put({ ...settings, booking_expiry_hours: 12 });
    expect((await failure(put({ ...settings, commission_percent: 10 }))).code).toBe("VERSION_CONFLICT");
  });

  it("points invalid cancellation rules at the row that's wrong", async () => {
    const { settings } = await get();
    const err = await failure(
      put({ ...settings, learner_cancellation: { tiers: [{ min_hours_before: 48, refund_percent: 50 }, { min_hours_before: 0, refund_percent: 100 }] } }),
    );
    expect(err.fieldErrors).toHaveProperty(["learner_cancellation.tiers.1.refund_percent"]);
    expect((await failure(put({ ...settings, commission_percent: 80 }))).fieldErrors).toHaveProperty("commission_percent");
  });
});

describe("audit log (ADM-5)", () => {
  beforeEach(() => {
    resetDb();
    mockSession.set("usr_admin_1");
  });

  it("lists newest first with filter options", async () => {
    const page = await audit();
    expect(page.items[0].id).toBe("aud_seed_1");
    expect(page.facets.target_types).toEqual(["category", "cohort", "pricing_rule", "training", "user"]);
    expect(page.facets.actors).toEqual([{ id: "usr_admin_1", name: "Test Admin" }]);
  });

  it("filters by text, type and dates", async () => {
    expect((await audit({ q: "chargebacks" })).items.map((e) => e.id)).toEqual(["aud_seed_5"]);
    expect((await audit({ target_type: "training" })).total).toBe(2);
    const today = new Date().toISOString().slice(0, 10);
    expect((await audit({ from: today })).items.every((e) => e.created_at.slice(0, 10) >= today)).toBe(true);
    expect((await audit({ to: "2000-01-01" })).total).toBe(0);
  });

  it("pages with a cursor and is admin-only", async () => {
    for (let i = 0; i < 30; i++) db.audit.push({ ...db.audit[0], id: `aud_x_${i}`, created_at: "2026-01-01T00:00:00.000Z" });
    const first = await audit();
    expect(first.items).toHaveLength(25);
    const second = await audit({ cursor: first.next_cursor! } as Record<string, string>);
    expect(second.items).toHaveLength(12);
    mockSession.set("usr_learner_1");
    expect((await failure(audit())).status).toBe(403);
  });
});
