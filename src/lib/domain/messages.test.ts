import { describe, expect, it } from "vitest";
import { countUnread, groupByDay, mergePages, messagePreview, seenMessageId, startsCluster } from "./messages";

const m = (id: string, sender: string, at: string) => ({ id, sender: { id: sender }, created_at: at });

describe("messagePreview", () => {
  it("collapses whitespace and cuts long text", () => {
    expect(messagePreview("  Hello\n\nthere  ", 0)).toBe("Hello there");
    const long = messagePreview("a".repeat(200), 0);
    expect(long).toHaveLength(120);
    expect(long.endsWith("…")).toBe(true);
  });
  it("describes file-only messages", () => {
    expect(messagePreview("", 1)).toBe("Sent a file");
    expect(messagePreview(" ", 3)).toBe("Sent 3 files");
  });
});

describe("mergePages", () => {
  it("orders oldest first and drops duplicates", () => {
    const newest = { items: [m("c", "u", "2026-11-20T10:02:00Z"), m("d", "u", "2026-11-20T10:03:00Z")] };
    const older = { items: [m("a", "u", "2026-11-20T10:00:00Z"), m("b", "u", "2026-11-20T10:01:00Z"), m("c", "u", "2026-11-20T10:02:00Z")] };
    expect(mergePages([newest, older]).map((x) => x.id)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("groupByDay", () => {
  const now = new Date("2026-11-21T12:00:00Z");
  it("labels today, yesterday and older days in the viewer's zone", () => {
    const groups = groupByDay(
      [m("1", "u", "2026-11-03T09:00:00Z"), m("2", "u", "2026-11-20T09:00:00Z"), m("3", "u", "2026-11-21T08:00:00Z"), m("4", "u", "2026-11-21T09:00:00Z")],
      "Africa/Lagos",
      now,
    );
    expect(groups.map((g) => [g.label, g.items.length])).toEqual([["Tue 3 Nov", 1], ["Yesterday", 1], ["Today", 2]]);
  });
  it("uses the zone for the day boundary and adds the year for past years", () => {
    // 23:30 UTC on the 20th is already the 21st in Lagos (UTC+1).
    expect(groupByDay([m("1", "u", "2026-11-20T23:30:00Z")], "Africa/Lagos", now)[0].label).toBe("Today");
    expect(groupByDay([m("1", "u", "2025-12-30T10:00:00Z")], "Africa/Lagos", now)[0].label).toBe("30 Dec 2025");
  });
});

describe("startsCluster", () => {
  it("starts a new cluster on a new sender or after five minutes", () => {
    const a = m("1", "u1", "2026-11-21T10:00:00Z");
    expect(startsCluster(undefined, a)).toBe(true);
    expect(startsCluster(a, m("2", "u1", "2026-11-21T10:04:00Z"))).toBe(false);
    expect(startsCluster(a, m("2", "u2", "2026-11-21T10:01:00Z"))).toBe(true);
    expect(startsCluster(a, m("2", "u1", "2026-11-21T10:06:00Z"))).toBe(true);
  });
});

describe("read receipts and unread", () => {
  const list = [m("1", "me", "2026-11-21T10:00:00Z"), m("2", "them", "2026-11-21T10:01:00Z"), m("3", "me", "2026-11-21T10:02:00Z"), m("4", "me", "2026-11-21T10:05:00Z")];
  it("marks the last of my messages the other person has read", () => {
    expect(seenMessageId(list, "me", "2026-11-21T10:03:00Z")).toBe("3");
    expect(seenMessageId(list, "me", "2026-11-21T10:05:00Z")).toBe("4");
    expect(seenMessageId(list, "me", null)).toBeNull();
    expect(seenMessageId(list, "me", "2026-11-21T09:00:00Z")).toBeNull();
  });
  it("counts only others' messages after my last read", () => {
    expect(countUnread(list, "me", null)).toBe(1);
    expect(countUnread(list, "me", "2026-11-21T10:01:00Z")).toBe(0);
    expect(countUnread(list, "them", "2026-11-21T10:01:00Z")).toBe(2);
  });
});
