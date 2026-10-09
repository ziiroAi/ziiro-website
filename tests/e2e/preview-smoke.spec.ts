import { expect, test } from "./fixtures";
import { copy } from "../../src/features/funnel/data/light";
import { sendContact, toContactStep } from "./helpers/flow";

/**
 * (C) Task 16, §12: one real run to the plan on a Vercel Preview. By hand, never in CI: each run sends a plan email
 * and a team alert through production's Resend account, whose free cap is 100 a day (§13.3).
 *
 *   ( set -a; . ~/.config/ziiro/builders.env; set +a; \
 *     PLAYWRIGHT_BASE_URL=https://<the preview host> SMOKE_EMAIL=<the tester's inbox> npm run test:preview )
 *
 * The bypass secret comes only from that private file, for that one command (manager ruling 12:05). It travels as a
 * header on requests to the Preview's own origin: never in a URL, where an error message would print it, and never
 * to Calendly or Cloudflare. Traces and videos are off in this file, because a trace records request headers.
 *
 * Against `vite preview` (no PLAYWRIGHT_BASE_URL) the Preview-only steps are skipped: there are no functions to send
 * to, and no vercel.json headers. The questions still run, so the spec is exercised locally.
 * Then I-T1 step 2 reads the visit, contact and plan-email rows on the Neon preview branch, and step 3 checks the
 * tester's inbox. A screen that shows the plan proves only the screen (00-index Review Focus 2).
 */
const PREVIEW_URL = process.env.PLAYWRIGHT_BASE_URL;
const SMOKE_EMAIL = process.env.SMOKE_EMAIL;
const BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const IMMUTABLE = "public, max-age=31536000, immutable";
/** The send waits out LEAD_BUDGET_MS (16 s) at worst; the plan then renders. */
const PLAN_TIMEOUT_MS = 20_000;

const previewStep = (title: string, body: () => Promise<void>) =>
  PREVIEW_URL ? test.step(title, body) : test.step.skip(`${title} (Preview only)`, body);

test.use({ trace: "off", video: "off" });

test("one real run to the plan on the Preview (§12)", { tag: "@preview" }, async ({ page }) => {
  test.setTimeout(90_000);
  const bypassHeader = PREVIEW_URL && BYPASS ? { "x-vercel-protection-bypass": BYPASS } : undefined;
  if (PREVIEW_URL) expect(SMOKE_EMAIL, "set SMOKE_EMAIL to the tester's inbox").toBeTruthy();
  if (PREVIEW_URL && bypassHeader) {
    await page.route(`${new URL(PREVIEW_URL).origin}/**`, (route) =>
      route.continue({ headers: { ...route.request().headers(), ...bypassHeader } }),
    );
  }

  await page.goto("/");
  await toContactStep(page);

  await previewStep("send the contact step to the real functions, and get the plan", async () => {
    await sendContact(page, SMOKE_EMAIL);
    await expect(page.getByText(copy("sp.pilot"), { exact: true }).first()).toBeVisible({ timeout: PLAN_TIMEOUT_MS });
  });

  await previewStep("the plan's hero comes from /spine/ under the immutable cache rule (lane B)", async () => {
    const hero = await page.evaluate(() =>
      performance.getEntriesByType("resource").map((e) => e.name).find((name) => name.includes("/spine/r20/")),
    );
    expect(hero, "the hero still loaded").toBeTruthy();
    const res = await page.request.get(hero!, { headers: bypassHeader });
    expect(res.headers()["cache-control"]).toBe(IMMUTABLE);
  });
});
