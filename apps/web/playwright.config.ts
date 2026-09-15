import { defineConfig, devices } from "@playwright/test";

/**
 * Golden-path tests against the real stack (gateway + tasks-service +
 * Postgres via docker compose) — only the AI chat network call is stubbed,
 * so these don't need a live ANTHROPIC_API_KEY to pass.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
