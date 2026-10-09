import { expect, test } from "./fixtures";
import { probeSeesHardware } from "./support/gpu";
import { answerAsAnanya, expectPlan, fillContact, sendContact } from "./support/questions";
import type { Page } from "@playwright/test";

/**
 * (C) W14-C: the live spine on the plan's hero, against the production build with /api/funnel/* mocked. Headless
 * Chromium draws WebGL on SwiftShader. The speed gates (LCP, INP at 4× CPU) run by hand on the Preview in
 * spine3d-gates.spec.ts.
 */
const WEBGL = ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"];
const LIVE_TIMEOUT_MS = 30_000;
const DRAG_PX = 160;
const DRAG_FRAME_TIMEOUT_MS = 15_000;

async function toPlan(page: Page) {
  // W14-X: no viewer runs 3D on a software renderer, so the probe is told the GPU is real; the scene still draws on
  // SwiftShader underneath (spine3d-software.spec.ts covers what a software-GL visitor really gets).
  await probeSeesHardware(page);
  await page.goto("/");
  await answerAsAnanya(page);
  await fillContact(page);
  await sendContact(page);
  await expectPlan(page);
}

// No idle spin, so only the drag can change the pixels. launchOptions must be top-level (one worker per launch).
test.use({ reducedMotion: "reduce", launchOptions: { args: WEBGL } });

test.describe("the live spine", () => {
  test("replaces the still once its first frame is drawn, and a drag turns it", async ({ page }) => {
    await toPlan(page);
    const viewer = page.getByTestId("spine-viewer");
    await expect(viewer).toHaveAttribute("data-spine", "live", { timeout: LIVE_TIMEOUT_MS });
    await expect(page.getByTestId("spine-canvas")).toBeVisible();
    await expect(page.getByTestId("spine-still")).toBeHidden();

    await viewer.scrollIntoViewIfNeeded();
    const before = await viewer.screenshot();
    const box = (await viewer.boundingBox())!;
    const x = box.x + box.width * 0.6;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - DRAG_PX, y, { steps: 8 });
    await page.mouse.up();
    // W15-A: 15 s, not 5. Under a loaded machine SwiftShader can take several seconds to draw the turned frame (the base
    // commit failed 3 of 4 runs at load 108 with 5 s); the drag itself always lands.
    await expect.poll(async () => (await viewer.screenshot()).equals(before), { timeout: DRAG_FRAME_TIMEOUT_MS }).toBe(false);
  });

  // W14-J, worker-2's F1: the canvas kept its mount-time look when <html data-theme> changed, so in light the dark
  // canvas sat behind light-theme words. SwiftShader compiles a new look slowly, hence the long polls.
  for (const when of ["while the 3D loads", "after it is live"] as const) {
    test(`follows a theme change made ${when}, and shows the canvas again only in the new look`, async ({ page }) => {
      test.setTimeout(120_000);
      await toPlan(page);
      const viewer = page.getByTestId("spine-viewer");
      if (when === "after it is live") await expect(viewer).toHaveAttribute("data-spine", "live", { timeout: LIVE_TIMEOUT_MS });
      const next = await page.evaluate(() => {
        const flipped = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = flipped;
        return flipped;
      });
      await expect(viewer).toHaveAttribute("data-spine", "live", { timeout: LIVE_TIMEOUT_MS });
      await expect(page.getByTestId("spine-still")).toBeHidden({ timeout: LIVE_TIMEOUT_MS });
      await viewer.scrollIntoViewIfNeeded();
      const looksLight = async () => (await meanLuminance(page, await viewer.screenshot())) > LIGHT_LUMINANCE;
      await expect.poll(looksLight, { timeout: LIVE_TIMEOUT_MS }).toBe(next === "light");
    });
  }

  // W14-O: SwiftShader stands in for a low-end phone with software GL. A spin that never stops starved the page's
  // own frames there (ananya-plan fell to 2/6), so on a software renderer the spine draws only when moved.
  test.describe("with motion allowed", () => {
    test.use({ reducedMotion: "no-preference" });
    test("does not spin on its own on a software renderer", async ({ page }) => {
      await toPlan(page);
      const viewer = page.getByTestId("spine-viewer");
      await expect(viewer).toHaveAttribute("data-spine", "live", { timeout: LIVE_TIMEOUT_MS });
      await expect(viewer).toHaveAttribute("data-spine-spin", "off");
    });
  });
});

/** Mid-grey: the light look's ground is near white and the dark look's near black, spine included. */
const LIGHT_LUMINANCE = 128;

/** A screenshot's mean luminance (0–255), decoded in a blank page, so no image library and no page CSP. */
async function meanLuminance(page: Page, png: Buffer): Promise<number> {
  const blank = await page.context().newPage();
  try {
    return await blank.evaluate(async (base64) => {
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const context = canvas.getContext("2d")!;
      context.drawImage(bitmap, 0, 0);
      const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height);
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      return sum / (data.length / 4);
    }, png.toString("base64"));
  } finally {
    await blank.close();
  }
}
