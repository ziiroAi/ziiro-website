import { expect, test } from "./fixtures";
import { answerRevenue, toRevenueQuestion } from "./helpers/flow";

declare global {
  interface Window { __inp: number }
}

test("taps answer within 100 ms with the CPU slowed 4× (INP, §13.10)", { tag: "@perf" }, async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.addInitScript(() => {
    window.__inp = 0;
    new PerformanceObserver((list) => {
      // interactionId is in Chromium's Event Timing, but not yet in this TypeScript's DOM lib.
      for (const e of list.getEntries() as (PerformanceEventTiming & { interactionId?: number })[]) {
        if (e.interactionId) window.__inp = Math.max(window.__inp, e.duration);
      }
    }).observe({ type: "event", buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
  });

  await page.goto("/");
  await toRevenueQuestion(page);
  await answerRevenue(page);
  // S6 is on screen, and an event's timing entry is reported once the frame after it has painted.
  await expect(page.getByRole("textbox")).toBeVisible();
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

  expect(await page.evaluate(() => window.__inp)).toBeLessThanOrEqual(100);
});
