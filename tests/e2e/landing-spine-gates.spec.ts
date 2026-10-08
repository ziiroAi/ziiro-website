import type { Browser, BrowserContextOptions, CDPSession, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

/**
 * (C) W14-I: the gates for S0's live spine. By hand, never in CI (the throttled runs are slow):
 *
 *   PLAYWRIGHT_BASE_URL=<a preview build> LANDING_GPU=metal|swiftshader \
 *     python3 "$BUS/with-render-lock.py" npx playwright test tests/e2e/landing-spine-gates.spec.ts --workers=1
 *
 * Each gate runs with the 3D on, and with it off (Save-Data: the viewer falls back before any 3D code loads) as the
 * baseline, at 4× CPU on Fast 4G. On a Vercel Preview, set VERCEL_AUTOMATION_BYPASS_SECRET: it travels only as a
 * header to the Preview's own origin.
 * - LCP: the browser's own LCP on S0 (it stops at the first input), 2.0 s or less, and it must be the greeting.
 * - INP (§13.10): Event Timing's duration for a tap on the first S1 option while the 3D is loading, worst of 5. On a
 *   real GPU (LANDING_GPU=metal) 100 ms or less. On SwiftShader S0 has no 3D (§6.6 "S0": the probe stops it), so the
 *   3D-on run is held to its 3D-off baseline instead: at most one frame (16 ms) slower.
 * - Long tasks: every task over 50 ms from navigation to the tap, listed for both; 50 ms or less on a real GPU, at most
 *   one frame over the baseline on SwiftShader.
 * On and off runs alternate, each in a cold context, after one unmeasured warm-up load.
 */
const BASE = process.env.PLAYWRIGHT_BASE_URL;
const BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const GPU = process.env.LANDING_GPU === "metal" ? "metal" : "swiftshader";
const ARGS = GPU === "metal"
  ? ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"]
  : ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"];

const LCP_LIMIT_MS = 2_000;
const INP_LIMIT_MS = 100;
const LONG_TASK_MS = 50;
const FRAME_MS = 16;
const RUNS = 5;
const CPU_SLOWDOWN = 4;
const FAST_4G = { latency: 165, downloadThroughput: (9_000_000 / 8) * 0.9, uploadThroughput: (1_500_000 / 8) * 0.9 };
const CHUNK_URL = /\/assets\/(host|scene|spine\.worker)-[\w-]+\.js(\?|$)/i;
const FIRST_OPTION = "I run a business";
const VIEWER = "[data-testid=landing-spine] [data-testid=spine-viewer]";

test.use({ trace: "off", video: "off", launchOptions: { args: ARGS } });
test.skip(!BASE, "Set PLAYWRIGHT_BASE_URL to a build of feat/spine-3d-landing");

interface Probe { lcp: number; lcpClass: string; taps: number[]; longTasks: number[] }

/** A cold context per run, sized as the project (phone or desktop), so no cache or init script carries over. */
async function freshPage(browser: Browser, use: BrowserContextOptions): Promise<Page> {
  const { viewport, deviceScaleFactor, isMobile, hasTouch, userAgent } = use;
  const context = await browser.newContext({ baseURL: BASE, viewport, deviceScaleFactor, isMobile, hasTouch, userAgent });
  return context.newPage();
}

async function prepare(page: Page, threeD: boolean): Promise<CDPSession> {
  if (BASE && BYPASS) {
    await page.route(`${new URL(BASE).origin}/**`, (route) =>
      route.continue({ headers: { ...route.request().headers(), "x-vercel-protection-bypass": BYPASS } }));
  }
  await page.route("**/api/funnel/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: '{"success":true}' }));
  await page.addInitScript((saveData: boolean) => {
    if (saveData) {
      Object.defineProperty(Navigator.prototype, "connection", {
        configurable: true,
        get: () => ({ saveData: true, effectiveType: "4g", addEventListener() {}, removeEventListener() {} }),
      });
    }
    const probe = { lcp: 0, lcpClass: "", taps: [] as number[], longTasks: [] as number[] };
    (window as unknown as { __probe: typeof probe }).__probe = probe;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as LargestContentfulPaint[]) {
        probe.lcp = e.startTime;
        probe.lcpClass = String(e.element?.className ?? "");
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & { interactionId?: number })[]) {
        if (e.interactionId) probe.taps.push(Math.round(e.duration));
      }
    }).observe({ type: "event", durationThreshold: 16, buffered: true } as PerformanceObserverInit);
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) probe.longTasks.push(Math.round(e.duration));
    }).observe({ type: "longtask", buffered: true });
  }, !threeD);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_SLOWDOWN });
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, ...FAST_4G });
  return cdp;
}

/** S0 loads; with the 3D on, the tap waits for the 3D chunk request, so it lands while the spine is loading. */
async function tapWhileLoading(page: Page, threeD: boolean): Promise<{ probe: Probe; state: string | null }> {
  // Since W14-R S0 has no 3D on a software renderer, so on SwiftShader the "3D on" run waits for that fallback.
  const loading = threeD && GPU === "metal" ? page.waitForRequest((r) => CHUNK_URL.test(r.url()), { timeout: 60_000 }) : null;
  await page.goto("/");
  const option = page.getByRole("button", { name: FIRST_OPTION });
  await expect(option).toBeVisible({ timeout: 30_000 });
  if (loading) await loading;
  else await expect(page.locator(VIEWER)).toHaveAttribute("data-spine", "fallback", { timeout: 30_000 });
  // A person reads the greeting, then taps once the options have risen into place.
  await page.waitForFunction(() => (window as unknown as { __probe: Probe }).__probe.lcp > 0, null, { timeout: 30_000 });
  await option.evaluate((el) => Promise.all(el.closest(".f-s1")?.getAnimations().map((a) => a.finished) ?? []));
  const state = await page.locator(VIEWER).getAttribute("data-spine", { timeout: 1_000 }).catch(() => null);
  await option.click();
  await page.waitForTimeout(1_000);
  const probe = await page.evaluate(() => (window as unknown as { __probe: Probe }).__probe);
  return { probe, state };
}

interface Run { lcp: number; tap: number; longest: number }

async function measure(browser: Browser, use: BrowserContextOptions, threeD: boolean, name: string): Promise<Run> {
  const page = await freshPage(browser, use);
  const cdp = await prepare(page, threeD);
  const { probe, state } = await tapWhileLoading(page, threeD);
  await cdp.detach();
  await page.context().close();
  const run = { lcp: Math.round(probe.lcp), tap: probe.taps.length ? Math.max(...probe.taps) : 0, longest: Math.max(0, ...probe.longTasks) };
  const line = `LCP ${run.lcp} ms (${probe.lcpClass}) · tap ${run.tap} ms, viewer "${state}" · long tasks [${probe.longTasks.join(", ")}] ms`;
  test.info().annotations.push({ type: name, description: line });
  console.log(`[${GPU}] ${name}: ${line}`);
  expect(probe.lcpClass, "the greeting must be the LCP").toBe("f-intro-greet");
  if (threeD) expect(state, "the tap must land while the 3D is still loading").not.toBe("live");
  return run;
}

const worst = (runs: Run[], key: keyof Run): number => Math.max(...runs.map((r) => r[key]));

test(`S0 on ${GPU}: LCP, the first S1 tap's INP and long tasks, 3D on against the Save-Data baseline`, async ({ browser }, info) => {
  test.setTimeout(RUNS * 2 * 90_000);
  // One unmeasured load first: the first page in a new browser pays its own start-up (about 300 ms on any tap).
  await measure(browser, info.project.use, false, "warm-up (not counted)");
  const on: Run[] = [];
  const off: Run[] = [];
  for (let run = 1; run <= RUNS; run += 1) {
    on.push(await measure(browser, info.project.use, true, `3D on, run ${run}`));
    off.push(await measure(browser, info.project.use, false, `3D off, run ${run}`));
  }
  const summary = `3D on: LCP ${worst(on, "lcp")} · INP ${worst(on, "tap")} · longest task ${worst(on, "longest")} ms | `
    + `3D off: LCP ${worst(off, "lcp")} · INP ${worst(off, "tap")} · longest task ${worst(off, "longest")} ms`;
  info.annotations.push({ type: "worst of 5", description: summary });
  console.log(`[${GPU}] ${info.project.name} worst of ${RUNS}: ${summary}`);
  expect(worst(on, "lcp")).toBeLessThanOrEqual(LCP_LIMIT_MS);
  if (GPU === "metal") {
    // §13.10 is judged here: the spec's own limits.
    expect(worst(on, "tap")).toBeLessThanOrEqual(INP_LIMIT_MS);
    expect(worst(on, "longest")).toBeLessThanOrEqual(LONG_TASK_MS);
    return;
  }
  // SwiftShader: the 3D's own cost, against the same steps with the 3D off.
  expect(worst(on, "tap")).toBeLessThanOrEqual(worst(off, "tap") + FRAME_MS);
  expect(worst(on, "longest")).toBeLessThanOrEqual(worst(off, "longest") + FRAME_MS);
});
