import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { ANANYA_WORDS, answerAsAnanya, atHour, expectPlan, fillContact, sendContact, tapThrough } from "./support/questions";

const S2_Q = "What kind of business?";
const S3_Q = "How long have you been at it?";
const question = (page: Page, name: string) => page.getByRole("heading", { name, exact: true });

test.describe("the greeting and the theme (§4.2, D4, D9)", () => {
  test("is light with the morning greeting at 10:00", async ({ page }) => {
    await atHour(page, 10);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(250, 250, 248)");
    await expect(page.locator(".f-head h1")).toHaveText("Hello, good morning.");
    await expect(page.locator(".f-head").getByText("Glad you're here.")).toBeVisible();
  });

  test("is dark with the evening greeting and the late line at 22:00", async ({ page }) => {
    await atHour(page, 22);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(6, 9, 17)");
    await expect(page.locator(".f-head h1")).toHaveText("Hello, good evening.");
    await expect(page.locator(".f-head").getByText("Late one? I'll keep it quick.")).toBeVisible();
  });

  test("is dark at 10:00 when the device asks for dark", async ({ page }) => {
    await atHour(page, 10);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});

test.describe("a Hindi browser (D4)", () => {
  test.use({ locale: "hi-IN" });

  test("gets the English greeting while the Hindi row is unchecked", async ({ page }) => {
    await atHour(page, 10);
    await page.goto("/");
    await expect(page.locator(".f-head h1")).toHaveText("Hello, good morning.");
  });

  test("gets the Hindi greeting, marked lang=hi, once the owner checks its row", async ({ page }) => {
    await page.route("/", async (route) => {
      const response = await route.fetch();
      const body = (await response.text()).replace('"lang":"hi","checked":false', '"lang":"hi","checked":true');
      await route.fulfill({ response, body });
    });
    await atHour(page, 10);
    await page.goto("/");
    await expect(page.locator(".f-head h1")).toHaveText("नमस्ते, सुप्रभात।");
    await expect(page.locator(".f-head h1")).toHaveAttribute("lang", "hi");
    await expect(question(page, "What do you do?")).toBeVisible();  // only the greeting is localised (§4.1)
  });
});

test("switches screens at once when the device asks for reduced motion (§4.1)", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".f-intro")).toBeHidden();
  await tapThrough(page, "I run a business");
  await expect(page.locator(".f-screen").first()).toHaveCSS("animation-name", "none");
});

test("gives a visitor without a business one question, then the site (D15)", async ({ page, funnelApi }) => {
  await page.goto("/");
  await tapThrough(page, "Student, or just curious");
  await expect(question(page, "What brought you here?")).toBeFocused();
  await tapThrough(page, "Saw a reel or a post");
  await expect(question(page, "Got it, thanks. Everything's open, have a look around.")).toBeFocused();
  expect(funnelApi.visits.some((v) => v.step === "S1b" && v.fields.nonOwnerReason === "saw_a_post")).toBe(true);
  await page.getByRole("link", { name: "Show me the site" }).click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.locator("html")).not.toHaveAttribute("data-funnel", /.*/);
});

test("Back goes one step with the answer kept, Forward returns, and the URL never changes (§4.1)", async ({ page }) => {
  await page.goto("/");
  await tapThrough(page, "I run a business", "Interior design / architecture");
  await expect(question(page, S3_Q)).toBeFocused();
  await page.goBack();
  await expect(question(page, S2_Q)).toBeVisible();
  await expect(page.getByRole("button", { name: "Interior design / architecture" })).toHaveClass(/is-selected/);
  await page.goForward();
  await expect(question(page, S3_Q)).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test("Ananya gets her plan, and Back from it lands on S6 with her words kept (§4.1, §12)", async ({ page, funnelApi }) => {
  await page.goto("/");
  await answerAsAnanya(page);
  await fillContact(page);
  await sendContact(page);
  await expectPlan(page);
  expect(funnelApi.leads).toHaveLength(1);
  await expect.poll(() => funnelApi.visits.at(-1)?.step).toBe("S9");
  expect(JSON.stringify(funnelApi.visits)).not.toContain("gone cold");  // D13
  await page.goBack();
  await expect(page.getByRole("textbox")).toHaveValue(ANANYA_WORDS);
});

test("counts a tap made before the code has loaded (Review Focus 3)", async ({ page, funnelApi }) => {
  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route(/\/assets\/.+\.js$/, async (route) => {
    await held;
    await route.continue();
  });
  await page.goto("/", { waitUntil: "commit" });
  const first = page.getByRole("button", { name: "I run a business" });
  await expect(first).toBeVisible();
  await first.click();
  release();
  await expect(question(page, S2_Q)).toBeVisible();
  await expect.poll(() => funnelApi.visits.some((v) => v.fields.segment === "business")).toBe(true);
});

test("answers once for a double tap on S2 (Review Focus 2)", async ({ page, funnelApi }) => {
  await page.goto("/");
  await tapThrough(page, "I run a business");
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Interior design / architecture" }).dblclick();
  await expect(question(page, S3_Q)).toBeVisible();
  await page.waitForTimeout(400);
  await expect(page.locator('.f-root [aria-pressed="true"], .f-root .is-selected')).toHaveCount(0);
  expect(funnelApi.visits.some((v) => v.fields.yearsBand || v.fields.teamBand)).toBe(false);
});

test("opens Privacy in a new tab and keeps the flow where it was (Review Focus 5)", async ({ page }) => {
  await page.goto("/");
  await tapThrough(page, "I run a business");
  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    page.locator(".f-root").getByRole("link", { name: "Privacy" }).click(),
  ]);
  await expect(popup).toHaveURL(/\/privacy$/);
  await expect(question(page, S2_Q)).toBeVisible();
});
