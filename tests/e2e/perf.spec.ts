import type { BrowserContextOptions } from "@playwright/test";
import { expect, test } from "./fixtures";
import { ANANYA, tap } from "./helpers/flow";

declare global {
  interface Window { __firstTapMs: number | undefined }
}

const INP_BUDGET_MS = 100; // §13.10
const CPU_SLOWDOWN = 4;
const RUNS = 5;

/**
 * INP gate (§13.10, manager ruling 8 Oct): the funnel's real first tap, S1 to S2, unaltered, with the CPU slowed
 * 4×. Five runs, each in a fresh context so no HTTP or code cache carries over; it passes when the worst run is
 * 100 ms or less. The first tap is the gated one because it is the dearest: its first S1→S2 frame cost 64–88 ms
 * here, and later taps 16–32 ms (worker-2, 8 Oct). A warm-up click before it changed nothing, so there is none.
 */
test("the first tap, S1 to S2, answers within 100 ms in the worst of 5 runs with the CPU slowed 4× (INP, §13.10)", { tag: "@perf" }, async ({ browser }, testInfo) => {
  test.setTimeout(RUNS * 20_000);
  const runs: number[] = [];
  for (let run = 0; run < RUNS; run++) {
    const context = await browser.newContext(testInfo.project.use as BrowserContextOptions);
    // The visit save is the only /api/funnel call before S2; `vite preview` runs no functions (fixtures.ts).
    await context.route("**/api/funnel/**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, country: "IN" }) }),
    );
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_SLOWDOWN });
    await page.addInitScript(() => {
      let firstId: number | undefined;
      new PerformanceObserver((list) => {
        // interactionId is in Chromium's Event Timing, but not yet in this TypeScript's DOM lib.
        for (const e of list.getEntries() as (PerformanceEventTiming & { interactionId?: number })[]) {
          if (!e.interactionId) continue;
          firstId ??= e.interactionId;
          if (e.interactionId === firstId) window.__firstTapMs = Math.max(window.__firstTapMs ?? 0, e.duration);
        }
      }).observe({ type: "event", buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
    });

    await page.goto("/");
    await tap(page, ANANYA.segment);
    // S2 is on screen, and the tap's entry is reported once the frame after it has painted.
    await expect(page.getByRole("button", { name: ANANYA.business, exact: true })).toBeVisible();
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    // Under the 16 ms reporting floor, a tap has no entry at all: it counts as 16.
    runs.push(await page.evaluate(() => window.__firstTapMs ?? 16));
    await context.close();
  }

  const sorted = [...runs].sort((a, b) => a - b);
  const median = sorted[Math.floor(RUNS / 2)];
  const worst = sorted[RUNS - 1];
  testInfo.annotations.push({ type: "first tap S1→S2", description: `runs ${runs.join(", ")} ms; median ${median}; worst ${worst}` });
  expect(worst, `first tap S1→S2, runs ${runs.join(", ")} ms`).toBeLessThanOrEqual(INP_BUDGET_MS);
});
