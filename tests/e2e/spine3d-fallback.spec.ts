import { expect, test } from "./fixtures";
import { probeAnswers } from "./support/gpu";
import { answerAsAnanya, expectPlan, fillContact, sendContact } from "./support/questions";
import type { Page } from "@playwright/test";

/**
 * (C) W14-C §4: where the r17 still stays on the plan's hero instead of the live spine. A browser whose GPU gives no
 * WebGL context (a blocklisted driver) fails in the scene; Save-Data stops the viewer before any 3D code is fetched.
 */
const LIVE_TIMEOUT_MS = 30_000;
const THREE_D = /\/assets\/(host|scene|spine\.worker)-[\w-]+\.js|\/spine\/3d\/.*\.glb/;

async function toPlan(page: Page) {
  await page.goto("/");
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

  test("under Save-Data, and fetches no 3D code or mesh", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "connection", { configurable: true, get: () => ({ saveData: true }) });
    });
    const fetched: string[] = [];
    page.on("request", (request) => {
      if (THREE_D.test(request.url())) fetched.push(request.url());
    });
    await toPlan(page);
    const viewer = page.getByTestId("spine-viewer");
    await expect(viewer).toHaveAttribute("data-spine", "fallback");
    await expect(viewer).toHaveAttribute("data-spine-reason", "save-data");
    await expect(page.getByTestId("spine-still").locator("img")).toBeVisible();
    expect(fetched).toEqual([]);
  });
});
