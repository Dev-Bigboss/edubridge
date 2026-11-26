import { setupWorker } from "msw/browser";
import { http, HttpResponse } from "msw/http";
import { API_BASE_URL } from "@/lib/api/client";
import { handlers } from "./handlers";

/**
 * Last in the list: any API call no mock answers gets a clear 501 here, so demo mode never
 * reaches a real backend (whatever NEXT_PUBLIC_API_BASE_URL points at).
 */
const notMocked = http.all(`${API_BASE_URL}/*`, ({ request }) =>
  HttpResponse.json(
    { code: "NOT_MOCKED", message: `There's no demo data for ${request.method} ${new URL(request.url).pathname} yet.` },
    { status: 501 },
  ),
);

export const worker = setupWorker(...handlers, notMocked);
