import { expect, test } from "./fixtures";

/** (C) W24-B: /products opens on the departments, agents and jobs graph; the three stages follow it. */
test.describe("/products (W24-B)", () => {
  test("puts the system graph first under the hero and the stages below it, without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => msg.type() === "error" && errors.push(msg.text()));
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/products");
    const directory = page.locator("section#systems");
    await expect(directory).toBeVisible();
    await expect(directory).toContainText("137 jobs of work, mapped across 33 agents in 7 departments.");

    const order = await page.evaluate(() => {
      const hero = document.querySelector("[data-hero-title]")?.closest("section");
      const systems = document.querySelector("section#systems");
      const stage = document.querySelector("[data-stage-card]");
      return {
        firstAfterHero: hero?.nextElementSibling === systems,
        stagesBelow: !!systems && !!stage && !!(systems.compareDocumentPosition(stage) & Node.DOCUMENT_POSITION_FOLLOWING),
      };
    });
    expect(order).toEqual({ firstAfterHero: true, stagesBelow: true });

    await page.locator("[data-stage-card]").first().scrollIntoViewIfNeeded();
    await expect(page.locator("[data-stage-card]")).toHaveCount(3);
    expect(errors).toEqual([]);
  });

  test("keeps its service catalog JSON-LD valid", async ({ page }) => {
    await page.goto("/products");
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const parsed = blocks.map((text) => JSON.parse(text));
    expect(JSON.stringify(parsed)).toContain("Ziiro engagement stages");
  });

  test("selects a department, shows its agents and jobs, and comes back", async ({ page, isMobile }) => {
    await page.goto("/products");
    const directory = page.locator("section#systems");

    if (isMobile) {
      await expect(directory.locator("svg [data-map-system]")).toHaveCount(0);
      await directory.getByRole("button", { name: /^03\s*Sales/ }).click();
    } else {
      await expect(directory.locator("[data-map-system]")).toHaveCount(7);
      await expect(directory).toContainText("The whole system");
      await directory.locator('[data-map-system][aria-label^="Sales."]').click();
    }

    const panel = directory.locator('[data-directory-view="detail"], h3:text-is("Sales")').first();
    await expect(panel).toBeVisible();
    const firstAgent = directory.locator("button[aria-expanded]").first();
    await firstAgent.click();
    await expect(firstAgent).toHaveAttribute("aria-expanded", "true");
    await expect(directory.locator("[data-directory-job]").first()).toBeVisible();

    if (isMobile) {
      await directory.getByRole("button", { name: "All systems" }).click();
      await expect(directory.locator('[data-directory-view="detail"] li > button')).toHaveCount(7);
    } else {
      await directory.locator('[data-map-system][aria-label^="Sales."]').click();
      await expect(directory).toContainText("The whole system");
    }
  });
});
