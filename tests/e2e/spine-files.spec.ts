import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { answerTeam, at, toTeamQuestion } from "./helpers/flow";
import { probeSeesHardware, SWIFTSHADER } from "./support/gpu";
import { DRACO_FILES } from "../../src/features/funnel/spine3d/mesh-urls";

/**
 * §12 as amended in W14-R: no hero still or any other /spine/ file before S5. The one exemption is the live mesh,
 * only after the first paint, never on Save-Data, a slow connection or a software renderer.
 * W15-M6: the plan's mesh (the big spine, PLAN_MESHES; W17-S dropped the close-up) is downloaded during the questions on a real
 * GPU, so the plan's 3D does not wait on them. W16-B: S0 has no spine any more, so they are the exemption's only use.
 */
const LIVE_MESH = /^\/spine\/3d\/m5c\//;  // W23-B's m5c (m5b's geometry in Draco); W17-S dropped the close-up
/** W23-B, W23-B2 (review-w23b M1): the exemption's files, the live mesh and exactly the Draco decoder's files
 *  warmed with it; anything else in the decoder's folder is held like any other /spine/ file. */
const isWarm = (path: string) => LIVE_MESH.test(path) || DRACO_FILES.includes(path);
// WebGL on SwiftShader, as CI has it: no 3D and no warm mesh on a software renderer (§6.6).
test.use({ launchOptions: { args: SWIFTSHADER } });

interface SpineLog {
  /** Every /spine/ path asked for, in order. */
  paths: string[];
  /** When each live-mesh request happened, on this process's clock. */
  meshAt: number[];
  /** When each warm request (the mesh and the decoder's files) happened, on the same clock (W23-B2). */
  warmAt: number[];
  paintAt: () => number | null;
}

async function spineRequests(page: Page): Promise<SpineLog> {
  const log = { paths: [] as string[], meshAt: [] as number[], warmAt: [] as number[], paint: null as number | null };
  await page.exposeFunction("__firstPaint", () => void (log.paint ??= Date.now()));
  await page.addInitScript(() => {
    new PerformanceObserver(() => (window as unknown as { __firstPaint(): void }).__firstPaint()).observe({ type: "paint", buffered: true });
  });
  page.on("request", (r) => {
    const { pathname } = new URL(r.url());
    if (!pathname.startsWith("/spine/")) return;
    log.paths.push(pathname);
    if (LIVE_MESH.test(pathname)) log.meshAt.push(Date.now());
    if (isWarm(pathname)) log.warmAt.push(Date.now());
  });
  return { paths: log.paths, meshAt: log.meshAt, warmAt: log.warmAt, paintAt: () => log.paint };
}

/** The hero stills and every other /spine/ file: what §12 still holds back until S5. */
const held = (paths: readonly string[]) => paths.filter((p) => !isWarm(p));

function expectNothingBeforeS5But(log: SpineLog) {
  expect(held(log.paths), "nothing under /spine/ before S5 but the plan's warm mesh (§12)").toEqual([]);
  const paint = log.paintAt();
  for (const at of log.warmAt) {
    expect(paint, "the live mesh and its decoder only after the first paint (§12)").not.toBeNull();
    expect(at, "the live mesh and its decoder only after the first paint (§12)").toBeGreaterThan(paint!);
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
    // W23-B2 (review-w23b M1): the Draco decoder's files, each asked for once, and nothing else of its folder.
    for (const file of DRACO_FILES) expect(log.paths.filter((path) => path === file), file).toHaveLength(1);
    expect(log.paths.filter((path) => path.startsWith("/spine/3d/draco-r186/") && !DRACO_FILES.includes(path))).toEqual([]);
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
  expect(paths.every((p) => p.startsWith("/spine/r22/light/hero/"))).toBe(true);
});

test("a dark visit (22:00) fetches only dark files", async ({ page }) => {
  const paths = await reachS5(page, "22:00");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(paths.every((p) => p.startsWith("/spine/r22/dark/hero/"))).toBe(true);
});

test.describe("a visitor who chose dark with the header toggle", () => {
  test("is dark at 10:00 and fetches only dark files (D9, W15-A)", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("ziiro-theme", "dark"));
    const paths = await reachS5(page, "10:00");
    expect(paths.every((p) => p.startsWith("/spine/r22/dark/hero/"))).toBe(true);
  });
});

test("a 390 × 844 phone at 3× picks phone-585.avif, the 3D's own 1.5× (§12, W18-C)", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone");
  expect(await reachS5(page, "10:00")).toContain("/spine/r22/light/hero/phone-585.avif");
});

test.describe("a 1200-wide window at 2×", () => {
  test.use({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 2 });
  test("picks hero-2880.avif (§12, W18-C)", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop");
    expect(await reachS5(page, "10:00")).toContain("/spine/r22/light/hero/hero-2880.avif");
  });
});
