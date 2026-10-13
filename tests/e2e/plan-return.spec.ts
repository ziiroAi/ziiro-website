import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { copy } from "../../src/features/funnel/data/light";
import { TAP_PACE_MS, answerAsAnanya, expectPlan, fillContact, sendContact, tapThrough } from "./support/questions";

/** (C) W24-C, the owner's fix 3: once the plan has shown, "/" opens on it for the rest of the visit. */

async function toPage(page: Page, id: "nav.mission" | "nav.who" | "nav.products", isMobile: boolean): Promise<void> {
  if (isMobile) await page.getByRole("button", { name: copy("ph.nav.menu") }).click();
  const links = isMobile ? page.locator("#site-menu") : page.getByRole("navigation").first();
  await links.getByRole("link", { name: copy(id), exact: true }).click();
  if (isMobile) await expect(page.getByRole("button", { name: copy("ph.nav.menu") })).toHaveAttribute("aria-expanded", "false");
}

/** The logo to "/". On touch its first tap opens the pill and the second follows the link (Navbar). */
async function logoHome(page: Page): Promise<void> {
  const logo = page.getByRole("link", { name: copy("nav.home.aria"), exact: true });
  await expect(async () => {
    await logo.click();
    await expect(page).toHaveURL(/\/$/, { timeout: 1_000 });
  }).toPass({ timeout: 10_000 });
}

/** The visit's saves so far, once the plan's own have landed. */
async function settledVisits(page: Page, funnelApi: { visits: unknown[] }): Promise<number> {
  await page.waitForTimeout(1_000);
  return funnelApi.visits.length;
}

test.describe("after a send", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await answerAsAnanya(page);
    await fillContact(page);
    await sendContact(page);
    await expectPlan(page);
  });

  test("the logo brings the plan back from Mission, Who We Are and Products, and sends nothing new", async ({ page, funnelApi, isMobile }) => {
    const visits = await settledVisits(page, funnelApi);
    for (const [id, path] of [["nav.mission", "/mission"], ["nav.who", "/who-we-are"], ["nav.products", "/products"]] as const) {
      await toPage(page, id, isMobile);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await logoHome(page);
      await expectPlan(page);
      await expect(page.getByText(copy("hx.eyebrow"), { exact: true })).toBeVisible();
    }
    await page.waitForTimeout(1_000);
    expect(funnelApi.leads).toHaveLength(1);
    expect(funnelApi.visits.length).toBe(visits);  // review C-1: coming back saves nothing over the visit's row
  });

  test("a reload opens on the plan too, on the same visit", async ({ page, funnelApi }) => {
    const visits = await settledVisits(page, funnelApi);
    await page.reload();
    await expectPlan(page);
    await page.waitForTimeout(1_000);
    expect(funnelApi.leads).toHaveLength(1);
    expect(funnelApi.visits.length).toBe(visits);  // review C-1
    const visitIds = new Set(funnelApi.visits.map((visit) => visit.id));
    expect(visitIds).toEqual(new Set([funnelApi.leads[0].visitId]));
  });

  test("Start over asks the questions again, as a new visit, and the logo no longer brings the plan back", async ({ page, funnelApi }) => {
    const restart = page.getByRole("button", { name: copy("s9.restart"), exact: true });
    await restart.scrollIntoViewIfNeeded();
    await expect(restart).toBeVisible();
    await page.waitForTimeout(TAP_PACE_MS);  // the tap gate (Review Focus 2): a person takes longer to reach it
    await restart.click();
    await expect(page.locator(".f-root")).toHaveAttribute("data-screen", "s1");
    await expect(page.getByRole("button", { name: "I run a business", exact: true })).toBeVisible();
    await expect(page.locator("[data-question]")).toBeFocused();  // review C-4: focus moves to S1's question
    // The questions' header is the logo alone, so the visitor comes back from Mission by a link elsewhere: the same tab.
    await page.goto("/mission");
    await logoHome(page);
    await expect(page.locator(".f-root")).toHaveAttribute("data-screen", "s1");
    await answerAsAnanya(page);
    await fillContact(page);
    await sendContact(page);
    await expectPlan(page);
    await expect.poll(() => funnelApi.leads.length).toBe(2);
    expect(funnelApi.leads[1].visitId).not.toBe(funnelApi.leads[0].visitId);
  });
});

test("a guest's sample plan comes back by the logo and a reload too, and saves nothing new", async ({ page, funnelApi, isMobile }) => {
  await page.goto("/");
  await tapThrough(page, "Student, or just curious", "Saw a reel or a post");
  await expectPlan(page);
  const visits = await settledVisits(page, funnelApi);
  await toPage(page, "nav.mission", isMobile);
  await expect(page).toHaveURL(/\/mission$/);
  await logoHome(page);
  await expectPlan(page);
  await page.reload();
  await expectPlan(page);
  await page.waitForTimeout(1_000);
  expect(funnelApi.leads).toHaveLength(0);
  expect(funnelApi.visits.length).toBe(visits);
});
