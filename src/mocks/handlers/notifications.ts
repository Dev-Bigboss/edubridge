import { delay } from "msw";
import { http, HttpResponse } from "msw/http";
import { db, save } from "../db";
import { omit } from "./catalog";
import { apiError, requireUser, url } from "./util";

const PAGE = 20;

const mine = (userId: string) => db.notifications.filter((n) => n.user_id === userId);
const unread = (userId: string) => mine(userId).filter((n) => !n.read_at).length;
const strip = (n: (typeof db.notifications)[number]) => omit(n, "user_id");

/** NTF-1, for every signed-in role. Newest first; cursor is the id of the last item seen. */
export const notificationHandlers = [
  http.get(url("/me/notifications"), async ({ request }) => {
    await delay(200);
    const user = requireUser();
    if (user instanceof Response) return user;
    const p = new URL(request.url).searchParams;
    let list = mine(user.id).sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (p.get("unread_only") === "true") list = list.filter((n) => !n.read_at);
    const cursor = p.get("cursor");
    const start = cursor ? list.findIndex((n) => n.id === cursor) + 1 : 0;
    const limit = Math.min(Number(p.get("limit")) || PAGE, 50);
    const page = list.slice(start, start + limit);
    return HttpResponse.json({
      items: page.map(strip),
      next_cursor: start + limit < list.length ? page.at(-1)!.id : null,
      unread_count: unread(user.id),
    });
  }),

  /** Cheap poll for the bell. */
  http.get(url("/me/notifications/unread-count"), async () => {
    await delay(100);
    const user = requireUser();
    if (user instanceof Response) return user;
    return HttpResponse.json({ unread_count: unread(user.id) });
  }),

  http.post(url("/me/notifications/read-all"), async () => {
    await delay(200);
    const user = requireUser();
    if (user instanceof Response) return user;
    const now = new Date().toISOString();
    for (const n of mine(user.id)) n.read_at ??= now;
    save();
    return HttpResponse.json({ unread_count: 0 });
  }),

  http.post(url("/me/notifications/:id/read"), async ({ params }) => {
    await delay(100);
    const user = requireUser();
    if (user instanceof Response) return user;
    const n = mine(user.id).find((x) => x.id === params.id);
    if (!n) return apiError(404, "NOT_FOUND", "That notification doesn't exist.");
    n.read_at ??= new Date().toISOString();
    save();
    return HttpResponse.json({ notification: strip(n), unread_count: unread(user.id) });
  }),
];
