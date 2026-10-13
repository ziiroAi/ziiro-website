import { expect, test } from "./fixtures";

/** Review Focus 1: frames with no visible H1 after the page had shown one. */
declare global {
  interface Window { __h1Gaps: number; __h1Seen: boolean }
}

test("the prerendered greeting stays on screen while the page chunk loads (§4.2, §13.10)", async ({ page }) => {
  await page.route(/\/assets\/Index-[\w-]+\.js$/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    await route.continue();
  });
  await page.addInitScript(() => {
    window.__h1Gaps = 0;
    window.__h1Seen = false;
    const tick = () => {
      const h1 = document.querySelector("h1");
      const shown = !!h1 && (h1.textContent ?? "").trim() !== "" && h1.getClientRects().length > 0;
      if (shown) window.__h1Seen = true;
      else if (window.__h1Seen) window.__h1Gaps += 1;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  await page.goto("/");
  await page.waitForTimeout(1_500);

  expect(await page.evaluate(() => window.__h1Seen)).toBe(true);
  expect(await page.evaluate(() => window.__h1Gaps)).toBe(0);
});
