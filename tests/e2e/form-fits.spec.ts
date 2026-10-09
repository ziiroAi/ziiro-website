import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { copy } from "../../src/features/funnel/data/light";
import { ANANYA, answerProblem, answerRevenue, answerTeam, tap } from "./helpers/flow";

/**
 * (C) W16-B: the owner, "the forms can't be scrollable, right?". Every question screen, S0 + S1 through the contact
 * form, fits the screen with nothing to scroll: desktop 1440 × 900, laptop 1280 × 720, phone 390 × 844 and a small
 * phone 360 × 640.
 */
const SIZES = {
  desktop: [{ width: 1440, height: 900 }, { width: 1280, height: 720 }],
  phone: [{ width: 390, height: 844 }, { width: 360, height: 640 }],
} as const;

/** The screen once its entry animations are over. */
async function settled(page: Page, screen: string) {
  await expect(page.locator(".f-root")).toHaveAttribute("data-screen", screen);
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity),
  );
}

/** How far the page runs past the bottom of the screen, in px: 0 when there is nothing to scroll. */
const overflow = (page: Page) =>
  page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - window.innerHeight);

async function expectFits(page: Page, what: string, screen: string) {
  await settled(page, screen);
  expect.soft(await overflow(page), `${what} runs past the screen by this many px`).toBeLessThanOrEqual(0);
}

for (const project of ["desktop", "phone"] as const) {
  for (const size of SIZES[project]) {
    test(`every question screen fits ${size.width} × ${size.height} with nothing to scroll`, async ({ page }, info) => {
      test.skip(info.project.name !== project, `${project} sizes`);
      await page.setViewportSize(size);
      await page.goto("/");
      await expectFits(page, "S0 + S1", "s1");
      await tap(page, ANANYA.segment);
      await expectFits(page, "S2", "s2");
      await tap(page, ANANYA.business);
      await expectFits(page, "S3", "s34");
      await tap(page, ANANYA.years);
      await expectFits(page, "S3 + S4", "s34");
      await answerTeam(page);
      await expectFits(page, "S5", "s5");
      await answerRevenue(page);
      await expectFits(page, "S6", "s6");
      await answerProblem(page);
      await expectFits(page, "S7", "s7");
    });

    test(`S1b fits ${size.width} × ${size.height} with nothing to scroll`, async ({ page }, info) => {
      test.skip(info.project.name !== project, `${project} sizes`);
      await page.setViewportSize(size);
      await page.goto("/");
      await tap(page, copy("s1.o3"));
      await expectFits(page, "S1b", "s1b");
    });
  }
}
