import type { z } from "zod";

/**
 * Single entry point to the LMP backend. Conventions are in contracts/CONVENTIONS.md:
 * - Session lives in httpOnly cookies set by the backend; the browser sends them with
 *   `credentials: "include"` and this code never sees a token (plan D4).
 * - Errors share one shape so forms can show field errors without losing input.
 * - State-changing calls that touch money send an Idempotency-Key.
 */

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1").replace(
  /\/$/,
  "",
);

export type ApiErrorBody = {
  code: string;
  message: string;
  field_errors?: Record<string, string[]>;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: Record<string, string[]>;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    this.fieldErrors = body.field_errors ?? {};
  }

  get isUnauthorised() {
    return this.status === 401;
  }
}

type RequestOptions<T> = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Validates the response so contract drift fails loudly in dev instead of rendering garbage. */
  schema?: z.ZodType<T>;
  idempotencyKey?: string;
  signal?: AbortSignal;
};

const MOCKING = process.env.NEXT_PUBLIC_API_MOCKING === "on";
let releaseGate: (ok: boolean) => void = () => {};
const mockGate = new Promise<boolean>((resolve) => (releaseGate = resolve));

/**
 * Mock mode only: requests wait here until the MSW worker is intercepting, so a click that
 * beats the worker's start-up isn't sent to a real backend. Released by msw-starter with
 * whether the worker started (and by the Vitest setup, where msw/node is already listening).
 */
export const releaseMockGate = (ok = true) => releaseGate(ok);

export async function api<T = unknown>(path: string, opts: RequestOptions<T> = {}): Promise<T> {
  // With mocking on, nothing may reach a real backend: if the worker didn't start, fail here.
  if (MOCKING && !(await mockGate)) {
    throw new ApiError(503, { code: "MOCKS_UNAVAILABLE", message: "The demo data didn't load. Reload the page to try again." });
  }
  const url = new URL(`${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      credentials: "include",
      signal: opts.signal,
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    throw new ApiError(0, {
      code: "NETWORK_ERROR",
      message: "We couldn't reach EduBridge. Check your connection and try again.",
    });
  }

  if (res.status === 204) return undefined as T;

  const data: unknown = await res.json().catch(() => undefined);

  if (!res.ok) {
    throw new ApiError(res.status, isErrorBody(data) ? data : fallbackError(res.status));
  }

  return opts.schema ? opts.schema.parse(data) : (data as T);
}

function isErrorBody(data: unknown): data is ApiErrorBody {
  return typeof data === "object" && data !== null && "code" in data && "message" in data;
}

function fallbackError(status: number): ApiErrorBody {
  if (status === 401) return { code: "UNAUTHENTICATED", message: "Please sign in to continue." };
  if (status === 403) return { code: "FORBIDDEN", message: "You don't have access to this." };
  if (status === 404) return { code: "NOT_FOUND", message: "We couldn't find that." };
  if (status >= 500) return { code: "SERVER_ERROR", message: "Something went wrong on our side. Please try again." };
  return { code: "REQUEST_FAILED", message: "That request didn't go through. Please try again." };
}

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
