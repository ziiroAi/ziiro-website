import { expect, test } from "./fixtures";

/** (C) W24-B, W24-B2: /products opens on the departments, agents and jobs graph, first under the navbar; the stages follow it. */
test.describe("/products (W24-B)", () => {
  test("opens on the system graph, right under the navbar, with the stages following it, without console errors", async ({ page, isMobile }) => {
    const errors: string[] = [];
    page.on("console", (msg) => msg.type() === "error" && errors.push(msg.text()));
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/products");
    const directory = page.locator("section#systems");
    await expect(directory).toBeVisible();
    await expect(page.locator("h1")).toHaveText("137 jobs of work, mapped across 33 agents in 7 departments.");
    await expect(directory.locator("h1")).toHaveCount(1);

    const layout = await page.evaluate(() => {
      const sections = [...document.querySelectorAll("section")];
      const systems = document.querySelector("section#systems")!;
      const lead = document.querySelector("section[data-stages-lead]")!;
      const stage = document.querySelector("[data-stage-card]")!;
      const after = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      return {
        first: sections[0] === systems,
        leadNext: systems.nextElementSibling === lead,
        stagesBelow: after(lead, stage),
        h1Top: Math.round(systems.querySelector("h1")!.getBoundingClientRect().top),
      };
    });
    expect(layout).toMatchObject({ first: true, leadNext: true, stagesBelow: true });
    // The sentence sits straight under the navbar's clearance: no band of empty page above it.
    expect(layout.h1Top).toBeLessThan(260);

    // The map (desktop) or the phone's intelligence mark above its department list starts on the first screen.
    const box = await directory.locator("svg").first().boundingBox();
    expect(box!.y).toBeLessThan(isMobile ? 844 : 900);

    await expect(page.locator("section[data-stages-lead] h2")).toHaveText(
      "Diagnose. Build. Optimize. Everything we make sits in one of these three.",
    );
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
