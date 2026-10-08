import { expect, test, type Page, type Request } from "@playwright/test";
import ananya from "../fixtures/ananya-lead.json" with { type: "json" };
import { tapThrough } from "./support/questions";

const leadBodies: Record<string, unknown>[] = [];

test.beforeEach(async ({ page }) => {
  leadBodies.length = 0;
  await page.route("**/api/funnel/visit", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, country: "IN" }) }),
  );
  await page.route("**/api/funnel/lead", async (route, request: Request) => {
    leadBodies.push(request.postDataJSON());
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, planEmail: "sent" }) });
  });
});

async function answerAsAnanya(page: Page) {
  await page.goto("/");
  // The questions ignore a tap for 350 ms after each step (lane A's double-tap guard), so tapThrough waits 400 ms first.
  await tapThrough(page, "I run a business", "Interior design / architecture", "5–10 years", "6–20", "₹1–5Cr");
  await page.getByRole("textbox").fill("Enquiries come in, but by the time someone calls back they've gone cold.");
  await tapThrough(page, "That's it");
  await fillContact(page);
}

async function fillContact(page: Page) {
  await page.getByLabel("Your name").fill("Ananya");
  // "Email" alone also matches the consent box, whose label says "email me".
  await page.getByLabel("Email", { exact: true }).fill("ananya@example.com");
  await page.getByRole("checkbox").check();
}

test("Ananya's lead body is the fixture lane B turns into the golden email", async ({ page }) => {
  await answerAsAnanya(page);
  await page.getByRole("button", { name: "Show me my plan" }).click();
  await expect.poll(() => leadBodies.length).toBe(1);
  const body = leadBodies[0] as typeof ananya;
  expect({ ...body, visitId: ananya.visitId, turnstileToken: ananya.turnstileToken }).toEqual(ananya);
});

test("a double tap on send makes one lead", async ({ page }) => {
  await answerAsAnanya(page);
  await page.getByRole("button", { name: "Show me my plan" }).dblclick();
  // Wait for the plan, not a fixed time: once it shows, both clicks have been handled.
  await expect(page.locator(".f-root")).toHaveAttribute("data-screen", "plan", { timeout: 12_000 });
  expect(leadBodies).toHaveLength(1);
});

test("Back from the plan lands on S6, and sending again is a new visit (§4.1)", async ({ page }) => {
  await answerAsAnanya(page);
  await page.getByRole("button", { name: "Show me my plan" }).click();
  await expect.poll(() => leadBodies.length).toBe(1);
  // Back from the plan itself: the lead is posted while S8 still holds, and a send in flight takes no second one.
  await expect(page.locator(".f-root")).toHaveAttribute("data-screen", "plan", { timeout: 12_000 });
  await page.goBack();
  await expect(page.getByRole("button", { name: "That's it" })).toBeVisible();
  await tapThrough(page, "That's it");
  await fillContact(page);
  await page.getByRole("button", { name: "Show me my plan" }).click();
  await expect.poll(() => leadBodies.length).toBe(2);
  expect((leadBodies[1] as { visitId: string }).visitId).not.toBe((leadBodies[0] as { visitId: string }).visitId);
});
