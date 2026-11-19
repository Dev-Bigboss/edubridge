import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { releaseMockGate } from "@/lib/api/client";
import { server } from "@/mocks/server";

beforeAll(() => {
  server.listen({ onUnhandledFrame: "error" });
  releaseMockGate();
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
