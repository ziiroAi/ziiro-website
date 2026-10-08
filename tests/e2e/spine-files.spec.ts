import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { answerTeam, at, toTeamQuestion } from "./helpers/flow";

function spineRequests(page: Page): string[] {
  const paths: string[] = [];
  page.on("request", (r) => {
    const { pathname } = new URL(r.url());
    if (pathname.startsWith("/spine/")) paths.push(pathname);
  });
  return paths;
}

async function reachS5(page: Page, time: string) {
  await page.clock.setFixedTime(at(time));
  const paths = spineRequests(page);
  await page.goto("/");
  await toTeamQuestion(page);
  expect(paths, "nothing under /spine/ before S5 (§12)").toEqual([]);
  await answerTeam(page);
  await expect.poll(() => paths.length).toBeGreaterThan(0);
  return paths;
}

test("a light visit (10:00) fetches only light files, from S5 on (§6.6, §12)", async ({ page }) => {
  const paths = await reachS5(page, "10:00");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(paths.every((p) => p.startsWith("/spine/r17/light/hero/"))).toBe(true);
});

test("a dark visit (22:00) fetches only dark files", async ({ page }) => {
  const paths = await reachS5(page, "22:00");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(paths.every((p) => p.startsWith("/spine/r17/dark/hero/"))).toBe(true);
});

test.describe("a device set to dark", () => {
  test.use({ colorScheme: "dark" });
  test("is dark at 10:00 and fetches only dark files (D9)", async ({ page }) => {
    const paths = await reachS5(page, "10:00");
    expect(paths.every((p) => p.startsWith("/spine/r17/dark/hero/"))).toBe(true);
  });
});

test("a 390 × 844 phone at 3× picks phone-1170.avif (§12)", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone");
  expect(await reachS5(page, "10:00")).toContain("/spine/r17/light/hero/phone-1170.avif");
});

test.describe("a 1200-wide window at 2×", () => {
  test.use({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 2 });
  test("picks hero-2560.avif (§12)", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop");
    expect(await reachS5(page, "10:00")).toContain("/spine/r17/light/hero/hero-2560.avif");
  });
});
