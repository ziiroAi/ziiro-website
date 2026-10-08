import { expect, test } from "./fixtures";
import { answerAsAnanya, expectPlan, fillContact, sendContact } from "./support/questions";
import type { Locator, Page } from "@playwright/test";

/**
 * (C) W14-F part 2: the plan's 3D tour (blocks 2 and 3) on Ananya's plan, against the production build with
 * /api/funnel/* mocked. Headless Chromium draws WebGL on SwiftShader. Built on the viewer's stable test ids
 * (spine-viewer, spine-canvas, spine-still) plus the tour's own (spine-tour, spine-tour-stage).
 * Reduced motion: flights cut, so the camera settles at once and the checks don't wait on a 900 ms flight.
 */
const WEBGL = ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"];
const LIVE_TIMEOUT_MS = 30_000;
/**
 * SwiftShader runs the GPU in software: for a few seconds after the tour's viewer goes live, and after a camera cut,
 * the page gets 0.5-1.5 frames a second (W14-M probe), so scroll handling waits on frames. A real GPU settles at once
 * (worker-2's W14-L: tour INP 32 ms or less). Waits allow for the software renderer; they don't hide a wrong value.
 */
const SETTLE_TIMEOUT_MS = 20_000;
const FLOWING_FPS = 10;
/** Ananya's stops in scroll order (§5.8): Deals, Sales, Marketing, Back Office. */
const STOP_DISCS = ["G04", "G05", "G06", "G01"] as const;

test.use({ reducedMotion: "reduce", launchOptions: { args: WEBGL } });

async function toPlan(page: Page) {
  await page.goto("/");
  await answerAsAnanya(page);
  await fillContact(page);
  await sendContact(page);
  await expectPlan(page);
}

/** Waits until the page draws at least FLOWING_FPS frames a second again. */
async function framesFlowing(page: Page) {
  await expect.poll(() => page.evaluate(() => new Promise<number>((done) => {
    let frames = 0;
    const start = performance.now();
    const tick = () => {
      frames += 1;
      if (performance.now() - start < 500) requestAnimationFrame(tick);
      else done(frames * 2);
    };
    requestAnimationFrame(tick);
  })), { timeout: SETTLE_TIMEOUT_MS }).toBeGreaterThanOrEqual(FLOWING_FPS);
}

/** Puts a block's top at the middle line of the screen, where the tour reads the stop in view. */
async function scrollToDepth(page: Page, depth: number) {
  await page.locator(`[data-depth="${depth}"]`).evaluate((el) => {
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top - window.innerHeight / 2 + 40);
  });
}

async function liveStage(page: Page): Promise<Locator> {
  await scrollToDepth(page, 0);
  const stage = page.getByTestId("spine-tour-stage");
  await expect(stage.getByTestId("spine-viewer")).toHaveAttribute("data-spine", "live", { timeout: LIVE_TIMEOUT_MS });
  await expect(stage.getByTestId("spine-canvas")).toBeVisible();
  await expect(stage.getByTestId("spine-still")).toBeHidden();
  await framesFlowing(page);
  return stage;
}

test.describe("the plan's 3D tour", () => {
  test("starts no second viewer until the tour reaches the screen", async ({ page }) => {
    await toPlan(page);
    await expect(page.getByTestId("spine-viewer")).toHaveCount(1);
    await expect(page.getByTestId("spine-tour-stage").locator("picture img")).toHaveCount(1);
    await scrollToDepth(page, 0);
    await expect(page.getByTestId("spine-viewer")).toHaveCount(2);
  });

  test("keeps its stage stuck under the site's bar while the stops scroll by", async ({ page }) => {
    await toPlan(page);
    const stage = await liveStage(page);
    const navHeight = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 84);
    await scrollToDepth(page, 1);
    const first = (await stage.boundingBox())!;
    await scrollToDepth(page, 3);
    const later = (await stage.boundingBox())!;
    expect(Math.abs(first.y - navHeight)).toBeLessThanOrEqual(2);
    expect(Math.abs(later.y - first.y)).toBeLessThanOrEqual(1);
  });

  test("flies to each stop's disc and back to the full spine above the stops", async ({ page }) => {
    await toPlan(page);
    const stage = await liveStage(page);
    await expect(stage).toHaveAttribute("data-stop", "overview");
    for (const [i, disc] of STOP_DISCS.entries()) {
      await scrollToDepth(page, i + 1);
      await expect(stage).toHaveAttribute("data-stop", disc, { timeout: SETTLE_TIMEOUT_MS });
    }
    await scrollToDepth(page, 0);
    await expect(stage).toHaveAttribute("data-stop", "overview", { timeout: SETTLE_TIMEOUT_MS });
  });

  test("pins the in-focus disc's callout with its names (§6.7)", async ({ page }) => {
    await toPlan(page);
    const stage = await liveStage(page);
    await scrollToDepth(page, 1);
    await expect(stage).toHaveAttribute("data-stop", "G04", { timeout: SETTLE_TIMEOUT_MS });
    const deals = stage.locator('[data-callout="G04"]');
    await expect(deals).toBeVisible({ timeout: SETTLE_TIMEOUT_MS });
    await expect(deals).toContainText("Deals · 3 of 5", { timeout: SETTLE_TIMEOUT_MS });
    await expect(deals).toContainText("Enquiry responder", { timeout: SETTLE_TIMEOUT_MS });
  });

  test("opens a disc's panel from the keyboard and gives focus back on Escape (§6.2)", async ({ page }) => {
    await toPlan(page);
    const stage = await liveStage(page);
    const buttons = stage.locator("button[data-disc]");
    await expect(buttons).toHaveCount(7);
    const deals = stage.locator('button[data-disc="G04"]');
    await expect(deals).toHaveAttribute("aria-label", /^Deals: you need 3 of its \d+ agents today\.$/);
    await deals.focus();
    const panel = stage.getByRole("dialog");
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("heading")).toContainText("Deals");
    await page.keyboard.press("Enter");
    await expect(panel).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
    await expect(deals).toBeFocused();
  });

  test("names the lit and quiet discs in its legend", async ({ page }) => {
    await toPlan(page);
    const stage = await liveStage(page);
    await expect(stage.locator("[data-legend]")).toContainText("Lit");
    await expect(stage.locator("[data-legend]")).toContainText("Quiet");
  });
});
