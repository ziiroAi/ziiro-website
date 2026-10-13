import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { TAP_PACE_MS, atHour, fillContact, sendContact, tapThrough } from "./support/questions";

/** §11: WCAG 2.2 AA. Lane D's ananya-plan.spec.ts covers Ananya's own screens; these are the others. */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const TO_S6 = ["I run a business", "Clinic / healthcare", "3–5 years", "2–5", "₹1–5Cr"];

async function axe(page: Page, screen: string) {
  const { violations } = await new AxeBuilder({ page }).include(".f-root").withTags(TAGS).analyze();
  expect(violations.map((v) => `${screen}: ${v.id} at ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

for (const [theme, hour] of [["light", 10], ["dark", 22]] as const) {
  test.describe(`the screens off Ananya's path, ${theme} (§11)`, () => {
    test.beforeEach(async ({ page }) => {
      await atHour(page, hour);
      await page.emulateMedia({ reducedMotion: "reduce" });  // axe reads the settled colours, never a fade
      await page.goto("/");
    });

    test("S1b and its closing line", async ({ page }) => {
      await tapThrough(page, "Student, or just curious");
      await axe(page, "S1b");
      await tapThrough(page, "Saw a reel or a post");
      await axe(page, "S1b done");
    });

    test("S2, and S2 with its Other box open", async ({ page }) => {
      await tapThrough(page, "I run a business");
      await axe(page, "S2");
      await tapThrough(page, "Other");
      await expect(page.locator("#f-s2-other-text")).toBeVisible();
      await axe(page, "S2 Other");
    });

    test("S6 asking for something, and S6 at three chips", async ({ page }) => {
      await tapThrough(page, ...TO_S6, "That's it");
      await expect(page.getByText("Give me something to work with: a few words, a chip, anything.")).toBeVisible();
      await axe(page, "S6 empty");
      await tapThrough(page, "Not enough leads", "Ads burn money", "Team chaos", "Customer support");
      await expect(page.getByText("Three's plenty. Untap one to swap.")).toBeVisible();
      await axe(page, "S6 three chips");
    });

    test("S7 with every field's error, and S7 after a failed spam check", async ({ page, funnelApi }) => {
      funnelApi.answerLeadWith([{ status: 403, body: { success: false } }]);
      await tapThrough(page, ...TO_S6, "Payments get stuck", "That's it");
      await sendContact(page);
      await expect(page.getByText("What should I call you?")).toBeVisible();
      await axe(page, "S7 errors");
      await fillContact(page);
      await sendContact(page);
      await expect(page.getByText("The spam check didn't go through. Mind trying once more?")).toBeVisible({ timeout: 12_000 });
      await axe(page, "S7 bot");
    });
  });
}

test("answers with the keyboard alone, with focus on each new question (§11)", async ({ page }) => {
  const enter = async () => {
    await page.waitForTimeout(TAP_PACE_MS);
    await page.keyboard.press("Enter");
  };
  await page.goto("/");
  await page.getByRole("button", { name: "I run a business" }).focus();
  await enter();
  await expect(page.getByRole("heading", { name: "What kind of business?" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Interior design / architecture" })).toBeFocused();
  await enter();
  await expect(page.getByRole("heading", { name: "How long have you been at it?" })).toBeFocused();
  await page.keyboard.press("Tab");
  await enter();
  await expect(page.getByRole("heading", { name: "How big is the team?" })).toBeFocused();
  await page.keyboard.press("Tab");
  await enter();
  await expect(page.getByRole("heading", { name: "Roughly, what does it make in a year?" })).toBeFocused();
});
