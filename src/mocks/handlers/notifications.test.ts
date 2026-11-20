import { beforeEach, describe, expect, it } from "vitest";
import { ApiError, api } from "@/lib/api/client";
import { CheckoutSession } from "@/lib/api/schemas/payments";
import { NotificationPage, UnreadCount } from "@/lib/api/schemas/notifications";
import { db, mockSession, notify, resetDb } from "../db";

const failure = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error("expected the request to fail");
    },
    (e) => e as ApiError,
  );
const list = (query: Record<string, string | number> = {}) => api("/me/notifications", { query, schema: NotificationPage });
const count = () => api("/me/notifications/unread-count", { schema: UnreadCount }).then((r) => r.unread_count);

describe("notifications (NTF-1)", () => {
  beforeEach(() => {
    resetDb();
    mockSession.set("usr_learner_1");
  });

  it("needs sign-in and only shows the user's own", async () => {
    const page = await list();
    expect(page.items.map((n) => n.id)).toEqual(["ntf_seed_1", "ntf_seed_2", "ntf_seed_3"]);
    expect(page.items[0]).not.toHaveProperty("user_id");
    expect(page.unread_count).toBe(2);
    mockSession.set(null);
    expect((await failure(list())).status).toBe(401);
  });

  it("filters unread and pages with a cursor", async () => {
    for (let i = 0; i < 25; i++) notify("usr_learner_1", { type: "MESSAGE_RECEIVED", title: `Message ${i}`, body: "Hi", link: null });
    const first = await list({ limit: 20 });
    expect(first.items).toHaveLength(20);
    const second = await list({ limit: 20, cursor: first.next_cursor! });
    expect(second.items).toHaveLength(8);
    expect(second.next_cursor).toBeNull();
    expect((await list({ unread_only: "true", limit: 50 })).items.every((n) => !n.read_at)).toBe(true);
  });

  it("marks one or all as read", async () => {
    await api("/me/notifications/ntf_seed_1/read", { method: "POST" });
    expect(await count()).toBe(1);
    expect((await failure(api("/me/notifications/ntf_seed_4/read", { method: "POST" }))).status).toBe(404); // the admin's
    await api("/me/notifications/read-all", { method: "POST" });
    expect(await count()).toBe(0);
  });

  it("a confirmed payment notifies the learner", async () => {
    const { payment } = await api("/checkout/sessions", { method: "POST", body: { cohort_id: "coh_mth_sem1" }, idempotencyKey: "n1", schema: CheckoutSession });
    await api(`/mock/gateway/${payment.id}/success`, { method: "POST" });
    db.payments.find((p) => p.id === payment.id)!.mock!.settles_at = new Date(0).toISOString();
    await api(`/payments/${payment.id}`);
    const [latest] = (await list()).items;
    expect(latest).toMatchObject({ type: "PAYMENT_SUCCEEDED", link: "/learn/trainings", read_at: null });
    expect(latest.title).toContain("MTH 101");
  });
});
