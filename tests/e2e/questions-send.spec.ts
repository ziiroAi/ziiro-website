import type { Page } from "@playwright/test";
import type { LeadField } from "../../src/features/funnel/data/contract";
import { expect, test, type LeadAnswer } from "./fixtures";
import { answerAsAnanya, expectPlan, fillContact, sendContact } from "./support/questions";

const G_ERROR = "Something went wrong on our end. Try that again?";
const BOT_LINE = "The spam check didn't go through. Mind trying once more?";
const EMAIL_LINE = "That email doesn't look right. Mind checking it?";
const SAVE_FAIL = "I couldn't save your details just now, so no email went out.";
const SAVE_UNSURE = "I couldn't confirm your details were saved.";
const refused = (status: number, field?: LeadField): LeadAnswer => ({
  status,
  body: field ? { success: false, field } : { success: false },
});

/** Back at S7 once, with every field kept (§10). */
async function expectBackAtS7(page: Page, line: string) {
  await expect(page.locator(".f-root")).toHaveAttribute("data-screen", "s7", { timeout: 20_000 });
  await expect(page.getByText(line)).toBeVisible();
  await expect(page.getByLabel("Your name")).toHaveValue("Ananya");
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue("ananya@example.com");
  await expect(page.getByRole("checkbox")).toBeChecked();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await answerAsAnanya(page);
});

test("checks the fields on the device first, and sends nothing (§4.4, §10)", async ({ page, funnelApi }) => {
  await page.getByLabel("Phone (optional)").fill("12");
  await sendContact(page);
  await expect(page.getByText("What should I call you?")).toBeVisible();
  await expect(page.getByText(EMAIL_LINE)).toBeVisible();
  await expect(page.getByText("That number doesn't look right. You can leave it blank.")).toBeVisible();
  await expect(page.getByText("Tick the box so I'm allowed to save this.")).toBeVisible();
  await expect(page.getByLabel("Your name")).toBeFocused();
  expect(funnelApi.leads).toHaveLength(0);
  await expect.poll(() => funnelApi.visits.at(-1)?.fields.contactErrors).toEqual(["name", "email", "phone", "consent"]);
});

test("sends on Enter (§4.3)", async ({ page, funnelApi }) => {
  await fillContact(page);
  await page.getByLabel("Your name").press("Enter");
  await expectPlan(page);
  expect(funnelApi.leads).toHaveLength(1);
});

test("an email the server refuses: S7 once, then the plan with sp.save.fail", async ({ page, funnelApi }) => {
  funnelApi.answerLeadWith([refused(400, "email"), refused(400, "email")]);
  await fillContact(page);
  await sendContact(page);
  await expectBackAtS7(page, EMAIL_LINE);
  await sendContact(page);
  await expectPlan(page);
  await expect(page.getByText(SAVE_FAIL)).toBeVisible();
  expect(funnelApi.leads.map((lead) => lead.retry)).toEqual([undefined, true]);
});

test("a failed spam check: S7 with s7.err.bot, then a retry the server saves", async ({ page, funnelApi }) => {
  funnelApi.answerLeadWith([refused(403)]);
  await fillContact(page);
  await sendContact(page);
  await expectBackAtS7(page, BOT_LINE);
  await sendContact(page);
  await expectPlan(page);
  await expect(page.getByText(SAVE_FAIL)).toHaveCount(0);
  expect(funnelApi.leads[1]).toMatchObject({ retry: true, visitId: funnelApi.leads[0].visitId });
});

test("a 403 twice still opens the plan, with sp.save.fail", async ({ page, funnelApi }) => {
  funnelApi.answerLeadWith([refused(403), refused(403)]);
  await fillContact(page);
  await sendContact(page);
  await expectBackAtS7(page, BOT_LINE);
  await sendContact(page);
  await expectPlan(page);
  await expect(page.getByText(SAVE_FAIL)).toBeVisible();
});

test("too many tries: S7 with g.error", async ({ page, funnelApi }) => {
  funnelApi.answerLeadWith([refused(429)]);
  await fillContact(page);
  await sendContact(page);
  await expectBackAtS7(page, G_ERROR);
  await expect.poll(() => funnelApi.visits.at(-1)?.fields.contactErrors).toEqual(["rate"]);
});

test("our server failing twice: S7 with g.error, then the plan with sp.save.fail", async ({ page, funnelApi }) => {
  funnelApi.answerLeadWith([refused(502), refused(502)]);
  await fillContact(page);
  await sendContact(page);
  await expectBackAtS7(page, G_ERROR);
  await sendContact(page);
  await expectPlan(page);
  await expect(page.getByText(SAVE_FAIL)).toBeVisible();
});

test("no answer twice: S8 holds until the drop, S7 with g.error, then the plan with sp.save.unsure", async ({ page, funnelApi }) => {
  test.setTimeout(60_000);
  funnelApi.answerLeadWith(["no-answer", "no-answer"]);
  await fillContact(page);
  await sendContact(page);
  await expect(page.locator(".f-s8")).toBeVisible();
  await expectBackAtS7(page, G_ERROR);
  await sendContact(page);
  await expectPlan(page);
  await expect(page.getByText(SAVE_UNSURE)).toBeVisible();
  await expect.poll(() => funnelApi.visits.at(-1)?.fields.contactErrors).toEqual(["timeout", "timeout"]);
});
