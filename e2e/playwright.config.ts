// e2e/playwright.config.ts
import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(__dirname, ".env") });

const BASE_URL = process.env.BASE_URL ?? "http://localhost:5173";

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./global-setup",
  globalTeardown: "./global-teardown",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // sequential — tests share DB state
  // A committed test.only would otherwise run one test and pass the job.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "regression",
      testMatch: "tests/regression/**/*.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "smoke",
      testMatch: "tests/smoke/**/*.smoke.ts",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
