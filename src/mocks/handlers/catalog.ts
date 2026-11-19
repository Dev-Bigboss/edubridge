import { delay } from "msw";
import { http, HttpResponse } from "msw/http";
import { db } from "../db";
import { url } from "./util";

export const catalogHandlers = [
  http.get(url("/catalog/categories"), async ({ request }) => {
    await delay(150);
    const all = new URL(request.url).searchParams.get("include_inactive") === "true";
    return HttpResponse.json({ items: db.categories.filter((c) => all || c.active) });
  }),

  http.get(url("/catalog/modalities"), async () => {
    await delay(100);
    return HttpResponse.json({ items: db.modalities });
  }),
];
