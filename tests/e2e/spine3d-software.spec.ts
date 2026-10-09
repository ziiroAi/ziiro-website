import { expect, test } from "./fixtures";
import { SWIFTSHADER } from "./support/gpu";
import { answerAsAnanya, expectPlan, fillContact, sendContact } from "./support/questions";

/**
 * (C) W14-X: on a software renderer (SwiftShader here; llvmpipe, WARP, a low-end phone with weak GL) no viewer runs its
 * 3D. worker-2's W14-S measured the plan's 3D on SwiftShader at 3-10 s per tour tap on a phone, and the first plan tap
 * at 344 / 728 ms against 128 / 192 ms with the 3D off. So the plan's hero and the tour keep the r17 still, the
 * fallback is recorded as software-gl, and no 3D code or mesh is fetched. The probe is not told otherwise here.
 */
const THREE_D = /\/assets\/(host|scene|spine\.worker)-[\w-]+\.js|\/spine\/3d\//;

test.use({ launchOptions: { args: SWIFTSHADER } });

test("the plan's hero and tour keep their stills, and fetch no 3D code or mesh", async ({ page }) => {
  const fetched: string[] = [];
  page.context().on("request", (request) => {
    if (THREE_D.test(request.url())) fetched.push(request.url());
  });
  await page.goto("/");
  await answerAsAnanya(page);
  await fillContact(page);
  await sendContact(page);
  await expectPlan(page);
  const hero = page.getByTestId("spine-viewer").first();
  await expect(hero).toHaveAttribute("data-spine", "fallback");
  await expect(hero).toHaveAttribute("data-spine-reason", "software-gl");
  await expect(hero.getByTestId("spine-still").locator("img")).toBeVisible();
  await page.getByTestId("spine-tour-stage").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("spine-viewer")).toHaveCount(2);
  const tour = page.getByTestId("spine-tour-stage").getByTestId("spine-viewer");
  await expect(tour).toHaveAttribute("data-spine", "fallback");
  await expect(tour).toHaveAttribute("data-spine-reason", "software-gl");
  await expect(page.getByTestId("spine-canvas")).toHaveCount(0);
  expect(fetched).toEqual([]);
});
