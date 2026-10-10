import { expect, test } from "./fixtures";
import { PROBE_WORKER, probeSeesHardware } from "./support/gpu";
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

/** Puts a block's top just past the stage's reading line, where it reads the stop in view: the middle of the screen
 *  on desktop; on a phone a third of the way down the space under the stuck band (PlanStage's readingSpace). */
async function scrollToDepth(page: Page, depth: number) {
  await page.locator(`[data-depth="${depth}"]`).evaluate((el) => {
    const top = el.getBoundingClientRect().top + window.scrollY;
    const band = document.querySelector<HTMLElement>("[data-testid=spine-stage]");
    const stuck = band && window.innerWidth < 1024 ? Number.parseFloat(getComputedStyle(band).top) + band.offsetHeight : 0;
    const line = stuck ? stuck + (window.innerHeight - stuck) / 3 : window.innerHeight / 2;
    window.scrollTo(0, top - line + 40);
  });
}

/** Back at the hero, where the full spine and its overlay show (W17-S: a zoomed department stop hides them). */
async function toHero(page: Page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => page.evaluate(() =>
    document.querySelector<HTMLElement>("[data-testid=spine-stage]")!.dataset.scrolled === "0"), { timeout: SETTLE_TIMEOUT_MS }).toBe(true);
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
    // W16-A, W17-S: at a zoomed stop the overlay is hidden (visibility) and the legend faded out: those cover nothing.
    const shown = (el: HTMLElement) => getComputedStyle(el).visibility !== "hidden" && Number(getComputedStyle(el).opacity) > 0.01;
    const marks = [...document.querySelectorAll<HTMLElement>("[data-testid=spine-stage] [data-legend], [data-testid=spine-stage] [data-callout]")]
      .filter(shown)
      .map((el) => ({ name: el.dataset.callout ? `callout ${el.dataset.callout}` : "legend", box: el.getBoundingClientRect() }))
      .filter((m) => onScreen(m.box));
    return marks.flatMap((m) => words.filter((w) => onScreen(w.box) && meet(m.box, w.box)).map((w) => `${m.name} over ${w.name}`));
  });
}

/**
 * Whether the spine, or the legend under it, crosses the hero's words or stats or block 2's while they show. The
 * spine's left edge comes from where the stage stands it (--spine-across, written on the scroll frame), less its
 * silhouette's reach left of that point (0.12 of the width, measured on the W15-B2 build: discs reach 0.05-0.08, the
 * processes about 0.06 more). The disc boxes can't be used: they update only when SwiftShader draws, seconds behind the
 * scroll. The words' extent is their text's own box. The legend counts while it shows at all (W15-B4 M1).
 */
async function stageCrossesWords(page: Page): Promise<string | null> {
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
    // W16-H: the hero's words column holds its stats too; its scroll cue sits at the bottom right, past the spine.
    const hero = document.querySelector<HTMLElement>("#plan-hero-title")!.parentElement!;
    const need = document.querySelector<HTMLElement>('[data-depth="0"]')!;
    // The hero's words are left of the spine, block 2's right of it.
    const parts: [HTMLElement, (box: DOMRect) => boolean][] = [
      [hero, (box) => box.right >= spineLeft], [need, (box) => box.left <= spineRight],
    ];
    const legend = screen.querySelector<HTMLElement>("[data-legend]");
    const legendBox = legend && Number(getComputedStyle(legend).opacity) > 0.01 ? legend.getBoundingClientRect() : null;
    const underLegend = (box: DOMRect) =>
      !!legendBox && legendBox.left < box.right && box.left < legendBox.right && legendBox.top < box.bottom && box.top < legendBox.bottom;
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
          const words = `"${node.textContent.trim().slice(0, 20)}" (${Math.round(box.left)}-${Math.round(box.right)})`;
          if (shows && meets(box)) hits.push(words);
          if (shows && underLegend(box)) hits.push(`under the legend: ${words}`);
        }
      }
      return hits;
    });
    return crossed.length ? `the spine (${Math.round(spineLeft)}-${Math.round(spineRight)}) crosses ${crossed.join(", ")}` : null;
  });
}

test.describe("the plan's one 3D stage (W15-B)", () => {
  for (const motion of ["no-preference", "reduce"] as const) {
    test(`never sweeps the spine or its legend across the hero's words and stats or block 2's on its way left, motion ${motion} (W15-B3, W15-B4 M1/M3)`, async ({ page }, info) => {
      test.skip(info.project.name !== "desktop", "on a phone the band sits between the hero's words and the text");
      // With motion the spine sweeps left; under reduced motion it cuts, now at the start of the travel (M3).
      await page.emulateMedia({ reducedMotion: motion });
      await toPlan(page);
      await liveStage(page);
      const end = await page.locator('[data-depth="5"]').evaluate((el) =>
        el.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2);
      // Every 2 % of the path to 20 %, and worker-2's legend probe at y 275-290 (M1).
      const at = [...Array.from({ length: 11 }, (_, i) => ({ y: Math.round((end * i * 2) / 100), name: `${i * 2} %` })),
        ...[275, 282, 290].map((y) => ({ y, name: `y ${y}` }))];
      for (const { y, name } of at) {
        await page.evaluate((top) => window.scrollTo(0, top), y);
        await expect.poll(() => stageCrossesWords(page), { timeout: SETTLE_TIMEOUT_MS, message: `at ${name}` }).toBeNull();
      }
    });
  }

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

  test("under reduced motion, cuts as block 2's travel starts, so its words show as they rise (W15-B4 M3)", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "the phone's band keeps the spine in its middle");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await toPlan(page);
    await liveStage(page);
    // Block 2's top at 60 % of the screen: inside its travel (from the screen's bottom to its middle line).
    await page.locator('[data-depth="0"]').evaluate((el) =>
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.6));
    await expect.poll(() => page.evaluate(() =>
      document.querySelector<HTMLElement>("[data-testid=spine-stage]")!.dataset.scrolled === String(Math.round(window.scrollY))),
    { timeout: SETTLE_TIMEOUT_MS }).toBe(true);
    await expect.poll(() => page.locator('[data-depth="0"]').evaluate((el) => Number(getComputedStyle(el).opacity)),
      { timeout: SETTLE_TIMEOUT_MS }).toBeGreaterThanOrEqual(0.99);
    await expect.poll(() => stageCrossesWords(page), { timeout: SETTLE_TIMEOUT_MS }).toBeNull();
  });

  // worker-2's H1 shapes: the review's 1440 x 900 and the owner's 1686 x 948 at 2x.
  for (const shape of [{ name: "1440", use: {} }, { name: "1686 @2", use: { viewport: { width: 1686, height: 948 }, deviceScaleFactor: 2 } }]) {
    test.describe(`at ${shape.name}`, () => {
      test.use(shape.use);
      test("opens the hero's disc panel on the spine's side, clear of the hero's words and buttons (W15-B4 H1)", async ({ page }, info) => {
        test.skip(info.project.name !== "desktop", "a phone's panel opens under the band");
        await toPlan(page);
        const stage = await liveStage(page);
        await page.evaluate(() => window.scrollTo(0, 0));
        await expect.poll(() => stageCrossesWords(page), { timeout: SETTLE_TIMEOUT_MS }).toBeNull();
        await expect.poll(() => spineAcross(page, stage), { timeout: SETTLE_TIMEOUT_MS }).toBeGreaterThan(0.6);
        await stage.locator('button[data-disc="G04"]').focus();
        const panel = stage.locator('[role=dialog][data-disc="G04"]');
        await expect(panel).toBeVisible();
        const covered = await panel.evaluate((dialog) => {
          // What shows of the panel: its box, cut to every scrolling ancestor (the dock is max-h 70 %, overflow-auto,
          // so a long list runs on below what the visitor sees).
          const box = dialog.getBoundingClientRect();
          const p = { left: box.left, top: box.top, right: box.right, bottom: box.bottom };
          for (let el = dialog.parentElement; el; el = el.parentElement) {
            if (getComputedStyle(el).overflowY === "visible") continue;
            const c = el.getBoundingClientRect();
            p.left = Math.max(p.left, c.left);
            p.top = Math.max(p.top, c.top);
            p.right = Math.min(p.right, c.right);
            p.bottom = Math.min(p.bottom, c.bottom);
          }
          // The whole hero: its words, its stats and its scroll cue (W16-H).
          const hero = document.querySelector<HTMLElement>("#plan-hero-title")!.closest("section")!;
          const hits: string[] = [];
          for (const part of [hero]) {
            const walker = document.createTreeWalker(part, NodeFilter.SHOW_TEXT);
            for (let node = walker.nextNode(); node; node = walker.nextNode()) {
              if (!node.textContent?.trim()) continue;
              const range = document.createRange();
              range.selectNodeContents(node);
              for (const b of range.getClientRects()) {
                if (b.width > 0 && b.left < p.right && p.left < b.right && b.top < p.bottom && p.top < b.bottom) hits.push(node.textContent.trim().slice(0, 24));
              }
            }
          }
          return hits;
        });
        expect(covered, "hero words or buttons over the panel").toEqual([]);
      });

      test("shows the whole panel's frame above the legend, and scrolls its list inside it (W16-R M2)", async ({ page }, info) => {
        test.skip(info.project.name !== "desktop", "a phone's panel opens under the band");
        await toPlan(page);
        const stage = await liveStage(page);
        await page.evaluate(() => window.scrollTo(0, 0));
        await expect.poll(() => stageCrossesWords(page), { timeout: SETTLE_TIMEOUT_MS }).toBeNull();
        await expect.poll(() => spineAcross(page, stage), { timeout: SETTLE_TIMEOUT_MS }).toBeGreaterThan(0.6);
        // Deals has three agents: its list is taller than the room the dock has.
        await stage.locator('button[data-disc="G04"]').focus();
        const panel = stage.locator('[role=dialog][data-disc="G04"]');
        await expect(panel).toBeVisible();
        const fit = await panel.evaluate((dialog) => {
          const box = dialog.getBoundingClientRect();
          let clippedBy = 0;
          for (let el = dialog.parentElement; el; el = el.parentElement) {
            if (getComputedStyle(el).overflowY === "visible") continue;
            clippedBy = Math.max(clippedBy, box.bottom - el.getBoundingClientRect().bottom);
          }
          const legend = document.querySelector<HTMLElement>("[data-testid=spine-stage] [data-legend]")?.getBoundingClientRect();
          return {
            clippedBy: Math.round(clippedBy),
            belowView: Math.round(box.bottom - innerHeight),
            overLegend: legend && legend.left < box.right && box.left < legend.right ? Math.round(box.bottom - legend.top) : 0,
            scrolls: dialog.scrollHeight > dialog.clientHeight + 1,
          };
        });
        expect(fit.clippedBy, "px of the panel's frame cut off by a scrolling dock").toBeLessThanOrEqual(0);
        expect(fit.belowView, "px of the panel below the window").toBeLessThanOrEqual(0);
        expect(fit.overLegend, "px of the panel over the legend").toBeLessThanOrEqual(0);
        expect(fit.scrolls, "the long list scrolls inside the panel").toBe(true);
      });
    });
  }

  test("asks the renderer probe once per visit: the questions' prefetch and the plan's viewer share it (W16-R L2)", async ({ page }) => {
    const probes: string[] = [];
    page.on("worker", (worker) => {
      if (PROBE_WORKER.test(worker.url())) probes.push(worker.url());
    });
    await toPlan(page);
    await liveStage(page);
    await scrollToDepth(page, 2);
    expect(probes, "gl-probe workers started").toHaveLength(1);
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

  test("pins the lit discs' callouts with their names on the full spine, and hides them at a zoomed stop (§6.7, W17-S)", async ({ page }) => {
    await toPlan(page);
    const stage = await liveStage(page);
    await toHero(page);
    const deals = stage.locator('[data-callout="G04"]');
    await expect(deals).toBeVisible({ timeout: SETTLE_TIMEOUT_MS });
    await expect(deals).toContainText("Deals · 3 of 5", { timeout: SETTLE_TIMEOUT_MS });
    await expect(deals).toContainText("Enquiry responder", { timeout: SETTLE_TIMEOUT_MS });
    await scrollToDepth(page, 1);
    await expect(stage).toHaveAttribute("data-stop", "G04", { timeout: SETTLE_TIMEOUT_MS });
    await expect(deals).toBeHidden({ timeout: SETTLE_TIMEOUT_MS });
  });

  test("puts each department's words on the side the zoomed spine isn't on: right, left, right... (W16-A, W17-S)", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "on a phone the text sits below the band");
    await toPlan(page);
    await liveStage(page);
    const width = await page.evaluate(() => window.innerWidth);
    for (const [i, side] of (["right", "left", "right", "left"] as const).entries()) {
      await scrollToDepth(page, i + 1);
      const section = page.locator(`[data-depth="${i + 1}"]`);
      await expect(section).toHaveAttribute("data-side", side);
      const box = (await section.boundingBox())!;
      if (side === "right") expect(box.x).toBeGreaterThanOrEqual(width / 2);
      else expect(box.x + box.width).toBeLessThanOrEqual(width / 2);
      // The zoomed spine stands on the other half, and the words show once it is there.
      await expect.poll(() => page.evaluate((wordsRight) => {
        const across = Number(document.querySelector<HTMLElement>("[data-stage-screen]")!.style.getPropertyValue("--spine-across"));
        return wordsRight ? across < 0.4 : across > 0.6;
      }, side === "right"), { timeout: SETTLE_TIMEOUT_MS }).toBe(true);
      await expect.poll(() => section.evaluate((el) => Number(getComputedStyle(el).opacity)), { timeout: SETTLE_TIMEOUT_MS }).toBeGreaterThanOrEqual(0.99);
    }
  });

  test("lets every disc answer the pointer at the close: no faded words sit over the stage (W16-R M1)", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "from 1024 px the words lie over the stage");
    await toPlan(page);
    const stage = await liveStage(page);
    await scrollToDepth(page, 5);
    await expect(stage).toHaveAttribute("data-stop", "overview", { timeout: SETTLE_TIMEOUT_MS });
    await expect.poll(() => page.evaluate(() =>
      Number(document.querySelector<HTMLElement>("[data-stage-screen]")!.style.getPropertyValue("--spine-across"))),
    { timeout: SETTLE_TIMEOUT_MS }).toBeLessThan(0.3);
    await framesFlowing(page);
    const buttons = stage.locator("button[data-disc]");
    await expect(buttons).toHaveCount(7);
    // At each disc's middle the pointer reaches the stage (its canvas picks the disc, or the disc's own button), never
    // a faded section or one of its cards (W16-R found the last department's words there). Polled: on a slow renderer
    // the discs' boxes trail the scroll by a few frames.
    await expect.poll(() => buttons.evaluateAll((list) => list.flatMap((button) => {
      const r = button.getBoundingClientRect();
      if (r.width === 0 || r.bottom < 0 || r.top > window.innerHeight) return [];
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      const section = hit?.closest<HTMLElement>("[data-depth]");
      const onStage = hit?.closest("[data-testid=spine-stage]");
      return onStage ? [] : [`${(button as HTMLElement).dataset.disc} under ${hit?.tagName} ${section ? `(section ${section.dataset.depth})` : ""}`];
    })), { timeout: SETTLE_TIMEOUT_MS }).toEqual([]);
    const deals = (await stage.locator('button[data-disc="G04"]').boundingBox())!;
    await page.mouse.move(deals.x + deals.width / 2, deals.y + deals.height / 2);
    await expect(stage.getByRole("dialog")).toBeVisible({ timeout: SETTLE_TIMEOUT_MS });
  });

  test("opens a disc's panel from the keyboard and gives focus back on Escape (§6.2)", async ({ page }) => {
    await toPlan(page);
    const stage = await liveStage(page);
    await toHero(page);
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

  test("ends the stage and its legend before the footer at the end of the plan (W15-B4, worker-4's W15-S LOW 3)", async ({ page }, info) => {
    await toPlan(page);
    const stage = await liveStage(page);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => page.evaluate(() =>
      document.querySelector<HTMLElement>("[data-testid=spine-stage]")!.dataset.scrolled === String(Math.round(window.scrollY))),
    { timeout: SETTLE_TIMEOUT_MS }).toBe(true);
    if (info.project.name === "desktop") {
      // No legend left at the bottom of the plan with no spine above it.
      await expect.poll(() => stage.locator("[data-legend]").evaluate((el) => Number(getComputedStyle(el).opacity)),
        { timeout: SETTLE_TIMEOUT_MS }).toBeLessThanOrEqual(0.01);
      return;
    }
    const band = (await stage.boundingBox())!;
    const footer = (await page.locator("footer.site-footer").boundingBox())!;
    expect(band.y + band.height, "the band's bottom against the footer's top").toBeLessThan(footer.y - 1);
  });

  test("keeps a phone's legend under the band, off the spine's lower vertebrae (W15-B4 L1)", async ({ page }, info) => {
    test.skip(info.project.name !== "phone", "desktop keeps its legend under the spine, on the stage");
    await toPlan(page);
    const stage = await liveStage(page);
    const legend = (await stage.locator("[data-legend]").boundingBox())!;
    const screen = (await stage.locator("[data-stage-screen]").boundingBox())!;
    expect(legend.y).toBeGreaterThanOrEqual(screen.y + screen.height - 1);
    // Each item on one line: worker-2 saw the two wrap into four lines over the spine.
    const lines = await stage.locator("[data-legend] li").evaluateAll((items) => items.map((li) => li.getBoundingClientRect().height));
    lines.forEach((height) => expect(height).toBeLessThan(24));
  });
});

/**
 * W20-MID: what crosses the hero's words at the top of the page: a callout or the legend over a line of its text, or
 * the nav's bar reaching below a line's top. "not ready" until the overlay has the disc boxes of this
 * screen (every disc button inside it).
 */
async function heroWordsCrossed(page: Page): Promise<string[] | "not ready"> {
  return page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>("[data-testid=spine-stage]")!;
    const buttons = [...stage.querySelectorAll("button[data-disc]")].map((b) => b.getBoundingClientRect()).filter((r) => r.width > 0);
    if (stage.dataset.scrolled !== "0" || !buttons.length || buttons.some((r) => r.right > innerWidth)) return "not ready";
    const meet = (a: DOMRect, b: DOMRect) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
    const hero = document.querySelector<HTMLElement>("#plan-hero-title")!.closest("section")!;
    const lines: { text: string; box: DOMRect }[] = [];
    const walker = document.createTreeWalker(hero, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent?.trim() || node.parentElement?.closest("[data-scroll-cue]")) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const box of range.getClientRects()) if (box.width > 0) lines.push({ text: node.textContent.trim().slice(0, 24), box });
    }
    const shown = (el: HTMLElement) => getComputedStyle(el).visibility !== "hidden" && Number(getComputedStyle(el).opacity) > 0.01;
    const marks = [...stage.querySelectorAll<HTMLElement>("[data-callout], [data-legend]")].filter(shown)
      .map((el) => ({ name: el.dataset.callout ? `callout ${el.dataset.callout}` : "legend", box: el.getBoundingClientRect() }));
    const navBottom = document.querySelector("nav")!.getBoundingClientRect().bottom;
    return [
      ...marks.flatMap((m) => lines.filter((l) => meet(m.box, l.box)).map((l) => `${m.name} over "${l.text}"`)),
      ...lines.filter((l) => l.box.top < navBottom).map((l) => `the nav (to ${Math.round(navBottom)}) over "${l.text}"`),
    ];
  });
}

test.describe("the hero at mid widths (W20-MID)", () => {
  // The manager at 1024 x 768: the callouts went left of the spine over the paragraph and stats, and the logo sat on
  // the eyebrow; at 1280 x 720 the nav covered the eyebrow and the headline's top; at 1280 x 800 the logo's rim crossed
  // the eyebrow (review-w20 F9).
  for (const size of [{ width: 1024, height: 768 }, { width: 1280, height: 720 }, { width: 1280, height: 800 }]) {
    test(`keeps the callouts and the legend off the hero's words, and the words under the nav, at ${size.width} x ${size.height}`, async ({ page }, info) => {
      test.skip(info.project.name !== "desktop", "desktop widths; the phone's hero has no stage beside its words");
      await page.setViewportSize(size);
      await toPlan(page);
      await liveStage(page);
      await toHero(page);
      await expect.poll(() => heroWordsCrossed(page), { timeout: SETTLE_TIMEOUT_MS }).toEqual([]);
    });
  }
});
