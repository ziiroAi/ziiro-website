import { expect, test } from "./fixtures";
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

async function toPlan(page: Page) {
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
    await expect.poll(async () => (await viewer.screenshot()).equals(before), { timeout: 5_000 }).toBe(false);
  });
});
