import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { answerTeam, at, toTeamQuestion } from "./helpers/flow";
import { probeSeesHardware, SWIFTSHADER } from "./support/gpu";

/**
 * §12 as amended in W14-R: no r17 still or any other /spine/ file before S5. The one exemption is the live mesh
 * (/spine/3d/m1/*) on S0, and only when it is asked for after the first paint, never on Save-Data, a slow connection
 * or a software renderer. CI draws on SwiftShader, where S0 has no 3D, so the exemption's own check runs with S0's
 * probe told the GPU is real (W14-W).
 */
const LIVE_MESH = /^\/spine\/3d\/m1\//;
// WebGL on SwiftShader, as CI has it: S0's 3D then settles the way §6.6 says for a software renderer.
test.use({ launchOptions: { args: SWIFTSHADER } });
const S0_VIEWER = "[data-testid=landing-spine] [data-testid=spine-viewer]";

interface SpineLog {
  /** Every /spine/ path asked for, in order. */
  paths: string[];
  /** When each live-mesh request and the first paint happened, on this process's clock. */
  meshAt: number[];
  paintAt: () => number | null;
}

async function spineRequests(page: Page): Promise<SpineLog> {
  const log = { paths: [] as string[], meshAt: [] as number[], paint: null as number | null };
  await page.exposeFunction("__firstPaint", () => void (log.paint ??= Date.now()));
  await page.addInitScript(() => {
    new PerformanceObserver(() => (window as unknown as { __firstPaint(): void }).__firstPaint()).observe({ type: "paint", buffered: true });
  });
  page.on("request", (r) => {
    const { pathname } = new URL(r.url());
    if (!pathname.startsWith("/spine/")) return;
    log.paths.push(pathname);
    if (LIVE_MESH.test(pathname)) log.meshAt.push(Date.now());
  });
  return { paths: log.paths, meshAt: log.meshAt, paintAt: () => log.paint };
}

/** The r17 stills and every other /spine/ file: what §12 still holds back until S5. */
const held = (paths: readonly string[]) => paths.filter((p) => !LIVE_MESH.test(p));

function expectNothingBeforeS5But(log: SpineLog) {
  expect(held(log.paths), "nothing under /spine/ before S5 but S0's live mesh (§12)").toEqual([]);
  const paint = log.paintAt();
  for (const at of log.meshAt) {
    expect(paint, "the live mesh only after the first paint (§12)").not.toBeNull();
    expect(at, "the live mesh only after the first paint (§12)").toBeGreaterThan(paint!);
  }
}

async function reachS5(page: Page, time: string) {
  await page.clock.setFixedTime(at(time));
  const log = await spineRequests(page);
  await page.goto("/");
  await toTeamQuestion(page);
  expectNothingBeforeS5But(log);
  await answerTeam(page);
  await expect.poll(() => held(log.paths).length).toBeGreaterThan(0);
  return held(log.paths);
}

/** Navigator.connection as a browser on Save-Data, or on a slow connection, reports it. */
async function connection(page: Page, value: { saveData: boolean; effectiveType: string }) {
  await page.addInitScript((c) => {
    Object.defineProperty(Navigator.prototype, "connection", {
      configurable: true,
      get: () => ({ ...c, addEventListener() {}, removeEventListener() {} }),
    });
  }, value);
}

test("a visitor who stays on S0 gets the live mesh only after the first paint, and nothing else before S5 (§12)", async ({ page }) => {
  const log = await spineRequests(page);
  await page.goto("/");
  // S0's 3D settles one way or the other: live on a real GPU, nothing on a software renderer (W14-R).
  await expect(page.locator(S0_VIEWER)).toHaveAttribute("data-spine", /live|fallback/, { timeout: 30_000 });
  await toTeamQuestion(page);
  expectNothingBeforeS5But(log);
});

test.describe("with S0's probe told the GPU is real (W14-W)", () => {
  test("S0 asks for its live mesh only after the first paint, and nothing else under /spine/ before S5 (§12)", async ({ page }) => {
    await probeSeesHardware(page);
    const log = await spineRequests(page);
    await page.goto("/");
    await expect(page.locator(S0_VIEWER)).toHaveAttribute("data-spine", "live", { timeout: 60_000 });
    expect(log.meshAt.length, "S0 went live without asking for its mesh").toBeGreaterThan(0);
    await toTeamQuestion(page);
    expectNothingBeforeS5But(log);
  });
});

for (const [name, value, reason] of [
  ["on Save-Data", { saveData: true, effectiveType: "4g" }, "save-data"],
  ["on a slow connection", { saveData: false, effectiveType: "3g" }, "slow-connection"],
] as const) {
  test(`${name}, nothing under /spine/ before S5, not even the live mesh (§12)`, async ({ page }) => {
    await connection(page, value);
    const log = await spineRequests(page);
    await page.goto("/");
    await expect(page.locator(S0_VIEWER)).toHaveAttribute("data-spine-reason", reason);
    await toTeamQuestion(page);
    expect(log.paths, "nothing under /spine/ before S5 (§12)").toEqual([]);
  });
}

test("a light visit (10:00) fetches only light files, from S5 on (§6.6, §12)", async ({ page }) => {
  const paths = await reachS5(page, "10:00");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(paths.every((p) => p.startsWith("/spine/r17/light/hero/"))).toBe(true);
});

test("a dark visit (22:00) fetches only dark files", async ({ page }) => {
  const paths = await reachS5(page, "22:00");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(paths.every((p) => p.startsWith("/spine/r17/dark/hero/"))).toBe(true);
});

test.describe("a device set to dark", () => {
  test.use({ colorScheme: "dark" });
  test("is dark at 10:00 and fetches only dark files (D9)", async ({ page }) => {
    const paths = await reachS5(page, "10:00");
    expect(paths.every((p) => p.startsWith("/spine/r17/dark/hero/"))).toBe(true);
  });
});

test("a 390 × 844 phone at 3× picks phone-1170.avif (§12)", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone");
  expect(await reachS5(page, "10:00")).toContain("/spine/r17/light/hero/phone-1170.avif");
});

test.describe("a 1200-wide window at 2×", () => {
  test.use({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 2 });
  test("picks hero-2560.avif (§12)", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop");
    expect(await reachS5(page, "10:00")).toContain("/spine/r17/light/hero/hero-2560.avif");
  });
});
