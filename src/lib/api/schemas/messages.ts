import { z } from "zod";
import { ROLES } from "@/lib/domain/enums";
import { MESSAGE_MAX_LENGTH, MAX_ATTACHMENTS } from "@/lib/domain/messages";
import { StoredFile } from "./uploads";

/** Mirrors contracts/openapi/messages.yaml (MSG-1..4). */

export const Person = z.object({ id: z.string(), name: z.string(), role: z.enum(ROLES), avatar_url: z.string().nullable() });
export type Person = z.infer<typeof Person>;

export const CONTACT_CONTEXTS = ["ENROLMENT", "BOOKING", "ENQUIRY"] as const;

export const Contact = Person.extend({
  context: z.enum(CONTACT_CONTEXTS),
  context_label: z.string(),
  conversation_id: z.string().nullable(),
});
export type Contact = z.infer<typeof Contact>;
export const ContactList = z.object({ items: z.array(Contact) });

export const Conversation = z.object({
  id: z.string(),
  kind: z.enum(["DIRECT", "COHORT"]),
  title: z.string(),
  subtitle: z.string(),
  context: z.enum([...CONTACT_CONTEXTS, "COHORT"]),
  training_id: z.string().nullable(),
  cohort_id: z.string().nullable(),
  /** Everyone but me. */
  participants: z.array(Person),
  member_count: z.number().int(),
  last_message: z
    .object({ preview: z.string(), sender_name: z.string(), mine: z.boolean(), created_at: z.string() })
    .nullable(),
  unread_count: z.number().int().min(0),
  last_read_at: z.string().nullable(),
  /** DIRECT only: when the other person last read it (read receipt). */
  other_last_read_at: z.string().nullable(),
  can_post: z.boolean(),
  can_announce: z.boolean(),
  updated_at: z.string(),
});
export type Conversation = z.infer<typeof Conversation>;
export const ConversationList = z.object({ items: z.array(Conversation) });
export const ConversationResponse = z.object({ conversation: Conversation });

export const Message = z.object({
  id: z.string(),
  conversation_id: z.string(),
  sender: Person,
  body: z.string(),
  attachments: z.array(StoredFile),
  announcement: z.boolean(),
  client_id: z.string().nullable(),
  created_at: z.string(),
});
export type Message = z.infer<typeof Message>;
export const MessagePage = z.object({ items: z.array(Message), next_cursor: z.string().nullable() });
export type MessagePage = z.infer<typeof MessagePage>;
export const MessageResponse = z.object({ message: Message });

export const SendMessageInput = z
  .object({
    body: z.string().trim().max(MESSAGE_MAX_LENGTH, { error: `Keep it under ${MESSAGE_MAX_LENGTH} characters, or send it in parts.` }),
    attachment_ids: z.array(z.string()).max(MAX_ATTACHMENTS, { error: `Attach up to ${MAX_ATTACHMENTS} files at a time.` }),
    announcement: z.boolean(),
    client_id: z.string().min(1),
  })
  .refine((m) => m.body.length > 0 || m.attachment_ids.length > 0, { path: ["body"], error: "Write a message or attach a file." });
export type SendMessageInput = z.infer<typeof SendMessageInput>;

export const OpenConversationInput = z.object({ user_id: z.string().min(1), training_id: z.string().nullable().optional() });
export type OpenConversationInput = z.infer<typeof OpenConversationInput>;

export const UnreadMessages = z.object({ unread_count: z.number().int().min(0) });
