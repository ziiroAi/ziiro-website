import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import type { Browser, BrowserContextOptions, CDPSession, Page, Response } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { PROBE_WORKER, probeSeesHardware } from "./support/gpu";
import { expectPlan, tapThrough } from "./support/questions";

/**
 * (C) W14-E: the gates for the live 3D spine (spec patch §6.6 and §13.10, checklist B20). By hand, against a
 * deployed Preview, never in CI: the throttled runs are slow and the numbers mean something only on Vercel.
 *
 *   ( set -a; . ~/.config/ziiro/builders.env; set +a; \
 *     PLAYWRIGHT_BASE_URL=https://<the feat/spine-3d Preview> SPINE3D_GPU=metal|swiftshader \
 *     python3 "$BUS/with-render-lock.py" npx playwright test tests/e2e/spine3d-gates.spec.ts --workers=1 )
 *
 * The bypass secret travels only as a header to the Preview's own origin, and traces and videos are off, because a
 * trace records request headers. /api/funnel/* is stubbed, so no run saves a lead or sends an email.
 *
 * What each gate measures:
 * - (a) LCP. The browser's own LCP stops at the first input, and the spine shows only on the plan, after many taps.
 *   So (a) times the plan's paint the same way: from the moment the plan replaces S8 (which holds 2.1 s after the tap
 *   on "Show me my plan" by design, §4.3) to the frame where the r17 still has painted, at 4× CPU on Fast 4G. It also checks that the still is what painted first, not the canvas.
 * - (b) INP. A real tap on the plan's hero while the 3D is still loading: Event Timing's duration for that
 *   interaction, the worst of 5 runs at 4× CPU. §13.10 judges it on a real GPU (SPINE3D_GPU=metal) at 100 ms or less;
 *   on SwiftShader (the default) the 3D-on runs are what a software-GL visitor gets, the still and no 3D (W14-X), held
 *   to a Save-Data baseline of the same steps: at most one frame (16 ms) slower.
 * - (c) The drag. With reduced motion (no idle spin), the canvas takes over from the still; a sideways drag changes
 *   its pixels; on a phone a vertical swipe on it still scrolls the page.
 * - (d) The fallback. No WebGL (getContext stubbed to null, and the worker path removed) and Save-Data each keep the
 *   still; Save-Data fetches no 3D chunk and no mesh.
 * - (e) Transfer. The lazy 3D chunk's gzip size and the mesh's transfer size, held to the §13.10 budgets.
 */

const PREVIEW_URL = process.env.PLAYWRIGHT_BASE_URL;
const BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
/** §13.10 "3D spine code": 178 KiB, about 5 % over the 173,754 bytes this gate measured on the f23a457 Preview
 *  (worker-2), so a rebuild's jitter or a small fix doesn't trip it; growing past it means updating §13.10 first. */
const CHUNK_GZ_LIMIT = 182_272;

const LCP_LIMIT_MS = 2_000;
const INP_LIMIT_MS = 100;
const INP_RUNS = 5;
/** One frame at 60 Hz: how much slower than its 3D-off baseline a SwiftShader run may be (§13.10). */
const FRAME_MS = 16;
const GPU = process.env.SPINE3D_GPU === "metal" ? "metal" : "swiftshader";
const CPU_SLOWDOWN = 4;
const MESH_LIMIT_BYTES = { phone: 1_500_000, desktop: 3_000_000 } as const;
/** Chrome DevTools' "Fast 4G" preset: 9 Mbps down, 1.5 Mbps up, 60 ms × 2.75 latency, both × 0.9. */
const FAST_4G = { latency: 165, downloadThroughput: (9_000_000 / 8) * 0.9, uploadThroughput: (1_500_000 / 8) * 0.9 };
/** How long the live model gets to replace the still, unthrottled, before (c) and (e) give up. */
const LIVE_TIMEOUT_MS = 30_000;
const SETTLE_MS = 400;
const DRAG_PX = 160;
/** Where a desktop drag starts, as a fraction of the canvas width: the middle of the spine's column, right of the words. */
const DESKTOP_GRAB_X = 0.775;
const SWIPE_PX = 300;

/**
 * Checked against worker-1's SpineViewer on feat/spine-3d (src/features/funnel/spine3d/SpineViewer.tsx). The still is
 * HeroPicture's <img> inside [data-testid=spine-still]. The viewer's wrapper is [data-testid=spine-viewer] and carries
 * data-spine="still" | "loading" | "live" | "fallback", with data-spine-reason set to one of rules.ts's FallbackReason
 * values on fallback; its canvas is [data-testid=spine-canvas].
 */
const SEL = {
  still: '[data-testid=spine-still] img[src*="/spine/r22/"]:visible',
  viewer: "[data-testid=spine-viewer]",
  canvas: "[data-testid=spine-canvas]",
  live: '[data-testid=spine-viewer][data-spine="live"]',
  fallback: '[data-testid=spine-viewer][data-spine="fallback"]',
  /** What (b) taps: the plan hero's heading, which is on screen as the plan opens. */
  tapTarget: 'main h1, [data-screen="plan"] h1',
} as const;
const STATE_ATTR = "data-spine";
const REASON_ATTR = "data-spine-reason";
/** The lazy 3D code, by URL: host.ts (the switch), the worker bundle (three.js on OffscreenCanvas), and scene.ts
 *  (three.js on the main thread, where OffscreenCanvas can't run WebGL). */
const CHUNK_URL = /\/assets\/(host|scene|spine\.worker)-[\w-]+\.js(\?|$)/i;
const MESH_URL = /\/spine\/3d\/.*\.glb(\?|$)/i;

const STUB_VISIT = { status: 200, contentType: "application/json", body: '{"success":true}' };
const STUB_LEAD = { status: 200, contentType: "application/json", body: '{"success":true,"planEmail":"sent"}' };

/**
 * Without these, headless Chromium composites in software and never shows a worker's WebGL frames: the canvas reads
 * back the spine but screenshots black, so (c) can't see a drag. SwiftShader renders on the CPU, which only makes
 * (b) harder.
 */
const WEBGL = GPU === "metal"
  ? ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"]
  : ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"];

test.use({ trace: "off", video: "off", launchOptions: { args: WEBGL } });
test.skip(!PREVIEW_URL, "Set PLAYWRIGHT_BASE_URL to the feat/spine-3d Preview");
test.describe.configure({ mode: "serial" });

type Device = keyof typeof MESH_LIMIT_BYTES;
const deviceOf = (projectName: string): Device => (projectName === "phone" ? "phone" : "desktop");

/** The bypass header on the Preview's own origin, then the stubs. The newest route wins, so the stubs go last. */
async function wire(page: Page): Promise<void> {
  if (PREVIEW_URL && BYPASS) {
    await page.route(`${new URL(PREVIEW_URL).origin}/**`, (route) => {
      const headers = { ...route.request().headers(), "x-vercel-protection-bypass": BYPASS };
      // The probe worker's script passes on to probeSeesHardware's stub where (c) and (e) set one (W14-X).
      return PROBE_WORKER.test(route.request().url()) ? route.fallback({ headers }) : route.continue({ headers });
    });
  }
  await page.route("**/api/funnel/visit", (route) => route.fulfill(STUB_VISIT));
  await page.route("**/api/funnel/lead", (route) => route.fulfill(STUB_LEAD));
}

async function throttle(page: Page): Promise<CDPSession> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_SLOWDOWN });
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, ...FAST_4G });
  return cdp;
}

/** S0 to S7 the way a person answers, then the contact step, stopping before the send. */
async function toContactStep(page: Page): Promise<void> {
  await page.goto("/");
  await tapThrough(page, "I run a business", "Interior design / architecture", "5–10 years", "6–20", "₹1–5Cr");
  await tapThrough(page, "Leads don't convert", "That's it");
  await page.getByLabel("Your name").fill("TEST spine3d");
  await page.getByLabel("Email", { exact: true }).fill("test@example.com");
  await page.getByRole("checkbox").check();
}

const sendContact = (page: Page) => page.getByRole("button", { name: "Show me my plan" }).click();

async function toPlan(page: Page): Promise<void> {
  await toContactStep(page);
  await sendContact(page);
  await expectPlan(page);
}

const viewerState = (page: Page) =>
  page.locator(SEL.viewer).first().getAttribute(STATE_ATTR, { timeout: 1_000 }).catch(() => null);

async function canvasHash(page: Page): Promise<string> {
  const shot = await page.locator(SEL.canvas).first().screenshot({ animations: "allow" });
  return createHash("sha1").update(shot).digest("hex");
}

/** A one-finger drag through CDP: Playwright's touchscreen only taps. */
async function touchDrag(cdp: CDPSession, from: { x: number; y: number }, dx: number, dy: number): Promise<void> {
  const steps = 12;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [from] });
  for (let i = 1; i <= steps; i += 1) {
    const point = { x: from.x + (dx * i) / steps, y: from.y + (dy * i) / steps };
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

async function centreOf(page: Page, selector: string): Promise<{ x: number; y: number }> {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`${selector} has no box`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test("(a) the r17 still paints first, within 2.0 s of the plan showing, at 4× CPU on Fast 4G", async ({ page }) => {
  test.setTimeout(240_000);
  await wire(page);
  await toContactStep(page);
  await throttle(page);
  // S8 holds for S8_MIN_MS (2.1 s, §4.3) by design, so the clock starts when the plan replaces S8, not at the send.
  await page.evaluate(() => {
    performance.mark("spine3d-send");
    const root = document.querySelector(".f-root");
    if (!root) return;
    const seen = new MutationObserver(() => {
      if (root.getAttribute("data-screen") !== "plan") return;
      performance.mark("spine3d-plan");
      seen.disconnect();
    });
    seen.observe(root, { attributes: true, attributeFilter: ["data-screen"] });
  });
  await sendContact(page);
  await expectPlan(page);
  const still = page.locator(SEL.still).first();
  await expect(still).toBeVisible({ timeout: 20_000 });
  const paint = await still.evaluate(async (img: HTMLImageElement) => {
    if (!img.complete || img.naturalWidth === 0) await img.decode().catch(() => undefined);
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
    const at = (name: string) => performance.getEntriesByName(name)[0]?.startTime ?? 0;
    const live = document.querySelector('[data-testid=spine-viewer][data-spine="live"]') !== null;
    const now = performance.now();
    return { ms: now - at("spine3d-plan"), fromSend: now - at("spine3d-send"), liveBeforeStill: live, src: img.currentSrc };
  });
  test.info().annotations.push({
    type: "a: still painted",
    description: `${Math.round(paint.ms)} ms after the plan showed (${Math.round(paint.fromSend)} ms after the send), ${paint.src}`,
  });
  expect(paint.liveBeforeStill, "the canvas went live before the still painted").toBe(false);
  expect(paint.ms).toBeLessThanOrEqual(LCP_LIMIT_MS);
});

/** A cold page sized as the project, for the 3D-off baseline: no WebGL2, so the viewer falls back before any 3D loads
 *  (W22-LOAD: Save-Data no longer does). */
async function noWebGlPage(browser: Browser, use: BrowserContextOptions): Promise<Page> {
  const { viewport, deviceScaleFactor, isMobile, hasTouch, userAgent } = use;
  const context = await browser.newContext({ baseURL: PREVIEW_URL, viewport, deviceScaleFactor, isMobile, hasTouch, userAgent });
  const page = await context.newPage();
  await page.addInitScript(() => {
    Reflect.deleteProperty(window, "WebGL2RenderingContext");
  });
  return page;
}

/** The worst of INP_RUNS first taps on the plan's hero, each made as the plan opens (with the 3D on: while it loads). */
async function worstPlanTap(page: Page, threeD: boolean, label: string): Promise<number> {
  await wire(page);
  const worst: number[] = [];
  for (let run = 1; run <= INP_RUNS; run += 1) {
    await toContactStep(page);
    const cdp = await throttle(page);
    await page.evaluate(() => {
      const w = window as unknown as { __spineTaps: number[] };
      w.__spineTaps = [];
      new PerformanceObserver((list) => {
        // interactionId isn't in this TypeScript lib's PerformanceEventTiming yet.
        for (const e of list.getEntries() as (PerformanceEntry & { interactionId?: number })[]) {
          if (e.interactionId) w.__spineTaps.push(e.duration);
        }
      }).observe({ type: "event", durationThreshold: 16, buffered: false } as PerformanceObserverInit);
    });
    // W14-X: on SwiftShader the "3D on" page is what a software-GL visitor gets: the probe keeps the still, so there is
    // no 3D request to wait for, and the tap is held to the Save-Data baseline.
    const loading = threeD && GPU === "metal"
      ? page.waitForRequest((r) => CHUNK_URL.test(r.url()) || MESH_URL.test(r.url()), { timeout: 60_000 })
      : null;
    await sendContact(page);
    await expectPlan(page);
    if (loading) await loading;
    const stateAtTap = await viewerState(page);
    await page.locator(SEL.tapTarget).first().click();
    await page.waitForTimeout(1_000);
    const taps = await page.evaluate(() => (window as unknown as { __spineTaps: number[] }).__spineTaps);
    const tapMs = taps.length ? Math.max(...taps) : 0;
    worst.push(tapMs);
    test.info().annotations.push({ type: `b: ${label}, run ${run}`, description: `${tapMs} ms, viewer was "${stateAtTap}"` });
    if (threeD && GPU === "metal") expect(stateAtTap, "the tap must land while the 3D is still loading").not.toBe("live");
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    await cdp.detach();
  }
  return Math.max(...worst);
}

test(`(b) a first tap while the 3D loads, worst of 5 at 4× CPU, on ${GPU} (§13.10)`, async ({ page, browser }, info) => {
  test.setTimeout((INP_RUNS * 2 + 1) * 180_000);
  // W14-X: the first page a fresh browser loads pays its cold start (HTTP and code caches, worker-1 swapped the order:
  // whichever side ran first was 128 / 192 ms slower on run 1). One untimed visit, with no WebGL, warms it for both.
  const warm = await noWebGlPage(browser, info.project.use);
  await wire(warm);
  await toPlan(warm);
  await warm.context().close();
  const on = await worstPlanTap(page, true, "3D on");
  if (GPU === "metal") {
    expect(on).toBeLessThanOrEqual(INP_LIMIT_MS);
    return;
  }
  const baseline = await noWebGlPage(browser, info.project.use);
  const off = await worstPlanTap(baseline, false, "3D off");
  await baseline.context().close();
  info.annotations.push({ type: "b: worst of 5", description: `3D on ${on} ms, 3D off ${off} ms` });
  expect(on).toBeLessThanOrEqual(off + FRAME_MS);
});

test("(c) the canvas replaces the still, a sideways drag turns it, a vertical swipe scrolls", async ({ page }, info) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await wire(page);
  // W14-X: the 3D runs only where the probe sees a real GPU; on SwiftShader it is told so, to test the drag itself.
  if (GPU === "swiftshader") await probeSeesHardware(page);
  await toPlan(page);
  await expect(page.locator(SEL.live)).toHaveCount(1, { timeout: LIVE_TIMEOUT_MS });
  await expect(page.locator(SEL.canvas).first()).toBeVisible();
  await expect(page.locator(SEL.still).first()).toBeHidden();
  await page.locator(SEL.canvas).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(SETTLE_MS);
  const before = await canvasHash(page);
  const centre = await centreOf(page, SEL.canvas);
  if (deviceOf(info.project.name) === "phone") {
    const cdp = await page.context().newCDPSession(page);
    await touchDrag(cdp, centre, DRAG_PX, 0);
    await expect.poll(() => canvasHash(page), { message: "a sideways drag changed no pixel", timeout: 10_000 }).not.toBe(before);
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await touchDrag(cdp, await centreOf(page, SEL.canvas), 0, -SWIPE_PX);
    await page.waitForTimeout(SETTLE_MS);
    expect(await page.evaluate(() => window.scrollY), "a vertical swipe on the canvas didn't scroll").toBeGreaterThan(scrollBefore);
  } else {
    // On desktop the words sit over the canvas's left 55 % (and take the pointer there); the spine is on the right.
    const box = await page.locator(SEL.canvas).first().boundingBox();
    if (!box) throw new Error(`${SEL.canvas} has no box`);
    const grab = { x: box.x + box.width * DESKTOP_GRAB_X, y: centre.y };
    await page.mouse.move(grab.x, grab.y);
    await page.mouse.down();
    await page.mouse.move(grab.x + DRAG_PX, grab.y, { steps: 12 });
    await page.mouse.up();
    await expect.poll(() => canvasHash(page), { message: "a mouse drag changed no pixel", timeout: 10_000 }).not.toBe(before);
  }
});

test.describe("(d) the still stays", () => {
  test("with no WebGL (getContext stubbed to null, no worker path)", async ({ page }) => {
    test.setTimeout(120_000);
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
        return /webgl/i.test(kind) ? null : (original as (...a: unknown[]) => unknown).call(this, kind, ...rest);
      } as typeof original;
      delete (HTMLCanvasElement.prototype as Partial<HTMLCanvasElement>).transferControlToOffscreen;
    });
    await wire(page);
    await toPlan(page);
    await page.waitForTimeout(5_000);
    await expect(page.locator(SEL.still).first()).toBeVisible();
    await expect(page.locator(SEL.live)).toHaveCount(0);
    const reason = await page.locator(SEL.fallback).first().getAttribute(REASON_ATTR).catch(() => null);
    test.info().annotations.push({ type: "d: no WebGL", description: `reason "${reason}"` });
  });

});

test("(d2) with Save-Data the 3D still loads and takes over (W22-LOAD)", async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "connection", {
      configurable: true,
      get: () => ({ saveData: true, effectiveType: "4g", addEventListener() {}, removeEventListener() {} }),
    });
  });
  await wire(page);
  await toPlan(page);
  await expect(page.locator(SEL.live)).toHaveCount(1, { timeout: LIVE_TIMEOUT_MS });
});

test("(e) the lazy 3D chunk and the mesh, against the budgets", async ({ page }, info) => {
  test.setTimeout(120_000);
  const device = deviceOf(info.project.name);
  const chunks: Response[] = [];
  const meshes: Response[] = [];
  page.on("response", (r) => {
    if (CHUNK_URL.test(r.url())) chunks.push(r);
    if (MESH_URL.test(r.url())) meshes.push(r);
  });
  await wire(page);
  if (GPU === "swiftshader") await probeSeesHardware(page);
  await toPlan(page);
  await expect(page.locator(SEL.live)).toHaveCount(1, { timeout: LIVE_TIMEOUT_MS });
  expect(chunks.length, "no lazy 3D chunk matched CHUNK_URL").toBeGreaterThan(0);
  expect(meshes.length, "no mesh matched MESH_URL").toBeGreaterThan(0);

  // Each chunk once. S0 may have loaded it first, and then the plan's response comes from cache with no body, so the
  // body is fetched again (with the bypass header on the Preview) where the response has none.
  const chunkPaths = [...new Set(chunks.map((r) => r.url()))];
  let chunkGz = 0;
  for (const url of chunkPaths) {
    const seen = chunks.find((r) => r.url() === url)!;
    const headers: Record<string, string> = BYPASS ? { "x-vercel-protection-bypass": BYPASS } : {};
    const body = await seen.body().catch(async () => (await page.request.get(url, { headers })).body());
    chunkGz += gzipSync(body, { level: 9 }).length;
  }
  let meshBytes = 0;
  for (const r of meshes) {
    const sizes = await r.request().sizes();
    meshBytes += sizes.responseBodySize + sizes.responseHeadersSize;
  }
  const report = {
    device,
    chunks: chunkPaths.map((url) => new URL(url).pathname),
    chunkGzBytes: chunkGz,
    chunkGzLimit: CHUNK_GZ_LIMIT,
    meshes: meshes.map((r) => new URL(r.url()).pathname),
    meshTransferBytes: meshBytes,
    meshLimit: MESH_LIMIT_BYTES[device],
  };
  await info.attach("spine3d-transfer.json", { body: JSON.stringify(report, null, 2), contentType: "application/json" });
  info.annotations.push({ type: "e: transfer", description: JSON.stringify(report) });
  expect(meshBytes).toBeLessThanOrEqual(MESH_LIMIT_BYTES[device]);
  expect(chunkGz).toBeLessThanOrEqual(CHUNK_GZ_LIMIT);
});
