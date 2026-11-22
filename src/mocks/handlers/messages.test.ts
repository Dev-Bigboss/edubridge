import { beforeEach, describe, expect, it } from "vitest";
import { ApiError, api } from "@/lib/api/client";
import { uploadFile } from "@/lib/api/hooks/uploads";
import { ContactList, ConversationList, ConversationResponse, MessagePage, MessageReportDetail, MessageReportList, MessageResponse, UnreadMessages } from "@/lib/api/schemas/messages";
import { db, mockSession, resetDb } from "../db";

const failure = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error("expected the request to fail");
    },
    (e) => e as ApiError,
  );
const list = () => api("/me/conversations", { schema: ConversationList }).then((r) => r.items);
const unread = () => api("/me/conversations/unread-count", { schema: UnreadMessages }).then((r) => r.unread_count);
const open = (user_id: string, training_id: string | null = null) =>
  api("/me/conversations", { method: "POST", body: { user_id, training_id }, schema: ConversationResponse }).then((r) => r.conversation);
let n = 0;
const send = (id: string, body: string, extra: Record<string, unknown> = {}) =>
  api(`/conversations/${id}/messages`, { method: "POST", body: { body, attachment_ids: [], announcement: false, client_id: `client-${++n}`, ...extra }, schema: MessageResponse }).then((r) => r.message);
const DIRECT = "cnv_seed_direct";
const CHANNEL = "cnv_seed_coh_aa_2025";

describe("messages (MSG-1..4)", () => {
  beforeEach(() => {
    resetDb();
    mockSession.set("usr_learner_1");
  });

  it("lists the learner's chat and cohort channels, newest activity first, with unread counts", async () => {
    const items = await list();
    expect(items.slice(0, 2).map((c) => c.title)).toEqual(["Test Instructor", "Autumn cohort"]);
    const direct = items.find((c) => c.id === DIRECT)!;
    expect(direct).toMatchObject({ kind: "DIRECT", unread_count: 1, can_post: true, can_announce: false, subtitle: "ICAN Audit and Assurance (2025 syllabus)" });
    expect(direct.last_message).toMatchObject({ mine: false, sender_name: "Test Instructor" });
    expect(direct.other_last_read_at).not.toBeNull();
    const channel = items.find((c) => c.id === CHANNEL)!;
    expect(channel).toMatchObject({ kind: "COHORT", member_count: 5, unread_count: 1 });
    const finished = items.find((c) => c.kind === "COHORT" && c.cohort_id === "coh_mth_past")!;
    expect(finished.can_post).toBe(false);
    expect(await unread()).toBe(2);
  });

  it("pages history oldest to newest within a page, and marks it read", async () => {
    const first = await api(`/conversations/${CHANNEL}/messages`, { query: { limit: 3 }, schema: MessagePage });
    expect(first.items.map((m) => m.id)).toEqual(["msg_seed_7", "msg_seed_9", "msg_seed_8"]);
    const older = await api(`/conversations/${CHANNEL}/messages`, { query: { limit: 3, before: first.next_cursor }, schema: MessagePage });
    expect(older).toMatchObject({ items: [{ id: "msg_seed_5", announcement: true }, { id: "msg_seed_6" }], next_cursor: null });
    await api(`/conversations/${CHANNEL}/read`, { method: "POST", schema: ConversationResponse });
    expect(await unread()).toBe(1);
  });

  it("sends once per client id, with a clean attachment, and the other side sees it unread", async () => {
    const file = await uploadFile("MESSAGE_ATTACHMENT", new File(["%PDF-1.4"], "working.pdf", { type: "application/pdf" }));
    const m = await send(DIRECT, "  Here is my working.  ", { attachment_ids: [file.id], client_id: "same" });
    expect(m).toMatchObject({ body: "Here is my working.", attachments: [{ name: "working.pdf", scan_status: "CLEAN" }] });
    const again = await send(DIRECT, "Here is my working.", { client_id: "same" });
    expect(again.id).toBe(m.id);
    expect(db.messages.filter((x) => x.client_id === "same")).toHaveLength(1);
    mockSession.set("usr_instructor_1");
    expect((await list()).find((c) => c.id === DIRECT)?.unread_count).toBe(1);
  });

  it("refuses empty messages, foreign files, learner announcements and posts in a finished cohort", async () => {
    expect((await failure(send(DIRECT, "   "))).fieldErrors).toHaveProperty("body");
    expect((await failure(send(DIRECT, "x", { attachment_ids: ["nope"] }))).fieldErrors).toHaveProperty("attachment_ids");
    expect((await failure(send(CHANNEL, "Hello all", { announcement: true }))).status).toBe(403);
    const finished = (await list()).find((c) => c.cohort_id === "coh_mth_past")!;
    expect((await failure(send(finished.id, "Hello?"))).code).toBe("CONVERSATION_CLOSED");
  });

  it("lets the instructor announce in their channel", async () => {
    mockSession.set("usr_instructor_1");
    const m = await send(CHANNEL, "No class next Monday.", { announcement: true });
    expect(m.announcement).toBe(true);
  });

  it("BR-6: contacts and opening conversations need a booking, a seat or an enquiry", async () => {
    const contacts = (await api("/me/contacts", { schema: ContactList })).items;
    expect(contacts.map((c) => [c.name, c.context, c.conversation_id])).toEqual([
      ["Demo Instructor Two", "ENROLMENT", null],
      ["Test Instructor", "ENROLMENT", DIRECT],
    ]);
    expect((await open("usr_instructor_1")).id).toBe(DIRECT);

    expect((await failure(open("usr_instructor_3"))).code).toBe("MESSAGING_NOT_ALLOWED");
    const enquiry = await open("usr_instructor_3", "trn_sql_1on1");
    expect(enquiry.context).toBe("ENQUIRY");
    expect(enquiry.subtitle).toMatch(/^Question about /);
    // Empty: only in the opener's list until someone writes.
    expect((await list()).some((c) => c.id === enquiry.id)).toBe(true);
    mockSession.set("usr_instructor_3");
    expect((await list()).some((c) => c.id === enquiry.id)).toBe(false);
    mockSession.set("usr_learner_1");
    await send(enquiry.id, "Is this suitable for complete beginners?");
    mockSession.set("usr_instructor_3");
    expect((await list()).find((c) => c.id === enquiry.id)?.unread_count).toBe(1);
    // Instructors can't start enquiries with strangers, and nobody can open someone else's conversation.
    expect((await failure(open("usr_roster_1", "trn_sql_1on1"))).status).toBe(403);
    expect((await failure(api(`/conversations/${DIRECT}`))).status).toBe(404);
  });

  it("is read-only while an admin views as the learner", async () => {
    db.impersonation = { admin_id: "usr_admin_1", started_at: new Date().toISOString(), reason: "Support ticket" };
    expect((await failure(send(DIRECT, "Hi"))).code).toBe("IMPERSONATION_READ_ONLY");
    await api(`/conversations/${DIRECT}/read`, { method: "POST" });
    expect(await unread()).toBe(2);
  });

  it("MSG-6: the contact filter warns (sent as written) or masks on send", async () => {
    expect((await send(DIRECT, "Call me on 0803 123 4567")).body).toBe("Call me on 0803 123 4567");
    db.settings.contact_filter = "MASK";
    const masked = await send(DIRECT, "Or email ada@example.com");
    expect(masked).toMatchObject({ body: "Or email [contact details hidden]", filtered: true });
    expect((await list()).find((c) => c.id === DIRECT)?.contact_filter).toBe("MASK");
  });

  it("MSG-6: blocking stops both sides posting until the blocker unblocks", async () => {
    const blocked = await api(`/conversations/${DIRECT}/block`, { method: "POST", schema: ConversationResponse }).then((r) => r.conversation);
    expect(blocked).toMatchObject({ blocked: "BY_ME", can_post: false });
    expect((await failure(send(DIRECT, "Hello?"))).code).toBe("CONVERSATION_BLOCKED");
    mockSession.set("usr_instructor_1");
    expect((await list()).find((c) => c.id === DIRECT)).toMatchObject({ blocked: "BY_THEM", can_post: false });
    expect((await failure(send(DIRECT, "Hi"))).code).toBe("CONVERSATION_BLOCKED");
    expect((await failure(api(`/conversations/${DIRECT}/unblock`, { method: "POST" }))).status).toBe(403);
    mockSession.set("usr_learner_1");
    await api(`/conversations/${DIRECT}/unblock`, { method: "POST" });
    expect((await send(DIRECT, "Sorry, wrong button.")).body).toBe("Sorry, wrong button.");
    expect((await failure(api(`/conversations/${CHANNEL}/block`, { method: "POST" }))).status).toBe(422);
  });

  it("MSG-6: a report reaches admins, who remove the message with a note; it's audited", async () => {
    const report = (body: Record<string, unknown>) => api(`/conversations/${DIRECT}/reports`, { method: "POST", body: { message_id: null, reason: "HARASSMENT", details: "", block: false, ...body } });
    expect((await failure(report({ reason: "OTHER", details: "" }))).fieldErrors).toHaveProperty("details");
    expect((await failure(report({ message_id: "msg_seed_1" }))).fieldErrors).toHaveProperty("message_id"); // my own message
    await report({ message_id: "msg_seed_4", block: true });
    expect(db.conversations.find((c) => c.id === DIRECT)?.blocked_by).toBe("usr_learner_1");
    expect(db.notifications.some((n) => n.user_id === "usr_admin_1" && n.type === "MESSAGE_REPORTED")).toBe(true);

    expect((await failure(api("/admin/message-reports"))).status).toBe(403);
    mockSession.set("usr_admin_1");
    const open = (await api("/admin/message-reports", { schema: MessageReportList })).items;
    expect(open.map((r) => [r.reason, r.reported?.name])).toEqual([
      ["HARASSMENT", "Test Instructor"],
      ["OFF_PLATFORM_PAYMENT", "Fola Demo"],
    ]);
    const detail = await api(`/admin/message-reports/${open[0].id}`, { schema: MessageReportDetail });
    expect(detail.context.map((m) => m.id)).toEqual(["msg_seed_1", "msg_seed_2", "msg_seed_3", "msg_seed_4"]);
    expect((await failure(api(`/admin/message-reports/${open[0].id}/resolve`, { method: "POST", body: { action: "REMOVE_MESSAGE", note: "" } }))).fieldErrors).toHaveProperty("note");
    await api(`/admin/message-reports/${open[0].id}/resolve`, { method: "POST", body: { action: "REMOVE_MESSAGE", note: "Abusive language." } });
    expect((await failure(api(`/admin/message-reports/${open[0].id}/resolve`, { method: "POST", body: { action: "DISMISS", note: "Second look" } }))).status).toBe(409);
    expect(db.audit[0]).toMatchObject({ action: "message.removed", target_id: open[0].id });
    expect((await api("/admin/message-reports", { query: { status: "RESOLVED" }, schema: MessageReportList })).items[0].resolution?.note).toBe("Abusive language.");

    mockSession.set("usr_learner_1");
    const page = await api(`/conversations/${DIRECT}/messages`, { schema: MessagePage });
    expect(page.items.at(-1)).toMatchObject({ id: "msg_seed_4", removed: true, body: "" });
  });

  it("MSG-5: emails each member once per unread batch after the delay, if they want message emails", async () => {
    db.outbox = [];
    await list(); // the learner's reply from the instructor is 2 hours old and unread
    expect(db.outbox.filter((m) => m.to === "learner@example.com").map((m) => m.subject).sort()).toEqual(["New messages in Autumn cohort", "Test Instructor sent you a message"]);
    const toLearner = () => db.outbox.filter((m) => m.to === "learner@example.com" && m.link.endsWith(DIRECT));
    await list();
    expect(toLearner()).toHaveLength(1); // not again until it's read

    // A fresh message isn't emailed until it has waited the delay.
    mockSession.set("usr_instructor_1");
    await send(DIRECT, "One more thing: bring a calculator.");
    mockSession.set("usr_learner_1");
    await list();
    expect(toLearner()).toHaveLength(1);
    const latest = db.messages.at(-1)!;
    latest.created_at = new Date(Date.now() - 31 * 60_000).toISOString();
    await list();
    expect(toLearner()).toHaveLength(2);

    // Turning message emails off stops them.
    db.notificationPrefs.usr_learner_1 = { messages: { in_app: true, email: false } };
    mockSession.set("usr_instructor_1");
    const m = await send(DIRECT, "And a pencil.");
    db.messages.find((x) => x.id === m.id)!.created_at = new Date(Date.now() - 31 * 60_000).toISOString();
    mockSession.set("usr_learner_1");
    await list();
    expect(toLearner()).toHaveLength(2);
  });
});
