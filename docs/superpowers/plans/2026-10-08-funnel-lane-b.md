# Business Spine Funnel, Lane B (Server and Data) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the funnel's server side: `/api/funnel/visit` and `/api/funnel/lead` on Neon, the plan email and the team alerts through Resend, the shared contact checks, the `_lib.ts` changes, the `/spine/` cache rule, `.env.example`, the saved queries and the Privacy text.

**Architecture:** Two thin handlers sit on four helper files. `_validate.ts` checks every body against the shared contract (`src/features/funnel/data/contract.ts`). `_sql.ts` and `_db.ts` talk to Neon over HTTP. `_email.ts` writes the emails from IDs and the shared copy module. `visit.ts` and `lead.ts` export `createVisitHandler(deps)` and `createLeadHandler(deps)`, so every test runs on fakes, without a network; `POST` wires in the real database, Resend and Turnstile. `api/_lib.ts` gains a few options that `/contact` doesn't use, so `/contact` keeps working as it does today.

**Tech Stack:** TypeScript 5.9 (strict, through `tsconfig.api.json`), Vercel Functions on Node.js with the Web handler, `@neondatabase/serverless` v1 (`neon(url)`, `sql.query(text, params)`, `sql.transaction([...])`), Resend's REST API, Cloudflare Turnstile's siteverify, Vitest (node environment; jsdom for the one page test), React 18 (`react-dom/server`) for the Privacy test.

**Spec:** `docs/superpowers/specs/2026-10-07-business-spine-funnel-design.md`: §7 (the plan email and the alert), §9 (data), §10 (errors), §12 (tests), §13.2 to §13.6, Appendix C (schema and saved queries). Read it together with `docs/superpowers/plans/2026-10-08-funnel-00-index.md`. Its §1.2 (`contract.ts`), §1.3 (the seams and the `/lead` answer table) and §2 (calendar, needs, branch rules) are binding here.

## Global Constraints

- Everything in 00-index "Global Constraints" applies.
- Lane B commits only these files: `api/funnel/**`, `api/_lib.ts`, `src/shared/lib/contact-checks.ts` and its test, `db/funnel.sql`, `db/funnel-queries.sql`, `vercel.json`, `.env.example`, `src/pages/Privacy.tsx` and its test, `tests/api/**`, `tests/fixtures/ananya-lead.json`, `tests/fixtures/ananya-email.txt`. Never `package.json` (00-index §2.3).
- Logging policy (`api/_lib.ts`, §13.2): a log line never carries a submitted field, the IP, a secret or a provider's error body. Event names, statuses, error names and field *names* only.
- `/contact` behaves exactly as today: same checks, same answers, same email.
- Both funnel functions keep `export const config = { runtime: "nodejs", maxDuration: 15 }`, and `vercel.json` keeps `"regions": ["sin1"]` (P0-T5).
- Body caps: `/visit` 4 KB (`LIMITS.visitBodyBytes`), `/lead` 10 KB (`LIMITS.leadBodyBytes`).
- `/lead` answers exactly the statuses in 00-index §1.3: 200 `{success:true, planEmail}`, 400 `{success:false, field}`, 403, 429, 415, 502 `{success:false}`.
- Resend idempotency keys: `alert-<visitId>`, `plan-<visitId>` and `alert-failed-<visitId>`.
- The plan email is plain text with one link, from `PLAN_FROM` with Reply-To `PLAN_REPLY_TO`. Every line comes from the shared copy module (§7, §13.3).
- Secrets live in Vercel only. The Neon `builders` branch string goes in an environment variable for one command, and never in git, a commit message or a chat log.
- Before every push: `npm test`, `npm run typecheck` and `npm run build` all pass (00-index §2.3).

## Review Focus

1. **A link, web address, email address or phone number typed into the name or the words.** The plan email would carry it into a stranger's inbox. Expected: it is removed before the email is written, and the email has exactly one link, the Calendly one. Pinned by Task 1 (`cleanEcho` cases) and Task 8 ("cleans links, addresses and phone numbers out of the name and the words").
2. **Names in any script, or with no letters at all** (अनन्या, José María, 😀, 12345). Expected: a real name in any script passes; a name with no letter left after cleaning gets 400 `name`. Pinned by Task 1 (the name cases) and Task 7 (the name refusals).
3. **Phone numbers written the way people write them** (spaces, a leading 0, 0091, brackets, US formats). Expected: S7 turns them into E.164 with `toE164`; the server takes only E.164 or blank. Pinned by Task 1 (`toE164` cases) and Task 7 (the phone refusals).
4. **A double tap, or a retry while the first send is still running.** Expected: one contact, one alert and one plan email, and the second answer repeats the first. Pinned by Task 9 (the replay cases and the lost race), with I-T2 checking the screen side.
5. **A slow or down Resend or Turnstile against S8's 8 s wait.** Expected: each call is capped at 2.5 s. A Turnstile timeout counts as refused (403 on a first try, flagged on the second), and a Resend timeout follows the failed path. Pinned by Task 2 (the timeout becomes an `AbortSignal`), Task 3 (a timeout is "refused") and Task 9 (the plan email failing twice).

## File map

| File | Responsibility | Task |
|---|---|---|
| `src/shared/lib/contact-checks.ts` | Email, name, phone and echo checks, shared by S7 and the server | 1 |
| `api/_lib.ts` | Re-exports `isValidEmail`; body cap and rate limit take a limit; Resend text, keys and timeout; Turnstile outcomes | 1, 2, 3 |
| `vercel.json`, `.env.example` | `/spine/` cache rule; the funnel's variables | 4 |
| `api/funnel/_validate.ts` | `parseVisit`, `parseLead`, `visitIdOf`, `countryOf`, `isBot` | 5, 7 |
| `api/funnel/_sql.ts`, `api/funnel/_db.ts` | The four statements; `createDb`, `toVisitRecord` | 6 |
| `api/funnel/visit.ts` | `POST /api/funnel/visit` | 6 |
| `api/funnel/_email.ts` | `buildPlanEmail`, `buildAlertEmail`, `buildSendByHandAlert`, `alertRecipients` | 8 |
| `api/funnel/lead.ts` | `POST /api/funnel/lead` | 9 |
| `tests/fixtures/ananya-lead.json`, `tests/fixtures/ananya-email.txt` | Ananya's `/lead` body and golden email | 7, 10 |
| `src/pages/Privacy.tsx` | The funnel's privacy text (B6) | 11 |
| `db/funnel-queries.sql` | The nine saved queries | 12 |

## Order and dependencies

| Day (00-index §2.1) | Tasks | Needs from other lanes |
|---|---|---|
| 1, afternoon | 1, 2, 3, 4 | phase 0 only. Push Task 1 and Task 4 as soon as they're green: lane A's S7 imports `contact-checks.ts` on day 1, and lane D's stills need the `/spine/` rule |
| 2 | 5, 6, 7 | lane C's `jobIdsFor` (day 1) for Task 6. `/visit` must be on the Preview by the end of day 2 |
| 3 | 8, 9 | lane C's copy lines, `agentById`, `departments`, `stopsFor`, `calendlyUrl` (day 2) |
| 4 | 9 finished, 10, 11 | lane C's `composePlan` (day 3) for Task 10. `/lead` must be on the Preview by the end of day 4 |
| 5, morning | 12 | the Neon `builders` branch string (P0-T1 item 4) |

If a lane C export isn't on the branch yet, follow 00-index §2.2: write the test, mock `src/features/funnel/data/index.ts` with `vi.mock` for that run only, finish the task, and land it once the export is in. Never write a copy of lane C's code.

---

### Task 1: Shared contact checks

**Files:**
- Create: `src/shared/lib/contact-checks.ts`
- Modify: `api/_lib.ts` (remove the `disposableDomains` set and `isValidEmail`; re-export the shared one)
- Test: `src/shared/lib/contact-checks.test.ts`, `tests/api/lib.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (the 00-index §1.3 seam; lane A's S7 imports these):
  - `isValidEmail(email: string): boolean`, `isDisposableEmail(email: string): boolean`, `DISPOSABLE_DOMAINS: ReadonlySet<string>`
  - `cleanEcho(text: string, max: number): string`, `cleanName(raw: string): string`, `isValidName(raw: string): boolean`
  - `isE164(value: string): boolean`, `toE164(raw: string, dialCode: string): string | null`
  - `api/_lib.ts` keeps exporting `isValidEmail`, now the same function.

- [ ] **Step 1: Write the failing tests**

`src/shared/lib/contact-checks.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  DISPOSABLE_DOMAINS, cleanEcho, cleanName, isDisposableEmail, isE164, isValidEmail, isValidName, toE164,
} from "./contact-checks";

const ANANYA_WORDS = "Enquiries come in, but by the time someone calls back they've gone cold.";

describe("isValidEmail", () => {
  it("accepts an ordinary address", () => {
    expect(isValidEmail("ananya@example.com")).toBe(true);
  });

  it.each(["a@b", "a b@example.com", "<a>@example.com", `${"a".repeat(250)}@example.com`])("refuses %j", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });

  it("refuses a throwaway domain in any case, from the list /contact has always used", () => {
    expect(isDisposableEmail("x@MAILINATOR.com")).toBe(true);
    expect(isValidEmail("x@mailinator.com")).toBe(false);
    expect(DISPOSABLE_DOMAINS.size).toBe(54);
  });
});

describe("cleanEcho (§13.3)", () => {
  it("keeps ordinary words, years and money as they are", () => {
    expect(cleanEcho(ANANYA_WORDS, 140)).toBe(ANANYA_WORDS);
    expect(cleanEcho("Since 2019 we made ₹50,000 a month.", 140)).toBe("Since 2019 we made ₹50,000 a month.");
    expect(cleanEcho("We do 3.5 lakh a month, e.g. tiles.", 140)).toBe("We do 3.5 lakh a month, e.g. tiles.");
  });

  it.each([
    ["see https://evil.example/x?y=1 now", "see now"],
    ["go to www.evil.com today", "go to today"],
    ["mail me at x@evil.com please", "mail me at please"],
    ["visit evil.co.in/offer today", "visit today"],
    ["call 98765 43210 now", "call now"],
    ["फोन ९८७६५४३२१० करो", "फोन करो"],
    ["one\ntwo\r\nthree", "one two three"],
    ["https://evil.com", ""],
  ])("cleans %j to %j", (input, output) => {
    expect(cleanEcho(input, 140)).toBe(output);
  });

  it("cuts at the limit with an ellipsis, without splitting an emoji", () => {
    const words = cleanEcho("word ".repeat(60), 140);
    expect(Array.from(words)).toHaveLength(140);
    expect(words.endsWith("…")).toBe(true);
    expect(cleanEcho("😀".repeat(200), 140)).toBe(`${"😀".repeat(139)}…`);
  });
});

describe("names (§13.2, §13.3)", () => {
  it.each(["Ananya", "अनन्या", "José María", "  Ananya  ", "a".repeat(80)])("accepts %j", (name) => {
    expect(isValidName(name)).toBe(true);
  });

  it.each(["", "   ", "😀", "12345", "https://evil.com", "a".repeat(81)])("refuses %j", (name) => {
    expect(isValidName(name)).toBe(false);
  });

  it("prints a name on one line, with links removed", () => {
    expect(cleanName("  Ananya \n Rao ")).toBe("Ananya Rao");
    expect(cleanName("Ananya https://evil.com")).toBe("Ananya");
  });
});

describe("phones (§4.4)", () => {
  it.each([
    ["+91 98765 43210", "+91", "+919876543210"],
    ["098765 43210", "+91", "+919876543210"],
    ["0091 98765 43210", "+91", "+919876543210"],
    ["(415) 555-0132", "+1", "+14155550132"],
  ])("turns %j with %s into %s", (raw, dialCode, e164) => {
    expect(toE164(raw, dialCode)).toBe(e164);
  });

  it.each(["", "12", "+0123456789", "abc"])("gives null for %j", (raw) => {
    expect(toE164(raw, "+91")).toBeNull();
  });

  it("checks E.164 strictly", () => {
    expect(isE164("+919876543210")).toBe(true);
    expect(isE164("919876543210")).toBe(false);
  });
});
```

`tests/api/lib.test.ts` (Tasks 2 and 3 add to this file):

```ts
import { describe, expect, it } from "vitest";
import * as lib from "../../api/_lib";
import * as checks from "../../src/shared/lib/contact-checks";

describe("isValidEmail in api/_lib.ts", () => {
  it("is the shared check, so /contact, S7 and /lead agree", () => {
    expect(lib.isValidEmail).toBe(checks.isValidEmail);
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run src/shared/lib/contact-checks.test.ts tests/api/lib.test.ts`
Expected: FAIL, with `Failed to resolve import "./contact-checks"` and `Failed to resolve import "../../src/shared/lib/contact-checks"`.

- [ ] **Step 3: Write `src/shared/lib/contact-checks.ts`**

```ts
/**
 * (C) Contact checks shared by the S7 form and /api/funnel/lead (spec §4.4, §13.3).
 * No imports, so the browser bundle and the functions bundle the same file.
 */

/** Throwaway-mail domains, moved here unchanged from api/_lib.ts. */
export const DISPOSABLE_DOMAINS: ReadonlySet<string> = new Set([
  "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email", "yopmail.com",
  "sharklasers.com", "guerrillamailblock.com", "grr.la", "guerrillamail.info", "spam4.me",
  "trashmail.com", "trashmail.me", "trashmail.net", "dispostable.com", "maildrop.cc",
  "10minutemail.com", "10minutemail.net", "10minutemail.org", "minutemail.com", "temp-mail.org",
  "fakeinbox.com", "mailnull.com", "spamgourmet.com", "spamgourmet.net", "discard.email",
  "mailnesia.com", "spamspot.com", "spamthisplease.com", "byom.de", "getnada.com",
  "anonaddy.com", "tempinbox.com", "tempr.email", "emailondeck.com", "getairmail.com",
  "filzmail.com", "zetmail.com", "mohmal.com", "owlpic.com", "cfl.fr",
  "spamfree24.org", "spamfree24.de", "spamfree24.eu", "spamfree24.info", "spaml.de",
  "spaml.com", "disigntime.com", "no-spam.ws", "antispam24.de", "wegwerfmail.de",
  "wegwerfmail.net", "wegwerfmail.org", "abcmail.email", "armyspy.com",
]);

const EMAIL_SHAPE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const MAX_EMAIL = 254;

export const isDisposableEmail = (email: string): boolean =>
  DISPOSABLE_DOMAINS.has((email.split("@")[1] ?? "").toLowerCase());

/** The rule /contact has always used, now shared with S7 and /api/funnel/lead. */
export const isValidEmail = (email: string): boolean =>
  EMAIL_SHAPE.test(email) && email.length <= MAX_EMAIL && !isDisposableEmail(email);

const CONTROL = /[\u0000-\u001f\u007f]/gu;
const LINK = /\b(?:https?:\/\/|www\.)\S*/giu;
const EMAIL_ADDRESS = /\S+@\S+/gu;
const WEB_ADDRESS = /[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.\p{L}{2,24}(?![\p{L}\p{N}])(?:\/\S*)?/gu;
const LONG_DIGITS = /(?:\p{Nd}[\s().-]?){7,}/gu;
const SPACES = /\s+/gu;

/**
 * §13.3: anyone can type any address, so an echo of their words or name must not carry
 * a link. Drops links, web and email addresses and runs of 7 or more digits, squeezes the
 * spaces, then cuts at max characters, the last one being "…".
 */
export const cleanEcho = (text: string, max: number): string => {
  const cleaned = text
    .replace(CONTROL, " ")
    .replace(LINK, " ")
    .replace(EMAIL_ADDRESS, " ")
    .replace(WEB_ADDRESS, " ")
    .replace(LONG_DIGITS, " ")
    .replace(SPACES, " ")
    .trim();
  const chars = Array.from(cleaned);
  return chars.length <= max ? cleaned : `${chars.slice(0, max - 1).join("").trimEnd()}…`;
};

const MAX_NAME = 80;
const HAS_LETTER = /\p{L}/u;

/** The name as the emails print it (§13.3). */
export const cleanName = (raw: string): string => cleanEcho(raw, MAX_NAME);

/** 1 to 80 characters, with at least one letter left after cleaning (§13.2). */
export const isValidName = (raw: string): boolean => {
  const trimmed = raw.trim();
  return Array.from(trimmed).length <= MAX_NAME && HAS_LETTER.test(cleanName(trimmed));
};

const E164 = /^\+[1-9][0-9]{6,14}$/;
const PHONE_PUNCTUATION = /[\s().-]/gu;

export const isE164 = (value: string): boolean => E164.test(value);

/** "+91 98765 43210", "0091 98765 43210", or "098765 43210" with dialCode "+91" all give "+919876543210". */
export const toE164 = (raw: string, dialCode: string): string | null => {
  const compact = raw.replace(PHONE_PUNCTUATION, "");
  if (compact === "") return null;
  const international = compact.startsWith("+")
    ? compact
    : compact.startsWith("00")
      ? `+${compact.slice(2)}`
      : `${dialCode}${compact.replace(/^0+/u, "")}`;
  return isE164(international) ? international : null;
};
```

- [ ] **Step 4: Point `api/_lib.ts` at it**

In `api/_lib.ts`:
1. Delete the whole `const disposableDomains = new Set([ … ]);` block (13 lines, the 54 domains).
2. Delete the `export const isValidEmail = (email: string) => …;` function (4 lines).
3. Directly below the header comment (the first `/** … */` block, above `const allowedOrigins`), add:

```ts

export { isValidEmail } from "../src/shared/lib/contact-checks";
```

`api/send-contact.ts` imports `isValidEmail` from `./_lib` and keeps working unchanged.

- [ ] **Step 5: Run the tests, the type check and the build**

```bash
npx vitest run src/shared/lib/contact-checks.test.ts tests/api/lib.test.ts
npm run typecheck && npm run build
```

Expected: 38 tests pass (37 and 1). `typecheck` and `build` exit 0.

- [ ] **Step 6: Commit and push**

```bash
git add src/shared/lib/contact-checks.ts src/shared/lib/contact-checks.test.ts api/_lib.ts tests/api/lib.test.ts
git commit -m "feat(funnel): share the contact checks between S7, /contact and /lead"
git pull --rebase && git push
```

Tell the manager that `contact-checks.ts` is on the branch (lane A's S7 needs it on day 1).

- [ ] **Step 7: Check /contact on the Preview**

`api/send-contact.ts` runs on Edge and now bundles a file from `src/`. Open the PR Preview's `/contact`, send one message with your own email, and expect the form's success message and the email in the team inbox. If the Preview build fails on that import instead, stop and tell the manager: `/contact` must keep working (Global Constraints).

### Task 2: `_lib.ts`: the body cap, the rate limit and Resend options

**Files:**
- Modify: `api/_lib.ts` (header comment, `isRateLimited`, `readJson`, `sendResendEmail`)
- Test: `tests/api/lib.test.ts`

**Interfaces:**
- Consumes: Task 1's `api/_lib.ts`.
- Produces:
  - `isRateLimited(key: string, max = 5): boolean`
  - `readJson(req: Request, maxBytes = 10_000): Promise<any>`
  - `sendResendEmail(opts: { apiKey; from; to: string[]; subject; html?; text?; replyTo?; idempotencyKey?; timeoutMs? }): Promise<{ id: string | null }>`, which throws `Error("sendResendEmail needs html or text")` when there's no body, and throws `UpstreamError("resend", status)` as before.

- [ ] **Step 1: Add the failing tests to `tests/api/lib.test.ts`**

Change the first import line to `import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";`, add `import { readFileSync } from "node:fs";` above it, and append:

```ts
describe("readJson", () => {
  const request = (body: string) => new Request("https://ziiroai.com/api/x", { method: "POST", body });

  it("keeps the 10 KB cap by default", async () => {
    await expect(lib.readJson(request(JSON.stringify({ a: "x".repeat(9_000) })))).resolves.toHaveProperty("a");
    await expect(lib.readJson(request("x".repeat(10_001)))).rejects.toThrow("Payload too large");
  });

  it("takes a smaller cap, as /api/funnel/visit does", async () => {
    await expect(lib.readJson(request("x".repeat(5_000)), 4_096)).rejects.toThrow("Payload too large");
  });
});

describe("isRateLimited", () => {
  it("allows max calls per key in 10 minutes, then refuses", () => {
    const key = `test-${Math.random()}`;
    expect([1, 2, 3].map(() => lib.isRateLimited(key, 2))).toEqual([false, false, true]);
  });

  it("still defaults to 5, the /contact setting", () => {
    const key = `test-${Math.random()}`;
    expect(Array.from({ length: 6 }, () => lib.isRateLimited(key))).toEqual([false, false, false, false, false, true]);
  });
});

describe("sendResendEmail", () => {
  const fetchMock = vi.fn();
  const call = () => fetchMock.mock.calls[0][1] as RequestInit & { headers: Record<string, string> };

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends text with an idempotency key and a timeout, and returns Resend's id", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: "re_1" })));
    const out = await lib.sendResendEmail({
      apiKey: "k", from: "a@ziiroai.com", to: ["b@example.com"], subject: "s", text: "t",
      idempotencyKey: "plan-1", timeoutMs: 2_500,
    });
    expect(out).toEqual({ id: "re_1" });
    expect(JSON.parse(String(call().body))).toEqual({ from: "a@ziiroai.com", to: ["b@example.com"], subject: "s", text: "t" });
    expect(call().headers["Idempotency-Key"]).toBe("plan-1");
    expect(call().signal).toBeInstanceOf(AbortSignal);
  });

  it("sends /contact's html as before, with no key and no timeout", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: "re_2" })));
    await lib.sendResendEmail({
      apiKey: "k", from: "a@ziiroai.com", to: ["b@example.com"], subject: "s", html: "<p>h</p>", replyTo: "v@example.com",
    });
    expect(JSON.parse(String(call().body))).toEqual({
      from: "a@ziiroai.com", to: ["b@example.com"], subject: "s", html: "<p>h</p>", reply_to: "v@example.com",
    });
    expect(call().headers).not.toHaveProperty("Idempotency-Key");
    expect(call().signal).toBeUndefined();
  });

  it("throws UpstreamError with Resend's status", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ name: "validation_error" }), { status: 422 }));
    await expect(lib.sendResendEmail({ apiKey: "k", from: "a", to: ["b"], subject: "s", text: "t" }))
      .rejects.toMatchObject({ provider: "resend", status: 422 });
  });

  it("throws UpstreamError with status 0 when Resend can't be reached or times out", async () => {
    fetchMock.mockRejectedValue(new DOMException("timed out", "TimeoutError"));
    await expect(lib.sendResendEmail({ apiKey: "k", from: "a", to: ["b"], subject: "s", text: "t", timeoutMs: 1 }))
      .rejects.toMatchObject({ provider: "resend", status: 0 });
  });

  it("refuses an email with no body, without calling Resend", async () => {
    await expect(lib.sendResendEmail({ apiKey: "k", from: "a", to: ["b"], subject: "s" })).rejects.toThrow("needs html or text");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("the header comment", () => {
  it("no longer says nothing is stored, and points at api/funnel/ (§13.3)", () => {
    const source = readFileSync(new URL("../../api/_lib.ts", import.meta.url), "utf8");
    expect(source).not.toContain("does NOT persist to a database");
    expect(source).toContain("api/funnel/");
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run tests/api/lib.test.ts`
Expected: FAIL. `readJson` ignores the 4 096 cap, `isRateLimited(key, 2)` gives `[false, false, false]`, no `text` or `Idempotency-Key` is sent, the no-body case calls Resend, and the header test still finds "does NOT persist to a database".

- [ ] **Step 3: Make the changes in `api/_lib.ts`**

1. Replace the header comment (the first `/** … */` block) with:

```ts
/**
 * Shared helpers for the site's functions: api/send-contact.ts (Edge) and the
 * funnel's api/funnel/visit.ts and api/funnel/lead.ts (Node.js, region sin1).
 * Files prefixed with "_" are bundled into functions but never routed themselves.
 *
 * /contact delivers mail through Resend and keeps no copy. The Supabase insert
 * it replaced was the single point of failure whenever the free project
 * auto-paused, silently swallowing every submission. The funnel is different on
 * purpose: it saves each lead to Neon Postgres AND sends the team alert, so a
 * lead survives either one failing. See api/funnel/ and spec §13.2.
 */
```

2. Replace `isRateLimited` with:

```ts
/** `max` defaults to the /contact setting, 5 per 10 minutes. /api/funnel/visit passes its own. */
export const isRateLimited = (key: string, max = rateLimitMax) => {
  const now = Date.now();
  const recent = (rateLimitBuckets.get(key) ?? []).filter((time) => now - time < rateLimitWindowMs);
  if (recent.length >= max) {
    rateLimitBuckets.set(key, recent);
    return true;
  }
  recent.push(now);
  rateLimitBuckets.set(key, recent);
  return false;
};
```

3. Replace `readJson` with:

```ts
const maxBodyBytes = 10_000;

/** `maxBytes` defaults to the 10 KB cap /contact and /api/funnel/lead use. /api/funnel/visit passes 4 KB. */
export const readJson = async (req: Request, maxBytes = maxBodyBytes) => {
  // Cheap pre-check on the declared length before buffering. F4 noted the old
  // order let an attacker make the isolate buffer up to Vercel's 4.5MB cap for
  // a request that was then rejected anyway.
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new Error("Payload too large");
  }
  const body = await req.text();
  if (body.length > maxBytes) throw new Error("Payload too large");
  return JSON.parse(body || "{}");
};
```

4. Replace `sendResendEmail` and its doc comment with:

```ts
/**
 * Sends one email through Resend and returns its id. Throws UpstreamError on a
 * non-2xx response, or when Resend can't be reached or `timeoutMs` runs out, so
 * the caller decides what the visitor sees. `from` defaults to Resend's shared
 * sandbox sender; set a RESEND_FROM env var to a verified-domain address (e.g.
 * "Ziiro AI <contact@ziiroai.com>") for reliable delivery to arbitrary recipients.
 *
 * Give it `html`, `text` or both. With `idempotencyKey`, Resend sends once per key
 * for 24 hours, however often it's called (spec §13.2). /contact passes neither a
 * key nor a timeout, and behaves as it always has.
 */
export const sendResendEmail = async (opts: {
  apiKey: string;
  from: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  /** Only ever pass an address that has already cleared isValidEmail. An
   *  unvalidated Reply-To is the single change that turns this endpoint into a
   *  usable spoofing primitive, which security review F4 called out by name. */
  replyTo?: string;
  idempotencyKey?: string;
  timeoutMs?: number;
}): Promise<{ id: string | null }> => {
  if (!opts.html && !opts.text) throw new Error("sendResendEmail needs html or text");
  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        "Content-Type": "application/json",
        ...(opts.idempotencyKey ? { "Idempotency-Key": opts.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: opts.from,
        to: opts.to,
        subject: opts.subject,
        ...(opts.html ? { html: opts.html } : {}),
        ...(opts.text ? { text: opts.text } : {}),
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
      ...(opts.timeoutMs ? { signal: AbortSignal.timeout(opts.timeoutMs) } : {}),
    });
  } catch (error) {
    // Resend unreachable: DNS, TLS, timeout. Same class of outcome for the
    // visitor as a 500 from Resend, so it becomes the same typed error and the
    // handler does not have to care which it was.
    logEvent("error", "resend.unreachable", {
      name: error instanceof Error ? error.name : "unknown",
    });
    throw new UpstreamError("resend", 0);
  }

  if (!res.ok) {
    // Status and error NAME only. Resend echoes addresses in some message
    // bodies, so the body itself must not reach the log.
    const data = (await res.json().catch(() => ({}))) as { name?: string };
    logEvent("error", "resend.rejected", {
      upstreamStatus: res.status,
      upstreamName: typeof data.name === "string" ? data.name : null,
    });
    throw new UpstreamError("resend", res.status);
  }
  const data = (await res.json().catch(() => ({}))) as { id?: unknown };
  return { id: typeof data.id === "string" ? data.id : null };
};
```

- [ ] **Step 4: Run the tests, the type check and the build**

```bash
npx vitest run tests/api/lib.test.ts
npm run typecheck && npm run build
```

Expected: 11 tests pass. `typecheck` and `build` exit 0 (`send-contact.ts` doesn't read the return value).

- [ ] **Step 5: Commit**

```bash
git add api/_lib.ts tests/api/lib.test.ts
git commit -m "feat(funnel): let _lib take a body cap, a rate limit, plain text, idempotency keys and a timeout"
```

### Task 3: Turnstile outcomes

**Files:**
- Modify: `api/_lib.ts` (`verifyTurnstile` and its doc comment)
- Test: `tests/api/lib.test.ts`

**Interfaces:**
- Consumes: `logEvent` in `api/_lib.ts`.
- Produces:
  - `type TurnstileOutcome = "passed" | "missing" | "refused"`
  - `turnstileOutcome(token: string | undefined, ip: string, opts?: { action?: string; timeoutMs?: number }): Promise<TurnstileOutcome>`
  - `verifyTurnstile(token: string, ip: string): Promise<boolean>`, unchanged for `/contact`

- [ ] **Step 1: Append the failing tests to `tests/api/lib.test.ts`**

```ts
describe("turnstileOutcome (§13.2 step 5, §13.3)", () => {
  const fetchMock = vi.fn();
  const cloudflare = (body: object) => fetchMock.mockResolvedValue(new Response(JSON.stringify(body)));

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("says missing when no token came, without calling Cloudflare", async () => {
    expect(await lib.turnstileOutcome(undefined, "203.0.113.7")).toBe("missing");
    expect(await lib.turnstileOutcome("", "203.0.113.7")).toBe("missing");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("passes a good token made for this form", async () => {
    cloudflare({ success: true, action: "funnel_lead" });
    expect(await lib.turnstileOutcome("t", "203.0.113.7", { action: "funnel_lead" })).toBe("passed");
  });

  it("passes when Cloudflare reports no action, as its test keys do", async () => {
    cloudflare({ success: true });
    expect(await lib.turnstileOutcome("t", "203.0.113.7", { action: "funnel_lead" })).toBe("passed");
  });

  it("refuses a token made for another form", async () => {
    cloudflare({ success: true, action: "contact" });
    expect(await lib.turnstileOutcome("t", "203.0.113.7", { action: "funnel_lead" })).toBe("refused");
  });

  it("refuses what Cloudflare refuses", async () => {
    cloudflare({ success: false, "error-codes": ["timeout-or-duplicate"] });
    expect(await lib.turnstileOutcome("t", "203.0.113.7")).toBe("refused");
  });

  it("refuses when Cloudflare doesn't answer in time", async () => {
    fetchMock.mockRejectedValue(new DOMException("timed out", "TimeoutError"));
    expect(await lib.turnstileOutcome("t", "203.0.113.7", { timeoutMs: 2_500 })).toBe("refused");
    expect((fetchMock.mock.calls[0][1] as RequestInit).signal).toBeInstanceOf(AbortSignal);
  });

  it("refuses, and logs the variable's name, when the secret isn't set", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect(await lib.turnstileOutcome("t", "203.0.113.7")).toBe("refused");
    expect(String(vi.mocked(console.error).mock.calls[0]?.[0])).toContain("TURNSTILE_SECRET_KEY");
  });

  it("keeps verifyTurnstile, /contact's check, as a yes or no", async () => {
    cloudflare({ success: true });
    expect(await lib.verifyTurnstile("t", "203.0.113.7")).toBe(true);
    cloudflare({ success: false });
    expect(await lib.verifyTurnstile("t", "203.0.113.7")).toBe(false);
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run tests/api/lib.test.ts`
Expected: FAIL, with `lib.turnstileOutcome is not a function` in 7 tests. The `verifyTurnstile` test passes already.

- [ ] **Step 3: Replace `verifyTurnstile` and its doc comment in `api/_lib.ts`**

```ts
const siteverifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** "missing": no token came. "refused": Cloudflare said no, didn't answer in time, or the secret isn't set. */
export type TurnstileOutcome = "passed" | "missing" | "refused";

/**
 * Verifies a Cloudflare Turnstile token server-side.
 *
 * This is the control that replaces the in-process Map as the primary defence:
 * it is per-submission, and a fresh isolate cannot reset it the way it resets a
 * counter. Fails CLOSED. A missing secret, a network error or a malformed
 * response are all "refused", because the alternative is an endpoint that
 * silently becomes an open relay the moment configuration drifts.
 *
 * "missing" is told apart from "refused" because /api/funnel/lead flags the two
 * differently on a second try (§13.2). `action`, when given, must match the
 * widget's; Cloudflare's test keys report none, so an empty one passes and only
 * a different one is refused. `timeoutMs` bounds the call; /contact passes none.
 *
 * Requires TURNSTILE_SECRET_KEY. The matching public site key belongs on the
 * form as VITE_TURNSTILE_SITE_KEY.
 */
export const turnstileOutcome = async (
  token: string | undefined,
  ip: string,
  opts: { action?: string; timeoutMs?: number } = {},
): Promise<TurnstileOutcome> => {
  if (!token) return "missing";
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    logEvent("error", "turnstile.misconfigured", { missing: "TURNSTILE_SECRET_KEY" });
    return "refused";
  }
  try {
    const form = new URLSearchParams({ secret, response: token });
    // Cloudflare treats remoteip as advisory; send it only when the platform
    // gave us a real one rather than the "unknown" placeholder.
    if (ip && ip !== "unknown") form.set("remoteip", ip);
    const res = await fetch(siteverifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      ...(opts.timeoutMs ? { signal: AbortSignal.timeout(opts.timeoutMs) } : {}),
    });
    const data = (await res.json().catch(() => ({}))) as { success?: boolean; action?: string };
    if (data.success !== true) return "refused";
    return opts.action && data.action && data.action !== opts.action ? "refused" : "passed";
  } catch (error) {
    logEvent("error", "turnstile.unreachable", { name: error instanceof Error ? error.name : "unknown" });
    return "refused";
  }
};

/** /contact's check, unchanged: true only when the token passed. */
export const verifyTurnstile = async (token: string, ip: string): Promise<boolean> =>
  (await turnstileOutcome(token, ip)) === "passed";
```

- [ ] **Step 4: Run the tests, the type check and the build**

```bash
npx vitest run tests/api/lib.test.ts
npm run typecheck && npm run build
```

Expected: 19 tests pass. `typecheck` and `build` exit 0.

- [ ] **Step 5: Commit**

```bash
git add api/_lib.ts tests/api/lib.test.ts
git commit -m "feat(funnel): tell a missing Turnstile token from a refused one, and check the action"
```

### Task 4: The `/spine/` cache rule and `.env.example`

**Files:**
- Modify: `vercel.json` (one `headers` rule), `.env.example` (header comment and a funnel block)
- Test: `tests/api/config.test.ts`

**Interfaces:**
- Produces: `/spine/*` served with `Cache-Control: public, max-age=31536000, immutable` (lane D's stills, day 1); `DATABASE_URL`, `PLAN_FROM` and `PLAN_REPLY_TO` documented (§13.6).

- [ ] **Step 1: Write the failing test**

`tests/api/config.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import vercel from "../../vercel.json";

const env = readFileSync(new URL("../../.env.example", import.meta.url), "utf8");
const sources = vercel.headers.map((rule) => rule.source);

describe("vercel.json", () => {
  it("caches the spine stills for a year, as immutable files (§13.10)", () => {
    const rule = vercel.headers.find((candidate) => candidate.source === "/spine/(.*)");
    expect(rule?.headers).toEqual([{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]);
  });

  it("puts the spine rule before the catch-all", () => {
    expect(sources.indexOf("/spine/(.*)")).toBeGreaterThan(-1);
    expect(sources.indexOf("/spine/(.*)")).toBeLessThan(sources.indexOf("/(.*)"));
  });
});

describe(".env.example (§13.6)", () => {
  it("lists the funnel's variables", () => {
    for (const name of ["DATABASE_URL=", "PLAN_FROM=", "PLAN_REPLY_TO="]) expect(env).toContain(`\n${name}`);
  });

  it("no longer says there are two edge functions and no database", () => {
    expect(env).not.toMatch(/no database/i);
    expect(env).not.toContain("two edge functions");
  });

  it("holds no secret values", () => {
    expect(env).toMatch(/\nDATABASE_URL=\n/);
    expect(env).toMatch(/\nRESEND_API_KEY=\n/);
    expect(env).toMatch(/\nTURNSTILE_SECRET_KEY=\n/);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/api/config.test.ts`
Expected: FAIL in all 5 tests: there's no `/spine/(.*)` rule, no `PLAN_FROM=` or `DATABASE_URL=`, and the header still says "no database".

- [ ] **Step 3: Add the rule to `vercel.json`**

In `headers`, directly after the `/media/(.*)` rule, add:

```json
    {
      "source": "/spine/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    },
```

Lane D names every file under `/spine/` by its content (the `r17` folder), so a changed still gets a new path and the year-long cache never serves a stale one.

- [ ] **Step 4: Update `.env.example`**

Replace the first ten lines (from `# Environment contract for the two edge functions.` down to `# true for the hours that send-contact.ts was deleted, and is no longer.`) with:

```bash
# Environment contract for the site's functions. Copy to .env for local work.
#
# Four functions and one database (Neon Postgres, for the funnel). No accounts
# or sessions:
#   api/geo.ts            takes NO configuration at all. It reads a country code
#                         off a request header Vercel sets. Nothing to set, and
#                         nothing to get wrong.
#   api/send-contact.ts   (Edge) needs RESEND_API_KEY and TURNSTILE_SECRET_KEY,
#                         reads RESEND_FROM and TEAM_INBOX, and its form needs
#                         VITE_TURNSTILE_SITE_KEY at build time.
#   api/funnel/visit.ts   (Node.js, sin1) needs DATABASE_URL.
#   api/funnel/lead.ts    (Node.js, sin1) needs DATABASE_URL, RESEND_API_KEY and
#                         TURNSTILE_SECRET_KEY, and reads PLAN_FROM, PLAN_REPLY_TO,
#                         RESEND_FROM and TEAM_INBOX.
#
# This file previously said the site needed no environment variables. That was
# true for the hours that send-contact.ts was deleted, and is no longer.
```

Then append at the end of the file:

```bash


# ── THE FUNNEL: api/funnel/visit.ts and api/funnel/lead.ts (spec §13.6) ──────

# Neon Postgres. SET BY THE NEON INTEGRATION, not by hand: the Vercel
# Marketplace install writes it for Production, and each Preview gets its own
# copy-on-write branch with its own value. For local work, paste a branch's
# string here and never commit it.
# MISSING: /visit answers 502 and saves nothing. /lead still sends the alert
# and the plan email, so the lead survives, but there's no row to query.
DATABASE_URL=

# Who the plan email comes from. Resend only sends from a verified domain, so
# this needs ziiroai.com verified first (B1). Unset, it falls back to RESEND_FROM.
PLAN_FROM="Adyut at ziiro <adyut@ziiroai.com>"

# Where a reply to the plan email goes: the inbox Adyut reads. Until he sends
# that address (B4), the team inbox (D7). The lead alert goes here too, once if
# it's the same address as TEAM_INBOX. Unset, it falls back to TEAM_INBOX.
PLAN_REPLY_TO=ziiro.work@gmail.com
```

- [ ] **Step 5: Run the test and the build**

```bash
npx vitest run tests/api/config.test.ts
npm run build
```

Expected: 5 tests pass. The build exits 0.

- [ ] **Step 6: Commit and push**

```bash
git add vercel.json .env.example tests/api/config.test.ts
git commit -m "feat(funnel): cache /spine/ for a year and document the funnel's variables"
git pull --rebase && git push
```

Tell the manager that the `/spine/` rule is on the branch (lane D's stills, day 1).

### Task 5: `parseVisit`

**Files:**
- Create: `api/funnel/_validate.ts` (the shared helpers and `parseVisit`; Task 7 adds `parseLead`)
- Test: `tests/api/funnel/visit-fields.ts` (a fixture), `tests/api/funnel/validate-visit.test.ts`

**Interfaces:**
- Consumes: `contract.ts` (all lists, `LIMITS`, `isOneOf`, `VISIT_FIELD_KEYS`, `VisitFields`, `VisitRequest`).
- Produces:
  - `type Parsed<T, F extends string> = { ok: true; value: T } | { ok: false; field: F }`
  - `parseVisit(body: unknown): Parsed<VisitRequest, string>`. The field is `"payload"` for the wrong shape, then `"id"`, `"step"`, the first bad or unknown key (cut to 40 characters), then `"noticeVersion"` when it's missing.
  - `isVisitId(value: unknown): value is string` (a v4 UUID)
  - `countryOf(request: Request): string | null` (from `x-vercel-ip-country`)
  - `isBot(request: Request, webdriver: boolean | undefined): boolean`

- [ ] **Step 1: Write the fixture and the failing test**

`tests/api/funnel/visit-fields.ts`:

```ts
import type { VisitFields } from "../../../src/features/funnel/data/contract";

export const VISIT_ID = "6f1c2a7e-6c1d-4f5e-9a51-0a7c1e2d3b4f";

/** Every key /visit allows, each with an allowed value. Required<> breaks the build if the contract adds a key. */
export const FULL_VISIT_FIELDS: Required<VisitFields> = {
  noticeVersion: "2026-10-08", landingPath: "/", entryIntent: "ai-lead-generation", referrerHost: "l.instagram.com",
  utm: { source: "ig", medium: "social", campaign: "launch", term: "ai", content: "reel-1" },
  timezone: "Asia/Kolkata", locale: "en-IN", dayPart: "morning", theme: "light", deviceClass: "mobile",
  isReturning: false, segment: "business", nonOwnerReason: "learning", businessType: "interior", yearsBand: "5_10",
  teamBand: "6_20", revenueBand: "band_3", revenueCurrency: "INR", chips: ["followups"], inputMode: "mixed",
  bucketPrimary: "sales", bucketSecondary: null, bucketScores: { sales: 6, lead_gen: 2 }, template: "B",
  orderVariant: "B-convert", tier: "M", agentIds: ["deals-inbound", "deals-reply-handling"], classifierVersion: "kw-1",
  agentsVersion: "2026-10-04", secondsToResult: 48, contactErrors: ["bot", "bot"], planDepth: 2, filmPlayed: true,
  filmPct: 50, ctaFrom: "hero", ctaClicked: true, webdriver: false, planView: "still", stillReason: "reduced_motion",
  discsOpened: ["deals"],
};
```

`tests/api/funnel/validate-visit.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseVisit } from "../../../api/funnel/_validate";
import {
  AGENT_IDS, BUCKETS, BUSINESS_TYPES, CHIPS, CONTACT_ERRORS, CTA_FROM, CURRENCIES, DAY_PARTS, DEPARTMENTS,
  DEVICE_CLASSES, FILM_PCTS, INPUT_MODES, NON_OWNER_REASONS, ORDER_VARIANTS, PLAN_VIEWS, REVENUE_BANDS, SEGMENTS,
  STEPS, STILL_REASONS, TEAM_BANDS, TEMPLATES, THEMES, TIERS, YEARS_BANDS,
} from "../../../src/features/funnel/data/contract";
import { FULL_VISIT_FIELDS, VISIT_ID } from "./visit-fields";

const visit = (fields: Record<string, unknown>, step = "S3") =>
  ({ id: VISIT_ID, step, fields: { noticeVersion: "2026-10-08", ...fields } });
const fieldOf = (body: unknown): string => {
  const parsed = parseVisit(body);
  return parsed.ok ? "ok" : parsed.field;
};

describe("parseVisit (§13.2)", () => {
  it("accepts a visit carrying every allowed field", () => {
    const body = { id: VISIT_ID, step: "S9", fields: FULL_VISIT_FIELDS };
    expect(parseVisit(body)).toEqual({ ok: true, value: body });
  });

  it.each(STEPS)("accepts step %s", (step) => {
    expect(fieldOf(visit({}, step))).toBe("ok");
  });

  it.each([
    ["dayPart", DAY_PARTS], ["theme", THEMES], ["deviceClass", DEVICE_CLASSES], ["segment", SEGMENTS],
    ["nonOwnerReason", NON_OWNER_REASONS], ["businessType", BUSINESS_TYPES], ["yearsBand", YEARS_BANDS],
    ["teamBand", TEAM_BANDS], ["revenueBand", REVENUE_BANDS], ["revenueCurrency", CURRENCIES],
    ["inputMode", INPUT_MODES], ["bucketPrimary", BUCKETS], ["template", TEMPLATES],
    ["orderVariant", ORDER_VARIANTS], ["tier", TIERS], ["filmPct", FILM_PCTS], ["ctaFrom", CTA_FROM],
    ["planView", PLAN_VIEWS], ["stillReason", STILL_REASONS],
  ] as const)("accepts every %s option in the contract", (key, values) => {
    for (const value of values) expect(fieldOf(visit({ [key]: value }))).toBe("ok");
  });

  it.each([
    ["chips", CHIPS], ["agentIds", AGENT_IDS], ["discsOpened", DEPARTMENTS], ["contactErrors", CONTACT_ERRORS],
  ] as const)("accepts every %s value in the contract", (key, values) => {
    for (const value of values) expect(fieldOf(visit({ [key]: [value] }))).toBe("ok");
  });

  it.each(["problemText", "businessOther", "matchedPhrases", "name", "email", "phone"])(
    "refuses %s: nothing typed or personal travels in /visit (D13)",
    (key) => {
      expect(fieldOf(visit({ [key]: "x" }))).toBe(key);
    },
  );

  it.each([
    [{ chips: ["leads", "convert", "ads", "team"] }, "chips"],
    [{ chips: ["ads", "ads"] }, "chips"],
    [{ chips: ["Ads burn money"] }, "chips"],
    [{ agentIds: [] }, "agentIds"],
    [{ agentIds: AGENT_IDS.slice(0, 10) }, "agentIds"],
    [{ filmPct: 30 }, "filmPct"],
    [{ secondsToResult: -1 }, "secondsToResult"],
    [{ secondsToResult: 1.5 }, "secondsToResult"],
    [{ landingPath: "/?q=my words" }, "landingPath"],
    [{ referrerHost: "evil.com/path" }, "referrerHost"],
    [{ utm: { source: "ig", foo: "x" } }, "utm"],
    [{ bucketScores: { nope: 1 } }, "bucketScores"],
    [{ webdriver: "yes" }, "webdriver"],
  ])("refuses %j with field %s", (fields, field) => {
    expect(fieldOf(visit(fields))).toBe(field);
  });

  it("needs noticeVersion", () => {
    expect(fieldOf({ id: VISIT_ID, step: "S1", fields: {} })).toBe("noticeVersion");
  });

  it("reports the shape, then the id, then the step", () => {
    expect(fieldOf({ id: VISIT_ID, step: "S1", fields: { noticeVersion: "x" }, name: "A" })).toBe("payload");
    expect(fieldOf({ id: VISIT_ID, step: "S1", fields: [] })).toBe("payload");
    expect(fieldOf({ id: "123", step: "S10", fields: { noticeVersion: "x" } })).toBe("id");
    expect(fieldOf({ id: VISIT_ID, step: "S10", fields: { noticeVersion: "x" } })).toBe("step");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/api/funnel/validate-visit.test.ts`
Expected: FAIL, with `Failed to resolve import "../../../api/funnel/_validate"`.

- [ ] **Step 3: Write `api/funnel/_validate.ts`**

```ts
// Request checks for api/funnel/visit.ts and api/funnel/lead.ts (spec §13.2). Every list comes
// from the shared contract, so the server accepts exactly what the browser can send.
import {
  AGENT_IDS, BUCKETS, BUSINESS_TYPES, CHIPS, CONTACT_ERRORS, CTA_FROM, CURRENCIES, DAY_PARTS, DEPARTMENTS,
  DEVICE_CLASSES, FILM_PCTS, INPUT_MODES, LIMITS, NON_OWNER_REASONS, ORDER_VARIANTS, PLAN_VIEWS, REVENUE_BANDS,
  SEGMENTS, STEPS, STILL_REASONS, TEAM_BANDS, TEMPLATES, THEMES, TIERS, VISIT_FIELD_KEYS, YEARS_BANDS, isOneOf,
  type VisitFields, type VisitRequest,
} from "../../src/features/funnel/data/contract";

export type Parsed<T, F extends string> = { ok: true; value: T } | { ok: false; field: F };
type Check = (value: unknown) => boolean;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const onlyKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean =>
  Object.keys(value).every((key) => keys.includes(key));

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VERSION = /^[A-Za-z0-9._-]+$/;
const PATH = /^\/[A-Za-z0-9/_-]*$/;
const SLUG = /^[a-z0-9-]+$/;
const HOST = /^[A-Za-z0-9.-]+$/;
const ZONE = /^[A-Za-z0-9/_+-]+$/;
const LOCALE = /^[A-Za-z0-9-]+$/;
const ONE_LINE = /^[^\u0000-\u001f\u007f]*$/u;

const text = (pattern: RegExp, max: number): Check => (value) =>
  typeof value === "string" && value.length <= max && pattern.test(value);
const oneOf = (values: readonly (string | number)[]): Check => (value) => isOneOf(values, value);
const bool: Check = (value) => typeof value === "boolean";
const int = (min: number, max: number): Check => (value) =>
  typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
const listOf = (values: readonly string[], min: number, max: number, unique = true): Check => (value) =>
  Array.isArray(value) && value.length >= min && value.length <= max &&
  value.every((item) => isOneOf(values, item)) && (!unique || new Set(value).size === value.length);
const version = text(VERSION, LIMITS.versionChars);

const UTM_KEYS = ["source", "medium", "campaign", "term", "content"] as const;
const utm: Check = (value) =>
  isRecord(value) && onlyKeys(value, UTM_KEYS) && Object.values(value).every(text(ONE_LINE, LIMITS.utmChars));
const scores: Check = (value) =>
  isRecord(value) && onlyKeys(value, BUCKETS) && Object.values(value).every(int(0, LIMITS.bucketScoreMax));

/** One check per key. Typed over keyof VisitFields, so a key added to the contract can't go unchecked. */
const VISIT_CHECKS: Record<keyof VisitFields, Check> = {
  noticeVersion: version,
  landingPath: text(PATH, LIMITS.landingPathChars),
  entryIntent: text(SLUG, LIMITS.entryIntentChars),
  referrerHost: text(HOST, LIMITS.referrerHostChars),
  utm,
  timezone: text(ZONE, LIMITS.timezoneChars),
  locale: text(LOCALE, LIMITS.localeChars),
  dayPart: oneOf(DAY_PARTS),
  theme: oneOf(THEMES),
  deviceClass: oneOf(DEVICE_CLASSES),
  isReturning: bool,
  segment: oneOf(SEGMENTS),
  nonOwnerReason: oneOf(NON_OWNER_REASONS),
  businessType: oneOf(BUSINESS_TYPES),
  yearsBand: oneOf(YEARS_BANDS),
  teamBand: oneOf(TEAM_BANDS),
  revenueBand: oneOf(REVENUE_BANDS),
  revenueCurrency: oneOf(CURRENCIES),
  chips: listOf(CHIPS, 0, LIMITS.chips),
  inputMode: oneOf(INPUT_MODES),
  bucketPrimary: oneOf(BUCKETS),
  bucketSecondary: (value) => value === null || isOneOf(BUCKETS, value),
  bucketScores: scores,
  template: oneOf(TEMPLATES),
  orderVariant: oneOf(ORDER_VARIANTS),
  tier: oneOf(TIERS),
  agentIds: listOf(AGENT_IDS, 1, LIMITS.agentIds),
  classifierVersion: version,
  agentsVersion: version,
  secondsToResult: int(0, LIMITS.secondsToResultMax),
  contactErrors: listOf(CONTACT_ERRORS, 0, LIMITS.contactErrors, false),
  planDepth: int(0, LIMITS.planDepthMax),
  filmPlayed: bool,
  filmPct: oneOf(FILM_PCTS),
  ctaFrom: oneOf(CTA_FROM),
  ctaClicked: bool,
  webdriver: bool,
  planView: oneOf(PLAN_VIEWS),
  stillReason: oneOf(STILL_REASONS),
  discsOpened: listOf(DEPARTMENTS, 0, LIMITS.discsOpened),
};

export const isVisitId = (value: unknown): value is string => typeof value === "string" && UUID_V4.test(value);

/** §13.2 /visit. Any key outside VISIT_FIELD_KEYS is refused, so typed words can't arrive here (D13). */
export function parseVisit(body: unknown): Parsed<VisitRequest, string> {
  if (!isRecord(body) || !onlyKeys(body, ["id", "step", "fields"]) || !isRecord(body.fields)) {
    return { ok: false, field: "payload" };
  }
  if (!isVisitId(body.id)) return { ok: false, field: "id" };
  if (!isOneOf(STEPS, body.step)) return { ok: false, field: "step" };
  for (const [key, value] of Object.entries(body.fields)) {
    if (!isOneOf(VISIT_FIELD_KEYS, key) || !VISIT_CHECKS[key](value)) return { ok: false, field: key.slice(0, 40) };
  }
  if (body.fields.noticeVersion === undefined) return { ok: false, field: "noticeVersion" };
  return { ok: true, value: body as unknown as VisitRequest };
}

/** x-vercel-ip-country, when it's a two-letter code. */
export const countryOf = (request: Request): string | null => {
  const code = request.headers.get("x-vercel-ip-country") ?? "";
  return /^[A-Z]{2}$/.test(code) ? code : null;
};

const BOT_AGENT =
  /(googlebot|bingbot|yandexbot|duckduckbot|baiduspider|applebot|ahrefsbot|semrushbot|petalbot|bot\/|crawler|spider|headlesschrome|lighthouse|facebookexternalhit|whatsapp|telegrambot|slackbot|discordbot|twitterbot|linkedinbot|vercel-screenshot)/i;

/** §13.2: navigator.webdriver was set, or the user agent is a known bot. */
export const isBot = (request: Request, webdriver: boolean | undefined): boolean =>
  webdriver === true || BOT_AGENT.test(request.headers.get("user-agent") ?? "");
```

- [ ] **Step 4: Run the test and the type check**

```bash
npx vitest run tests/api/funnel/validate-visit.test.ts
npm run typecheck
```

Expected: 56 tests pass. `typecheck` exits 0; it fails on `VISIT_CHECKS` if the contract gains a key with no check.

- [ ] **Step 5: Commit**

```bash
git add api/funnel/_validate.ts tests/api/funnel/visit-fields.ts tests/api/funnel/validate-visit.test.ts
git commit -m "feat(funnel): check /visit bodies against the shared contract"
```

### Task 6: `/api/funnel/visit`

**Files:**
- Create: `api/funnel/_sql.ts`, `api/funnel/_db.ts`
- Modify: `api/funnel/visit.ts` (the phase 0 skeleton becomes the function), `tests/api/funnel/skeleton.test.ts` (the 501 case stays for `/lead` only)
- Test: `tests/api/funnel/db.test.ts`, `tests/api/funnel/visit.test.ts`

**Interfaces:**
- Consumes: Task 2's `readJson(req, maxBytes)` and `isRateLimited(key, max)`; Task 5's `parseVisit`, `countryOf`, `isBot`; lane C's `jobIdsFor(agentIds: readonly AgentId[]): JobId[]` (day 1).
- Produces:
  - `api/funnel/_sql.ts`: `VISIT_UPSERT`, `FIND_LEAD`, `CONTACT_INSERT`, `PLAN_EMAIL_INSERT` (each takes one jsonb or uuid parameter)
  - `api/funnel/_db.ts`: `type VisitRecord`, `interface VisitAnswers`, `interface ContactRecord`, `type StoredPlanEmailStatus`, `interface PlanEmailRecord`, `type SavedLead`, `interface FunnelDb { upsertVisit; findLead; saveLead; savePlanEmail }`, `createDb(url = process.env.DATABASE_URL): FunnelDb`, `toVisitRecord(request, { country, bot, jobIds }): VisitRecord`
  - `api/funnel/visit.ts`: `interface VisitDeps`, `createVisitHandler(deps)`, `POST`, `config`
  - On the Preview: `/visit` answers `200 {success:true, country}`, 400, 415, 429 and 502 (lane A's background saves, day 2)

- [ ] **Step 1: Write the failing tests**

`tests/api/funnel/db.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { toVisitRecord } from "../../../api/funnel/_db";
import { VISIT_UPSERT } from "../../../api/funnel/_sql";
import { VISIT_FIELD_KEYS } from "../../../src/features/funnel/data/contract";
import { FULL_VISIT_FIELDS, VISIT_ID } from "./visit-fields";

/** The column names in VISIT_UPSERT's jsonb_to_record list: the one place a column's name and type live. */
const recordColumns = (): Set<string> => {
  const list = VISIT_UPSERT.slice(VISIT_UPSERT.indexOf("as r("), VISIT_UPSERT.indexOf("on conflict"));
  return new Set([...list.matchAll(/([a-z_]+) (?:uuid|text|jsonb|boolean|integer|smallint)/g)].map((match) => match[1]));
};

describe("toVisitRecord", () => {
  const record = toVisitRecord({ id: VISIT_ID, step: "S9", fields: FULL_VISIT_FIELDS }, { country: "IN", bot: false, jobIds: ["j1"] });

  it("spells every key as a column VISIT_UPSERT reads", () => {
    const columns = recordColumns();
    expect(Object.keys(record).filter((key) => !columns.has(key))).toEqual([]);
  });

  it("carries every field the browser can send except webdriver, plus five of the server's own", () => {
    expect(Object.keys(record)).toHaveLength(VISIT_FIELD_KEYS.length - 1 + 5);
    expect(record).not.toHaveProperty("webdriver");
  });

  it("adds the id, the step, the country, the bot flag and the jobs", () => {
    expect(record).toMatchObject({
      id: VISIT_ID, last_step: "S9", notice_version: "2026-10-08", bot_flag: false, country: "IN", job_ids: ["j1"],
      cta_clicked: true, bucket_scores: { sales: 6, lead_gen: 2 },
    });
  });

  it("leaves job_ids out before there's a plan", () => {
    expect(toVisitRecord({ id: VISIT_ID, step: "S1", fields: { noticeVersion: "2026-10-08" } }, { country: null, bot: true, jobIds: null }))
      .toEqual({ id: VISIT_ID, last_step: "S1", notice_version: "2026-10-08", bot_flag: true, country: null });
  });
});

describe("VISIT_UPSERT", () => {
  it("moves last_step forward only, and keeps the first CTA time (§13.2)", () => {
    expect(VISIT_UPSERT).toContain("array_position(array['S0','S1','S1b','S2','S3','S4','S5','S6','S7','S8','S9'], excluded.last_step)");
    expect(VISIT_UPSERT).toMatch(/cta_clicked_at\s+= coalesce\(v\.cta_clicked_at, excluded\.cta_clicked_at\)/);
  });

  it("returns the visit's taps, which the lead alert prints (§7)", () => {
    expect(VISIT_UPSERT.trimEnd().endsWith("returning segment, business_type, years_band, team_band, revenue_band, revenue_currency")).toBe(true);
  });
});
```

`tests/api/funnel/visit.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FunnelDb, VisitRecord } from "../../../api/funnel/_db";
import { createVisitHandler } from "../../../api/funnel/visit";
import { VISIT_ID } from "./visit-fields";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)";
const GOOGLEBOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

function setup(options: { limited?: boolean; down?: boolean } = {}) {
  const saved: VisitRecord[] = [];
  const db: FunnelDb = {
    async upsertVisit(visit) {
      if (options.down) throw new Error("connection refused");
      saved.push(visit);
    },
    async findLead() { return null; },
    async saveLead() { throw new Error("not used by /visit"); },
    async savePlanEmail() { throw new Error("not used by /visit"); },
  };
  const rateLimited = vi.fn((_key: string, _max: number) => options.limited ?? false);
  const handle = createVisitHandler({
    db: () => db,
    rateLimited,
    jobIdsFor: (ids) => ids.map((id) => `${id}:job`),
  });
  return { handle, saved, rateLimited };
}

const send = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("https://ziiroai.com/api/funnel/visit", {
    method: "POST",
    headers: {
      "content-type": "application/json", "user-agent": IPHONE, "x-vercel-ip-country": "IN",
      "x-forwarded-for": "203.0.113.7", ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
const visit = (fields: Record<string, unknown>, step = "S3") =>
  ({ id: VISIT_ID, step, fields: { noticeVersion: "2026-10-08", ...fields } });

describe("POST /api/funnel/visit (§13.2)", () => {
  let logs: string[];
  beforeEach(() => {
    logs = [];
    vi.spyOn(console, "log").mockImplementation((line) => { logs.push(String(line)); });
    vi.spyOn(console, "error").mockImplementation((line) => { logs.push(String(line)); });
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it("saves the step, derives the jobs, and answers with the country", async () => {
    const { handle, saved } = setup();
    const res = await handle(send(visit({ segment: "business", agentIds: ["deals-inbound"] }, "S8")));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, country: "IN" });
    expect(saved[0]).toMatchObject({
      id: VISIT_ID, last_step: "S8", segment: "business", job_ids: ["deals-inbound:job"], country: "IN", bot_flag: false,
    });
  });

  it("refuses typed words with 400 and the key, saves nothing, and logs no value (D13)", async () => {
    const { handle, saved } = setup();
    const res = await handle(send(visit({ problemText: "my words" })));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ success: false, field: "problemText" });
    expect(saved).toEqual([]);
    expect(logs.join("\n")).not.toContain("my words");
  });

  it("refuses a body over 4 KB with 400 payload", async () => {
    const { handle } = setup();
    const res = await handle(send(visit({ landingPath: `/${"a".repeat(5_000)}` })));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ success: false, field: "payload" });
  });

  it("refuses a body that isn't JSON with 415", async () => {
    const { handle } = setup();
    expect((await handle(send("a=1", { "content-type": "text/plain" }))).status).toBe(415);
  });

  it("answers 429 past 120 saves in 10 minutes from one connection", async () => {
    const { handle, saved, rateLimited } = setup({ limited: true });
    const res = await handle(send(visit({})));
    expect(res.status).toBe(429);
    expect(rateLimited).toHaveBeenCalledWith("funnel-visit:203.0.113.7", 120);
    expect(saved).toEqual([]);
  });

  it("flags a bot by navigator.webdriver or by its user agent", async () => {
    const { handle, saved } = setup();
    await handle(send(visit({ webdriver: true })));
    await handle(send(visit({}), { "user-agent": GOOGLEBOT }));
    await handle(send(visit({})));
    expect(saved.map((row) => row.bot_flag)).toEqual([true, true, false]);
  });

  it("leaves the country out when the header isn't a country code", async () => {
    const { handle, saved } = setup();
    const res = await handle(send(visit({}), { "x-vercel-ip-country": "XX1" }));
    expect(await res.json()).toEqual({ success: true, country: null });
    expect(saved[0].country).toBeNull();
  });

  it("answers 502 when the database is down, and logs only the error's name", async () => {
    const { handle } = setup({ down: true });
    const res = await handle(send(visit({ segment: "business" })));
    expect(res.status).toBe(502);
    expect(logs.join("\n")).toContain("funnel.visit.db");
    expect(logs.join("\n")).not.toContain("business");
  });
});
```

In `tests/api/funnel/skeleton.test.ts`, take the `answers 501 until lane B builds it` case out of `describe.each`, and put this block for `/lead` below it (Task 9 deletes it):

```ts
describe("/api/funnel/lead, until Task 9", () => {
  it("answers 501", async () => {
    const res = await lead.POST(post("{}"));
    expect(res.status).toBe(501);
    expect(await res.json()).toEqual({ success: false });
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run tests/api/funnel/db.test.ts tests/api/funnel/visit.test.ts tests/api/funnel/skeleton.test.ts`
Expected: FAIL, with `Failed to resolve import "../../../api/funnel/_db"` and `createVisitHandler is not a function`. The skeleton file passes.

- [ ] **Step 3: Write `api/funnel/_sql.ts`**

```ts
// The SQL behind api/funnel/_db.ts (spec Appendix C). Each statement takes its row as one
// jsonb parameter, so a column's name and type live in one place: the record list.

const STEP_ORDER = "array['S0','S1','S1b','S2','S3','S4','S5','S6','S7','S8','S9']";

/**
 * One row per visit. A null leaves its column alone, last_step only moves forward, and the
 * row's taps come back for the lead alert (§7: "every answer").
 */
export const VISIT_UPSERT = `
insert into visits as v (
  id, landing_path, entry_intent, referrer_host, utm, country, timezone, locale, day_part, theme, device_class,
  is_returning, segment, non_owner_reason, business_type, years_band, team_band, revenue_band, revenue_currency,
  chips, input_mode, bucket_primary, bucket_secondary, bucket_scores, template, order_variant, tier, agent_ids,
  job_ids, classifier_version, agents_version, last_step, seconds_to_result, contact_errors, plan_depth,
  film_played, film_pct, cta_clicked_at, cta_from, plan_view, still_reason, discs_opened, bot_flag, notice_version
)
select
  r.id, r.landing_path, r.entry_intent, r.referrer_host, r.utm, r.country, r.timezone, r.locale, r.day_part, r.theme,
  r.device_class, coalesce(r.is_returning, false), r.segment, r.non_owner_reason, r.business_type, r.years_band,
  r.team_band, r.revenue_band, r.revenue_currency, r.chips, r.input_mode, r.bucket_primary, r.bucket_secondary,
  r.bucket_scores, r.template, r.order_variant, r.tier, r.agent_ids, r.job_ids, r.classifier_version, r.agents_version,
  r.last_step, r.seconds_to_result, r.contact_errors, r.plan_depth, coalesce(r.film_played, false), r.film_pct,
  case when r.cta_clicked then now() end, r.cta_from, r.plan_view, r.still_reason, r.discs_opened,
  coalesce(r.bot_flag, false), r.notice_version
from jsonb_to_record($1::jsonb) as r(
  id uuid, landing_path text, entry_intent text, referrer_host text, utm jsonb, country text, timezone text,
  locale text, day_part text, theme text, device_class text, is_returning boolean, segment text,
  non_owner_reason text, business_type text, years_band text, team_band text, revenue_band text,
  revenue_currency text, chips text[], input_mode text, bucket_primary text, bucket_secondary text,
  bucket_scores jsonb, template text, order_variant text, tier text, agent_ids text[], job_ids text[],
  classifier_version text, agents_version text, last_step text, seconds_to_result integer, contact_errors text[],
  plan_depth smallint, film_played boolean, film_pct smallint, cta_clicked boolean, cta_from text, plan_view text,
  still_reason text, discs_opened text[], bot_flag boolean, notice_version text
)
on conflict (id) do update set
  updated_at         = now(),
  landing_path       = coalesce(excluded.landing_path, v.landing_path),
  entry_intent       = coalesce(excluded.entry_intent, v.entry_intent),
  referrer_host      = coalesce(excluded.referrer_host, v.referrer_host),
  utm                = coalesce(excluded.utm, v.utm),
  country            = coalesce(excluded.country, v.country),
  timezone           = coalesce(excluded.timezone, v.timezone),
  locale             = coalesce(excluded.locale, v.locale),
  day_part           = coalesce(excluded.day_part, v.day_part),
  theme              = coalesce(excluded.theme, v.theme),
  device_class       = coalesce(excluded.device_class, v.device_class),
  is_returning       = v.is_returning or excluded.is_returning,
  segment            = coalesce(excluded.segment, v.segment),
  non_owner_reason   = coalesce(excluded.non_owner_reason, v.non_owner_reason),
  business_type      = coalesce(excluded.business_type, v.business_type),
  years_band         = coalesce(excluded.years_band, v.years_band),
  team_band          = coalesce(excluded.team_band, v.team_band),
  revenue_band       = coalesce(excluded.revenue_band, v.revenue_band),
  revenue_currency   = coalesce(excluded.revenue_currency, v.revenue_currency),
  chips              = coalesce(excluded.chips, v.chips),
  input_mode         = coalesce(excluded.input_mode, v.input_mode),
  bucket_primary     = coalesce(excluded.bucket_primary, v.bucket_primary),
  bucket_secondary   = case when excluded.bucket_primary is null then v.bucket_secondary else excluded.bucket_secondary end,
  bucket_scores      = coalesce(excluded.bucket_scores, v.bucket_scores),
  template           = coalesce(excluded.template, v.template),
  order_variant      = coalesce(excluded.order_variant, v.order_variant),
  tier               = coalesce(excluded.tier, v.tier),
  agent_ids          = coalesce(excluded.agent_ids, v.agent_ids),
  job_ids            = coalesce(excluded.job_ids, v.job_ids),
  classifier_version = coalesce(excluded.classifier_version, v.classifier_version),
  agents_version     = coalesce(excluded.agents_version, v.agents_version),
  last_step          = case
                         when coalesce(array_position(${STEP_ORDER}, excluded.last_step), 0)
                            > coalesce(array_position(${STEP_ORDER}, v.last_step), 0)
                         then excluded.last_step else v.last_step end,
  seconds_to_result  = coalesce(excluded.seconds_to_result, v.seconds_to_result),
  contact_errors     = coalesce(excluded.contact_errors, v.contact_errors),
  plan_depth         = greatest(v.plan_depth, excluded.plan_depth),
  film_played        = v.film_played or excluded.film_played,
  film_pct           = greatest(v.film_pct, excluded.film_pct),
  cta_clicked_at     = coalesce(v.cta_clicked_at, excluded.cta_clicked_at),
  cta_from           = coalesce(excluded.cta_from, v.cta_from),
  plan_view          = coalesce(excluded.plan_view, v.plan_view),
  still_reason       = coalesce(excluded.still_reason, v.still_reason),
  discs_opened       = coalesce(excluded.discs_opened, v.discs_opened),
  bot_flag           = v.bot_flag or excluded.bot_flag,
  notice_version     = excluded.notice_version
returning segment, business_type, years_band, team_band, revenue_band, revenue_currency`;

/** A visit's lead, if it has one, and its plan email's status (§13.2, the replay check). */
export const FIND_LEAD = `
select c.id, p.status
from contacts c left join plan_emails p on p.contact_id = c.id
where c.visit_id = $1::uuid`;

/** One contact per visit. A second insert for the same visit returns no row. */
export const CONTACT_INSERT = `
insert into contacts (visit_id, name, email, phone_e164, business_other, problem_text, matched_phrases,
                      consent_version, consent_at, flag)
select r.visit_id, r.name, r.email, r.phone_e164, r.business_other, r.problem_text, r.matched_phrases,
       r.consent_version, now(), r.flag
from jsonb_to_record($1::jsonb) as r(
  visit_id uuid, name text, email text, phone_e164 text, business_other text, problem_text text,
  matched_phrases text[], consent_version text, flag text
)
on conflict (visit_id) do nothing
returning id`;

/** One row per lead: sent, failed or held (§13.2, write 4). */
export const PLAN_EMAIL_INSERT = `
insert into plan_emails (contact_id, resend_id, status, agent_ids, job_ids, error_name)
select r.contact_id, r.resend_id, r.status, r.agent_ids, r.job_ids, r.error_name
from jsonb_to_record($1::jsonb) as r(
  contact_id uuid, resend_id text, status text, agent_ids text[], job_ids text[], error_name text
)
on conflict (contact_id) do nothing`;
```

These four statements were run on PostgreSQL 14 against Appendix C's schema on 8 Oct. A late S2 save after S3 left `last_step` at S3, and a lead's S8 snapshot after S9 left it at S9. The first CTA time and the larger film and plan-depth values were kept. A second contact insert returned no row, and a deleted contact took its plan-email row with it.

- [ ] **Step 4: Write `api/funnel/_db.ts`**

```ts
// Neon access for the funnel (spec §13.5): Neon's HTTP driver, one round trip per call, no pool.
import { neon } from "@neondatabase/serverless";
import type { LeadFlag, PlanEmailStatus, StepId, VisitRequest } from "../../src/features/funnel/data/contract";
import { CONTACT_INSERT, FIND_LEAD, PLAN_EMAIL_INSERT, VISIT_UPSERT } from "./_sql";

/** A visits row by its column names, as VISIT_UPSERT's record list spells them. */
export type VisitRecord = {
  id: string;
  last_step: StepId;
  notice_version: string;
  bot_flag: boolean;
  country: string | null;
} & Record<string, unknown>;

/** The taps /visit saved before the lead, for the alert (§7). All null when /visit never got through. */
export interface VisitAnswers {
  segment: string | null;
  business_type: string | null;
  years_band: string | null;
  team_band: string | null;
  revenue_band: string | null;
  revenue_currency: string | null;
}

export interface ContactRecord {
  visit_id: string;
  name: string;
  email: string;
  phone_e164: string | null;
  business_other: string | null;
  problem_text: string | null;
  matched_phrases: string[];
  consent_version: string;
  flag: LeadFlag | null;
}

/** plan_emails.status: what /lead writes, plus what the saved queries and later phases write (Appendix C). */
export type StoredPlanEmailStatus = PlanEmailStatus | "sent_by_hand" | "delivered" | "bounced" | "complained";

export interface PlanEmailRecord {
  contact_id: string;
  resend_id: string | null;
  status: PlanEmailStatus;
  agent_ids: string[];
  job_ids: string[];
  error_name: string | null;
}

export type SavedLead = { contactId: string; answers: VisitAnswers } | { duplicate: true };

export interface FunnelDb {
  upsertVisit(visit: VisitRecord): Promise<void>;
  /** null when the visit has no lead yet; status is null until its plan_emails row exists. */
  findLead(visitId: string): Promise<{ status: StoredPlanEmailStatus | null } | null>;
  /** One transaction: the visit's final snapshot, then the contact (§13.2, write 1). */
  saveLead(visit: VisitRecord, contact: ContactRecord): Promise<SavedLead>;
  savePlanEmail(row: PlanEmailRecord): Promise<void>;
}

export function createDb(url: string | undefined = process.env.DATABASE_URL): FunnelDb {
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = neon(url);
  return {
    async upsertVisit(visit) {
      await sql.query(VISIT_UPSERT, [JSON.stringify(visit)]);
    },
    async findLead(visitId) {
      const rows = await sql.query(FIND_LEAD, [visitId]);
      return rows[0] ? { status: rows[0].status as StoredPlanEmailStatus | null } : null;
    },
    async saveLead(visit, contact) {
      const [visitRows, contactRows] = await sql.transaction([
        sql.query(VISIT_UPSERT, [JSON.stringify(visit)]),
        sql.query(CONTACT_INSERT, [JSON.stringify(contact)]),
      ]);
      const inserted = contactRows[0] as { id: string } | undefined;
      return inserted ? { contactId: inserted.id, answers: visitRows[0] as VisitAnswers } : { duplicate: true };
    },
    async savePlanEmail(row) {
      await sql.query(PLAN_EMAIL_INSERT, [JSON.stringify(row)]);
    },
  };
}

const snakeCase = (key: string): string => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

/** A /visit body as a visits row. webdriver isn't a column: it only feeds bot_flag. */
export function toVisitRecord(
  request: VisitRequest,
  extra: { country: string | null; bot: boolean; jobIds: string[] | null },
): VisitRecord {
  const columns = Object.fromEntries(
    Object.entries(request.fields)
      .filter(([key]) => key !== "webdriver")
      .map(([key, value]) => [snakeCase(key), value]),
  );
  return {
    ...columns,
    id: request.id,
    last_step: request.step,
    notice_version: request.fields.noticeVersion,
    bot_flag: extra.bot,
    country: extra.country,
    ...(extra.jobIds ? { job_ids: extra.jobIds } : {}),
  };
}
```

If `npm run typecheck` reports that the installed driver's `sql.transaction` or `sql.query` signature differs, adapt only the calls inside `createDb`. Keep `FunnelDb` as it is, since the handlers and tests depend on it, and note the difference in your commit message.

- [ ] **Step 5: Replace `api/funnel/visit.ts`**

```ts
// POST /api/funnel/visit: one anonymous row per visit, updated at every step (spec §9, §13.2).
import { clientIp, isJsonRequest, isRateLimited, jsonResponse, logEvent, readJson, requestId } from "../_lib";
import { jobIdsFor } from "../../src/features/funnel/data";
import {
  LIMITS, VISIT_FIELD_KEYS, isOneOf, type AgentId, type VisitResponse,
} from "../../src/features/funnel/data/contract";
import { createDb, toVisitRecord, type FunnelDb } from "./_db";
import { countryOf, isBot, parseVisit } from "./_validate";

export const config = { runtime: "nodejs", maxDuration: 15 };

/** Saves per connection per 10 minutes. A visit sends about 12; §13.2 sets no number for /visit. */
const VISIT_RATE_MAX = 120;

export interface VisitDeps {
  db(): FunnelDb;
  rateLimited(key: string, max: number): boolean;
  jobIdsFor(agentIds: readonly AgentId[]): string[];
}

const answer = (request: Request, body: VisitResponse, status = 200): Response => jsonResponse(request, body, status);

/** A refused key is logged by name only when it's one of ours (the logging policy in api/_lib.ts). */
const loggable = (field: string): string =>
  isOneOf(VISIT_FIELD_KEYS, field) || ["id", "step", "payload"].includes(field) ? field : "unknown_key";

export function createVisitHandler(deps: VisitDeps) {
  return async (request: Request): Promise<Response> => {
    if (!isJsonRequest(request)) return answer(request, { success: false }, 415);
    let body: unknown;
    try {
      body = await readJson(request, LIMITS.visitBodyBytes);
    } catch {
      return answer(request, { success: false, field: "payload" }, 400);
    }
    const parsed = parseVisit(body);
    if (!parsed.ok) {
      logEvent("info", "funnel.visit.refused", { field: loggable(parsed.field), requestId: requestId(request) });
      return answer(request, { success: false, field: parsed.field }, 400);
    }
    if (deps.rateLimited(`funnel-visit:${clientIp(request)}`, VISIT_RATE_MAX)) {
      return answer(request, { success: false }, 429);
    }
    const visit = parsed.value;
    const country = countryOf(request);
    const record = toVisitRecord(visit, {
      country,
      bot: isBot(request, visit.fields.webdriver),
      jobIds: visit.fields.agentIds ? deps.jobIdsFor(visit.fields.agentIds) : null,
    });
    try {
      await deps.db().upsertVisit(record);
    } catch (error) {
      logEvent("error", "funnel.visit.db", {
        name: error instanceof Error ? error.name : "unknown",
        requestId: requestId(request),
      });
      return answer(request, { success: false }, 502);
    }
    return answer(request, { success: true, country });
  };
}

const handle = createVisitHandler({ db: () => createDb(), rateLimited: isRateLimited, jobIdsFor });

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}
```

- [ ] **Step 6: Run the tests, the type check and the build**

```bash
npx vitest run tests/api/funnel/db.test.ts tests/api/funnel/visit.test.ts tests/api/funnel/skeleton.test.ts
npm run typecheck && npm run build
```

Expected: 20 tests pass (6, 8 and 6). `typecheck` and `build` exit 0.

- [ ] **Step 7: Commit and push**

```bash
git add api/funnel/_sql.ts api/funnel/_db.ts api/funnel/visit.ts tests/api/funnel/db.test.ts \
  tests/api/funnel/visit.test.ts tests/api/funnel/skeleton.test.ts
git commit -m "feat(funnel): save each visit step to Neon through /api/funnel/visit"
git pull --rebase && git push
```

- [ ] **Step 8: Check `/visit` on the Preview**

Take the Preview URL from the PR's Vercel comment. Leave out the bypass header if P0-T1 item 5 wasn't needed:

```bash
PREVIEW=https://<the PR's preview host>
curl -s -X POST "$PREVIEW/api/funnel/visit" -H "content-type: application/json" \
  -H "x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET" \
  -d '{"id":"0b5e2f3c-1d2e-4a5b-8c9d-0e1f2a3b4c5d","step":"S1","fields":{"noticeVersion":"2026-10-08","landingPath":"/"}}'
```

Expected: `{"success":true,"country":"IN"}` (your own country code). In the Neon console, the Preview's branch, SQL Editor: `select last_step, landing_path, bot_flag from visits where id = '0b5e2f3c-1d2e-4a5b-8c9d-0e1f2a3b4c5d';` gives `S1 | / | f`. A 502 means the Preview has no `DATABASE_URL` or no schema; check P0-T1 and P0-T6 before anything else. Then tell the manager that `/visit` is on the Preview (lane A, day 2).

### Task 7: `parseLead`, and Ananya's `/lead` body

**Files:**
- Create: `tests/fixtures/ananya-lead.json`
- Modify: `api/funnel/_validate.ts` (add `parseLead` and `visitIdOf`)
- Test: `tests/api/funnel/validate-lead.test.ts`

**Interfaces:**
- Consumes: Task 1's `isValidEmail`, `isValidName`, `isE164`; Task 5's helpers in `_validate.ts`.
- Produces:
  - `parseLead(body: unknown): Parsed<LeadRequest, LeadField>`. It checks name, then email (trimmed), phone (absent, `""` or E.164), consent (exactly `{ given: true, version: CONSENT_VERSION }`), and reports anything else wrong as `"payload"`.
  - `visitIdOf(body: unknown): string | null`
  - `tests/fixtures/ananya-lead.json`, the body S7 sends for Ananya (00-index §1.3; lane D's I-T2 compares the browser's body with it)

- [ ] **Step 1: Write the fixture and the failing test**

`tests/fixtures/ananya-lead.json`. It has no `phone`, `retry` or `businessOther` key, because S7 sends none of them for Ananya:

```json
{
  "visitId": "6f1c2a7e-6c1d-4f5e-9a51-0a7c1e2d3b4f",
  "name": "Ananya",
  "email": "ananya@example.com",
  "consent": { "given": true, "version": "2026-10-08" },
  "turnstileToken": "XXXX.DUMMY.TOKEN.XXXX",
  "answers": {
    "problemText": "Enquiries come in, but by the time someone calls back they've gone cold.",
    "chips": [],
    "inputMode": "typed"
  },
  "plan": {
    "template": "B",
    "orderVariant": "B-convert",
    "tier": "M",
    "agentIds": [
      "deals-inbound",
      "deals-reply-handling",
      "deals-call-cycle",
      "sales-sequencing-send",
      "marketing-insights",
      "back-office-finance-reporting"
    ],
    "matchedPhrases": ["calls back", "gone cold"],
    "classifierVersion": "kw-1",
    "agentsVersion": "2026-10-04",
    "fallback": false
  }
}
```

`tests/api/funnel/validate-lead.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import ananya from "../../fixtures/ananya-lead.json";
import { parseLead, visitIdOf } from "../../../api/funnel/_validate";
import { AGENT_IDS } from "../../../src/features/funnel/data/contract";

const lead = (over: Record<string, unknown> = {}) => ({ ...ananya, ...over });
const answers = (over: Record<string, unknown>) => lead({ answers: { ...ananya.answers, ...over } });
const plan = (over: Record<string, unknown>) => lead({ plan: { ...ananya.plan, ...over } });
const fieldOf = (body: unknown): string => {
  const parsed = parseLead(body);
  return parsed.ok ? "ok" : parsed.field;
};

describe("parseLead (§13.2 step 3)", () => {
  it("accepts Ananya's lead", () => {
    expect(parseLead(ananya)).toEqual({ ok: true, value: ananya });
    expect(visitIdOf(ananya)).toBe(ananya.visitId);
  });

  it.each([
    ["an E.164 phone", lead({ phone: "+919876543210" })],
    ["a blank phone", lead({ phone: "" })],
    ["a second try", lead({ retry: true })],
    ["an email with spaces around it", lead({ email: " ananya@example.com " })],
    ["the Other business text", answers({ businessOther: "Printing press" })],
    ["600 characters over two lines", answers({ problemText: `${"a".repeat(299)}\n${"b".repeat(300)}` })],
    ["three chips and no words", answers({ problemText: undefined, chips: ["leads", "convert", "ads"], inputMode: "chips" })],
  ])("accepts %s", (_label, body) => {
    expect(fieldOf(body)).toBe("ok");
  });

  it.each(["", "😀", "12345", "https://evil.com", "a".repeat(81)])("refuses the name %j", (name) => {
    expect(fieldOf(lead({ name }))).toBe("name");
  });

  it.each(["nope", "a@b", "x@mailinator.com"])("refuses the email %j", (email) => {
    expect(fieldOf(lead({ email }))).toBe("email");
  });

  it.each(["98765", "+0123456789", 919876543210])("refuses the phone %j", (phone) => {
    expect(fieldOf(lead({ phone }))).toBe("phone");
  });

  it.each([
    ["not given", { given: false, version: "2026-10-08" }],
    ["an old version", { given: true, version: "2026-01-01" }],
    ["missing", undefined],
    ["an extra key", { given: true, version: "2026-10-08", at: "now" }],
  ])("refuses consent that is %s", (_label, consent) => {
    expect(fieldOf(lead({ consent }))).toBe("consent");
  });

  it.each([
    ["a bad visit ID", lead({ visitId: "nope" })],
    ["an extra top-level key", lead({ extra: 1 })],
    ["no agents", plan({ agentIds: [] })],
    ["ten agents", plan({ agentIds: AGENT_IDS.slice(0, 10) })],
    ["an unknown agent", plan({ agentIds: ["deals-inbound", "nobody"] })],
    ["601 characters of words", answers({ problemText: "a".repeat(601) })],
    ["four chips", answers({ chips: ["leads", "convert", "ads", "team"] })],
    ["a chip label instead of its ID", answers({ chips: ["Ads burn money"] })],
    ["an unknown template", plan({ template: "C" })],
    ["a retry that isn't true or false", lead({ retry: "yes" })],
    ["a 3,000-character token", lead({ turnstileToken: "x".repeat(3_000) })],
    ["a 61-character matched phrase", plan({ matchedPhrases: ["a".repeat(61)] })],
    ["a version with a space", plan({ agentsVersion: "2026 10 04" })],
    ["a plan with no fallback", plan({ fallback: undefined })],
    ["a fallback that isn't true or false", plan({ fallback: "no" })],
  ])("reports %s as payload", (_label, body) => {
    expect(fieldOf(body)).toBe("payload");
  });

  it("reports the name first, then the email, then the phone, then consent", () => {
    expect(fieldOf(lead({ name: "", email: "nope", phone: "1", consent: undefined }))).toBe("name");
    expect(fieldOf(lead({ email: "nope", phone: "1", consent: undefined }))).toBe("email");
    expect(fieldOf(lead({ phone: "1", consent: undefined }))).toBe("phone");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/api/funnel/validate-lead.test.ts`
Expected: FAIL, with `parseLead is not a function` (`_validate.ts` has no such export yet).

- [ ] **Step 3: Add to `api/funnel/_validate.ts`**

Extend the contract import with `CONSENT_VERSION`, `type LeadField` and `type LeadRequest`. Below it, add:

```ts
import { isE164, isValidEmail, isValidName } from "../../src/shared/lib/contact-checks";
```

Below `ONE_LINE`, add:

```ts
const LINES = /^[^\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]*$/u;
const MAX_TOKEN = 2_048;
```

At the end of the file, add:

```ts
const LEAD_KEYS = ["visitId", "retry", "name", "email", "phone", "consent", "turnstileToken", "answers", "plan"];
const ANSWER_KEYS = ["businessOther", "problemText", "chips", "inputMode"];
const PLAN_KEYS = [
  "template", "orderVariant", "tier", "agentIds", "matchedPhrases", "classifierVersion", "agentsVersion", "fallback",
];

const isConsent = (value: unknown): boolean =>
  isRecord(value) && onlyKeys(value, ["given", "version"]) && value.given === true && value.version === CONSENT_VERSION;

const isAnswers = (value: unknown): boolean =>
  isRecord(value) && onlyKeys(value, ANSWER_KEYS) &&
  (value.businessOther === undefined || text(ONE_LINE, LIMITS.businessOtherChars)(value.businessOther)) &&
  (value.problemText === undefined || text(LINES, LIMITS.problemTextChars)(value.problemText)) &&
  listOf(CHIPS, 0, LIMITS.chips)(value.chips) && isOneOf(INPUT_MODES, value.inputMode);

const isPhrases = (value: unknown): boolean =>
  Array.isArray(value) && value.length <= LIMITS.matchedPhrases && value.every(text(ONE_LINE, LIMITS.phraseChars));

const isPlan = (value: unknown): boolean =>
  isRecord(value) && onlyKeys(value, PLAN_KEYS) &&
  isOneOf(TEMPLATES, value.template) && isOneOf(ORDER_VARIANTS, value.orderVariant) && isOneOf(TIERS, value.tier) &&
  listOf(AGENT_IDS, 1, LIMITS.agentIds)(value.agentIds) && isPhrases(value.matchedPhrases) &&
  version(value.classifierVersion) && version(value.agentsVersion) && typeof value.fallback === "boolean";

/** §13.2 step 3, in the order the 400 reports: name, email, phone, consent, then everything else as "payload". */
export function parseLead(body: unknown): Parsed<LeadRequest, LeadField> {
  if (!isRecord(body) || !onlyKeys(body, LEAD_KEYS) || !isVisitId(body.visitId)) return { ok: false, field: "payload" };
  if (typeof body.name !== "string" || !isValidName(body.name)) return { ok: false, field: "name" };
  if (typeof body.email !== "string" || !isValidEmail(body.email.trim())) return { ok: false, field: "email" };
  const phone = body.phone;
  if (phone !== undefined && !(typeof phone === "string" && (phone === "" || isE164(phone)))) {
    return { ok: false, field: "phone" };
  }
  if (!isConsent(body.consent)) return { ok: false, field: "consent" };
  const rest =
    (body.retry === undefined || typeof body.retry === "boolean") &&
    (body.turnstileToken === undefined || text(ONE_LINE, MAX_TOKEN)(body.turnstileToken)) &&
    isAnswers(body.answers) && isPlan(body.plan);
  return rest ? { ok: true, value: body as unknown as LeadRequest } : { ok: false, field: "payload" };
}

/** The visit ID, read before anything else, for the replay check (§13.2 step 2). */
export const visitIdOf = (body: unknown): string | null =>
  isRecord(body) && isVisitId(body.visitId) ? body.visitId : null;
```

- [ ] **Step 4: Run the tests and the type check**

```bash
npx vitest run tests/api/funnel/validate-lead.test.ts tests/api/funnel/validate-visit.test.ts
npm run typecheck
```

Expected: 95 tests pass (39 and 56). `typecheck` exits 0.

- [ ] **Step 5: Commit and push**

```bash
git add api/funnel/_validate.ts tests/fixtures/ananya-lead.json tests/api/funnel/validate-lead.test.ts
git commit -m "feat(funnel): check /lead bodies, and add Ananya's lead as the shared fixture"
git pull --rebase && git push
```

Tell the manager that `tests/fixtures/ananya-lead.json` is on the branch (lane D's e2e and Task 10).

### Task 8: `_email.ts`: the plan email and the alerts

**Files:**
- Create: `api/funnel/_email.ts`
- Test: `tests/api/funnel/email.test.ts`

**Interfaces:**
- Consumes: lane C's `copy`, `agentById`, `departments`, `stopsFor`, `calendlyUrl` from `src/features/funnel/data/index.ts`; Task 1's `cleanEcho`, `cleanName`; Task 3's `TurnstileOutcome`; Task 6's `VisitAnswers`.
- Produces (lane D's claims check reads `buildPlanEmail`, day 3; 00-index §1.5, request 3):
  - `interface Email { subject: string; text: string }`
  - `interface PlanEmailInput { name; email; problemText?; chips: ChipId[]; plan: LeadRequest["plan"] }`, and `buildPlanEmail(input): Email`. `plan.fallback` picks the fallback subject and need line (request 16); the server doesn't classify again.
  - `type SpamCheck = TurnstileOutcome | "skipped"`
  - `interface AlertInput { lead; flag; spamCheck; answers: VisitAnswers | null; country; receivedAt; planEmail: Email }`, and `buildAlertEmail(input): Email`
  - `buildSendByHandAlert({ lead, errorName, planEmail }): Email`
  - `alertRecipients(teamInbox: string, replyTo: string): string[]`

- [ ] **Step 1: Write the failing test**

`tests/api/funnel/email.test.ts`. Expected values come from the shared copy, so a copy edit doesn't break these tests; Task 10's golden test checks the exact words.

```ts
import { describe, expect, it } from "vitest";
import ananya from "../../fixtures/ananya-lead.json";
import type { VisitAnswers } from "../../../api/funnel/_db";
import {
  alertRecipients, buildAlertEmail, buildPlanEmail, buildSendByHandAlert, type AlertInput, type PlanEmailInput,
} from "../../../api/funnel/_email";
import { agentById, calendlyUrl, copy, departments, stopsFor } from "../../../src/features/funnel/data";
import type { LeadRequest } from "../../../src/features/funnel/data/contract";

const lead = ananya as LeadRequest;
const WORDS = lead.answers.problemText ?? "";
const label = (copyId: string, index: number): string => copy(copyId).split(" · ")[index];
const planInput = (over: Partial<PlanEmailInput> = {}): PlanEmailInput => ({
  name: lead.name, email: lead.email, problemText: WORDS, chips: lead.answers.chips, plan: lead.plan, ...over,
});
const planA = { ...lead.plan, template: "A", orderVariant: "A-default" } as LeadRequest["plan"];
const planFallback = { ...planA, fallback: true } as LeadRequest["plan"];
const links = (text: string) => text.match(/https?:\/\//g) ?? [];

const ANSWERS: VisitAnswers = {
  segment: "business", business_type: "interior", years_band: "5_10", team_band: "6_20",
  revenue_band: "band_3", revenue_currency: "INR",
};
const alertInput = (over: Partial<AlertInput> = {}): AlertInput => ({
  lead, flag: null, spamCheck: "passed", answers: ANSWERS, country: "IN",
  receivedAt: "2026-10-19T06:30:00.000Z", planEmail: buildPlanEmail(planInput()), ...over,
});

describe("buildPlanEmail (§7, copy.md M)", () => {
  it("opens with her name, the open line and her words", () => {
    const email = buildPlanEmail(planInput());
    expect(email.subject).toBe(copy("em.subject", { name: "Ananya", n: 6 }));
    expect(email.text.startsWith(
      `${copy("em.hi", { name: "Ananya" })}\n\n${copy("em.open")}\n\n${copy("em.said", { "their words": WORDS })}\n\n`,
    )).toBe(true);
  });

  it("lists her departments in scroll order, with each agent's line", () => {
    const text = buildPlanEmail(planInput()).text;
    const heads = stopsFor(lead.plan.agentIds).map((stop) => departments.find((d) => d.id === stop.department)?.name);
    const positions = heads.map((name) => text.indexOf(`\n${name}. `));
    expect(positions.every((position) => position > 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    for (const id of lead.plan.agentIds) expect(text).toContain(`\n- ${agentById(id)?.name}: `);
  });

  it("carries em.pilot on a template B plan only (decision 19)", () => {
    expect(buildPlanEmail(planInput()).text).toContain(copy("em.pilot"));
    expect(buildPlanEmail(planInput({ plan: planA })).text).not.toContain(copy("em.pilot"));
  });

  it("has one link, the Calendly link with her name and email", () => {
    const text = buildPlanEmail(planInput()).text;
    expect(links(text)).toHaveLength(1);
    expect(text).toContain(calendlyUrl("Ananya", "ananya@example.com"));
  });

  it("cleans links, addresses and phone numbers out of the name and the words (§13.3)", () => {
    const email = buildPlanEmail(planInput({
      name: "Ananya https://evil.com", problemText: `${WORDS} Book at www.evil.com or call 98765 43210`,
    }));
    expect(email.text).not.toMatch(/evil|98765/);
    expect(links(email.text)).toHaveLength(1);
    expect(email.subject).toBe(copy("em.subject", { name: "Ananya", n: 6 }));
  });

  it("quotes the chips when the words leave nothing", () => {
    const text = buildPlanEmail(planInput({ problemText: "https://evil.com", chips: ["leads", "ads"] })).text;
    expect(text).toContain(copy("em.said.chips", { chips: `${label("s6.chips", 0)}, ${label("s6.chips", 3)}` }));
  });

  it("drops the quote when there are no words and no chips", () => {
    const blocks = buildPlanEmail(planInput({ problemText: undefined, chips: [], plan: planFallback })).text.split("\n\n");
    expect(blocks[2]).toBe(copy("em.need.fallback", { n: 6 }));
  });

  it("uses the fallback subject and need line when the plan is a fallback (§5.7)", () => {
    const email = buildPlanEmail(planInput({ problemText: "zzz", chips: [], plan: planFallback }));
    expect(email.subject).toBe(copy("em.subject.fallback", { name: "Ananya", n: 6 }));
    expect(email.text).toContain(copy("em.need.fallback", { n: 6 }));
  });

  it("takes the fallback from the plan, not from the words (00-index §1.5, request 16)", () => {
    const email = buildPlanEmail(planInput({ problemText: "zzz", chips: [] }));
    expect(email.subject).toBe(copy("em.subject", { name: "Ananya", n: 6 }));
    expect(email.text).not.toContain(copy("em.need.fallback", { n: 6 }));
  });
});

describe("buildAlertEmail (§7)", () => {
  it("is titled with the name, the business type and the team", () => {
    expect(buildAlertEmail(alertInput()).subject)
      .toBe(`New funnel lead: Ananya, ${label("s2.o", 0)}, team of ${label("s4.o", 2)}`);
  });

  it("carries every answer, her words, the spam check, the plan and her booking link", () => {
    const text = buildAlertEmail(alertInput()).text;
    for (const line of [
      "Name: Ananya", "Email: ananya@example.com", "Phone: none", "Country: IN", `What they do: ${copy("s1.o1")}`,
      `Business: ${label("s2.o", 0)}`, `Years: ${label("s3.o", 3)}`, `Team: ${label("s4.o", 2)}`,
      `Revenue: ${label("s5.o.IN", 2)}`, `Their words: ${WORDS}`, "Spam check: passed",
      "Plan email: going out now", "Consent: version 2026-10-08, at 2026-10-19T06:30:00.000Z",
      `Their booking link: ${calendlyUrl("Ananya", "ananya@example.com")}`, `Visit: ${lead.visitId}`,
    ]) expect(text).toContain(`${line}\n`);
    for (const id of lead.plan.agentIds) expect(text).toContain(agentById(id)?.name ?? id);
  });

  it("opens a flagged lead with the FLAGGED line, and carries the plan to send by hand", () => {
    const text = buildAlertEmail(alertInput({ flag: "turnstile_unverified", spamCheck: "missing" })).text;
    expect(text.split("\n")[0])
      .toBe("FLAGGED (turnstile_unverified). Check it today, and if a real person sent it, send the plan by hand.");
    expect(text).toContain("Plan email: held, because this lead is flagged\n");
    expect(text).toContain(`Subject: ${copy("em.subject", { name: "Ananya", n: 6 })}\n`);
  });

  it("says it's the only copy when the database write failed", () => {
    const email = buildAlertEmail(alertInput({ answers: null }));
    expect(email.text.split("\n")[0]).toBe("The database write failed. This email is the only copy of this lead.");
    expect(email.subject).toBe("New funnel lead: Ananya, business type unknown, team of unknown size");
  });

  it("uses the typed business when S2 was Other, and Rather not say for the revenue", () => {
    const email = buildAlertEmail(alertInput({
      lead: { ...lead, answers: { ...lead.answers, businessOther: "Printing press" } },
      answers: { ...ANSWERS, business_type: "other", revenue_band: "undisclosed" },
    }));
    expect(email.subject).toBe(`New funnel lead: Ananya, Printing press, team of ${label("s4.o", 2)}`);
    expect(email.text).toContain(`Revenue: ${copy("s5.skip")}\n`);
  });
});

describe("buildSendByHandAlert (§7, §10)", () => {
  it("opens with the spec's line and carries the plan email to forward", () => {
    const planEmail = buildPlanEmail(planInput());
    const email = buildSendByHandAlert({ lead, errorName: "resend_500", planEmail });
    expect(email.subject).toBe("Plan email NOT sent: Ananya");
    expect(email.text.split("\n")[0]).toBe("Plan email NOT sent. Send it by hand today.");
    expect(email.text).toContain("(resend_500)");
    expect(email.text.endsWith(planEmail.text)).toBe(true);
  });
});

describe("alertRecipients (§13.2, write 2)", () => {
  it("sends once when TEAM_INBOX and PLAN_REPLY_TO are the same address", () => {
    expect(alertRecipients("team@ziiroai.com", "TEAM@ziiroai.com ")).toEqual(["team@ziiroai.com"]);
  });

  it("sends to both when they differ", () => {
    expect(alertRecipients("team@ziiroai.com", "adyut@ziiroai.com")).toEqual(["team@ziiroai.com", "adyut@ziiroai.com"]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/api/funnel/email.test.ts`
Expected: FAIL, with `Failed to resolve import "../../../api/funnel/_email"`.

- [ ] **Step 3: Write `api/funnel/_email.ts`**

```ts
// The emails /api/funnel/lead sends, written from IDs with the shared copy (spec §7, §13.3).
// Plain text only: no HTML, no images, and one link in the plan email.
import {
  BUSINESS_TYPES, CHIPS, REVENUE_BANDS, SEGMENTS, TEAM_BANDS, YEARS_BANDS,
  type ChipId, type LeadFlag, type LeadRequest,
} from "../../src/features/funnel/data/contract";
import { agentById, calendlyUrl, copy, departments, stopsFor } from "../../src/features/funnel/data";
import { cleanEcho, cleanName } from "../../src/shared/lib/contact-checks";
import type { TurnstileOutcome } from "../_lib";
import type { VisitAnswers } from "./_db";

export interface Email {
  subject: string;
  text: string;
}

export interface PlanEmailInput {
  name: string;
  email: string;
  problemText?: string;
  chips: ChipId[];
  plan: LeadRequest["plan"];
}

const MAX_ECHO = 140;
const MAX_TYPED_BUSINESS = 80;

/** Option i's label is item i of its copy line split on " · " (00-index §1.2). */
const optionLabel = (copyId: string, ids: readonly string[], id: string | null | undefined): string | null => {
  const index = id ? ids.indexOf(id) : -1;
  return index < 0 ? null : (copy(copyId).split(" · ")[index] ?? null);
};

const lowerFirst = (line: string): string => line.charAt(0).toLowerCase() + line.slice(1);

/** em.said with their cleaned words, else em.said.chips, else nothing (§13.3). */
const saidLine = (problemText: string | undefined, chips: ChipId[]): string | null => {
  const words = cleanEcho(problemText ?? "", MAX_ECHO);
  if (words) return copy("em.said", { "their words": words });
  if (chips.length > 0) {
    return copy("em.said.chips", { chips: chips.map((chip) => optionLabel("s6.chips", CHIPS, chip)).join(", ") });
  }
  return null;
};

/** One block per department, in scroll order (§7, line 4). */
const departmentBlocks = (agentIds: LeadRequest["plan"]["agentIds"]): string[] =>
  stopsFor(agentIds).map((stop) => {
    const department = departments.find((candidate) => candidate.id === stop.department);
    if (!department) throw new Error(`unknown department ${stop.department}`);
    const head = copy("em.dept", { Department: department.name, "dp.*.why": copy(`dp.${department.copyKey}.why`) });
    const lines = stop.agentIds.map((id) => {
      const agent = agentById(id);
      if (!agent) throw new Error(`unknown agent ${id}`);
      return copy("em.agent", { "agent name": agent.name, "agent line": lowerFirst(agent.line) });
    });
    return [head, ...lines].join("\n");
  });

/** copy.md M, line for line, with the fallback lines when the plan is a fallback (§5.7). The plan says so. */
export function buildPlanEmail(input: PlanEmailInput): Email {
  const name = cleanName(input.name);
  const n = input.plan.agentIds.length;
  const fallback = input.plan.fallback;
  const blocks = [
    copy("em.hi", { name }),
    copy("em.open"),
    saidLine(input.problemText, input.chips),
    copy(fallback ? "em.need.fallback" : "em.need", { n }),
    input.plan.template === "B" ? copy("em.pilot") : null,
    ...departmentBlocks(input.plan.agentIds),
    copy("em.close", { n }),
    `${copy("em.cta")}\n${copy("em.link", { "Calendly link": calendlyUrl(name, input.email) })}`,
    copy("em.cta.sub"),
    `${copy("em.sign")}\n${copy("em.sign2")}`,
    copy("em.foot"),
  ].filter((block): block is string => block !== null);
  return {
    subject: copy(fallback ? "em.subject.fallback" : "em.subject", { name, n }),
    text: `${blocks.join("\n\n")}\n`,
  };
}

/** What the spam check said, for the alert. "skipped": the rate limit stopped it running. */
export type SpamCheck = TurnstileOutcome | "skipped";

const SPAM_CHECK: Record<SpamCheck, string> = {
  passed: "passed",
  missing: "no token came with it",
  refused: "refused",
  skipped: "not run, because this connection hit the rate limit",
};

export interface AlertInput {
  lead: LeadRequest;
  flag: LeadFlag | null;
  spamCheck: SpamCheck;
  /** null when the database write failed, so the taps aren't known. */
  answers: VisitAnswers | null;
  country: string | null;
  receivedAt: string;
  planEmail: Email;
}

const segmentLabel = (segment: string | null | undefined): string | null => {
  const index = segment ? (SEGMENTS as readonly string[]).indexOf(segment) : -1;
  return index < 0 ? null : copy(`s1.o${index + 1}`);
};

const revenueLabel = (answers: VisitAnswers | null): string | null =>
  answers?.revenue_band === "undisclosed"
    ? copy("s5.skip")
    : optionLabel(answers?.revenue_currency === "USD" ? "s5.o.other" : "s5.o.IN", REVENUE_BANDS, answers?.revenue_band);

const businessLabel = (lead: LeadRequest, answers: VisitAnswers | null): string => {
  const typed = cleanEcho(lead.answers.businessOther ?? "", MAX_TYPED_BUSINESS);
  if (answers?.business_type === "other" && typed) return typed;
  return optionLabel("s2.o", BUSINESS_TYPES, answers?.business_type) ?? (typed || "business type unknown");
};

/** The team's copy of the whole lead (§7, §13.2 write 2). It's the only copy when the database is down. */
export function buildAlertEmail(input: AlertInput): Email {
  const { lead, flag, answers, planEmail } = input;
  const name = cleanName(lead.name);
  const email = lead.email.trim();
  const business = businessLabel(lead, answers);
  const team = optionLabel("s4.o", TEAM_BANDS, answers?.team_band) ?? "unknown size";
  const agents = lead.plan.agentIds.map((id) => agentById(id)?.name ?? id).join(", ");
  const chips = lead.answers.chips.map((chip) => optionLabel("s6.chips", CHIPS, chip)).join(", ");
  const lines = [
    flag ? `FLAGGED (${flag}). Check it today, and if a real person sent it, send the plan by hand.` : null,
    answers ? null : "The database write failed. This email is the only copy of this lead.",
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${lead.phone || "none"}`,
    `Country: ${input.country ?? "unknown"}`,
    `What they do: ${segmentLabel(answers?.segment) ?? "unknown"}`,
    `Business: ${business}`,
    `Years: ${optionLabel("s3.o", YEARS_BANDS, answers?.years_band) ?? "unknown"}`,
    `Team: ${team}`,
    `Revenue: ${revenueLabel(answers) ?? "unknown"}`,
    `Their words: ${lead.answers.problemText?.trim() || "none"}`,
    `Chips: ${chips || "none"}`,
    `Plan: ${lead.plan.orderVariant}, tier ${lead.plan.tier}, ${lead.plan.agentIds.length} agents: ${agents}`,
    `Matched phrases: ${lead.plan.matchedPhrases.join(", ") || "none"}`,
    `Spam check: ${SPAM_CHECK[input.spamCheck]}`,
    `Plan email: ${flag ? "held, because this lead is flagged" : "going out now"}`,
    `Consent: version ${lead.consent.version}, at ${input.receivedAt}`,
    `Their booking link: ${calendlyUrl(name, email)}`,
    `Visit: ${lead.visitId}`,
  ].filter((line): line is string => line !== null);
  const byHand = flag
    ? ["", "If they're real, send them this, then run saved query 6 with their email:", "", `Subject: ${planEmail.subject}`, "", planEmail.text]
    : [];
  return {
    subject: `New funnel lead: ${name}, ${business}, team of ${team}`,
    text: `${[...lines, ...byHand].join("\n").trimEnd()}\n`,
  };
}

/** The second alert, when the plan email failed twice (§7: "Plan email NOT sent. Send it by hand today."). */
export function buildSendByHandAlert(input: { lead: LeadRequest; errorName: string | null; planEmail: Email }): Email {
  const { lead, errorName, planEmail } = input;
  return {
    subject: `Plan email NOT sent: ${cleanName(lead.name)}`,
    text: [
      "Plan email NOT sent. Send it by hand today.",
      `It failed twice${errorName ? ` (${errorName})` : ""}. Send this to ${lead.email.trim()}, then run saved query 6 with their email.`,
      `Visit: ${lead.visitId}`,
      "",
      `Subject: ${planEmail.subject}`,
      "",
      planEmail.text,
    ].join("\n"),
  };
}

/** TEAM_INBOX and PLAN_REPLY_TO, once if they're the same address (§13.2, write 2). */
export const alertRecipients = (teamInbox: string, replyTo: string): string[] => {
  const byAddress = new Map<string, string>();
  for (const address of [teamInbox, replyTo]) {
    const trimmed = address.trim();
    if (trimmed && !byAddress.has(trimmed.toLowerCase())) byAddress.set(trimmed.toLowerCase(), trimmed);
  }
  return [...byAddress.values()];
};
```

- [ ] **Step 4: Run the test and the type check**

```bash
npx vitest run tests/api/funnel/email.test.ts
npm run typecheck
```

Expected: 17 tests pass, and `typecheck` exits 0. If "lists her departments in scroll order" fails, `stopsFor` isn't returning scroll order. That's lane C's function, so add a line for lane C to `.team/ziiro-fleet/requests.md` and leave the test as it is.

- [ ] **Step 5: Commit and push**

```bash
git add api/funnel/_email.ts tests/api/funnel/email.test.ts
git commit -m "feat(funnel): write the plan email and the team alerts from IDs and the shared copy"
git pull --rebase && git push
```

Tell the manager that `buildPlanEmail` is on the branch (lane D's claims check, day 3).

### Task 9: `/api/funnel/lead`

**Files:**
- Modify: `api/funnel/lead.ts` (the phase 0 skeleton becomes the function), `tests/api/funnel/skeleton.test.ts` (delete the 501 block)
- Test: `tests/api/funnel/lead.test.ts`

**Interfaces:**
- Consumes: Task 2's `readJson`, `isRateLimited`, `sendResendEmail`; Task 3's `turnstileOutcome`; Task 6's `createDb`, `FunnelDb`, `VisitRecord`, `VisitAnswers`, `StoredPlanEmailStatus`; Task 7's `parseLead`, `visitIdOf`, `countryOf`; Task 8's builders; lane C's `jobIdsFor`.
- Produces:
  - `interface OutgoingEmail extends Email { to: string[]; from: string; replyTo?: string; idempotencyKey: string }`
  - `interface LeadEnv { teamInbox; planFrom; planReplyTo; alertFrom }`
  - `interface LeadDeps { db(); rateLimited(key, max); turnstile(token, ip); send(email); jobIdsFor(ids); env(); now() }`
  - `createLeadHandler(deps)`, `POST`, `config`
  - On the Preview: `/lead` answers as in 00-index §1.3 (lane A's S7, day 4)

The flow, in §13.2's order:
1. 415 unless the body is JSON; 400 `payload` over 10 KB.
2. Replay: if the visit already has a lead, answer with its result and do nothing else.
3. `parseLead`, then 400 with the field.
4. The rate limit, 5 per 10 minutes per connection: a first try gets 429; a second try is flagged `rate_limited`, and Turnstile isn't asked.
5. Turnstile, with action `funnel_lead` and a 2.5 s cap: a first try that fails gets 403; a second try is flagged `turnstile_unverified` (no token) or `turnstile_failed`.
6. Write 1: the transaction.
7. Write 2: the alert.
8. A 502 only when writes 1 and 2 both failed.
9. Write 3: the plan email, two tries, unless flagged (then held). If it fails twice, the send-by-hand alert goes out.
10. Write 4: the `plan_emails` row, when write 1 worked.

- [ ] **Step 1: Write the failing test**

`tests/api/funnel/lead.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ananya from "../../fixtures/ananya-lead.json";
import { UpstreamError, type TurnstileOutcome } from "../../../api/_lib";
import type {
  ContactRecord, FunnelDb, PlanEmailRecord, StoredPlanEmailStatus, VisitAnswers, VisitRecord,
} from "../../../api/funnel/_db";
import { createLeadHandler, type OutgoingEmail } from "../../../api/funnel/lead";

const IP = "203.0.113.7";
const ID = ananya.visitId;
const ANSWERS: VisitAnswers = {
  segment: "business", business_type: "interior", years_band: "5_10", team_band: "6_20",
  revenue_band: "band_3", revenue_currency: "INR",
};

type Options = {
  dbDown?: boolean;
  stored?: StoredPlanEmailStatus | null;              // this visit already has a lead, with this plan email status
  raceLost?: boolean;                                 // another request saves this visit's lead first
  limited?: boolean;
  turnstile?: TurnstileOutcome;
  failSend?: (email: OutgoingEmail) => number | null; // a Resend status to throw, or null to send
};

function setup(options: Options = {}) {
  const saved: { visit: VisitRecord; contact: ContactRecord }[] = [];
  const rows: PlanEmailRecord[] = [];
  const sent: OutgoingEmail[] = [];
  const tries: OutgoingEmail[] = [];
  const turnstile = vi.fn(async (_token: string | undefined, _ip: string): Promise<TurnstileOutcome> =>
    options.turnstile ?? "passed");
  const db: FunnelDb = {
    async upsertVisit() { throw new Error("not used by /lead"); },
    async findLead() {
      if (options.dbDown) throw new Error("connection refused");
      if (options.stored !== undefined) return { status: options.stored };
      return options.raceLost && saved.length > 0 ? { status: "sent" } : null;
    },
    async saveLead(visit, contact) {
      if (options.dbDown) throw new Error("connection refused");
      saved.push({ visit, contact });
      return options.raceLost ? { duplicate: true } : { contactId: "c-1", answers: ANSWERS };
    },
    async savePlanEmail(row) {
      if (options.dbDown) throw new Error("connection refused");
      rows.push(row);
    },
  };
  const handle = createLeadHandler({
    db: () => db,
    rateLimited: () => options.limited ?? false,
    turnstile,
    async send(email) {
      tries.push(email);
      const status = options.failSend?.(email) ?? null;
      if (status !== null) throw new UpstreamError("resend", status);
      sent.push(email);
      return { id: `re_${sent.length}` };
    },
    jobIdsFor: (ids) => ids.map((id) => `${id}:job`),
    env: () => ({
      teamInbox: "team@ziiroai.com", planFrom: "Adyut at ziiro <adyut@ziiroai.com>",
      planReplyTo: "team@ziiroai.com", alertFrom: "Ziiro AI <contact@ziiroai.com>",
    }),
    now: () => new Date("2026-10-19T06:30:00.000Z"),
  });
  return { handle, saved, rows, sent, tries, turnstile };
}

const send = (body: unknown, type = "application/json") =>
  new Request("https://ziiroai.com/api/funnel/lead", {
    method: "POST",
    headers: { "content-type": type, origin: "https://ziiroai.com", "x-forwarded-for": IP, "x-vercel-ip-country": "IN" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
const lead = (over: Record<string, unknown> = {}) => ({ ...ananya, ...over });
const keys = (emails: OutgoingEmail[]) => emails.map((email) => email.idempotencyKey);

describe("POST /api/funnel/lead (§13.2)", () => {
  let logs: string[];
  beforeEach(() => {
    logs = [];
    vi.spyOn(console, "log").mockImplementation((line) => { logs.push(String(line)); });
    vi.spyOn(console, "error").mockImplementation((line) => { logs.push(String(line)); });
  });
  afterEach(() => { vi.restoreAllMocks(); });

  describe("a clean first try", () => {
    it("saves the lead with the visit's final snapshot, and answers sent", async () => {
      const { handle, saved } = setup();
      const res = await handle(send(lead()));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true, planEmail: "sent" });
      expect(saved[0].visit).toMatchObject({
        id: ID, last_step: "S8", notice_version: "2026-10-08", country: "IN", template: "B", tier: "M",
        job_ids: ananya.plan.agentIds.map((id) => `${id}:job`),
      });
      expect(saved[0].contact).toMatchObject({
        visit_id: ID, name: "Ananya", email: "ananya@example.com", phone_e164: null, business_other: null,
        problem_text: ananya.answers.problemText, matched_phrases: ["calls back", "gone cold"],
        consent_version: "2026-10-08", flag: null,
      });
    });

    it("sends the alert to the team first, then the plan email to her", async () => {
      const { handle, sent } = setup();
      await handle(send(lead()));
      expect(keys(sent)).toEqual([`alert-${ID}`, `plan-${ID}`]);
      expect(sent[0]).toMatchObject({ to: ["team@ziiroai.com"], from: "Ziiro AI <contact@ziiroai.com>", replyTo: "ananya@example.com" });
      expect(sent[0].subject).toMatch(/^New funnel lead: Ananya, /);
      expect(sent[1]).toMatchObject({ to: ["ananya@example.com"], from: "Adyut at ziiro <adyut@ziiroai.com>", replyTo: "team@ziiroai.com" });
    });

    it("records the plan email with Resend's id and the jobs it listed", async () => {
      const { handle, rows } = setup();
      await handle(send(lead()));
      expect(rows).toEqual([{
        contact_id: "c-1", resend_id: "re_2", status: "sent", agent_ids: ananya.plan.agentIds,
        job_ids: ananya.plan.agentIds.map((id) => `${id}:job`), error_name: null,
      }]);
    });
  });

  describe("the spam check and the rate limit (§13.2 steps 4 and 5)", () => {
    it.each(["refused", "missing"] as const)("answers 403 and saves nothing when the check says %s on a first try", async (outcome) => {
      const { handle, saved, tries } = setup({ turnstile: outcome });
      const res = await handle(send(lead()));
      expect(res.status).toBe(403);
      expect(saved).toEqual([]);
      expect(tries).toEqual([]);
    });

    it.each([
      ["missing", "turnstile_unverified", "no token came with it"],
      ["refused", "turnstile_failed", "refused"],
    ] as const)("saves a second try whose check says %s, flagged %s, with the alert and no plan email", async (outcome, flag, said) => {
      const { handle, saved, sent, rows } = setup({ turnstile: outcome });
      const res = await handle(send(lead({ retry: true })));
      expect(await res.json()).toEqual({ success: true, planEmail: "held" });
      expect(saved[0].contact.flag).toBe(flag);
      expect(keys(sent)).toEqual([`alert-${ID}`]);
      expect(sent[0].text.split("\n")[0]).toMatch(new RegExp(`^FLAGGED \\(${flag}\\)\\. `));
      expect(sent[0].text).toContain(`Spam check: ${said}\n`);
      expect(rows[0]).toMatchObject({ status: "held", resend_id: null });
    });

    it("answers 429 on a first try past the limit, without asking Turnstile", async () => {
      const { handle, saved, turnstile } = setup({ limited: true });
      const res = await handle(send(lead()));
      expect(res.status).toBe(429);
      expect(saved).toEqual([]);
      expect(turnstile).not.toHaveBeenCalled();
    });

    it("saves a second try past the limit, flagged rate_limited, and holds the plan email", async () => {
      const { handle, saved, sent } = setup({ limited: true });
      const res = await handle(send(lead({ retry: true })));
      expect(await res.json()).toEqual({ success: true, planEmail: "held" });
      expect(saved[0].contact.flag).toBe("rate_limited");
      expect(keys(sent)).toEqual([`alert-${ID}`]);
    });

    it("asks Turnstile with the token and the connection's address", async () => {
      const { handle, turnstile } = setup();
      await handle(send(lead()));
      expect(turnstile).toHaveBeenCalledWith("XXXX.DUMMY.TOKEN.XXXX", IP);
    });
  });

  describe("when something fails (§10)", () => {
    it("still sends the alert, marked as the only copy, and the plan email when the database is down", async () => {
      const { handle, sent } = setup({ dbDown: true });
      const res = await handle(send(lead()));
      expect(await res.json()).toEqual({ success: true, planEmail: "sent" });
      expect(keys(sent)).toEqual([`alert-${ID}`, `plan-${ID}`]);
      expect(sent[0].text.split("\n")[0]).toBe("The database write failed. This email is the only copy of this lead.");
    });

    it("answers 502, and sends no plan email, when the database and the alert both fail", async () => {
      const { handle, tries } = setup({ dbDown: true, failSend: () => 500 });
      const res = await handle(send(lead()));
      expect(res.status).toBe(502);
      expect(await res.json()).toEqual({ success: false });
      expect(keys(tries)).toEqual([`alert-${ID}`]);
    });

    it("counts an alert Resend answers 409 for as sent: one under that key has gone or is going", async () => {
      const { handle } = setup({ dbDown: true, failSend: (email) => (email.idempotencyKey.startsWith("alert-") ? 409 : null) });
      expect((await handle(send(lead()))).status).toBe(200);
    });

    it("tries the plan email twice, then records it failed and sends the send-by-hand alert", async () => {
      const { handle, tries, sent, rows } = setup({ failSend: (email) => (email.idempotencyKey.startsWith("plan-") ? 500 : null) });
      const res = await handle(send(lead()));
      expect(await res.json()).toEqual({ success: true, planEmail: "failed" });
      expect(keys(tries)).toEqual([`alert-${ID}`, `plan-${ID}`, `plan-${ID}`, `alert-failed-${ID}`]);
      expect(sent[1].text.split("\n")[0]).toBe("Plan email NOT sent. Send it by hand today.");
      expect(rows[0]).toMatchObject({ status: "failed", resend_id: null, error_name: "resend_500" });
    });
  });

  describe("a repeat send for the same visit (§13.2 step 2)", () => {
    it.each([
      ["sent", "sent"], ["sent_by_hand", "sent"], ["delivered", "sent"], ["held", "held"],
      ["failed", "failed"], ["bounced", "failed"], [null, "failed"],
    ] as const)("answers a stored %s with %s, and does nothing else", async (stored, planEmail) => {
      const { handle, saved, tries, turnstile } = setup({ stored });
      const res = await handle(send(lead()));
      expect(await res.json()).toEqual({ success: true, planEmail });
      expect(saved).toEqual([]);
      expect(tries).toEqual([]);
      expect(turnstile).not.toHaveBeenCalled();
    });

    it("answers with the first request's result when it loses the race to save", async () => {
      const { handle, tries } = setup({ raceLost: true });
      const res = await handle(send(lead()));
      expect(await res.json()).toEqual({ success: true, planEmail: "sent" });
      expect(tries).toEqual([]);
    });
  });

  describe("the request itself", () => {
    it.each([
      [lead({ email: "x@mailinator.com" }), "email"],
      [lead({ visitId: "nope" }), "payload"],
    ])("answers 400 with the field", async (body, field) => {
      const { handle } = setup();
      const res = await handle(send(body));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ success: false, field });
    });

    it("answers 415 to a body that isn't JSON, and 400 to one over 10 KB", async () => {
      const { handle } = setup();
      expect((await handle(send("{}", "text/plain"))).status).toBe(415);
      const big = lead({ answers: { ...ananya.answers, problemText: "x".repeat(12_000) } });
      expect((await handle(send(big))).status).toBe(400);
    });
  });

  it("never logs a submitted field or the IP", async () => {
    await setup().handle(send(lead()));
    await setup({ dbDown: true }).handle(send(lead()));
    await setup().handle(send(lead({ name: "" })));
    await setup({ turnstile: "refused" }).handle(send(lead()));
    expect(logs.some((line) => line.includes("funnel.lead.saved"))).toBe(true);
    expect(logs.join("\n")).not.toMatch(/Ananya|ananya@example\.com|203\.0\.113\.7|calls back|gone cold/);
  });
});
```

In `tests/api/funnel/skeleton.test.ts`, delete the whole `describe("/api/funnel/lead, until Task 9", …)` block that Task 6 added.

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/api/funnel/lead.test.ts`
Expected: FAIL, with `createLeadHandler is not a function`.

- [ ] **Step 3: Replace `api/funnel/lead.ts`**

```ts
// POST /api/funnel/lead: the checks, then the database, the team alert and the plan email (spec §13.2).
import {
  UpstreamError, clientIp, isJsonRequest, isRateLimited, jsonResponse, logEvent, readJson, requestId,
  resendFrom, sendResendEmail, teamInbox, turnstileOutcome, type TurnstileOutcome,
} from "../_lib";
import { jobIdsFor } from "../../src/features/funnel/data";
import {
  LIMITS, NOTICE_VERSION, TURNSTILE_ACTION,
  type AgentId, type LeadField, type LeadFlag, type LeadRequest, type LeadResponse, type PlanEmailStatus,
} from "../../src/features/funnel/data/contract";
import { cleanName } from "../../src/shared/lib/contact-checks";
import { createDb, type FunnelDb, type StoredPlanEmailStatus, type VisitAnswers, type VisitRecord } from "./_db";
import {
  alertRecipients, buildAlertEmail, buildPlanEmail, buildSendByHandAlert, type Email, type SpamCheck,
} from "./_email";
import { countryOf, parseLead, visitIdOf } from "./_validate";

export const config = { runtime: "nodejs", maxDuration: 15 };

const LEAD_RATE_MAX = 5;              // per connection per 10 minutes, the /contact setting (§13.2 step 4)
const CALL_TIMEOUT_MS = 2_500;        // each Turnstile or Resend call, so most answers land inside S8's 8 s
const PLAN_EMAIL_TRIES = 2;           // two tries, then failed (§10)
const RESEND_KEY_ALREADY_USED = 409;  // Resend: this idempotency key is in flight, or was used with another body

export interface OutgoingEmail extends Email {
  to: string[];
  from: string;
  replyTo?: string;
  idempotencyKey: string;
}

export interface LeadEnv {
  teamInbox: string;
  planFrom: string;
  planReplyTo: string;
  alertFrom: string;
}

export interface LeadDeps {
  db(): FunnelDb;
  rateLimited(key: string, max: number): boolean;
  turnstile(token: string | undefined, ip: string): Promise<TurnstileOutcome>;
  send(email: OutgoingEmail): Promise<{ id: string | null }>;
  jobIdsFor(agentIds: readonly AgentId[]): string[];
  env(): LeadEnv;
  now(): Date;
}

type Gate = { refuse: 403 | 429 | null; flag: LeadFlag | null; spamCheck: SpamCheck };
type Saved = { contactId: string; answers: VisitAnswers } | "duplicate" | null;
type PlanResult = { status: PlanEmailStatus; resendId: string | null; errorName: string | null };

const answer = (request: Request, body: LeadResponse, status = 200): Response => jsonResponse(request, body, status);

const errorNameOf = (error: unknown): string =>
  error instanceof UpstreamError
    ? `${error.provider}_${error.status}`
    : error instanceof Error ? error.name : "unknown";

/** What a repeat send answers for a stored status (§13.2 step 2: the first result). */
const answerFor = (status: StoredPlanEmailStatus | null): PlanEmailStatus =>
  status === "held" ? "held" : status === "failed" || status === "bounced" || status === null ? "failed" : "sent";

async function earlierResult(deps: LeadDeps, visitId: string): Promise<PlanEmailStatus | null> {
  try {
    const found = await deps.db().findLead(visitId);
    return found ? answerFor(found.status) : null;
  } catch (error) {
    // The database is down: carry on. Resend's idempotency keys stop a second email (§13.2).
    logEvent("error", "funnel.lead.replay_check", { name: errorNameOf(error) });
    return null;
  }
}

/** §13.2 steps 4 and 5. A first try that fails stops here; a second try is saved with its flag. */
async function checkSender(deps: LeadDeps, request: Request, lead: LeadRequest): Promise<Gate> {
  const retry = lead.retry === true;
  const ip = clientIp(request);
  if (deps.rateLimited(`funnel-lead:${ip}`, LEAD_RATE_MAX)) {
    return retry
      ? { refuse: null, flag: "rate_limited", spamCheck: "skipped" }
      : { refuse: 429, flag: null, spamCheck: "skipped" };
  }
  const outcome = await deps.turnstile(lead.turnstileToken, ip);
  if (outcome === "passed") return { refuse: null, flag: null, spamCheck: outcome };
  if (!retry) return { refuse: 403, flag: null, spamCheck: outcome };
  return { refuse: null, flag: outcome === "missing" ? "turnstile_unverified" : "turnstile_failed", spamCheck: outcome };
}

const visitSnapshot = (lead: LeadRequest, country: string | null, jobIds: string[]): VisitRecord => ({
  id: lead.visitId,
  last_step: "S8",
  notice_version: NOTICE_VERSION,
  bot_flag: false,
  country,
  chips: lead.answers.chips,
  input_mode: lead.answers.inputMode,
  template: lead.plan.template,
  order_variant: lead.plan.orderVariant,
  tier: lead.plan.tier,
  agent_ids: lead.plan.agentIds,
  job_ids: jobIds,
  classifier_version: lead.plan.classifierVersion,
  agents_version: lead.plan.agentsVersion,
});

/** Write 1. "duplicate" when a racing request saved this visit's lead first; null when the database failed. */
async function saveContact(
  deps: LeadDeps, lead: LeadRequest, flag: LeadFlag | null, country: string | null, jobIds: string[],
): Promise<Saved> {
  try {
    const saved = await deps.db().saveLead(visitSnapshot(lead, country, jobIds), {
      visit_id: lead.visitId,
      name: cleanName(lead.name),
      email: lead.email.trim(),
      phone_e164: lead.phone || null,
      business_other: lead.answers.businessOther?.trim() || null,
      problem_text: lead.answers.problemText?.trim() || null,
      matched_phrases: lead.plan.matchedPhrases,
      consent_version: lead.consent.version,
      flag,
    });
    return "duplicate" in saved ? "duplicate" : saved;
  } catch (error) {
    logEvent("error", "funnel.lead.db", { name: errorNameOf(error) });
    return null;
  }
}

/** Write 2, and the send-by-hand alert. A 409 means an alert under this key has gone or is going. */
async function sendAlert(deps: LeadDeps, lead: LeadRequest, email: Email, idempotencyKey: string): Promise<boolean> {
  const env = deps.env();
  try {
    await deps.send({
      ...email, to: alertRecipients(env.teamInbox, env.planReplyTo), from: env.alertFrom,
      replyTo: lead.email.trim(), idempotencyKey,
    });
    return true;
  } catch (error) {
    if (error instanceof UpstreamError && error.status === RESEND_KEY_ALREADY_USED) return true;
    logEvent("error", "funnel.lead.alert", { name: errorNameOf(error) });
    return false;
  }
}

/** Write 3: two tries under one key, then failed (§10). */
async function sendPlanEmail(deps: LeadDeps, lead: LeadRequest, email: Email): Promise<PlanResult> {
  const env = deps.env();
  let errorName: string | null = null;
  for (let attempt = 1; attempt <= PLAN_EMAIL_TRIES; attempt += 1) {
    try {
      const { id } = await deps.send({
        ...email, to: [lead.email.trim()], from: env.planFrom, replyTo: env.planReplyTo,
        idempotencyKey: `plan-${lead.visitId}`,
      });
      return { status: "sent", resendId: id, errorName: null };
    } catch (error) {
      errorName = errorNameOf(error);
    }
  }
  return { status: "failed", resendId: null, errorName };
}

/** Writes 1 to 4 (§13.2). The lead counts as saved when it's in the database or in the alert. */
async function save(deps: LeadDeps, request: Request, lead: LeadRequest, gate: Gate): Promise<Response> {
  const country = countryOf(request);
  const jobIds = deps.jobIdsFor(lead.plan.agentIds);
  const saved = await saveContact(deps, lead, gate.flag, country, jobIds);
  if (saved === "duplicate") {
    return answer(request, { success: true, planEmail: (await earlierResult(deps, lead.visitId)) ?? "failed" });
  }
  const planEmail = buildPlanEmail({
    name: lead.name, email: lead.email.trim(), problemText: lead.answers.problemText,
    chips: lead.answers.chips, plan: lead.plan,
  });
  const alert = buildAlertEmail({
    lead, flag: gate.flag, spamCheck: gate.spamCheck, answers: saved?.answers ?? null, country,
    receivedAt: deps.now().toISOString(), planEmail,
  });
  const alerted = await sendAlert(deps, lead, alert, `alert-${lead.visitId}`);
  if (!saved && !alerted) {
    logEvent("error", "funnel.lead.lost", { requestId: requestId(request) });
    return answer(request, { success: false }, 502);
  }
  const plan: PlanResult = gate.flag
    ? { status: "held", resendId: null, errorName: null }
    : await sendPlanEmail(deps, lead, planEmail);
  if (plan.status === "failed") {
    const byHand = buildSendByHandAlert({ lead, errorName: plan.errorName, planEmail });
    await sendAlert(deps, lead, byHand, `alert-failed-${lead.visitId}`);
  }
  if (saved) {
    try {
      await deps.db().savePlanEmail({
        contact_id: saved.contactId, resend_id: plan.resendId, status: plan.status,
        agent_ids: lead.plan.agentIds, job_ids: jobIds, error_name: plan.errorName,
      });
    } catch (error) {
      logEvent("error", "funnel.lead.plan_email_row", { name: errorNameOf(error) });
    }
  }
  logEvent("info", "funnel.lead.saved", {
    planEmail: plan.status, flagged: gate.flag !== null, inDb: saved !== null, alerted,
    requestId: requestId(request),
  });
  return answer(request, { success: true, planEmail: plan.status });
}

const refuse = (request: Request, field: LeadField): Response => {
  logEvent("info", "funnel.lead.refused", { field, requestId: requestId(request) });
  return answer(request, { success: false, field }, 400);
};

export function createLeadHandler(deps: LeadDeps) {
  return async (request: Request): Promise<Response> => {
    if (!isJsonRequest(request)) return answer(request, { success: false }, 415);
    let body: unknown;
    try {
      body = await readJson(request, LIMITS.leadBodyBytes);
    } catch {
      return refuse(request, "payload");
    }
    const visitId = visitIdOf(body);
    if (!visitId) return refuse(request, "payload");
    const earlier = await earlierResult(deps, visitId);
    if (earlier) return answer(request, { success: true, planEmail: earlier });
    const parsed = parseLead(body);
    if (!parsed.ok) return refuse(request, parsed.field);
    const gate = await checkSender(deps, request, parsed.value);
    if (gate.refuse) {
      logEvent("info", "funnel.lead.gate", { status: gate.refuse, spamCheck: gate.spamCheck, requestId: requestId(request) });
      return answer(request, { success: false }, gate.refuse);
    }
    return save(deps, request, parsed.value, gate);
  };
}

const sendWithResend = (email: OutgoingEmail): Promise<{ id: string | null }> => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logEvent("error", "funnel.lead.misconfigured", { missing: "RESEND_API_KEY" });
    return Promise.reject(new Error("RESEND_API_KEY is not set"));
  }
  return sendResendEmail({
    apiKey, from: email.from, to: email.to, subject: email.subject, text: email.text,
    replyTo: email.replyTo, idempotencyKey: email.idempotencyKey, timeoutMs: CALL_TIMEOUT_MS,
  });
};

const handle = createLeadHandler({
  db: () => createDb(),
  rateLimited: isRateLimited,
  turnstile: (token, ip) => turnstileOutcome(token, ip, { action: TURNSTILE_ACTION, timeoutMs: CALL_TIMEOUT_MS }),
  send: sendWithResend,
  jobIdsFor,
  env: () => ({
    teamInbox: teamInbox(),
    planFrom: process.env.PLAN_FROM || resendFrom(),
    planReplyTo: process.env.PLAN_REPLY_TO || teamInbox(),
    alertFrom: resendFrom(),
  }),
  now: () => new Date(),
});

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}
```

- [ ] **Step 4: Run all of lane B's tests, the type check, the build and coverage**

```bash
npx vitest run tests/api src/shared/lib/contact-checks.test.ts
npm run typecheck && npm run build
npx vitest run --coverage --coverage.include='api/funnel/**/*.ts' --coverage.include='src/shared/lib/contact-checks.ts' \
  tests/api src/shared/lib/contact-checks.test.ts
```

Expected:
- `tests/api/funnel/lead.test.ts` passes 26 tests and `skeleton.test.ts` passes 5, with every other lane B file green.
- `typecheck` and `build` exit 0.
- Coverage is at least 80 % of lines across `api/funnel/*.ts` and `contact-checks.ts`, and the run exits 0. The two `--coverage.include` flags replace the config's list for this run, so lanes A and C's files, which these tests don't touch, aren't counted against lane B. `createDb` and `sendWithResend` are the parts left uncovered; Task 12's live test and the Preview check below cover them.

- [ ] **Step 5: Commit and push**

```bash
git add api/funnel/lead.ts tests/api/funnel/lead.test.ts tests/api/funnel/skeleton.test.ts
git commit -m "feat(funnel): take leads through /api/funnel/lead: Neon, the team alert and the plan email"
git pull --rebase && git push
```

- [ ] **Step 6: Check `/lead` on the Preview**

The Preview has Cloudflare's test secret, which passes the dummy token. Send Ananya's body with a new visit ID and your own email:

```bash
PREVIEW=https://<the PR's preview host>
node -e 'const b=require("./tests/fixtures/ananya-lead.json"); b.visitId=require("node:crypto").randomUUID(); b.email=process.argv[1]; process.stdout.write(JSON.stringify(b))' \
  "<your email>" > "$TMPDIR/lead.json"
for attempt in 1 2; do
  curl -s -X POST "$PREVIEW/api/funnel/lead" -H "content-type: application/json" \
    -H "x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET" --data @"$TMPDIR/lead.json"; echo
done
```

Expected: `{"success":true,"planEmail":"sent"}` twice. The second answer is the replay, and it sends nothing.

Then check three things:
- **Your inbox:** one plan email from "Adyut at ziiro" (or `RESEND_FROM` until B1), with one link.
- **The team inbox:** one alert titled `New funnel lead: Ananya, business type unknown, team of unknown size`. This visit never went through `/visit`, so its taps are unknown.
- **The Preview's Neon branch:** `select c.name, p.status from contacts c join plan_emails p on p.contact_id = c.id order by c.created_at desc limit 1;` gives `Ananya | sent`.

Tell the manager that `/lead` is on the Preview (lane A, day 4).

### Task 10: Ananya's golden email

**Files:**
- Create: `tests/fixtures/ananya-email.txt`
- Test: `tests/api/funnel/golden-email.test.ts`

**Interfaces:**
- Consumes: Task 7's `tests/fixtures/ananya-lead.json`; Task 8's `buildPlanEmail`; lane C's `calendlyUrl` and `composePlan` (day 3).
- Produces: the golden check from §12 ("Ananya's email matches `copy.md` M exactly, with the new `em.pilot`, link aside"), and a check that the fixture's plan is what `composePlan` makes for her answers.

- [ ] **Step 1: Write the golden text**

`tests/fixtures/ananya-email.txt` is `copy.md` section M's email body, from "Hi Ananya," to the footer, with the `em.pilot` line replaced by §4.5's (spec row `em.pilot`). The file ends with one newline:

```text
Hi Ananya,

Here's the plan you just made on ziiroai.com, so it's in your inbox when you need it.

You said: "Enquiries come in, but by the time someone calls back they've gone cold."

Out of 137 jobs across 33 agents, you need 6 today. Here they are, by part of the business:

One thing to know: this plan is a pilot. Parts of it are still being built. The part that answers questions about your business is live today, and we can show you one in 30 seconds.

Deals. Every enquiry gets a fast reply and every call gets its follow-up, so nothing goes cold.
- Enquiry responder: answers every new enquiry within minutes and checks whether it's serious, so nobody goes cold waiting.
- Reply sorter: reads every reply, flags the serious ones and books the meeting.
- Call companion: preps you before a call, then turns it into notes and a follow-up you can send.

Sales. Finding the businesses that fit, then reaching out to them properly and on time.
- Campaign runner: sends your outreach on schedule and keeps it out of spam folders.

Marketing. Posts, ads and pages that bring enquiries in, built on what already works for you.
- Marketing analyst: tells you which of your posts work and what your comments and DMs keep asking for.

Back Office. Invoices go out and get chased, and you can see this month's numbers without opening a spreadsheet.
- Numbers agent: shows this month's revenue against your goal, and warns you before cash runs short.

Start with the 6 you need. We build them, you watch them work, and the rest waits until you're ready.

Want this built for your business? Book a call:
{Calendly link}

You'll talk to the people who'd build it. Pick a time that suits you.

Adyut
ziiro AI · ziiroai.com

You're getting this because you asked for your plan on ziiroai.com. We'll only email you about this plan. Want your answers deleted? Reply and say so.
```

- [ ] **Step 2: Write the failing test**

`tests/api/funnel/golden-email.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import ananya from "../../fixtures/ananya-lead.json";
import { buildPlanEmail } from "../../../api/funnel/_email";
import { calendlyUrl, composePlan } from "../../../src/features/funnel/data";
import type { LeadRequest } from "../../../src/features/funnel/data/contract";

const lead = ananya as LeadRequest;
const golden = readFileSync(new URL("../../fixtures/ananya-email.txt", import.meta.url), "utf8");

describe("Ananya's plan email (§7, §12)", () => {
  const email = buildPlanEmail({
    name: lead.name, email: lead.email, problemText: lead.answers.problemText, chips: lead.answers.chips, plan: lead.plan,
  });

  it("has the golden subject", () => {
    expect(email.subject).toBe("Ananya, your plan: 6 agents to start with");
  });

  it("matches copy.md M line for line, with the new em.pilot, link aside", () => {
    expect(email.text.replace(calendlyUrl("Ananya", "ananya@example.com"), "{Calendly link}")).toBe(golden);
  });

  it("is built from the plan composePlan makes for her answers", () => {
    const plan = composePlan({
      teamBand: "6_20", revenueBand: "band_3", currency: "INR", chips: [], problemText: lead.answers.problemText ?? "",
    });
    expect({
      template: plan.template, orderVariant: plan.orderVariant, tier: plan.tier, agentIds: plan.agentIds,
      matchedPhrases: plan.matchedPhrases, classifierVersion: plan.classifierVersion, agentsVersion: plan.agentsVersion,
      fallback: plan.fallback,
    }).toEqual(ananya.plan);
  });
});
```

- [ ] **Step 3: Run it**

Run: `npx vitest run tests/api/funnel/golden-email.test.ts`
Expected: 3 tests pass. Each failure points at a different owner:
- **The text test** shows the first differing line. A copy line or an agent's name or line goes to lane C; the order of blocks, or the gaps between them, is fixed in `_email.ts` (Task 8).
- **The composePlan test** shows the differing field. That's lane C's classifier or plan rules, unless the fixture is wrong; settle it with lane C through the manager before changing either.

Both lanes must agree before this test goes green, because lane D's e2e compares the browser's body with the same fixture. This task has no implementation step of its own.

- [ ] **Step 4: Commit**

```bash
git add tests/fixtures/ananya-email.txt tests/api/funnel/golden-email.test.ts
git commit -m "test(funnel): pin Ananya's plan email to copy.md M"
```

### Task 11: The Privacy text (B6)

**Files:**
- Modify: `src/pages/Privacy.tsx` (a new section 05, sections 05 to 09 renumbered 06 to 10, the date)
- Test: `src/pages/Privacy.test.tsx`

**Interfaces:**
- Produces: a Privacy page that names Vercel, Neon (Singapore), Resend, Cloudflare Turnstile and Calendly, says what the funnel stores, and says that a reply to the plan email is enough to get deleted (§13.8, B6). Div approves the words before launch (L-T1).

- [ ] **Step 1: Write the failing test**

`src/pages/Privacy.test.tsx`:

```tsx
// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Privacy from "./Privacy";

const html = renderToStaticMarkup(
  <HelmetProvider context={{}}>
    <MemoryRouter>
      <Privacy />
    </MemoryRouter>
  </HelmetProvider>,
);
const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("the Privacy page covers the funnel (spec §13.8, B6)", () => {
  it("names the five services, and Singapore for the database", () => {
    for (const name of ["Vercel", "Neon", "Singapore", "Resend", "Cloudflare Turnstile", "Calendly"]) {
      expect(text).toContain(name);
    }
  });

  it("says what the funnel stores, and what it never stores", () => {
    for (const phrase of [
      "the options you tap", "your name, your email address", "the words you type about your business",
      "do not store your IP address", "never store audio",
    ]) expect(text).toContain(phrase);
  });

  it("says a reply to the plan email is enough to be deleted", () => {
    expect(text).toContain("reply to the plan email and say so");
    expect(text).toContain("within 7 days");
  });

  it("numbers its sections 01 to 10, in order", () => {
    expect([...html.matchAll(/>(\d{2})<\/p>/g)].map((match) => match[1]))
      .toEqual(["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"]);
  });

  it("is dated October 2026", () => {
    expect(text).toContain("Effective date: October 2026");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/pages/Privacy.test.tsx`
Expected: FAIL in 5 tests. "Neon" isn't found, the indexes stop at 09, and the date says September 2026.

- [ ] **Step 3: Edit `src/pages/Privacy.tsx`**

1. Change `Effective date: September 2026` to `Effective date: October 2026`.
2. Renumber the five sections after "How We Share Information", working from the bottom up: `index="09"` (Contact) becomes `"10"`, `"08"` becomes `"09"`, `"07"` becomes `"08"`, `"06"` becomes `"07"`, and `"05"` (Data Retention) becomes `"06"`.
3. Directly after the closing `</LegalSection>` of section 04 ("How We Share Information"), add:

```tsx
            <LegalSection index="05" title="Your Plan on ziiroai.com">
              <p>
                When you answer the questions on our homepage to get a plan, we keep a
                record of that visit: the options you tap, the plan we show you, how far
                you get, the page you came from, and how you view it (phone or computer,
                light or dark, time zone and language). We read your approximate country
                from a header our hosting provider adds. We do not store your IP address.
              </p>
              <p>
                If you ask for your plan by email, we also store your name, your email
                address, your phone number if you give one, the words you type about your
                business, when you agreed, and which version of this notice you agreed to.
                We never store audio, your precise location or a WhatsApp number.
              </p>
              <p>These services handle it for us:</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Dot />
                  <span>
                    <strong className="font-semibold text-[var(--text-primary)]">Vercel</strong>{" "}
                    hosts the site and runs the code that saves your answers.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Dot />
                  <span>
                    <strong className="font-semibold text-[var(--text-primary)]">Neon</strong>{" "}
                    stores them in a database in Singapore.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Dot />
                  <span>
                    <strong className="font-semibold text-[var(--text-primary)]">Resend</strong>{" "}
                    sends your plan email, and our team&apos;s copy of your request.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Dot />
                  <span>
                    <strong className="font-semibold text-[var(--text-primary)]">Cloudflare Turnstile</strong>{" "}
                    checks that a person, not a bot, sent the form.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Dot />
                  <span>
                    <strong className="font-semibold text-[var(--text-primary)]">Calendly</strong>{" "}
                    handles the call, if you book one.
                  </span>
                </li>
              </ul>
              <p>
                We keep your contact details and the record of your plan email for 12
                months, and the visit record for 24 months. To have your details deleted
                sooner, reply to the plan email and say so. That is enough: we delete them
                within 7 days.
              </p>
            </LegalSection>
```

- [ ] **Step 4: Run the test, the type check and the build**

```bash
npx vitest run src/pages/Privacy.test.tsx
npm run typecheck && npm run build
```

Expected: 5 tests pass. `typecheck` and `build` exit 0, and the prerendered `/privacy` contains "Neon".

- [ ] **Step 5: Commit and hand it to Div**

```bash
git add src/pages/Privacy.tsx src/pages/Privacy.test.tsx
git commit -m "feat(funnel): say on the Privacy page what the funnel stores and who handles it (B6)"
git pull --rebase && git push
```

Write `B6 | drafted | <date> | waiting for Div` in `.team/ziiro-fleet/funnel/phase0.md`, and tell the manager the text is ready for Div on the Preview's `/privacy`. A wording change he asks for goes into the same section, and the test is updated only if a checked phrase changes.

### Task 12: The saved queries, and the live SQL check

**Files:**
- Create: `db/funnel-queries.sql`
- Test: `tests/api/funnel/queries.test.ts`, `tests/api/funnel/db.live.test.ts`

**Interfaces:**
- Consumes: Appendix C; `db/funnel.sql` (P0-T6); Task 6's `createDb`; the Neon `builders` branch string (P0-T1 item 4), sent privately.
- Produces: the nine saved queries that L-T3 and L-T4 run (1 new leads, 3 to send by hand, 6 mark sent by hand, 8 delete a person, and the rest); and proof that `createDb` works against Neon's real schema.

- [ ] **Step 1: Write the failing tests**

`tests/api/funnel/queries.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(new URL("../../../db/funnel-queries.sql", import.meta.url), "utf8");
const statements = sql.replace(/^--.*$/gm, "").split(";").map((part) => part.trim()).filter(Boolean);

describe("db/funnel-queries.sql (Appendix C)", () => {
  it("holds the nine saved queries, numbered in order", () => {
    expect([...sql.matchAll(/^-- (\d)\. /gm)].map((match) => Number(match[1]))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("changes data only in queries 6 to 9, and never drops or alters a table", () => {
    const writes = statements.filter((statement) => /^(update|delete|insert)\b/i.test(statement));
    expect(writes).toHaveLength(5);
    expect(statements.join("\n")).not.toMatch(/\b(drop|alter|truncate)\b/i);
  });
});
```

`tests/api/funnel/db.live.test.ts`:

```ts
import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { afterAll, describe, expect, it } from "vitest";
import { createDb } from "../../../api/funnel/_db";

// Runs only with FUNNEL_DB_URL set to the Neon builders branch. Never point it at main.
const url = process.env.FUNNEL_DB_URL;

describe.skipIf(!url)("api/funnel/_db.ts against Neon (the builders branch)", () => {
  const visitId = randomUUID();
  const email = `lane-b-${visitId.slice(0, 8)}@example.com`;
  const visit = (step: "S3" | "S8", extra: Record<string, unknown>) =>
    ({ id: visitId, last_step: step, notice_version: "2026-10-08", bot_flag: false, country: "IN", ...extra });
  const contact = {
    visit_id: visitId, name: "Lane B test", email, phone_e164: null, business_other: null,
    problem_text: "test words", matched_phrases: [], consent_version: "2026-10-08", flag: null,
  };

  afterAll(async () => {
    const sql = neon(url ?? "");
    await sql.query("delete from contacts where visit_id = $1::uuid", [visitId]);
    await sql.query("delete from visits where id = $1::uuid", [visitId]);
  });

  it("saves a visit, its lead once, and its plan email", async () => {
    const db = createDb(url);
    await db.upsertVisit(visit("S3", { segment: "business", business_type: "interior", team_band: "6_20" }));
    expect(await db.findLead(visitId)).toBeNull();

    const first = await db.saveLead(visit("S8", { chips: [], template: "B", tier: "M" }), contact);
    expect(first).toMatchObject({ answers: { segment: "business", business_type: "interior", team_band: "6_20" } });
    expect(await db.saveLead(visit("S8", {}), contact)).toEqual({ duplicate: true });
    expect(await db.findLead(visitId)).toEqual({ status: null });

    if (!("contactId" in first)) throw new Error("the first save made no contact");
    await db.savePlanEmail({
      contact_id: first.contactId, resend_id: null, status: "sent", agent_ids: ["deals-inbound"],
      job_ids: ["deals-inbound:job"], error_name: null,
    });
    expect(await db.findLead(visitId)).toEqual({ status: "sent" });
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run tests/api/funnel/queries.test.ts tests/api/funnel/db.live.test.ts`
Expected: FAIL in `queries.test.ts` with `ENOENT … db/funnel-queries.sql`. `db.live.test.ts` is skipped.

- [ ] **Step 3: Write `db/funnel-queries.sql`**

Copy Appendix C's saved queries, from the line `-- Saved queries (Neon console). Bot-flagged visits are left out wherever visits are counted.` to the last `delete from visits …` line, into `db/funnel-queries.sql` unchanged. The file then holds 34 lines, with the queries numbered 1 to 9. Queries 6, 7 and 8 take `$1`, the lead's email. In the Neon console, put the email in quotes where `$1` stands.

- [ ] **Step 4: Run every saved query on a throwaway local Postgres**

```bash
PGTMP=$(mktemp -d)
initdb -D "$PGTMP/data" -U postgres >/dev/null
pg_ctl -D "$PGTMP/data" -o "-p 54931 -c unix_socket_directories=''" -l "$PGTMP/log" -w start
psql -h 127.0.0.1 -p 54931 -U postgres -v ON_ERROR_STOP=1 -q -f db/funnel.sql
sed "s/\$1/'nobody@example.com'/g" db/funnel-queries.sql \
  | psql -h 127.0.0.1 -p 54931 -U postgres -v ON_ERROR_STOP=1 -q >/dev/null
echo "saved queries exit $?"
pg_ctl -D "$PGTMP/data" -w stop
```

Expected: `saved queries exit 0`. The same nine queries passed this check against Appendix C's schema on 8 Oct.

- [ ] **Step 5: Run the live check against the `builders` branch**

```bash
FUNNEL_DB_URL='<the builders branch connection string>' npx vitest run tests/api/funnel/db.live.test.ts
```

Expected: 1 test passes, and it removes its own rows afterwards. Type the string into this one command only. Don't export it in a shell profile, and don't write it into any file.

- [ ] **Step 6: Run everything, then commit and push**

```bash
npm test && npm run typecheck && npm run build
git add db/funnel-queries.sql tests/api/funnel/queries.test.ts tests/api/funnel/db.live.test.ts
git commit -m "feat(funnel): add the nine saved queries and a live check of the database code"
git pull --rebase && git push
```

Expected: `npm test` passes, with `db.live.test.ts` skipped because `FUNNEL_DB_URL` isn't set. Lane B is done. Tell the manager, and offer the rest of the day to lane A (00-index §2.1).

---

## Spec coverage

| Spec | Where |
|---|---|
| §13.2 `/visit`: fields, D13, enums, `job_ids`, country, `bot_flag`, `last_step` forward only, 200/400/415/429 | Tasks 5, 6 |
| §13.2 `/lead`: order of checks, first and second tries, writes 1 to 4, answers, idempotency | Tasks 7, 9 |
| §13.3 Resend: text, keys, Reply-To, the cleaned echo, the name rule, the `_lib.ts` changes | Tasks 1, 2, 3, 8 |
| §13.4 Turnstile: action `funnel_lead`, missing vs refused | Task 3 |
| §13.5 Neon: HTTP driver, one transaction, one row per visit | Task 6, Task 12 (live) |
| §13.6 env vars | Task 4 |
| §7 plan email: line order, pilot, fallback, one link; the alert's subject, contents and first lines | Tasks 8, 10 |
| §10 failures: database down, alert down, plan email failing twice, flagged leads held | Task 9 |
| §12 API tests (the `/lead` list), the golden email, no answer text in logs | Tasks 9, 10 |
| §13.8 B6 Privacy | Task 11 |
| Appendix C saved queries | Task 12 |
| §13.10 `/spine/` cache | Task 4 |
