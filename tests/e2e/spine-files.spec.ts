import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { answerTeam, at, toTeamQuestion } from "./helpers/flow";
import { probeSeesHardware, SWIFTSHADER } from "./support/gpu";

/**
 * §12 as amended in W14-R: no hero still or any other /spine/ file before S5. The one exemption is the live mesh,
 * only after the first paint, never on Save-Data, a slow connection or a software renderer.
 * W15-M6: the plan's mesh (the big spine, PLAN_MESHES; W17-S dropped the close-up) is downloaded during the questions on a real
 * GPU, so the plan's 3D does not wait on them. W16-B: S0 has no spine any more, so they are the exemption's only use.
 */
const LIVE_MESH = /^\/spine\/3d\/m4\//;  // W17-M's m4; W17-S dropped the close-up
// WebGL on SwiftShader, as CI has it: no 3D and no warm mesh on a software renderer (§6.6).
test.use({ launchOptions: { args: SWIFTSHADER } });

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

/** The hero stills and every other /spine/ file: what §12 still holds back until S5. */
const held = (paths: readonly string[]) => paths.filter((p) => !LIVE_MESH.test(p));

function expectNothingBeforeS5But(log: SpineLog) {
  expect(held(log.paths), "nothing under /spine/ before S5 but the plan's warm mesh (§12)").toEqual([]);
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

test("a visitor on the questions gets nothing under /spine/ before S5 on a software renderer (§12, W16-B)", async ({ page }) => {
  const log = await spineRequests(page);
  await page.goto("/");
  await toTeamQuestion(page);
  expect(log.paths, "nothing under /spine/ before S5 (§12)").toEqual([]);
});

test.describe("with the probe told the GPU is real (W14-W, W15-M6)", () => {
  test("the plan's mesh warms during the questions, only after the first paint, and nothing else under /spine/ before S5 (§12)", async ({ page }) => {
    await probeSeesHardware(page);
    const log = await spineRequests(page);
    await page.goto("/");
    await toTeamQuestion(page);
    await expect.poll(() => log.meshAt.length, { timeout: 30_000 }).toBeGreaterThan(0);
    expectNothingBeforeS5But(log);
    // W17-S: the big spine is the plan's only model; a close-up would have followed it.
    await page.waitForTimeout(2_000);
    expect(log.paths.filter((path) => path.includes("/closeup")), "no close-up warmed (W17-S)").toEqual([]);
    expect(log.meshAt).toHaveLength(1);
  });
});

for (const [name, value] of [
  ["on Save-Data", { saveData: true, effectiveType: "4g" }],
  ["on a slow connection", { saveData: false, effectiveType: "3g" }],
] as const) {
  test(`${name}, nothing under /spine/ before S5, not even the warm mesh (§12)`, async ({ page }) => {
    await probeSeesHardware(page);
    await connection(page, value);
    const log = await spineRequests(page);
    await page.goto("/");
    await toTeamQuestion(page);
    await page.waitForTimeout(1_000);  // the warm, were it allowed, would be under way by now
    expect(log.paths, "nothing under /spine/ before S5 (§12)").toEqual([]);
  });
}

test("a light visit (10:00) fetches only light files, from S5 on (§6.6, §12)", async ({ page }) => {
  const paths = await reachS5(page, "10:00");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(paths.every((p) => p.startsWith("/spine/r18/light/hero/"))).toBe(true);
});

test("a dark visit (22:00) fetches only dark files", async ({ page }) => {
  const paths = await reachS5(page, "22:00");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(paths.every((p) => p.startsWith("/spine/r18/dark/hero/"))).toBe(true);
});

test.describe("a visitor who chose dark with the header toggle", () => {
  test("is dark at 10:00 and fetches only dark files (D9, W15-A)", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("ziiro-theme", "dark"));
    const paths = await reachS5(page, "10:00");
    expect(paths.every((p) => p.startsWith("/spine/r18/dark/hero/"))).toBe(true);
  });
});

test("a 390 × 844 phone at 3× picks phone-585.avif, the 3D's own 1.5× (§12, W18-C)", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone");
  expect(await reachS5(page, "10:00")).toContain("/spine/r18/light/hero/phone-585.avif");
});

test.describe("a 1200-wide window at 2×", () => {
  test.use({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 2 });
  test("picks hero-2880.avif (§12, W18-C)", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop");
    expect(await reachS5(page, "10:00")).toContain("/spine/r18/light/hero/hero-2880.avif");
  });
});
