import { expect, test } from "./fixtures";
import { copy } from "../../src/features/funnel/data/light";

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
});
