import { beforeEach, describe, expect, it } from "vitest";
import { api } from "@/lib/api/client";
import { RecommendationList } from "@/lib/api/schemas/recommendations";
import { db, mockSession, resetDb } from "../db";

const get = () => api("/me/recommendations", { schema: RecommendationList });

describe("recommendations (Phase 4)", () => {
  beforeEach(() => {
    resetDb();
    mockSession.set("usr_learner_1");
  });

  it("suggests published trainings from the learner's interests, best match first, with reasons", async () => {
    const res = await get();
    expect(res.profile_complete).toBe(true);
    const ids = res.items.map((r) => r.training.id);
    expect(ids[0]).toBe("trn_ican_sfr"); // exam category + "Financial reporting" + level
    expect(ids).toContain("trn_sql_1on1");
    expect(ids).not.toContain("trn_mth101"); // not an interest
    expect(ids).not.toContain("trn_ican_aa_2025"); // archived and already enrolled
    expect(ids).not.toContain("trn_python_da"); // draft
    expect(res.items[0].reasons.map((r) => r.code)).toEqual(expect.arrayContaining(["CATEGORY", "TOPIC", "LEVEL"]));
  });

  it("leaves out trainings the learner already booked", async () => {
    const booked = db.trainings.find((t) => t.id === "trn_sql_1on1")!;
    db.bookings.push({ ...(db.bookings[0] ?? {}), id: "bk_test", learner_id: "usr_learner_1", training_id: booked.id, status: "PENDING_INSTRUCTOR" } as (typeof db.bookings)[number]);
    expect((await get()).items.map((r) => r.training.id)).not.toContain("trn_sql_1on1");
  });

  it("asks for goals first when onboarding hasn't got that far, and is for learners only", async () => {
    delete db.onboarding.usr_learner_1;
    expect(await get()).toEqual({ items: [], profile_complete: false });
    mockSession.set("usr_instructor_1");
    await expect(get()).rejects.toMatchObject({ status: 403 });
  });
});
