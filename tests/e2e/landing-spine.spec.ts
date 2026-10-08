import { expect, test } from "./fixtures";
import type { Page } from "@playwright/test";

/**
 * (C) W14-I: the live spine on S0, against the production build with /api/funnel/* mocked. Headless Chromium draws
 * WebGL on SwiftShader, where S0 has no 3D at all since W14-R (it stands in for a low-end phone's software GL). The
 * tests that need S0 live run on a real GPU, by hand: LANDING_GPU=metal with-render-lock npx playwright test
 * tests/e2e/landing-spine.spec.ts. The speed gates (LCP, INP of the first S1 tap, long tasks) are in
 * landing-spine-gates.spec.ts.
 */
const GPU = process.env.LANDING_GPU === "metal";
const ARGS = GPU
  ? ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"]
  : ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"];
const NEEDS_GPU = "S0 has no 3D on a software renderer (W14-R): run with LANDING_GPU=metal";
const NEEDS_SOFTWARE = "a software renderer's case: run without LANDING_GPU";
const LIVE_TIMEOUT_MS = 30_000;
/** LandingSpineSlot's SPINE_FADE_MS, plus a margin. */
const GONE_MS = 1_500;
const FIRST_OPTION = "I run a business";

const SEL = {
  layer: "[data-testid=landing-spine]",
  viewer: "[data-testid=landing-spine] [data-testid=spine-viewer]",
  canvas: "[data-testid=landing-spine] [data-testid=spine-canvas]",
} as const;

test.use({ launchOptions: { args: ARGS } });

/** S0's 3D settles: live on a real GPU, nothing on a software renderer. */
const SETTLED = GPU ? "live" : "fallback";

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
    test.skip(!GPU, NEEDS_GPU);
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
