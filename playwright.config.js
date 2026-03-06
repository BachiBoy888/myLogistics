import { defineConfig } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: BASE_URL,
    headless: true,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  reporter: [["list"], ["html", { open: "never" }]],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npm run preview -- --host localhost",
        url: "http://localhost:5173",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});