import { beforeEach, describe, expect, it } from "vitest";
import { ApiError, api } from "@/lib/api/client";
import { AdminReviewList, MyReviewResponse, ReviewableList, TrainingReviews } from "@/lib/api/schemas/reviews";
import { db, mockSession, resetDb } from "../db";

const failure = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error("expected the request to fail");
    },
    (e) => e as ApiError,
  );
const body = { training_id: "trn_mth101", instructor_id: "usr_instructor_2", training_rating: 3, instructor_rating: 5, comment: "Solid course, and a very patient instructor." };
const write = (extra: Record<string, unknown> = {}) => api("/me/reviews", { method: "PUT", body: { ...body, ...extra }, schema: MyReviewResponse }).then((r) => r.review);
const reviews = () => api("/trainings/trn_mth101/reviews", { schema: TrainingReviews });

describe("reviews (FDB-4)", () => {
  beforeEach(() => {
    resetDb();
    mockSession.set("usr_learner_1");
  });

  it("shows published reviews to anyone, with first-name authors and averages from three reviews", async () => {
    mockSession.set(null);
    const data = await reviews();
    expect(data.summary).toEqual({ count: 3, training_average: 4.3, instructors: [{ instructor_id: "usr_instructor_2", count: 3, average: 4.7 }] });
    expect(data.items.map((r) => r.author_name)).toEqual(["Fola D.", "Chidi D.", "Ada D."]);
    expect(JSON.stringify(data)).not.toContain("usr_roster");
  });

  it("offers what the learner finished, then saves and edits one review per training and instructor", async () => {
    const list = (await api("/me/reviewables", { schema: ReviewableList })).items;
    expect(list.map((x) => [x.training_id, x.instructor.name, x.review])).toEqual([["trn_mth101", "Demo Instructor Two", null]]);
    const r = await write();
    expect(r).toMatchObject({ author_name: "Test L.", status: "PUBLISHED", edited: false });
    expect((await reviews()).summary.training_average).toBe(4);
    const edited = await write({ training_rating: 4 });
    expect(edited).toMatchObject({ id: r.id, training_rating: 4 });
    expect(db.reviews.filter((x) => x.learner_id === "usr_learner_1")).toHaveLength(1);
  });

  it("refuses learners who haven't finished, bad ratings and short comments", async () => {
    expect((await failure(write({ training_id: "trn_ican_aa_2025", instructor_id: "usr_instructor_1" }))).code).toBe("NOT_ELIGIBLE"); // still in progress
    expect((await failure(write({ training_rating: 6 }))).fieldErrors).toHaveProperty("training_rating");
    expect((await failure(write({ comment: "ok" }))).fieldErrors).toHaveProperty("comment");
    mockSession.set("usr_instructor_2");
    expect((await failure(write())).status).toBe(403);
  });

  it("admins hide a review with a reason (audited); the author sees why; editing republishes it", async () => {
    const mine = await write();
    mockSession.set("usr_admin_1");
    expect((await failure(api(`/admin/reviews/${mine.id}/hide`, { method: "POST", body: { reason: "" } }))).fieldErrors).toHaveProperty("reason");
    await api(`/admin/reviews/${mine.id}/hide`, { method: "POST", body: { reason: "Mentions another learner by name." } });
    expect(db.audit[0].action).toBe("review.hidden");
    expect((await api("/admin/reviews", { query: { status: "HIDDEN" }, schema: AdminReviewList })).items.map((r) => r.author.name)).toEqual(["Test Learner"]);
    expect((await reviews()).summary.count).toBe(3);

    mockSession.set("usr_learner_1");
    const list = (await api("/me/reviewables", { schema: ReviewableList })).items;
    expect(list[0].review).toMatchObject({ status: "HIDDEN", hidden_reason: "Mentions another learner by name." });
    expect((await write({ comment: "Solid course and a patient instructor." })).status).toBe("PUBLISHED");

    mockSession.set("usr_admin_1");
    await api("/admin/reviews/rev_seed_1/hide", { method: "POST", body: { reason: "Testing restore." } });
    await api("/admin/reviews/rev_seed_1/restore", { method: "POST" });
    expect(db.reviews.find((r) => r.id === "rev_seed_1")?.status).toBe("PUBLISHED");
  });

  it("lets the author delete their review", async () => {
    const r = await write();
    await api(`/me/reviews/${r.id}`, { method: "DELETE" });
    expect((await reviews()).summary.count).toBe(3);
    expect((await failure(api("/me/reviews/rev_seed_1", { method: "DELETE" }))).status).toBe(404);
  });
});
