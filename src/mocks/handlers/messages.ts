import { delay } from "msw";
import { http, HttpResponse } from "msw/http";
import { OpenConversationInput, SendMessageInput, type Contact, type Conversation, type Message, type Person } from "@/lib/api/schemas/messages";
import { countUnread, messagePreview } from "@/lib/domain/messages";
import { db, findUser, newId, save, type MockUser, type StoredConversation, type StoredMessage } from "../db";
import { getUploadedFile } from "./uploads";
import { apiError, blockWhileImpersonating, requireUser, url, validationError } from "./util";

/** Channels exist for cohorts past DRAFT; these can still be read but not posted in. */
const CHANNEL_CLOSED = new Set(["COMPLETED", "CANCELLED"]);

export const toPerson = (u: MockUser): Person => ({ id: u.id, name: u.name, role: u.role, avatar_url: u.avatar_url });

const trainingTitle = (id: string | null) => db.trainings.find((t) => t.id === id)?.title ?? "A training";

function membersOf(c: StoredConversation): string[] {
  if (c.kind === "DIRECT") return c.member_ids;
  const cohort = db.cohorts.find((x) => x.id === c.cohort_id);
  if (!cohort) return [];
  const learners = db.enrolments.filter((e) => e.cohort_id === cohort.id && e.status === "CONFIRMED").map((e) => e.learner_id);
  return [cohort.instructor_id, ...new Set(learners)];
}

/** MSG-2: one channel per cohort past DRAFT, created when first needed. */
function ensureCohortChannels() {
  for (const cohort of db.cohorts) {
    if (cohort.status === "DRAFT" || db.conversations.some((c) => c.kind === "COHORT" && c.cohort_id === cohort.id)) continue;
    db.conversations.push({
      id: newId("cnv"), kind: "COHORT", context: "COHORT", member_ids: [], training_id: cohort.training_id, cohort_id: cohort.id,
      created_by: null, created_at: new Date().toISOString(), reads: {},
    });
  }
}

const messagesIn = (id: string) => db.messages.filter((m) => m.conversation_id === id).sort((a, b) => a.created_at.localeCompare(b.created_at));

/** In the list: every channel I belong to; a DIRECT one once it has a message, or if I opened it. */
function visibleTo(c: StoredConversation, user: MockUser): boolean {
  if (!membersOf(c).includes(user.id)) return false;
  return c.kind === "COHORT" || c.created_by === user.id || db.messages.some((m) => m.conversation_id === c.id);
}

/** BR-6: why a learner and an instructor may talk, if they may. */
function relationship(learnerId: string, instructorId: string): { context: "ENROLMENT" | "BOOKING"; training_id: string; label: string } | null {
  const enrolment = db.enrolments.find(
    (e) => e.learner_id === learnerId && e.status === "CONFIRMED" && db.cohorts.find((c) => c.id === e.cohort_id)?.instructor_id === instructorId,
  );
  if (enrolment) {
    const cohort = db.cohorts.find((c) => c.id === enrolment.cohort_id)!;
    return { context: "ENROLMENT", training_id: enrolment.training_id, label: `${cohort.name}, ${trainingTitle(enrolment.training_id)}` };
  }
  const booking = db.bookings.find((b) => b.learner_id === learnerId && b.instructor_id === instructorId && b.status !== "DRAFT");
  if (booking) return { context: "BOOKING", training_id: booking.training_id, label: `One-on-one, ${trainingTitle(booking.training_id)}` };
  return null;
}

function canPost(c: StoredConversation): boolean {
  if (c.kind === "DIRECT") return true;
  const cohort = db.cohorts.find((x) => x.id === c.cohort_id);
  return !!cohort && !CHANNEL_CLOSED.has(cohort.status);
}

function canAnnounce(c: StoredConversation, user: MockUser): boolean {
  return c.kind === "COHORT" && canPost(c) && db.cohorts.find((x) => x.id === c.cohort_id)?.instructor_id === user.id;
}

export function toConversation(c: StoredConversation, user: MockUser): Conversation {
  const members = membersOf(c);
  const others = members.filter((id) => id !== user.id).map(findUser).filter((u): u is MockUser => !!u);
  const list = messagesIn(c.id);
  const last = list.at(-1);
  const cohort = db.cohorts.find((x) => x.id === c.cohort_id);
  const other = c.kind === "DIRECT" ? others[0] : undefined;
  const lastRead = c.reads[user.id] ?? null;
  return {
    id: c.id,
    kind: c.kind,
    title: c.kind === "DIRECT" ? (other?.name ?? "Former member") : (cohort?.name ?? "Cohort"),
    subtitle: c.context === "ENQUIRY" ? `Question about ${trainingTitle(c.training_id)}` : trainingTitle(c.training_id),
    context: c.context,
    training_id: c.training_id,
    cohort_id: c.cohort_id,
    participants: others.map(toPerson),
    member_count: members.length,
    last_message: last
      ? { preview: messagePreview(last.body, last.attachments.length), sender_name: findUser(last.sender_id)?.name ?? "Someone", mine: last.sender_id === user.id, created_at: last.created_at }
      : null,
    unread_count: countUnread(list.map((m) => ({ ...m, sender: { id: m.sender_id } })), user.id, lastRead),
    last_read_at: lastRead,
    other_last_read_at: other ? (c.reads[other.id] ?? null) : null,
    can_post: canPost(c),
    can_announce: canAnnounce(c, user),
    updated_at: last?.created_at ?? c.created_at,
  };
}

function toMessage(m: StoredMessage): Message {
  const sender = findUser(m.sender_id);
  return {
    id: m.id,
    conversation_id: m.conversation_id,
    sender: sender ? toPerson(sender) : { id: m.sender_id, name: "Former member", role: "LEARNER", avatar_url: null },
    body: m.body,
    attachments: m.attachments,
    announcement: m.announcement,
    client_id: m.client_id,
    created_at: m.created_at,
  };
}

/** The conversation, if this user is in it; 404 otherwise so ids can't be probed. */
function memberConversation(id: string, user: MockUser): StoredConversation | Response {
  ensureCohortChannels();
  const c = db.conversations.find((x) => x.id === id);
  if (!c || !membersOf(c).includes(user.id)) return apiError(404, "NOT_FOUND", "That conversation doesn't exist or you're not in it.");
  return c;
}

function myConversations(user: MockUser) {
  ensureCohortChannels();
  return db.conversations.filter((c) => visibleTo(c, user)).map((c) => toConversation(c, user));
}

/** BR-6: everyone this person may message, with the reason in plain words. */
function contactsOf(user: MockUser): Contact[] {
  const found = new Map<string, Contact>();
  const add = (otherId: string, context: Contact["context"], label: string) => {
    const other = findUser(otherId);
    if (!other || found.has(otherId)) return;
    const existing = db.conversations.find((c) => c.kind === "DIRECT" && c.member_ids.includes(user.id) && c.member_ids.includes(otherId));
    found.set(otherId, { ...toPerson(other), context, context_label: label, conversation_id: existing?.id ?? null });
  };
  const learnerSide = user.role === "LEARNER";
  for (const e of db.enrolments.filter((x) => x.status === "CONFIRMED")) {
    const cohort = db.cohorts.find((c) => c.id === e.cohort_id);
    if (!cohort) continue;
    if (learnerSide && e.learner_id === user.id) add(cohort.instructor_id, "ENROLMENT", `Your instructor, ${cohort.name}`);
    if (!learnerSide && cohort.instructor_id === user.id) add(e.learner_id, "ENROLMENT", `${cohort.name}, ${trainingTitle(cohort.training_id)}`);
  }
  for (const b of db.bookings.filter((x) => x.status !== "DRAFT")) {
    if (learnerSide && b.learner_id === user.id) add(b.instructor_id, "BOOKING", `One-on-one, ${trainingTitle(b.training_id)}`);
    if (!learnerSide && b.instructor_id === user.id) add(b.learner_id, "BOOKING", `One-on-one, ${trainingTitle(b.training_id)}`);
  }
  for (const c of db.conversations.filter((x) => x.context === "ENQUIRY" && x.member_ids.includes(user.id))) {
    const otherId = c.member_ids.find((id) => id !== user.id);
    if (otherId) add(otherId, "ENQUIRY", `Question about ${trainingTitle(c.training_id)}`);
  }
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

const unreadTotal = (user: MockUser) => myConversations(user).reduce((n, c) => n + c.unread_count, 0);

export const messageHandlers = [
  http.get(url("/me/conversations"), async () => {
    await delay(150);
    const user = requireUser("LEARNER", "INSTRUCTOR");
    if (user instanceof Response) return user;
    // Most recent message first; conversations nobody has written in yet go last.
    const items = myConversations(user).sort((a, b) => Number(!a.last_message) - Number(!b.last_message) || b.updated_at.localeCompare(a.updated_at));
    return HttpResponse.json({ items });
  }),

  http.get(url("/me/conversations/unread-count"), async () => {
    await delay(80);
    const user = requireUser();
    if (user instanceof Response) return user;
    return HttpResponse.json({ unread_count: user.role === "ADMIN" ? 0 : unreadTotal(user) });
  }),

  http.get(url("/me/contacts"), async () => {
    await delay(150);
    const user = requireUser("LEARNER", "INSTRUCTOR");
    if (user instanceof Response) return user;
    return HttpResponse.json({ items: contactsOf(user) });
  }),

  /** MSG-1 / BR-6: open the pair's conversation, or start one when they're connected (or it's an enquiry). */
  http.post(url("/me/conversations"), async ({ request }) => {
    await delay(200);
    const user = requireUser("LEARNER", "INSTRUCTOR");
    if (user instanceof Response) return user;
    const readOnly = blockWhileImpersonating();
    if (readOnly) return readOnly;
    const parsed = OpenConversationInput.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const other = findUser(parsed.data.user_id);
    if (!other || other.id === user.id) return apiError(404, "NOT_FOUND", "That person doesn't exist.");
    const existing = db.conversations.find((c) => c.kind === "DIRECT" && c.member_ids.includes(user.id) && c.member_ids.includes(other.id));
    if (existing) return HttpResponse.json({ conversation: toConversation(existing, user) });

    const notAllowed = () =>
      apiError(403, "MESSAGING_NOT_ALLOWED", "You can message an instructor once you've booked or enrolled with them, or to ask about one of their trainings.");
    const [learner, instructor] = user.role === "LEARNER" ? [user, other] : [other, user];
    if (learner.role !== "LEARNER" || instructor.role !== "INSTRUCTOR") return notAllowed();
    const link = relationship(learner.id, instructor.id);
    let context: StoredConversation["context"];
    let trainingId: string;
    if (link) {
      context = link.context;
      trainingId = link.training_id;
    } else {
      const training = db.trainings.find((t) => t.id === parsed.data.training_id);
      const asks = user.role === "LEARNER" && training?.status === "PUBLISHED" && training.instructors.some((i) => i.instructor_id === instructor.id);
      if (!asks) return notAllowed();
      context = "ENQUIRY";
      trainingId = training.id;
    }
    const c: StoredConversation = {
      id: newId("cnv"), kind: "DIRECT", context, member_ids: [learner.id, instructor.id], training_id: trainingId, cohort_id: null,
      created_by: user.id, created_at: new Date().toISOString(), reads: {},
    };
    db.conversations.push(c);
    save();
    return HttpResponse.json({ conversation: toConversation(c, user) }, { status: 201 });
  }),

  http.get(url("/conversations/:id"), async ({ params }) => {
    await delay(100);
    const user = requireUser("LEARNER", "INSTRUCTOR");
    if (user instanceof Response) return user;
    const c = memberConversation(String(params.id), user);
    if (c instanceof Response) return c;
    return HttpResponse.json({ conversation: toConversation(c, user) });
  }),

  /** MSG-3: newest page first; each page oldest → newest. */
  http.get(url("/conversations/:id/messages"), async ({ params, request }) => {
    await delay(150);
    const user = requireUser("LEARNER", "INSTRUCTOR");
    if (user instanceof Response) return user;
    const c = memberConversation(String(params.id), user);
    if (c instanceof Response) return c;
    const q = new URL(request.url).searchParams;
    const limit = Math.min(100, Math.max(1, Number(q.get("limit")) || 30));
    const all = messagesIn(c.id);
    const before = q.get("before");
    const end = before ? Math.max(0, all.findIndex((m) => m.id === before)) : all.length;
    const start = Math.max(0, end - limit);
    return HttpResponse.json({ items: all.slice(start, end).map(toMessage), next_cursor: start > 0 ? all[start].id : null });
  }),

  /** MSG-3/4: send. A repeated client_id returns the first message instead of posting twice. */
  http.post(url("/conversations/:id/messages"), async ({ params, request }) => {
    await delay(250);
    const user = requireUser("LEARNER", "INSTRUCTOR");
    if (user instanceof Response) return user;
    const readOnly = blockWhileImpersonating();
    if (readOnly) return readOnly;
    const c = memberConversation(String(params.id), user);
    if (c instanceof Response) return c;
    const parsed = SendMessageInput.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const input = parsed.data;
    const repeat = db.messages.find((m) => m.conversation_id === c.id && m.sender_id === user.id && m.client_id === input.client_id);
    if (repeat) return HttpResponse.json({ message: toMessage(repeat) });
    if (!canPost(c)) return apiError(403, "CONVERSATION_CLOSED", "This cohort has ended, so its channel is read-only.");
    if (input.announcement && !canAnnounce(c, user)) return apiError(403, "FORBIDDEN", "Only the cohort's instructor can post announcements.");
    const attachments = input.attachment_ids.map(getUploadedFile);
    if (attachments.some((f) => !f || f.purpose !== "MESSAGE_ATTACHMENT")) {
      return apiError(422, "VALIDATION_FAILED", "One of the files isn't ready.", { attachment_ids: ["Upload the file again. Files are virus-scanned before they can be sent."] });
    }
    const now = new Date().toISOString();
    const m: StoredMessage = {
      id: newId("msg"), conversation_id: c.id, sender_id: user.id, body: input.body, attachments: attachments.filter((f) => !!f),
      announcement: input.announcement, client_id: input.client_id, created_at: now,
    };
    db.messages.push(m);
    c.reads[user.id] = now;
    save();
    return HttpResponse.json({ message: toMessage(m) }, { status: 201 });
  }),

  http.post(url("/conversations/:id/read"), async ({ params }) => {
    await delay(80);
    const user = requireUser("LEARNER", "INSTRUCTOR");
    if (user instanceof Response) return user;
    const c = memberConversation(String(params.id), user);
    if (c instanceof Response) return c;
    // Reading isn't a change an admin "viewing as" should leave behind, so it's skipped, not refused.
    if (!db.impersonation) {
      c.reads[user.id] = new Date().toISOString();
      save();
    }
    return HttpResponse.json({ conversation: toConversation(c, user) });
  }),
];
