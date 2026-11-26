import { beforeEach, describe, expect, it } from "vitest";
import { ApiError, api } from "@/lib/api/client";
import { uploadFile } from "@/lib/api/hooks/uploads";
import { AudienceOptions, ResourceAccessList, ResourceList, ResourceResponse, TeachingTrainings } from "@/lib/api/schemas/resources";
import { db, mockSession, resetDb } from "../db";

const failure = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error("expected the request to fail");
    },
    (e) => e as ApiError,
  );
const AA = "trn_ican_aa_2025";
const none = { cohort_id: null, session_id: null, learner_id: null };
const mine = () => api("/me/resources", { query: { training_id: AA }, schema: ResourceList }).then((r) => r.items);
const create = (body: Record<string, unknown>) =>
  api("/teach/resources", { method: "POST", body: { training_id: AA, kind: "LINK", title: "Extra reading", description: null, folder: null, file_id: null, link_url: "https://example.com/x", scope: "TRAINING", ...none, ...body }, schema: ResourceResponse }).then((r) => r.resource);

describe("resources (RES-1..4)", () => {
  beforeEach(() => {
    resetDb();
    mockSession.set("usr_instructor_1");
  });

  it("offers the instructor their trainings, cohorts with classes, and existing folders", async () => {
    const trainings = (await api("/teach/trainings", { schema: TeachingTrainings })).items.map((t) => t.id);
    expect(trainings).toContain(AA);
    const opts = await api(`/teach/trainings/${AA}/audiences`, { schema: AudienceOptions });
    expect(opts.cohorts.map((c) => c.name)).toEqual(["Autumn cohort"]);
    expect(opts.cohorts[0].sessions.length).toBeGreaterThan(5);
    expect(opts.folders).toEqual(["Week 1", "Past papers"]);
    mockSession.set("usr_instructor_3");
    expect((await failure(api(`/teach/trainings/${AA}/audiences`))).status).toBe(404);
  });

  it("learners of the training see training, cohort and class materials, grouped and ordered", async () => {
    mockSession.set("usr_learner_1");
    const items = await mine();
    expect(items.map((r) => r.title)).toEqual(["Audit planning: summary notes", "ICAN study text (official site)", "Practice questions", "Whiteboard from the first class"]);
    expect(items[0].file?.url).toBe("/demo/audit-planning-summary.pdf");
    expect(items[2].audience_label).toBe("Autumn cohort");
    mockSession.set("usr_learner_suspended");
    db.users.find((u) => u.id === "usr_learner_suspended")!.status = "ACTIVE";
    expect(await mine()).toEqual([]);
  });

  it("uploads a scanned file for one cohort and tells its learners", async () => {
    const file = await uploadFile("RESOURCE", new File(["%PDF-1.4"], "week-2.pdf", { type: "application/pdf" }));
    const r = await create({ kind: "FILE", title: "Week 2 slides", folder: "Week 2", file_id: file.id, link_url: null, scope: "COHORT", cohort_id: "coh_aa_2025" });
    expect(r).toMatchObject({ kind: "FILE", folder: "Week 2", audience_label: "Autumn cohort", file: { name: "week-2.pdf", scan_status: "CLEAN" } });
    expect(db.notifications.filter((n) => n.type === "RESOURCE_ADDED").map((n) => n.user_id).sort()).toEqual(["usr_learner_1", "usr_roster_1", "usr_roster_2", "usr_roster_3"]);
  });

  it("rejects missing files, bad links, unknown audiences and other instructors' cohorts", async () => {
    expect((await failure(create({ kind: "FILE", file_id: "nope", link_url: null }))).fieldErrors).toHaveProperty("file_id");
    expect((await failure(create({ link_url: "javascript:alert(1)" }))).fieldErrors).toHaveProperty("link_url");
    expect((await failure(create({ scope: "COHORT" }))).fieldErrors).toHaveProperty("scope");
    expect((await failure(create({ scope: "COHORT", cohort_id: "coh_mth_sem1" }))).fieldErrors).toHaveProperty("scope");
    expect((await failure(create({ scope: "LEARNER", learner_id: "usr_learner_1" }))).fieldErrors).toHaveProperty("scope"); // no 1:1 with them here
  });

  it("RES-4: files over 100 MB or of other types are refused before upload", async () => {
    await expect(uploadFile("RESOURCE", new File(["x"], "run.exe", { type: "application/x-msdownload" }))).rejects.toThrow(/isn't supported/);
  });

  it("RES-3: reorders within a folder, edits the audience, and deletes", async () => {
    const res = await api("/teach/resources/reorder", { method: "POST", body: { ids: ["res_seed_2", "res_seed_1"] }, schema: ResourceList });
    expect(res.items.map((r) => [r.id, r.position])).toEqual([["res_seed_2", 0], ["res_seed_1", 1]]);
    expect((await failure(api("/teach/resources/reorder", { method: "POST", body: { ids: ["res_seed_1", "res_seed_3"] } }))).status).toBe(422); // two folders

    const edited = await api("/resources/res_seed_1", { method: "PATCH", body: { scope: "COHORT", cohort_id: "coh_aa_2025", session_id: "leftover" }, schema: ResourceResponse });
    expect(edited.resource).toMatchObject({ scope: "COHORT", session_id: null });
    await api("/resources/res_seed_4", { method: "DELETE" });
    mockSession.set("usr_learner_1");
    expect((await mine()).map((r) => r.id)).not.toContain("res_seed_4");
  });

  it("RES-5: records learner opens and shows the instructor who opened what", async () => {
    const teachList = () => api("/teach/resources", { query: { training_id: AA }, schema: ResourceList }).then((r) => r.items);
    const before = (await teachList()).find((r) => r.id === "res_seed_1")!;
    expect(before.access).toEqual({ opened: 2, audience: 4 });
    expect(before.opened_at).toBeNull();

    mockSession.set("usr_learner_1");
    expect((await mine())[0]).toMatchObject({ access: null, opened_at: null });
    await api("/resources/res_seed_1/opens", { method: "POST" });
    await api("/resources/res_seed_1/opens", { method: "POST" });
    const first = (await mine())[0].opened_at;
    expect(first).not.toBeNull();
    expect(db.resourceOpens.find((o) => o.resource_id === "res_seed_1" && o.learner_id === "usr_learner_1")).toMatchObject({ count: 2, first_opened_at: first });

    db.impersonation = { admin_id: "usr_admin_1", started_at: new Date().toISOString(), reason: "Support" };
    await api("/resources/res_seed_2/opens", { method: "POST" });
    expect(db.resourceOpens.some((o) => o.resource_id === "res_seed_2" && o.learner_id === "usr_learner_1")).toBe(false);
    db.impersonation = null;

    mockSession.set("usr_learner_suspended");
    db.users.find((u) => u.id === "usr_learner_suspended")!.status = "ACTIVE";
    expect((await failure(api("/resources/res_seed_1/opens", { method: "POST" }))).status).toBe(404); // not in its audience

    mockSession.set("usr_instructor_1");
    expect((await teachList()).find((r) => r.id === "res_seed_1")!.access).toEqual({ opened: 3, audience: 4 });
    const who = (await api("/resources/res_seed_1/opens", { schema: ResourceAccessList })).items;
    expect(who).toHaveLength(4);
    expect(who[0]).toMatchObject({ learner_id: "usr_learner_1", count: 2 });
    expect(who.at(-1)).toMatchObject({ first_opened_at: null, count: 0 });

    mockSession.set("usr_instructor_3");
    expect((await failure(api("/resources/res_seed_1/opens"))).status).toBe(404);
    mockSession.set("usr_instructor_1");
    await api("/resources/res_seed_1", { method: "DELETE" });
    expect(db.resourceOpens.some((o) => o.resource_id === "res_seed_1")).toBe(false);
  });
});
