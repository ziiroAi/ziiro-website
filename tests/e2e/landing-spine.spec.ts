import { expect, test } from "./fixtures";
import type { Page } from "@playwright/test";
import { probeSeesHardware } from "./support/gpu";

/**
 * (C) W14-I: the live spine on S0 (§6.6 "S0"), against the production build with /api/funnel/* mocked. Headless
 * Chromium draws WebGL on SwiftShader, where S0 has no 3D at all since W14-R (it stands in for a low-end phone's
 * software GL). So in CI (W14-W) the live tests tell S0's main-thread probe the GPU is real (asHardware): the 3D then
 * runs on SwiftShader underneath, and the worker, whose renderer name isn't faked, keeps its idle spin off (W14-O).
 * On a real GPU, by hand: LANDING_GPU=metal with-render-lock npx playwright test tests/e2e/landing-spine.spec.ts.
 * The speed gates (LCP, INP of the first S1 tap, long tasks) are in landing-spine-gates.spec.ts.
 */
const GPU = process.env.LANDING_GPU === "metal";
const ARGS = GPU
  ? ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"]
  : ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"];
const NEEDS_SOFTWARE = "a software renderer's case: run without LANDING_GPU";
const LIVE_TIMEOUT_MS = 30_000;
/** LandingSpineSlot's SPINE_FADE_MS, plus a margin. */
const GONE_MS = 1_500;
/**
 * How long a disposed worker may take to go: host.ts terminates it 1 s after dispose at the latest, but under
 * SwiftShader the page's own timers can run seconds late (W14-M's frame stall), so the wait allows for that.
 */
const WORKER_GONE_MS = 10_000;
const FIRST_OPTION = "I run a business";
/** S0's 3D code and its mesh. */
const THREE_D = /\/assets\/(host|scene|spine\.worker)-[\w-]+\.js|\/spine\/3d\//;
/** first-screen.ts's WAIT_AFTER_LCP_MS plus a margin: past it, S0's 3D would have started. */
const START_WAIT_MS = 1_500;

const SEL = {
  layer: "[data-testid=landing-spine]",
  viewer: "[data-testid=landing-spine] [data-testid=spine-viewer]",
  canvas: "[data-testid=landing-spine] [data-testid=spine-canvas]",
} as const;

test.use({ launchOptions: { args: ARGS } });

/** S0's 3D settles: live on a real GPU, nothing on a software renderer. */
const SETTLED = GPU ? "live" : "fallback";
/** On SwiftShader, S0's probe is told the GPU is real so the 3D runs in CI; on a real GPU nothing is faked. */
const asHardware = (page: Page) => (GPU ? Promise.resolve() : probeSeesHardware(page));

/** Logs every data-spine value S0's viewer takes, in order, from the first paint. */
async function logPhases(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __phases: string[] };
    w.__phases = [];
    new MutationObserver((records) => {
      for (const r of records) {
        const el = r.target as HTMLElement;
        if (el.closest("[data-testid=landing-spine]") && el.dataset.testid === "spine-viewer") w.__phases.push(el.dataset.spine ?? "");
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-spine"] });
  });
}
const phases = (page: Page) => page.evaluate(() => (window as unknown as { __phases: string[] }).__phases);

async function optionBox(page: Page) {
  const box = await page.getByRole("button", { name: FIRST_OPTION }).boundingBox();
  if (!box) throw new Error("the first S1 option has no box");
  return box;
}

test.describe("the live spine on S0", () => {
  test("the greeting stays the LCP once the spine has settled", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __lcp: string[] };
      w.__lcp = [];
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as LargestContentfulPaint[]) w.__lcp.push(String(e.element?.className ?? ""));
      }).observe({ type: "largest-contentful-paint", buffered: true });
    });
    await page.goto("/");
    await expect(page.locator(SEL.viewer)).toHaveAttribute("data-spine", SETTLED, { timeout: LIVE_TIMEOUT_MS });
    // No still on S0: nothing in the layer could become the LCP (a canvas never is one).
    await expect(page.locator(`${SEL.layer} img`)).toHaveCount(0);
    const lcp = await page.evaluate(() => (window as unknown as { __lcp: string[] }).__lcp);
    expect(lcp.at(-1), `LCP entries: ${lcp.join(" > ")}`).toBe("f-intro-greet");
  });

  test("goes live under the words without moving the options", async ({ page }) => {
    await asHardware(page);
    // No intro (S1 rises 58svh during it), so a moved option can only be the spine's doing.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.getByRole("button", { name: FIRST_OPTION })).toBeVisible({ timeout: 15_000 });
    const before = await optionBox(page);
    await expect(page.locator(SEL.viewer)).toHaveAttribute("data-spine", "live", { timeout: LIVE_TIMEOUT_MS });
    await expect(page.locator(SEL.canvas)).toBeVisible();
    expect(await optionBox(page)).toEqual(before);
    // The layer sits under the options: a tap on an option still lands on the option.
    const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("button")?.textContent ?? "", {
      x: before.x + before.width / 2, y: before.y + before.height / 2,
    });
    expect(hit).toContain(FIRST_OPTION);
  });

  test("fades out on the first tap into S1 and is gone after the fade", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(SEL.viewer)).toHaveAttribute("data-spine", SETTLED, { timeout: LIVE_TIMEOUT_MS });
    await page.getByRole("button", { name: FIRST_OPTION }).click();
    await expect(page.locator(".f-root")).not.toHaveAttribute("data-screen", "s1");
    await expect(page.locator(SEL.layer)).toHaveCount(0, { timeout: GONE_MS });
    await expect(page.locator("[data-testid=spine-viewer]")).toHaveCount(0);
  });

  test("gives its 3D up on a press before its first frame, and frees its worker (§6.6 S0)", async ({ page }) => {
    await asHardware(page);
    await logPhases(page);
    // Hold the mesh back, so the press is sure to land while the 3D is loading.
    await page.route("**/spine/3d/**", async (route) => {
      await new Promise((done) => setTimeout(done, 10_000));
      await route.continue().catch(() => undefined);
    });
    await page.goto("/");
    await expect(page.locator(SEL.viewer)).toHaveAttribute("data-spine", "loading", { timeout: LIVE_TIMEOUT_MS });
    expect(page.workers().length, "S0's scene runs in a worker").toBeGreaterThan(0);
    // W14-U L1: a key that isn't pressing an option (here Shift) is not the visitor leaving S0.
    await page.keyboard.press("Shift");
    await expect(page.locator(SEL.viewer)).toHaveAttribute("data-spine", "loading");
    // A press on an S1 option is. The button is held, not released, so the page stays on S1 for the checks below.
    // W15-D2: the 3D now starts 300 ms past the LCP, before the options have risen into place on a phone, so the press
    // waits until the option is where it will stay and is what a press there lands on.
    const button = page.getByRole("button", { name: FIRST_OPTION });
    await button.evaluate((el) => Promise.all(el.closest(".f-s1")?.getAnimations({ subtree: true }).map((a) => a.finished) ?? []));
    await expect.poll(() => button.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return hit !== null && el.contains(hit);
    }), { timeout: LIVE_TIMEOUT_MS }).toBe(true);
    const option = await button.boundingBox();
    if (!option) throw new Error("the first S1 option has no box");
    await page.mouse.move(option.x + option.width / 2, option.y + option.height / 2);
    await page.mouse.down();
    await expect(page.locator(SEL.viewer)).toHaveAttribute("data-spine", "still");
    await expect(page.locator(SEL.canvas)).toHaveCount(0);
    await expect.poll(() => page.workers().length, { timeout: WORKER_GONE_MS }).toBe(0);
    expect(await phases(page)).not.toContain("live");
  });

  test("never loads its 3D after a press that lands before its layer mounts (W14-X, the phone tap at about 470 ms)", async ({ page }) => {
    await asHardware(page);
    const done: string[] = [];
    page.context().on("requestfinished", (request) => {
      if (THREE_D.test(request.url())) done.push(new URL(request.url()).pathname);
    });
    // Hold the lazy layer back, so the press is sure to land before S0's viewer exists.
    let layerAsked: () => void = () => undefined;
    const asked = new Promise<void>((resolve) => (layerAsked = resolve));
    let releaseLayer: () => void = () => undefined;
    const released = new Promise<void>((resolve) => (releaseLayer = resolve));
    await page.route(/\/assets\/LandingSpine-[\w-]+\.js/, async (route) => {
      layerAsked();
      await released;
      await route.continue();
    });
    await page.goto("/");
    await asked;
    // A press on the option itself (it may still be rising in), not yet acted on: the visitor is still on S1, as in
    // worker-2's phone run, where S2 came about a second later.
    await page.getByRole("button", { name: FIRST_OPTION }).dispatchEvent("pointerdown", { pointerType: "touch", isPrimary: true });
    releaseLayer();
    await expect(page.locator(SEL.viewer)).toHaveAttribute("data-spine-left", "", { timeout: LIVE_TIMEOUT_MS });
    // Wait out the 3D's own start condition (its LCP, the second after it, idle time, two frames), then look.
    await page.evaluate((waitMs) => new Promise<void>((resolve) => {
      new PerformanceObserver((_list, observer) => {
        observer.disconnect();
        setTimeout(() => requestIdleCallback(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))), waitMs);
      }).observe({ type: "largest-contentful-paint", buffered: true });
    }), START_WAIT_MS);
    await expect(page.locator(SEL.viewer)).toHaveAttribute("data-spine", "still");
    await expect(page.locator(SEL.canvas)).toHaveCount(0);
    expect(page.workers()).toHaveLength(0);
    expect(done, "no 3D code or /spine/3d request completes after an early press").toEqual([]);
  });

  test("frees its worker once the first S1 tap has faded it out (§6.6 S0)", async ({ page }) => {
    await asHardware(page);
    await page.goto("/");
    await expect(page.locator(SEL.viewer)).toHaveAttribute("data-spine", "live", { timeout: LIVE_TIMEOUT_MS });
    await page.getByRole("button", { name: FIRST_OPTION }).click();
    await expect(page.locator(SEL.layer)).toHaveCount(0, { timeout: GONE_MS });
    await expect.poll(() => page.workers().length, { timeout: WORKER_GONE_MS }).toBe(0);
  });

  test("on a software renderer it shows nothing and fetches no 3D, so the first tap never waits on it", async ({ page }) => {
    test.skip(GPU, NEEDS_SOFTWARE);
    const fetched: string[] = [];
    page.on("request", (r) => { if (/\/spine\/3d\/|\/assets\/(host|scene|spine\.worker)-/.test(r.url())) fetched.push(r.url()); });
    await page.goto("/");
    await expect(page.locator(SEL.viewer)).toHaveAttribute("data-spine-reason", "software-gl", { timeout: LIVE_TIMEOUT_MS });
    await expect(page.locator(SEL.canvas)).toHaveCount(0);
    await expect(page.locator(`${SEL.layer} img`)).toHaveCount(0);
    expect(fetched, "software GL fetched 3D files").toEqual([]);
  });

  test("with Save-Data it shows nothing: no canvas, no still, no box", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, "connection", {
        configurable: true,
        get: () => ({ saveData: true, effectiveType: "4g", addEventListener() {}, removeEventListener() {} }),
      });
    });
    const fetched: string[] = [];
    page.on("request", (r) => { if (/\/spine\/3d\/|\/assets\/(host|scene|spine\.worker)-/.test(r.url())) fetched.push(r.url()); });
    await page.goto("/");
    await expect(page.locator(SEL.viewer)).toHaveAttribute("data-spine", "fallback", { timeout: 15_000 });
    await expect(page.locator(SEL.canvas)).toHaveCount(0);
    await expect(page.locator(`${SEL.layer} img`)).toHaveCount(0);
    expect(fetched, "Save-Data fetched 3D files").toEqual([]);
  });
});
