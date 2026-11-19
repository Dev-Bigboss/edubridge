import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "contracts/**/*.test.ts"],
    coverage: {
      // Unit-coverage gate (SRS NFR Maintainability: >= 80% on core logic). React hooks and
      // components are covered by the Playwright suite instead.
      include: ["src/lib/**/*.ts"],
      // React Query wrappers and static copy are exercised by the Playwright flows, not unit tests.
      exclude: ["src/lib/**/*.test.ts", "src/lib/auth/session.ts", "src/lib/api/hooks/**", "src/lib/api/query.ts", "src/lib/api/schemas/**", "src/lib/legal/documents.ts", "src/lib/cn.ts"],
      thresholds: { lines: 80, functions: 80, branches: 80 },
    },
  },
});
