import { expect, test } from "./fixtures";

test("vite preview serves the production build", async ({ page }) => {
  await page.goto("/mission");
  await expect(page.locator("h1").first()).toBeVisible();
});
