import { expect, test } from "./fixtures";
import { probeSeesHardware } from "./support/gpu";
import { answerAsAnanya, expectPlan, fillContact, sendContact } from "./support/questions";
import type { Locator, Page } from "@playwright/test";

/**
 * (C) W14-F part 2, W15-B: the plan's one 3D stage on Ananya's plan, against the production build with
 * /api/funnel/* mocked. Headless Chromium draws WebGL on SwiftShader. Built on the viewer's stable test ids
 * (spine-viewer, spine-canvas, spine-still) plus the stage's (spine-stage, data-stop, data-stage-screen).
 * Reduced motion: flights cut, so the camera settles at once and the checks don't wait on a 900 ms flight.
 */
const WEBGL = ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"];
const LIVE_TIMEOUT_MS = 30_000;
/**
 * SwiftShader runs the GPU in software: for a few seconds after the tour's viewer goes live, and after a camera cut,
 * the page gets 0.5-1.5 frames a second (W14-M probe), so scroll handling waits on frames. A real GPU settles at once
 * (worker-2's W14-L: tour INP 32 ms or less). Waits allow for the software renderer; they don't hide a wrong value.
 */
const SETTLE_TIMEOUT_MS = 20_000;
const FLOWING_FPS = 10;
/** Ananya's stops in scroll order (§5.8): Deals, Sales, Marketing, Back Office. */
const STOP_DISCS = ["G04", "G05", "G06", "G01"] as const;

test.use({ reducedMotion: "reduce", launchOptions: { args: WEBGL } });

async function toPlan(page: Page) {
  // W14-X: no viewer runs 3D on a software renderer, so the probe is told the GPU is real; the scene still draws on
  // SwiftShader underneath (spine3d-software.spec.ts covers what a software-GL visitor really gets).
  await probeSeesHardware(page);
  await page.goto("/");
  await answerAsAnanya(page);
  await fillContact(page);
  await sendContact(page);
  await expectPlan(page);
}

/** Waits until the page draws at least FLOWING_FPS frames a second again. */
async function framesFlowing(page: Page) {
  await expect.poll(() => page.evaluate(() => new Promise<number>((done) => {
    let frames = 0;
    const start = performance.now();
    const tick = () => {
      frames += 1;
      if (performance.now() - start < 500) requestAnimationFrame(tick);
      else done(frames * 2);
    };
    requestAnimationFrame(tick);
  })), { timeout: SETTLE_TIMEOUT_MS }).toBeGreaterThanOrEqual(FLOWING_FPS);
}

/** Puts a block's top at the middle line of the screen, where the tour reads the stop in view. */
async function scrollToDepth(page: Page, depth: number) {
  await page.locator(`[data-depth="${depth}"]`).evaluate((el) => {
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top - window.innerHeight / 2 + 40);
  });
}

async function liveStage(page: Page): Promise<Locator> {
  await scrollToDepth(page, 0);
  const stage = page.getByTestId("spine-stage");
  await expect(stage.getByTestId("spine-viewer")).toHaveAttribute("data-spine", "live", { timeout: LIVE_TIMEOUT_MS });
  await expect(stage.getByTestId("spine-canvas")).toBeVisible();
  await expect(stage.getByTestId("spine-still")).toBeHidden();
  await framesFlowing(page);
  return stage;
}

/** The middle of the lit discs' buttons, as a share of the screen's width: where the spine stands across it. */
async function spineAcross(page: Page, stage: Locator): Promise<number> {
  const boxes = await stage.locator("button[data-disc]").evaluateAll((buttons) =>
    buttons.map((b) => b.getBoundingClientRect()).filter((r) => r.width > 0).map((r) => r.left + r.width / 2));
  const width = page.viewportSize()!.width;
  return boxes.reduce((sum, x) => sum + x, 0) / boxes.length / width;
}

/**
 * What the stage's legend or a callout covers on the plan's text column (blocks 2 to 4) or the close's call to action,
 * as "legend/callout over depth N or the CTA". Empty when nothing on the stage sits on the words.
 */
async function overStageCovers(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const meet = (a: DOMRect, b: DOMRect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const onScreen = (r: DOMRect) => r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
    const words = [...document.querySelectorAll<HTMLElement>("[data-depth]")]
      .map((el) => ({ name: `depth ${el.dataset.depth}`, box: el.getBoundingClientRect() }));
    const cta = document.querySelector('[data-depth="5"] a');
    if (cta) words.push({ name: "the CTA", box: cta.getBoundingClientRect() });
    const marks = [...document.querySelectorAll<HTMLElement>("[data-testid=spine-stage] [data-legend], [data-testid=spine-stage] [data-callout]")]
      .map((el) => ({ name: el.dataset.callout ? `callout ${el.dataset.callout}` : "legend", box: el.getBoundingClientRect() }))
      .filter((m) => onScreen(m.box));
    return marks.flatMap((m) => words.filter((w) => onScreen(w.box) && meet(m.box, w.box)).map((w) => `${m.name} over ${w.name}`));
  });
}

/**
 * Whether the spine crosses the hero's words or stats while they show. The spine's left edge comes from where the stage
 * stands it (--spine-across, written on the scroll frame), less its silhouette's reach left of that point (0.12 of the
 * width, measured on the W15-B2 build: discs reach 0.05-0.08, the processes about 0.06 more). The disc boxes can't be
 * used: they update only when SwiftShader draws, seconds behind the scroll. The words' extent is their text's own box.
 */
async function spineCrossesHeroWords(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const REACH = 0.12;
    // The stage reads the scroll on its next frame, which SwiftShader can hold back for seconds: wait for it.
    const stage = document.querySelector<HTMLElement>("[data-testid=spine-stage]");
    if (stage?.dataset.scrolled !== String(Math.round(window.scrollY))) return "the stage hasn't framed this scroll yet";
    const screen = document.querySelector<HTMLElement>("[data-stage-screen]");
    const across = Number(screen?.style.getPropertyValue("--spine-across"));
    if (!screen || !Number.isFinite(across) || across === 0) return "no --spine-across yet";
    const width = screen.getBoundingClientRect().width;
    const spineLeft = (across - REACH) * width;
    const spineRight = (across + REACH) * width;
    const hero = document.querySelector<HTMLElement>("#plan-hero-title")!.closest("section")!;
    const stats = document.querySelector<HTMLElement>("[data-testid=spine-stage] ~ div")!;
    const need = document.querySelector<HTMLElement>('[data-depth="0"]')!;
    // The hero's words are left of the spine, block 2's right of it.
    const parts: [HTMLElement, (box: DOMRect) => boolean][] = [
      [hero, (box) => box.right >= spineLeft], [stats, (box) => box.right >= spineLeft], [need, (box) => box.left <= spineRight],
    ];
    const crossed = parts.flatMap(([part, meets]) => {
      const style = getComputedStyle(part);
      if (style.visibility === "hidden" || Number(style.opacity) <= 0.01) return [];
      // Each text node's own line boxes: an element's box spans its whole column, not its words.
      const walker = document.createTreeWalker(part, NodeFilter.SHOW_TEXT);
      const hits: string[] = [];
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent?.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const box of range.getClientRects()) {
          const shows = box.width > 0 && box.bottom > 0 && box.top < window.innerHeight;
          if (shows && meets(box)) hits.push(`"${node.textContent.trim().slice(0, 20)}" (${Math.round(box.left)}-${Math.round(box.right)})`);
        }
      }
      return hits;
    });
    return crossed.length ? `the spine (${Math.round(spineLeft)}-${Math.round(spineRight)}) crosses ${crossed.join(", ")}` : null;
  });
}

test.describe("the plan's one 3D stage (W15-B)", () => {
  test("never sweeps the spine across the hero's words and stats or block 2's on its way left (W15-B3)", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "on a phone the band sits between the hero's words and the text");
    // The sweep only happens with motion: under reduced motion the stage cuts from the hero to block 2.
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await toPlan(page);
    await liveStage(page);
    const end = await page.locator('[data-depth="5"]').evaluate((el) =>
      el.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2);
    for (let pct = 0; pct <= 20; pct += 2) {
      await page.evaluate((y) => window.scrollTo(0, y), Math.round((end * pct) / 100));
      await expect.poll(() => spineCrossesHeroWords(page), { timeout: SETTLE_TIMEOUT_MS, message: `at ${pct} % of the path` }).toBeNull();
    }
  });

  test("keeps the legend and the callouts off the text column and the close's call to action (W15-B2)", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "on a phone the legend and callouts sit inside the band, above the text");
    await toPlan(page);
    await liveStage(page);
    const end = await page.locator('[data-depth="5"]').evaluate((el) =>
      el.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2);
    for (const pct of [25, 50, 75, 100]) {
      await page.evaluate((y) => window.scrollTo(0, y), Math.round((end * pct) / 100));
      await expect.poll(() => overStageCovers(page), { timeout: SETTLE_TIMEOUT_MS, message: `at ${pct} % of the path` }).toEqual([]);
    }
  });

  test("keeps one viewer and one canvas from the hero to the close", async ({ page }) => {
    await toPlan(page);
    await expect(page.getByTestId("spine-viewer")).toHaveCount(1);
    await liveStage(page);
    for (const depth of [1, 2, 3, 4, 5]) {
      await scrollToDepth(page, depth);
      await expect(page.getByTestId("spine-viewer")).toHaveCount(1);
      await expect(page.locator("canvas")).toHaveCount(1);
    }
  });

  test("moves the spine from the right of the hero to the left as block 2 arrives, on desktop", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "the phone's band keeps the spine in its middle");
    await toPlan(page);
    const stage = await liveStage(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => spineAcross(page, stage), { timeout: SETTLE_TIMEOUT_MS }).toBeGreaterThan(0.6);
    await scrollToDepth(page, 0);
    await expect.poll(() => spineAcross(page, stage), { timeout: SETTLE_TIMEOUT_MS }).toBeLessThan(0.4);
  });

  test("keeps its stage stuck under the site's bar while the stops scroll by", async ({ page }) => {
    await toPlan(page);
    const stage = (await liveStage(page)).locator("[data-stage-screen]");
    const navHeight = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 84);
    await scrollToDepth(page, 1);
    const first = (await stage.boundingBox())!;
    await scrollToDepth(page, 3);
    const later = (await stage.boundingBox())!;
    expect(Math.abs(first.y - navHeight)).toBeLessThanOrEqual(2);
    expect(Math.abs(later.y - first.y)).toBeLessThanOrEqual(1);
  });

  test("flies to each stop's disc and back to the full spine above the stops", async ({ page }) => {
    await toPlan(page);
    const stage = await liveStage(page);
    await expect(stage).toHaveAttribute("data-stop", "overview");
    for (const [i, disc] of STOP_DISCS.entries()) {
      await scrollToDepth(page, i + 1);
      await expect(stage).toHaveAttribute("data-stop", disc, { timeout: SETTLE_TIMEOUT_MS });
    }
    await scrollToDepth(page, 0);
    await expect(stage).toHaveAttribute("data-stop", "overview", { timeout: SETTLE_TIMEOUT_MS });
  });

  test("pins the in-focus disc's callout with its names (§6.7)", async ({ page }) => {
    await toPlan(page);
    const stage = await liveStage(page);
    await scrollToDepth(page, 1);
    await expect(stage).toHaveAttribute("data-stop", "G04", { timeout: SETTLE_TIMEOUT_MS });
    const deals = stage.locator('[data-callout="G04"]');
    await expect(deals).toBeVisible({ timeout: SETTLE_TIMEOUT_MS });
    await expect(deals).toContainText("Deals · 3 of 5", { timeout: SETTLE_TIMEOUT_MS });
    await expect(deals).toContainText("Enquiry responder", { timeout: SETTLE_TIMEOUT_MS });
  });

  test("opens a disc's panel from the keyboard and gives focus back on Escape (§6.2)", async ({ page }) => {
    await toPlan(page);
    const stage = await liveStage(page);
    const buttons = stage.locator("button[data-disc]");
    await expect(buttons).toHaveCount(7);
    const deals = stage.locator('button[data-disc="G04"]');
    await expect(deals).toHaveAttribute("aria-label", /^Deals: you need 3 of its \d+ agents today\.$/);
    await deals.focus();
    const panel = stage.getByRole("dialog");
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("heading")).toContainText("Deals");
    await page.keyboard.press("Enter");
    await expect(panel).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
    await expect(deals).toBeFocused();
  });

  test("names the lit and quiet discs in its legend", async ({ page }) => {
    await toPlan(page);
    const stage = await liveStage(page);
    await expect(stage.locator("[data-legend]")).toContainText("Lit");
    await expect(stage.locator("[data-legend]")).toContainText("Quiet");
  });
});
