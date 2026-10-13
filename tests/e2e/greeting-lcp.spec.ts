import { expect, test } from "@playwright/test";

/**
 * (C) §13.10: the greeting is the LCP from the first paint, before the page's script has run. On a slow
 * connection the HTML paints first; a greeting that faded in from opacity 0 wasn't counted until React
 * re-rendered it, a second later (lane D's speed gate, 8 Oct). The fade now starts at 1 %.
 */
declare global {
  interface Window { __paint: { fcp: number; lcp: number; lcpClass: string } }
}

test("the greeting is the LCP at the first contentful paint, before the script loads", async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  // About a slow 4G round trip: the HTML paints well before the script chunks arrive.
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: 200_000, uploadThroughput: 100_000 });
  await page.addInitScript(() => {
    window.__paint = { fcp: 0, lcp: 0, lcpClass: "" };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (entry.name === "first-contentful-paint") window.__paint.fcp = entry.startTime;
    }).observe({ type: "paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as LargestContentfulPaint[]) {
        window.__paint.lcp = entry.startTime;
        window.__paint.lcpClass = String(entry.element?.className ?? "");
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "I run a business" })).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => page.evaluate(() => window.__paint.lcp)).toBeGreaterThan(0);
  const paint = await page.evaluate(() => window.__paint);
  expect(paint.lcpClass).toBe("f-intro-greet");
  expect(paint.lcp - paint.fcp).toBeLessThan(100);  // the same frame, give or take one
});
