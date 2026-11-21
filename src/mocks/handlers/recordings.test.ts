import { beforeEach, describe, expect, it } from "vitest";
import { ApiError, api } from "@/lib/api/client";
import { Playback, RecordingList, RecordingResponse } from "@/lib/api/schemas/recordings";
import { db, mockSession, resetDb } from "../db";
import { sweepRecordings } from "./recordings";

const failure = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error("expected the request to fail");
    },
    (e) => e as ApiError,
  );
const mine = () => api("/me/recordings", { schema: RecordingList }).then((r) => r.items);
const teach = () => api("/teach/recordings", { schema: RecordingList }).then((r) => r.items);
const one = (id: string) => api(`/recordings/${id}`, { schema: RecordingResponse }).then((r) => r.recording);
const ready = () => db.recordings.filter((r) => r.status === "READY");

describe("recordings (REC-2/3/6)", () => {
  beforeEach(() => resetDb());

  it("enrolled learners see ready recordings of their cohort, newest first; processing ones wait", async () => {
    mockSession.set("usr_learner_1");
    const items = await mine();
    expect(items.length).toBe(ready().length);
    expect(items.every((r) => r.status === "READY" && r.subtitle === "Autumn cohort")).toBe(true);
    expect(items.map((r) => r.recorded_at)).toEqual([...items.map((r) => r.recorded_at)].sort().reverse());
  });

  it("anyone outside the cohort gets 404, even by id", async () => {
    const id = ready()[0].id;
    mockSession.set("usr_learner_suspended");
    db.users.find((u) => u.id === "usr_learner_suspended")!.status = "ACTIVE";
    expect((await failure(one(id))).status).toBe(404);
    expect(await mine()).toEqual([]);
    mockSession.set("usr_instructor_3");
    expect((await failure(one(id))).status).toBe(404);
  });

  it("plays through a short-lived signed link, with captions", async () => {
    mockSession.set("usr_learner_1");
    const p = await api(`/recordings/${ready()[0].id}/playback`, { schema: Playback });
    expect(p.url).toMatch(/^\/demo\/recording-sample\.webm\?token=\w+&expires=/);
    expect(p.captions_url).toBe("/demo/captions.vtt");
    expect(Date.parse(p.expires_at) - Date.now()).toBeLessThanOrEqual(60 * 60_000);
  });

  it("REC-4: remembers where each viewer stopped", async () => {
    mockSession.set("usr_learner_1");
    const id = ready()[0].id;
    await api(`/recordings/${id}/progress`, { method: "PUT", body: { position_sec: 12.6 } });
    expect((await one(id)).resume_sec).toBe(12);
    mockSession.set("usr_roster_1");
    expect((await one(id)).resume_sec).toBe(0);
  });

  it("REC-2: a recording that finishes processing appears and learners are told", async () => {
    const processing = db.recordings.find((r) => r.status === "PROCESSING")!;
    processing.ready_at = new Date(Date.now() - 1000).toISOString();
    sweepRecordings();
    expect(processing.status).toBe("READY");
    expect(db.notifications.filter((n) => n.type === "RECORDING_ADDED").map((n) => n.user_id).sort()).toEqual(["usr_learner_1", "usr_roster_1", "usr_roster_2", "usr_roster_3"]);
  });
});

describe("managing recordings (REC-5)", () => {
  beforeEach(() => {
    resetDb();
    mockSession.set("usr_instructor_1");
  });

  it("the instructor sees all of theirs, including processing ones", async () => {
    expect((await teach()).length).toBe(db.recordings.length);
  });

  it("hiding removes it from learners; showing brings it back", async () => {
    const id = ready()[0].id;
    await api(`/recordings/${id}`, { method: "PATCH", body: { hidden: true } });
    mockSession.set("usr_learner_1");
    expect((await failure(one(id))).status).toBe(404);
    mockSession.set("usr_instructor_1");
    await api(`/recordings/${id}`, { method: "PATCH", body: { hidden: false } });
    mockSession.set("usr_learner_1");
    expect((await one(id)).hidden).toBe(false);
  });

  it("trims within the recording, and deletes", async () => {
    const id = ready()[0].id;
    expect((await failure(api(`/recordings/${id}`, { method: "PATCH", body: { trim: { start_sec: 5, end_sec: 8 } } }))).fieldErrors).toHaveProperty(["trim.end_sec"]);
    const r = await api(`/recordings/${id}`, { method: "PATCH", body: { trim: { start_sec: 2, end_sec: 18 } }, schema: RecordingResponse });
    expect(r.recording.trim).toEqual({ start_sec: 2, end_sec: 18 });
    await api(`/recordings/${id}`, { method: "DELETE" });
    expect(db.recordings.some((x) => x.id === id)).toBe(false);
  });

  it("learners can't change recordings, and old ones go after the retention period", async () => {
    mockSession.set("usr_learner_1");
    expect((await failure(api(`/recordings/${ready()[0].id}`, { method: "PATCH", body: { hidden: true } }))).status).toBe(403);
    db.settings.recording_retention_months = 1;
    db.recordings[0].recorded_at = new Date(Date.now() - 40 * 86_400_000).toISOString();
    const before = db.recordings.length;
    sweepRecordings();
    expect(db.recordings.length).toBe(before - 1);
  });
});
