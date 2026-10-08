import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test, type LeadAnswer } from "./fixtures";
import { copy, departments } from "../../src/features/funnel/data";
import { answerProblem, answerRevenue, answerTeam, at, sendContact, toTeamQuestion } from "./helpers/flow";

/** §5.8: B-convert, tier M, 6 agents in 4 stops, the Pilot tag. */
const STOPS = ["deals", "sales", "marketing", "back-office"].map((id) => departments.find((d) => d.id === id)!.name);
const AGENTS = ["Enquiry responder", "Reply sorter", "Call companion", "Campaign runner", "Marketing analyst", "Numbers agent"];
const BUDGET = { phone: 500_000, desktop: 800_000 }; // §13.10, everything prefetched before the plan
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
/** Held 3 s, under LEAD_TIMEOUT_MS, so axe can read S8 while it is on screen. */
const SLOW_OK: LeadAnswer = { status: 200, body: { success: true, planEmail: "sent" }, delayMs: 3_000 };

/** Every screen fades in, and axe reads a fading line's blended colour as low contrast. Endless loops don't count. */
async function settled(page: Page) {
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity),
  );
}

async function axe(page: Page, screen: string) {
  await settled(page);
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(violations.map((v) => `${screen}: ${v.id} on ${v.nodes.length} node(s)`)).toEqual([]);
}

/** One screen at a time, with axe on each, counting every byte fetched after the first load until the plan paints. */
async function runToPlan(page: Page, time: string, isMobile: boolean) {
  await page.clock.setFixedTime(at(time));
  let counting = false;
  const sizes: Promise<number>[] = [];
  page.on("requestfinished", (r) => {
    if (counting) sizes.push(r.sizes().then((s) => s.responseBodySize));
  });

  await page.goto("/");
  await page.waitForLoadState("load");
  counting = true;
  await axe(page, "S0 + S1");
  await toTeamQuestion(page);
  await axe(page, "S3 + S4");
  await answerTeam(page);
  await axe(page, "S5");
  await answerRevenue(page);
  await axe(page, "S6");
  await answerProblem(page);
  await axe(page, "S7");
  await sendContact(page);
  await axe(page, "S8");
  await expect(page.getByText(copy("sp.pilot"), { exact: true }).first()).toBeVisible({ timeout: 10_000 });
  counting = false;

  const prefetched = (await Promise.all(sizes)).reduce((a, b) => a + b, 0);
  expect(prefetched, "bytes fetched after the first load until the plan painted").toBeLessThanOrEqual(isMobile ? BUDGET.phone : BUDGET.desktop);
  await axe(page, "S9");
}

/** The words before {words} in every dp.*.words line: "You said". */
const SAID = copy("dp.deals.words", { words: "|" }).split("|")[0].replace(/["“”'\s]+$/, "");

/**
 * Her six agents come in scroll order, stop by stop. Her words are quoted once, at the stop of the
 * department her problem belongs to, Deals, her first stop (D36). On desktop each stop also opens with
 * "Part i of 4" and the department's name; a phone shows ph.part in its sticky strip instead (copy.md).
 */
async function expectAnanyasPlan(page: Page, isMobile: boolean) {
  for (const agent of AGENTS) await expect(page.getByText(agent, { exact: true }).first()).toBeVisible();
  const text = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  const firsts = AGENTS.map((agent) => text.indexOf(agent));
  expect([...firsts].sort((a, b) => a - b), "her agents, in scroll order").toEqual(firsts);
  expect(text.split(SAID).length - 1, "her words, quoted once (D36)").toBe(1);
  if (isMobile) return;
  // "Part i of 4" is set in capitals by CSS, and innerText reports it that way: "PART 1 OF 4".
  const lower = text.toLowerCase();
  const part = (i: number, from = 0) => lower.indexOf(copy("sp.part.count", { i, d: STOPS.length }).toLowerCase(), from);
  const quoted = text.indexOf(SAID);
  expect(quoted > part(1) && quoted < part(2), "quoted at stop 1, Deals (D36)").toBe(true);
  let from = 0;
  for (const [i, name] of STOPS.entries()) {
    from = part(i + 1, from);
    expect(from, `Part ${i + 1} of ${STOPS.length}`).toBeGreaterThanOrEqual(0);
    const firstAfter = Math.min(...STOPS.map((s) => text.indexOf(s, from)).filter((x) => x >= 0));
    expect(text.indexOf(name, from), `stop ${i + 1} is ${name}`).toBe(firstAfter);
  }
}

for (const theme of [{ name: "light", time: "10:00" }, { name: "dark", time: "22:00" }]) {
  test(`Ananya gets her plan, ${theme.name} (§5.8, §11, §12)`, async ({ page, isMobile, funnelApi }) => {
    funnelApi.answerLeadWith([SLOW_OK]);
    await runToPlan(page, theme.time, isMobile);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme.name);
    await expectAnanyasPlan(page, isMobile);
    expect(funnelApi.leads).toHaveLength(1);
  });
}

test.describe("a device set to dark", () => {
  test.use({ colorScheme: "dark" });
  test("gets the dark plan at 10:00 (D9)", async ({ page, isMobile, funnelApi }) => {
    funnelApi.answerLeadWith([SLOW_OK]);
    await runToPlan(page, "10:00", isMobile);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expectAnanyasPlan(page, isMobile);
  });
});
