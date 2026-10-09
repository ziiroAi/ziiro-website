import { expect, test } from "./fixtures";
import { copy } from "../../src/features/funnel/data/light";
import { INTERIM_BOOKING_URL } from "../../src/features/pricing/entities/rates";

test("the first screen holds the greeting, S1 and g.about, with only the logo above them (§4.1, D6)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: copy("s1.q") })).toBeVisible();
  for (const i of [1, 2, 3, 4, 5]) await expect(page.getByRole("button", { name: copy(`s1.o${i}`), exact: true })).toBeVisible();
  await expect(page.getByText(copy("g.about"))).toBeVisible();
  await expect(page.getByRole("link", { name: copy("nav.home.aria") })).toBeVisible();
  await expect(page.locator("#site-menu")).toHaveCount(0);
});

test("has no orange footer under the questions (W16-B)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 2, name: copy("s1.q") })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expect(page.locator("footer.site-footer")).toHaveCount(0);
  await expect(page.locator(".site-sheet")).toHaveAttribute("data-flat", "");
});

// Chromium under Playwright's javaScriptEnabled: false still parses <noscript> as raw text, so nothing in it
// renders. The served HTML is what a browser without JavaScript gets, so the check reads that instead.
test("serves g.noscript with a plain link to Calendly for a browser without JavaScript (§4.5)", async ({ request }) => {
  const html = await (await request.get("/")).text();
  const blocks = [...html.matchAll(/<noscript>([\s\S]*?)<\/noscript>/g)].map((m) => m[1]);
  const funnel = blocks.filter((b) => b.includes(`href="${INTERIM_BOOKING_URL}`));
  expect(funnel).toHaveLength(1);
  expect(funnel[0].replace(/<[^>]+>/g, "").trim()).toBe(copy("g.noscript"));
});
