import type { Page } from "@playwright/test";
import { copy } from "../../../src/features/funnel/data/light";

/** Item i of a " · " list line: option IDs take their labels in display order (contract.ts). */
export const option = (id: string, i: number) => copy(id).split(" · ")[i];

/** Ananya, spec §5.8. */
export const ANANYA = {
  segment: copy("s1.o1"),
  business: option("s2.o", 0),
  years: option("s3.o", 3),
  team: option("s4.o", 2),
  revenue: option("s5.o.IN", 2),
  problem: "Enquiries come in, but by the time someone calls back they've gone cold.",
  name: "Ananya",
  email: "ananya@example.com",
};

/** A fixed time in India on Mon 12 Oct, for the theme rule (D9): "10:00" is light, "22:00" is dark. */
export const at = (time: string) => new Date(`2026-10-12T${time}:00+05:30`);

/**
 * The questions ignore a tap for 350 ms after each step (lane A's double-tap guard, TAP_LOCK_MS), and Playwright
 * clicks sooner than that. So each tap waits a quick person's pace first, the same as lane A's TAP_PACE_MS.
 * The guard reads performance.now(), which keeps running under page.clock.setFixedTime, so at() doesn't stop it.
 */
const TAP_PACE_MS = 400;

async function tap(page: Page, name: string) {
  await page.waitForTimeout(TAP_PACE_MS);
  await page.getByRole("button", { name, exact: true }).click();
}

/* One step at a time. Each starts where the one before it stopped. */

/** S1, S2 and the years row of S3 + S4: the team row is now asked, S5 isn't on screen yet. */
export async function toTeamQuestion(page: Page) {
  await tap(page, ANANYA.segment);
  await tap(page, ANANYA.business);
  await tap(page, ANANYA.years);
}

/** The team row, which brings S5. */
export const answerTeam = (page: Page) => tap(page, ANANYA.team);

/** S5, which brings S6. */
export const answerRevenue = (page: Page) => tap(page, ANANYA.revenue);

/** S6, which brings S7. */
export async function answerProblem(page: Page) {
  await page.getByRole("textbox").fill(ANANYA.problem);
  await tap(page, copy("s6.btn"));
}

/* From a fresh `/`. */

export async function toRevenueQuestion(page: Page) {
  await toTeamQuestion(page);
  await answerTeam(page);
}

export async function toContactStep(page: Page) {
  await toRevenueQuestion(page);
  await answerRevenue(page);
  await answerProblem(page);
}

/** S7, which brings S8. A loose "Email" would also match the consent box, whose label says "email me". */
export async function sendContact(page: Page, email = ANANYA.email) {
  await page.getByLabel(copy("s7.name")).fill(ANANYA.name);
  await page.getByLabel(copy("s7.email"), { exact: true }).fill(email);
  await page.getByRole("checkbox").check();
  await tap(page, copy("s7.btn"));
}
