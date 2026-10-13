import { expect, test } from "./fixtures";
import { probeAnswers } from "./support/gpu";
import { answerAsAnanya, expectPlan, fillContact, sendContact } from "./support/questions";
import type { Page } from "@playwright/test";

/**
 * (C) W14-C §4: where the r17 still stays on the plan's hero instead of the live spine. A browser whose GPU gives no
 * WebGL context (a blocklisted driver) fails in the scene. W22-LOAD: Save-Data and a slow connection no longer keep it.
 */
const LIVE_TIMEOUT_MS = 30_000;
const THREE_D = /\/assets\/(host|scene|spine\.worker)-[\w-]+\.js|\/spine\/3d\/.*\.glb/;

async function toPlan(page: Page, start = "/") {
  await page.goto(start);
  await answerAsAnanya(page);
  await fillContact(page);
  await sendContact(page);
  await expectPlan(page);
}

/** No WebGL context anywhere: the worker path removed (init scripts don't reach workers), getContext("webgl*") null,
 *  and the software-GL probe worker answering as a worker with no WebGL does (W14-X). */
async function withoutWebGL(page: Page) {
  await probeAnswers(page, false);
  await page.addInitScript(() => {
    Reflect.deleteProperty(HTMLCanvasElement.prototype, "transferControlToOffscreen");
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
      return /webgl/i.test(kind) ? null : (original as (...a: unknown[]) => unknown).call(this, kind, ...rest);
    } as typeof original;
  });
}

test.describe("the still stays", () => {
  test("with no WebGL context: the r17 still and no canvas", async ({ page }) => {
    await withoutWebGL(page);
    await toPlan(page);
    const viewer = page.getByTestId("spine-viewer");
    await expect(viewer).toHaveAttribute("data-spine", "fallback", { timeout: LIVE_TIMEOUT_MS });
    await expect(viewer).toHaveAttribute("data-spine-reason", "no-webgl2");
    await expect(page.getByTestId("spine-still").locator("img")).toBeVisible();
    await expect(page.getByTestId("spine-canvas")).toHaveCount(0);
  });
});

test.describe("the 3D loads anyway (W22-LOAD)", () => {
  // A teammate's phone kept the still for good: Save-Data or a "3g" reading kept it before any 3D loaded.
  test.setTimeout(120_000);
  for (const [name, connection] of [["Save-Data", { saveData: true }], ["a 3g reading", { saveData: false, effectiveType: "3g" }]] as const) {
    test(`under ${name}, in the background, and takes over from the still`, async ({ page }) => {
      await probeAnswers(page, false);
      await page.addInitScript((value) => {
        Object.defineProperty(navigator, "connection", { configurable: true, get: () => value });
      }, connection);
      await toPlan(page);
      await expect(page.getByTestId("spine-viewer")).toHaveAttribute("data-spine", "live", { timeout: LIVE_TIMEOUT_MS });
    });
  }

  test("?why3d=1 says on screen why the still stayed", async ({ page }) => {
    await withoutWebGL(page);
    await toPlan(page, "/?why3d=1");
    const why = page.getByTestId("why3d");
    await expect(why).toContainText("3D fallback", { timeout: LIVE_TIMEOUT_MS });
    await expect(why).toContainText("no-webgl2");
  });
});
