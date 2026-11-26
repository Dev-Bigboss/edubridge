import { formatInZone } from "./time";

/** MSG-3/4 limits, shared by the composer and the API. */
export const MESSAGE_MAX_LENGTH = 4000;
export const MAX_ATTACHMENTS = 5;
export const PREVIEW_LENGTH = 120;
/** Messages from the same person this close together share one name line. */
const CLUSTER_MS = 5 * 60_000;

type Msg = { id: string; sender: { id: string }; created_at: string };

/** The list's one-line preview: the start of the text, or a note that a file was sent. */
export function messagePreview(body: string, attachmentCount: number): string {
  const text = body.replace(/\s+/g, " ").trim();
  if (!text) return attachmentCount > 1 ? `Sent ${attachmentCount} files` : "Sent a file";
  return text.length > PREVIEW_LENGTH ? `${text.slice(0, PREVIEW_LENGTH - 1).trimEnd()}…` : text;
}

/**
 * History pages arrive newest page first, each page oldest → newest. Returns one oldest → newest
 * list without duplicates (a message can appear twice when new ones arrive between page loads).
 */
export function mergePages<T extends { id: string; created_at: string }>(pages: { items: T[] }[]): T[] {
  const byId = new Map<string, T>();
  for (const page of pages) for (const m of page.items) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

/** Day groups with readable labels ("Today", "Yesterday", "Mon 3 Nov") in the viewer's zone. */
export function groupByDay<T extends { created_at: string }>(messages: T[], zone: string, now = new Date()): { key: string; label: string; items: T[] }[] {
  const today = formatInZone(now.toISOString(), zone, "yyyy-MM-dd");
  const yesterday = formatInZone(new Date(now.getTime() - 86_400_000).toISOString(), zone, "yyyy-MM-dd");
  const thisYear = today.slice(0, 4);
  const groups: { key: string; label: string; items: T[] }[] = [];
  for (const m of messages) {
    const key = formatInZone(m.created_at, zone, "yyyy-MM-dd");
    let group = groups.at(-1);
    if (group?.key !== key) {
      const label =
        key === today ? "Today" : key === yesterday ? "Yesterday" : formatInZone(m.created_at, zone, key.startsWith(thisYear) ? "EEE d MMM" : "d MMM yyyy");
      group = { key, label, items: [] };
      groups.push(group);
    }
    group.items.push(m);
  }
  return groups;
}

/** Show the sender's name (and time) when the sender changes or a few minutes have passed. */
export function startsCluster(prev: Msg | undefined, m: Msg): boolean {
  if (!prev) return true;
  return prev.sender.id !== m.sender.id || new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() > CLUSTER_MS;
}

/** The last of my messages the other person has read, for a single "Seen" mark (DIRECT only). */
export function seenMessageId(messages: Msg[], myId: string, otherReadAt: string | null): string | null {
  if (!otherReadAt) return null;
  const read = new Date(otherReadAt).getTime();
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.sender.id === myId && new Date(m.created_at).getTime() <= read) return m.id;
  }
  return null;
}

/** Others' messages after my last read (what the badge counts). */
export function countUnread(messages: Msg[], myId: string, lastReadAt: string | null): number {
  const since = lastReadAt ? new Date(lastReadAt).getTime() : -Infinity;
  return messages.filter((m) => m.sender.id !== myId && new Date(m.created_at).getTime() > since).length;
}
