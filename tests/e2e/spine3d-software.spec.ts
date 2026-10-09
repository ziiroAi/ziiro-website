import { expect, test } from "./fixtures";
import { SWIFTSHADER } from "./support/gpu";
import { answerAsAnanya, expectPlan, fillContact, sendContact } from "./support/questions";

/**
 * (C) W14-X: on a software renderer (SwiftShader here; llvmpipe, WARP, a low-end phone with weak GL) no viewer runs its
 * 3D. worker-2's W14-S measured the plan's 3D on SwiftShader at 3-10 s per tour tap on a phone, and the first plan tap
 * at 344 / 728 ms against 128 / 192 ms with the 3D off. So the plan's one stage (W15-B) keeps the r17 still, the
 * fallback is recorded as software-gl, and no 3D code or mesh is fetched. The probe is not told otherwise here.
 */
const THREE_D = /\/assets\/(host|scene|spine\.worker)-[\w-]+\.js|\/spine\/3d\//;

test.use({ launchOptions: { args: SWIFTSHADER } });

test("the plan's stage keeps its still all the way down, and fetches no 3D code or mesh", async ({ page }) => {
  const fetched: string[] = [];
  page.context().on("request", (request) => {
    if (THREE_D.test(request.url())) fetched.push(request.url());
  });
  await page.goto("/");
  await answerAsAnanya(page);
  await fillContact(page);
  await sendContact(page);
  await expectPlan(page);
  // W15-B: the plan has one stage, so one viewer, from the hero to the close.
  const viewer = page.getByTestId("spine-viewer");
  await expect(viewer).toHaveCount(1);
  await expect(viewer).toHaveAttribute("data-spine", "fallback");
  await expect(viewer).toHaveAttribute("data-spine-reason", "software-gl");
  await expect(viewer.getByTestId("spine-still").locator("img")).toBeVisible();
  await page.locator('[data-depth="1"]').scrollIntoViewIfNeeded();
  await expect(viewer).toHaveCount(1);
  await expect(viewer).toHaveAttribute("data-spine", "fallback");
  await expect(page.getByTestId("spine-canvas")).toHaveCount(0);
  expect(fetched).toEqual([]);
});
