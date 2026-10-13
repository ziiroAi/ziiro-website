import type { Page } from "@playwright/test";
import { expect } from "../fixtures";

/**
 * (C) Lane A's Playwright helpers (spec §12): the questions at a person's pace, and Ananya's answers (index I-T2).
 * Labels are copy lines, as the visitor sees them.
 */

/** The questions ignore a tap for 350 ms after each step (TAP_LOCK_MS, Review Focus 2). A quick person is slower. */
export const TAP_PACE_MS = 400;

/** The visitor's clock, at a whole hour in India (the config's time zone). Call it before page.goto. */
export async function atHour(page: Page, hour: number): Promise<void> {
  await page.clock.setFixedTime(new Date(`2026-10-15T${String(hour).padStart(2, "0")}:00:00+05:30`));
}

/** Taps each button by its visible name, a person's pace apart. */
export async function tapThrough(page: Page, ...names: string[]): Promise<void> {
  for (const name of names) {
    await page.waitForTimeout(TAP_PACE_MS);
    await page.getByRole("button", { name, exact: true }).click();
  }
}

export const ANANYA_WORDS = "Enquiries come in, but by the time someone calls back they've gone cold.";

/** Ananya's answers from S1 to S7 (index I-T2). */
export async function answerAsAnanya(page: Page): Promise<void> {
  await tapThrough(page, "I run a business", "Interior design / architecture", "5–10 years", "6–20", "₹1–5Cr");
  await page.getByRole("textbox").fill(ANANYA_WORDS);
  await tapThrough(page, "That's it");
}

/** S7. "Email" alone would also match the consent box, whose label says "email me". */
export async function fillContact(page: Page): Promise<void> {
  await page.getByLabel("Your name").fill("Ananya");
  await page.getByLabel("Email", { exact: true }).fill("ananya@example.com");
  await page.getByRole("checkbox").check();
}

export async function sendContact(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Show me my plan" }).click();
}

/** Lane C's plan is on screen at "/". S8 holds until /lead answers, up to LEAD_BUDGET_MS (review M2). */
export async function expectPlan(page: Page): Promise<void> {
  await expect(page.locator(".f-root")).toHaveAttribute("data-screen", "plan", { timeout: 20_000 });
}
