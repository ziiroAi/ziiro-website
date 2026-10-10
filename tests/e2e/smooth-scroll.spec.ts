// (C) W23-C3 H1: the site's smooth scroll (Lenis) eases the first scroll after an idle pause. W23-C stopped Lenis's loop
// while nothing scrolls; Lenis steps by the time since its last frame, so the first scroll after a pause landed in one
// frame (worker-3's review-w23c H1) until the loop forgot its clock on stopping.
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { answerAsAnanya, expectPlan, fillContact, sendContact } from "./support/questions";

test.use({ reducedMotion: "no-preference" });

const IDLE_MS = 2_000;

/** After IDLE_MS with nothing scrolling, scrolls by `by` px (a scrollTo, or a wheel) and reads scrollY each frame. */
function scrollAfterIdle(page: Page, how: "scrollTo" | "wheel", by: number): Promise<{ from: number; ys: number[] }> {
  return page.evaluate(
    ([how, by, idle]) =>
      new Promise<{ from: number; ys: number[] }>((resolve) => {
        setTimeout(() => {
          const from = Math.round(scrollY);
          if (how === "scrollTo") window.__lenis!.scrollTo(from + by, { duration: 1 });
          else window.dispatchEvent(new WheelEvent("wheel", { deltaY: by, bubbles: true, cancelable: true }));
          const ys: number[] = [];
          const frame = () => {
            ys.push(Math.round(scrollY));
            if (ys.length < 40) requestAnimationFrame(frame);
            else resolve({ from, ys });
          };
          requestAnimationFrame(frame);
        }, idle);
      }),
    [how, by, IDLE_MS] as const,
  );
}

/** Eased: the first frames cover only part of the way, it climbs over several frames, and it gets there. */
function expectEased({ from, ys }: { from: number; ys: number[] }, by: number) {
  const travelled = ys.map((y) => y - from);
  expect(travelled[1], `frame 2 of ${JSON.stringify(travelled)}`).toBeLessThan(by * 0.6);
  expect(new Set(travelled.slice(0, 12)).size, `distinct steps in ${JSON.stringify(travelled)}`).toBeGreaterThan(5);
  expect(travelled.at(-1)).toBeGreaterThan(by * 0.9);
}

async function lenisReady(page: Page) {
  await page.waitForFunction(() => window.__lenis !== undefined);
}

test.describe("the smooth scroll after an idle pause (W23-C3 H1)", () => {
  test("eases a scrollTo and a wheel on /who-we-are", async ({ page, isMobile }) => {
    await page.goto("/who-we-are");
    await lenisReady(page);
    expectEased(await scrollAfterIdle(page, "scrollTo", 1200), 1200);
    test.skip(isMobile, "a phone scrolls by touch, natively; Lenis smooths the wheel only");
    expectEased(await scrollAfterIdle(page, "wheel", 300), 300);
  });

  test("eases a scrollTo and a wheel on the funnel's plan", async ({ page, isMobile }) => {
    await page.goto("/");
    await answerAsAnanya(page);
    await fillContact(page);
    await sendContact(page);
    await expectPlan(page);
    await lenisReady(page);
    expectEased(await scrollAfterIdle(page, "scrollTo", 1200), 1200);
    test.skip(isMobile, "a phone scrolls by touch, natively; Lenis smooths the wheel only");
    expectEased(await scrollAfterIdle(page, "wheel", 300), 300);
  });
});
