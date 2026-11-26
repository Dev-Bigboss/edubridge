import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { server } from "@/mocks/server";
import { API_BASE_URL, ApiError, api, newIdempotencyKey } from "./client";
import { applyApiError } from "./form-errors";

/** Awaits a call that must fail and returns its ApiError. */
const failure = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error("expected the request to fail");
    },
    (e) => e as ApiError,
  );

const url = (p: string) => `${API_BASE_URL}${p}`;

describe("api client", () => {
  it("sends credentials, query params and idempotency key", async () => {
    let seen: Request | undefined;
    server.use(
      http.post(url("/things"), ({ request }) => {
        seen = request;
        return HttpResponse.json({ ok: true });
      }),
    );
    await api("/things", {
      method: "POST",
      body: { a: 1 },
      query: { page: 2, empty: "", skip: undefined, flag: false },
      idempotencyKey: "key-1",
    });
    const u = new URL(seen!.url);
    expect(u.searchParams.get("page")).toBe("2");
    expect(u.searchParams.get("flag")).toBe("false");
    expect(u.searchParams.has("empty")).toBe(false);
    expect(u.searchParams.has("skip")).toBe(false);
    expect(seen!.headers.get("Idempotency-Key")).toBe("key-1");
    expect(seen!.headers.get("Content-Type")).toBe("application/json");
  });

  it("always sends cookies (credentials: include)", async () => {
    // Node's fetch drops `credentials` on the intercepted Request, so check the call itself.
    server.use(http.get(url("/me-ish"), () => HttpResponse.json({})));
    const spy = vi.spyOn(globalThis, "fetch");
    await api("/me-ish");
    expect(spy.mock.calls[0][1]?.credentials).toBe("include");
    spy.mockRestore();
  });

  it("accepts paths with or without a leading slash", async () => {
    server.use(http.get(url("/ping"), () => HttpResponse.json({ pong: true })));
    await expect(api("ping")).resolves.toEqual({ pong: true });
  });

  it("validates responses against a schema", async () => {
    server.use(http.get(url("/typed"), () => HttpResponse.json({ id: 123 })));
    await expect(api("/typed", { schema: z.object({ id: z.string() }) })).rejects.toThrow();
  });

  it("returns undefined for 204", async () => {
    server.use(http.delete(url("/gone"), () => new HttpResponse(null, { status: 204 })));
    await expect(api("/gone", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("maps the agreed error body to ApiError", async () => {
    server.use(
      http.post(url("/fail"), () =>
        HttpResponse.json(
          { code: "VALIDATION", message: "Check the form.", field_errors: { email: ["Taken."] } },
          { status: 422 },
        ),
      ),
    );
    const err = await failure(api("/fail", { method: "POST", body: {} }));
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(422);
    expect(err.code).toBe("VALIDATION");
    expect(err.fieldErrors).toEqual({ email: ["Taken."] });
    expect(err.isUnauthorised).toBe(false);
  });

  it.each([
    [401, "UNAUTHENTICATED"],
    [403, "FORBIDDEN"],
    [404, "NOT_FOUND"],
    [500, "SERVER_ERROR"],
    [418, "REQUEST_FAILED"],
  ])("falls back to a readable error for a bare %i", async (status, code) => {
    server.use(http.get(url("/bare"), () => new HttpResponse("nope", { status })));
    const err = await failure(api("/bare"));
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe(code);
    expect(err.message.length).toBeGreaterThan(10);
  });

  it("reports network failures as NETWORK_ERROR", async () => {
    server.use(http.get(url("/down"), () => HttpResponse.error()));
    const err = await failure(api("/down"));
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("NETWORK_ERROR");
  });

  it("lets aborts through untouched", async () => {
    server.use(http.get(url("/slow"), () => new Promise(() => {})));
    const ctrl = new AbortController();
    const p = api("/slow", { signal: ctrl.signal });
    ctrl.abort();
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
  });

  it("creates unique idempotency keys", () => {
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey());
  });
});

describe("applyApiError", () => {
  it("puts field errors on fields and returns no form message", () => {
    const set: Array<[string, string]> = [];
    const msg = applyApiError(new ApiError(422, { code: "V", message: "x", field_errors: { email: ["Taken."] } }), (
      f,
      e,
    ) => set.push([f, e.message!]));
    expect(set).toEqual([["email", "Taken."]]);
    expect(msg).toBeNull();
  });

  it("returns the API message when there are no field errors", () => {
    expect(applyApiError(new ApiError(401, { code: "C", message: "Nope." }), () => {})).toBe("Nope.");
  });

  it("returns a generic message for unexpected errors", () => {
    expect(applyApiError(new Error("boom"), () => {})).toMatch(/Something went wrong/);
  });
});
