import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

/**
 * End-to-end tests run the production build against the MSW mocks, so they need no backend.
 * Browser matrix follows SRS NFR "Browser support"; CI runs all projects, local runs default to Chromium.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // Locally the app server, browsers and your editor share one machine; more workers made runs flaky.
  workers: process.env.CI ? undefined : 2,
  forbidOnly: !!process.env.CI,
  // Flows with a full reload restart the mock service worker; give assertions room under parallel load.
  expect: { timeout: 10_000 },
  // Admin flows sign in with MFA and walk several screens; axe scans are CPU-heavy.
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
    ...(process.env.CI
      ? [
          { name: "firefox", use: { ...devices["Desktop Firefox"] } },
          { name: "webkit", use: { ...devices["Desktop Safari"] } },
          { name: "mobile-safari", use: { ...devices["iPhone 14"] } },
        ]
      : []),
  ],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    // Always build fresh: reusing a running server can silently test a stale build.
    reuseExistingServer: false,
    timeout: 240_000,
    env: { NEXT_PUBLIC_API_MOCKING: "on" },
  },
});
