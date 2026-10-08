import { test as base, expect, type Route } from "@playwright/test";
import type { LeadRequest, LeadResponse, VisitRequest, VisitResponse } from "../../src/features/funnel/data/contract";

/**
 * (C) /api/funnel/* answered by route mocks for every spec (spec §12). `vite preview` runs no
 * functions, so without these every background save would 404. Specs tagged @preview talk to the
 * real functions on a Vercel Preview instead (Task 16).
 */

/** One /lead answer: a status and body, optionally held for delayMs; or "no-answer" (held past LEAD_TIMEOUT_MS, then dropped). */
export type LeadAnswer = { status: number; body?: LeadResponse; delayMs?: number } | "no-answer";

export interface FunnelApi {
  visits: VisitRequest[];
  leads: LeadRequest[];
  /** Answers for the next /lead calls, in order. Once they run out, /lead answers 200. */
  answerLeadWith(answers: LeadAnswer[]): void;
}

const VISIT_OK: VisitResponse = { success: true, country: "IN" };
const LEAD_OK: LeadResponse = { success: true, planEmail: "sent" };
const NO_ANSWER_MS = 12_000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const reply = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

export const test = base.extend<{ funnelApi: FunnelApi }>({
  funnelApi: [
    async ({ page }, use, testInfo) => {
      const queue: LeadAnswer[] = [];
      const api: FunnelApi = { visits: [], leads: [], answerLeadWith: (answers) => void queue.push(...answers) };
      if (testInfo.tags.includes("@preview")) return use(api);

      await page.route("**/api/funnel/visit", (route) => {
        api.visits.push(route.request().postDataJSON() as VisitRequest);
        return reply(route, 200, VISIT_OK);
      });
      await page.route("**/api/funnel/lead", async (route) => {
        api.leads.push(route.request().postDataJSON() as LeadRequest);
        const next = queue.shift() ?? { status: 200, body: LEAD_OK };
        if (next === "no-answer") {
          await wait(NO_ANSWER_MS);
          return route.abort("timedout").catch(() => undefined);
        }
        if (next.delayMs) await wait(next.delayMs);
        return reply(route, next.status, next.body ?? { success: false });
      });
      await use(api);
    },
    { auto: true },
  ],
});

export { expect };
