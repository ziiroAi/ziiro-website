import { expect, test } from "./fixtures";
import { copy } from "../../src/features/funnel/data/light";
import { answerAsAnanya, expectPlan, fillContact, sendContact } from "./support/questions";

test.describe("the header on a phone (§6.2, D14)", () => {
  test.skip(({ isMobile }) => !isMobile, "the burger is phone-only");

  test("opens the menu with three links and the pill, and closes on Escape", async ({ page }) => {
    await page.goto("/mission");
    const menu = page.getByRole("button", { name: copy("ph.nav.menu") });
    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    const sheet = page.locator("#site-menu");
    for (const id of ["nav.mission", "nav.who", "nav.products", "nav.btn"]) {
      await expect(sheet.getByRole("link", { name: copy(id), exact: true })).toBeVisible();
    }
    await page.keyboard.press("Escape");
    await expect(menu).toHaveAttribute("aria-expanded", "false");
  });

  test("sits above the plan hero, not over it (worker-3's 390 check)", async ({ page }) => {
    await page.goto("/");
    await answerAsAnanya(page);
    await fillContact(page);
    await sendContact(page);
    await expectPlan(page);
    const bottom = async (box: { y: number; height: number } | null) => (box ? box.y + box.height : Infinity);
    const logo = await bottom(await page.getByRole("link", { name: copy("nav.home.aria"), exact: true }).boundingBox());
    const burger = await bottom(await page.getByRole("button", { name: copy("ph.nav.menu") }).boundingBox());
    const eyebrow = await page.getByText(copy("hx.eyebrow"), { exact: true }).boundingBox();
    expect(eyebrow?.y ?? 0).toBeGreaterThanOrEqual(Math.max(logo, burger));
  });
});
