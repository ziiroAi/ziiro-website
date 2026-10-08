import { defineConfig, devices } from "@playwright/test";

/**
 * (C) Lane D's Playwright setup (spec §12). Specs run against the production build served by
 * `vite preview`, with /api/funnel/* answered by route mocks (tests/e2e/fixtures.ts).
 * PLAYWRIGHT_BASE_URL points them at a deployed site instead (the preview smoke, Task 16).
 */
const external = process.env.PLAYWRIGHT_BASE_URL;
// Each lane's worktree previews on its own port (00-index §2.3): A 4173, B 4174, C 4175, D 4176.
const PORT = Number(process.env.PORT) || 4173;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: external ?? `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    timezoneId: "Asia/Kolkata",
    locale: "en-IN",
  },
  projects: [
    // §12: the full flow at 390 × 844 and 1440 × 900.
    { name: "phone", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: external
    ? undefined
    : {
        command: `npm run preview -- --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
