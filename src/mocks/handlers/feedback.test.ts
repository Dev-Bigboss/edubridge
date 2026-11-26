import { beforeEach, describe, expect, it } from "vitest";
import { ApiError, api } from "@/lib/api/client";
import { uploadFile } from "@/lib/api/hooks/uploads";
import { FeedbackList, FeedbackResponse, RubricList, RubricResponse, SessionFeedback } from "@/lib/api/schemas/feedback";
import { cohortSessions } from "@/lib/domain/cohort-schedule";
import { db, mockSession, resetDb } from "../db";

const failure = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error("expected the request to fail");
    },
    (e) => e as ApiError,
  );
const cohort = () => db.cohorts.find((c) => c.id === "coh_aa_2025")!;
const pastSessions = () => cohortSessions(cohort()).filter((s) => Date.parse(s.end_utc) < Date.now());
const futureSession = () => cohortSessions(cohort()).find((s) => Date.parse(s.start_utc) > Date.now())!;
const good = { scores: { technical: 3, application: 3, technique: 3, timing: 4 }, comment: "Much better structure this week.", strengths: "", improvements: "", next_steps: "Try question 4 timed.", assignment_title: null, attachment_id: null };
const write = (sessionId: string, learnerId: string, body: Record<string, unknown> = {}) =>
  api(`/sessions/${encodeURIComponent(sessionId)}/feedback/${learnerId}`, { method: "PUT", body: { ...good, ...body }, schema: FeedbackResponse }).then((r) => r.feedback);
const rubricBody = (extra: Record<string, unknown> = {}) => ({
  name: "Coursework",
  criteria: [{ key: null, label: "Accuracy", description: null }, { key: null, label: "Clarity", description: "Explains steps" }],
  category_ids: ["cat_uni_course"],
  is_default: false,
  ...extra,
});

describe("feedback (FDB-1..3, FDB-5)", () => {
  beforeEach(() => {
    resetDb();
    mockSession.set("usr_instructor_1");
  });

  it("gives the instructor the category's rubric and what's already been sent", async () => {
    const s = pastSessions()[1];
    const data = await api(`/sessions/${encodeURIComponent(s.id)}/feedback`, { schema: SessionFeedback });
    expect(data.rubric?.name).toBe("Professional exam readiness");
    expect(data.items.map((f) => f.learner.name)).toEqual(["Test Learner"]);
  });

  it("writes feedback for a classmate, tells them once, and lets the instructor edit it", async () => {
    const s = pastSessions()[0];
    const f = await write(s.id, "usr_roster_1");
    expect(f).toMatchObject({ learner: { name: "Ada Demo" }, rubric: { id: "rub_exam" }, session_kind: "COHORT" });
    expect(db.notifications.filter((n) => n.user_id === "usr_roster_1" && n.type === "FEEDBACK_ADDED")).toHaveLength(1);
    const edited = await write(s.id, "usr_roster_1", { comment: "Much better structure this week, well done." });
    expect(edited.id).toBe(f.id);
    expect(db.notifications.filter((n) => n.user_id === "usr_roster_1" && n.type === "FEEDBACK_ADDED")).toHaveLength(1);
  });

  it("attaches marked work (FDB-3) and keeps it on later edits", async () => {
    const file = await uploadFile("FEEDBACK_ATTACHMENT", new File(["%PDF-1.4"], "marked.pdf", { type: "application/pdf" }));
    const s = pastSessions()[0];
    const f = await write(s.id, "usr_roster_2", { assignment_title: "Question 2", attachment_id: file.id });
    expect(f).toMatchObject({ assignment_title: "Question 2", attachment: { name: "marked.pdf" } });
    expect((await write(s.id, "usr_roster_2", { assignment_title: "Question 2", attachment_id: file.id })).attachment?.name).toBe("marked.pdf");
    expect((await failure(write(s.id, "usr_roster_2", { attachment_id: "nope" }))).fieldErrors).toHaveProperty("attachment_id");
  });

  it("refuses missing scores, short comments, future sessions, strangers and other instructors", async () => {
    const s = pastSessions()[0];
    const missing = await failure(write(s.id, "usr_roster_1", { scores: { technical: 3 } }));
    expect(missing.fieldErrors).toHaveProperty(["scores.application"]);
    expect((await failure(write(s.id, "usr_roster_1", { comment: "ok" }))).fieldErrors).toHaveProperty("comment");
    expect((await failure(write(futureSession().id, "usr_roster_1"))).code).toBe("SESSION_NOT_STARTED");
    expect((await failure(write(s.id, "usr_instructor_2"))).status).toBe(404);
    mockSession.set("usr_instructor_2");
    expect((await failure(write(s.id, "usr_roster_1"))).status).toBe(404);
  });

  it("FDB-2/5: learners see only their own feedback; admins can read anyone's", async () => {
    await write(pastSessions()[0].id, "usr_roster_1");
    mockSession.set("usr_learner_1");
    const mine = (await api("/me/feedback", { query: { training_id: "trn_ican_aa_2025" }, schema: FeedbackList })).items;
    expect(mine.map((f) => f.id)).toEqual(["fbk_seed_2", "fbk_seed_1"]);
    expect(mine[0].attachment?.name).toBe("q2-marked.pdf");
    mockSession.set("usr_roster_1");
    expect((await api("/me/feedback", { schema: FeedbackList })).items).toHaveLength(1);
    expect((await failure(api(`/sessions/${encodeURIComponent(pastSessions()[0].id)}/feedback`))).status).toBe(403);
    mockSession.set("usr_admin_1");
    expect((await api("/admin/users/usr_instructor_1/feedback", { schema: FeedbackList })).items).toHaveLength(3);
  });

  it("admins manage rubrics: one default, one rubric per category, keys kept on edit, audited", async () => {
    mockSession.set("usr_admin_1");
    const created = (await api("/admin/rubrics", { method: "POST", body: rubricBody(), schema: RubricResponse })).rubric;
    expect(created.criteria.map((c) => c.key)).toEqual(["accuracy", "clarity"]);
    expect(db.audit[0].action).toBe("rubric.created");

    const renamed = (await api(`/admin/rubrics/${created.id}`, { method: "PUT", body: rubricBody({ criteria: [{ key: "accuracy", label: "Correct answers", description: null }, { key: "clarity", label: "Clarity", description: null }] }), schema: RubricResponse })).rubric;
    expect(renamed.criteria[0]).toMatchObject({ key: "accuracy", label: "Correct answers" });

    expect((await failure(api("/admin/rubrics", { method: "POST", body: rubricBody({ name: "Clash" }) }))).fieldErrors).toHaveProperty("category_ids");
    expect((await failure(api("/admin/rubrics", { method: "POST", body: rubricBody({ category_ids: [] }) }))).fieldErrors).toHaveProperty("category_ids");
    expect((await failure(api("/admin/rubrics", { method: "POST", body: rubricBody({ criteria: [{ key: null, label: "Only one", description: null }] }) }))).fieldErrors).toHaveProperty("criteria");
    expect((await failure(api("/admin/rubrics/rub_general", { method: "PUT", body: { ...rubricBody({ category_ids: ["cat_topic"] }), name: "General progress" } }))).fieldErrors).toHaveProperty("is_default");
    expect((await failure(api("/admin/rubrics/rub_general/archive", { method: "POST" }))).code).toBe("DEFAULT_RUBRIC");

    // Making another rubric the default moves the flag.
    await api(`/admin/rubrics/${created.id}`, { method: "PUT", body: rubricBody({ is_default: true }) });
    const list = (await api("/admin/rubrics", { schema: RubricList })).items;
    expect(list.filter((r) => r.is_default).map((r) => r.id)).toEqual([created.id]);
    expect(list.find((r) => r.id === created.id)?.category_ids).toEqual([]);

    await api("/admin/rubrics/rub_exam/archive", { method: "POST" });
    mockSession.set("usr_instructor_1");
    const data = await api(`/sessions/${encodeURIComponent(pastSessions()[0].id)}/feedback`, { schema: SessionFeedback });
    expect(data.rubric?.id).toBe(created.id);
    // Feedback already written keeps the rubric it used.
    expect(data.items[0].rubric.id).toBe("rub_exam");
  });
});
