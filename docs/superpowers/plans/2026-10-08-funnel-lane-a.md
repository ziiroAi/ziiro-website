# Business Spine funnel, lane A: the questions (S0–S8) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/` into the questions: the greeting, the six asking screens and the S1b side path, the contact step with its one retry, and the S8 wait. They end on lane C's plan, and every step is saved in the background.

**Architecture:**
- An inline script in `index.html` sets the theme, the day-part and the greeting before first paint.
- The prerendered HTML already holds S0 and S1 as text and real buttons.
- `FunnelRoot` runs one pure reducer over screens and answers. It mirrors each step into history on the same URL, and saves each step to `/api/funnel/visit` without waiting.
- At S7 it sends `/api/funnel/lead` under the D18 rule while S8 plays.
- Logic lives in small `.ts` modules tested with Vitest. Screens are thin components, tested in jsdom, then end to end with Playwright and axe.

**Tech Stack:**
- Vite 8, React 18.3 (`createRoot`; `hydrateRoot` is phase 3), react-router-dom 6.30, TypeScript 5.8.
- Plain CSS with custom properties.
- Vitest with jsdom, Playwright and @axe-core/playwright, all installed in index P0-T4.
- Cloudflare Turnstile.

**Spec:** `docs/superpowers/specs/2026-10-07-business-spine-funnel-design.md` (approved 8 Oct).

**Contracts:** `docs/superpowers/plans/2026-10-08-funnel-00-index.md` ("index" below), §1: `src/features/funnel/data/contract.ts`. A § number without "index" is the spec's.

**Order.** Tasks run in number order. Against index §2.1's calendar:

| Day | Tasks |
|---|---|
| 1 | 1–5 |
| 2 | 6–8 |
| 3 | 9–12 |
| 4 | 13 |
| 5 | 14–17 |

From Task 4 on, flow files import `copy` from the light entry, `@/features/funnel/data/light`, which lane C fills on day 2 morning (index §1.5, §2.2). Until it lands:
- write and test those tasks against the mock (index §2.2);
- keep the commits local, because `npm run typecheck` fails without the export;
- push them the moment `copy` is on the branch.

`FunnelRoot` therefore reaches lane D's Index swap with that push, on day 2 morning, not on day 1. Lane D codes the swap against §1.3 until then. Task 1 needs no copy, so the two day-1 seams, the colour tokens for lane C and the `funnelSession` stub for lane D's header, are pushed on day 1.

## Global Constraints

**Branch and process**
- Work on `feat/business-spine-funnel` (index P0-T2). Commit only the files in this plan's File Structure.
- Run `git pull --rebase` before each push, and never force-push.
- Before each push, run `npm test`, `npm run typecheck` and `npm run build` (index §2.3).
- No new package. Tests use only what index P0-T4 installs: `vitest`, `@vitest/coverage-v8`, `jsdom`, `@playwright/test` and `@axe-core/playwright`.
- DOM tests start with `// @vitest-environment jsdom`. With no Testing Library, they mount with `createRoot` and `act` from `react` (`flow/test/dom.ts`, Task 5).

**Words and IDs**
- No visitor-facing words in code. Every visible line is `copy(id)` from `@/features/funnel/data/light`, and every option ID comes from `contract.ts`.
- S0–S8 import the light entry only, never `@/features/funnel/data` itself. `composePlan`, `PlanPage` and `HeroPicturePrefetch` come through `import()`, started at S5, so the agents data, the jobs and the phrase lists stay out of the funnel chunk (index §1.5, request 14).
- Option i takes its label from item i of its copy line split on `" · "`, or from `s1.o{i+1}` and `s1b.o{i+1}` (index §1.2).
- A placeholder is filled by its text without braces, as in `copy("g.progress", { n: 2, total: 6 })` (index §1.3).
- "Only the greeting is localised. Every other line is in English." (§4.1)

**Flow behaviour (§4.1, §4.2, D6, D9)**
- "Tapping an answer moves on by itself, within 250 ms. Every option is a real button." (§4.1)
- "Nothing waits on the network between steps." (§4.1)
- "Reduced motion: no slides or fades; screens switch at once." (§4.1)
- The header shows "the logo only, from S0 to S8" (§4.1, D6). Lane A signals this with `funnelSession.stage()`, which is `"questions"` until S9 and again after Back from S9 (index §1.3).
- Day-parts follow the visitor's clock: "morning 05:00–11:59, afternoon 12:00–16:59, evening 17:00–04:59" (§4.2).
- The second line follows the same clock: `s0.sub.early` 05:00–07:59, `s0.sub.day` 08:00–21:59, `s0.sub.late` 22:00–04:59 (§4.2).
- Theme (D9): dark when the device asks for dark. Otherwise dark from 17:00 to 04:59, and light from 05:00 to 16:59.

**Limits and data**
- The head script is 2 KB at most and does nothing off `/`. The greeting map is 3 KB at most (§13.1, §13.10).
- Limits come from `LIMITS` in `contract.ts`:

  | Limit | Value |
  |---|---|
  | S2 box | 80 characters |
  | S6 box | 600 characters |
  | Name | 80 characters |
  | Chips | 3 |
  | `contactErrors` | 10 |
  | `/visit` body | 4,096 bytes |
  | `/lead` body | 10,000 bytes |

- S8 waits `LEAD_TIMEOUT_MS` (8,000 ms), counted from the tap on `s7.btn`.
- Typed words never go into `/visit` (D13). That covers the S2 box, the S6 box, the name, the email and the phone.
- Turnstile uses action `TURNSTILE_ACTION` and `appearance: "interaction-only"`. Its script loads when S6 opens. No token at send counts as a failed check (§13.4).

**Performance and access**
- Budgets (§13.10):
  - the funnel chunk is 25 KB gz at most;
  - LCP is 2.0 s at most, INP 100 ms and CLS 0.02;
  - motion is transform and opacity only;
  - lane A's files use nothing from framer-motion, WebGL, Spline or the Preloader.
- WCAG 2.2 AA in both themes, at 390 and 1440 px (§11):
  - options are buttons;
  - focus moves to the new question, an H2 with `tabindex="-1"`;
  - targets are 44 × 44 px;
  - text contrast is 4.5:1;
  - S8's lines sit in `aria-live="polite"`;
  - there are no time limits.
- At least 80 % line coverage on `src/features/funnel/flow/**` (`npm run coverage`, §12).

## Review Focus

1. **S6's sentence starter, half edited.**
   - What happens: most people type into `s6.text` rather than clearing it. They fill one blank, delete the starter, or leave it and tap a chip.
   - Expected: an untouched starter counts as nothing typed (`s6.empty` without a chip). A leftover blank never reaches the plan or the email as "because ___".
   - Test: Task 10, `problemTextFrom`.
2. **A double tap that carries into the next screen.**
   - What happens: the screen changes at once, so the second tap of a fast double tap lands on the next screen's option in the same spot.
   - Expected: the second tap is ignored, and nothing is answered for the visitor.
   - Test: Task 4, `createTapGate`; Task 7, a second tap within 350 ms of S2's lands on S3 + S4 and is ignored; Task 15, a double tap in the browser.
3. **A tap before the app has loaded.**
   - What happens: on a slow phone the prerendered S1 buttons show a second or more before React runs.
   - Expected: the tap still counts once the code arrives.
   - Test: Task 3, the head script keeps the tap; Task 5, `useEarlyTap` answers it; Task 15, the scripts held back and then released.
4. **Sending before Turnstile has a token.**
   - What happens: "Show me my plan" is tapped right after S7 opens, or straight after a failed send resets the widget. Without a token, the first try is a 403, and a second try is saved flagged with no plan email.
   - Expected: the send waits up to 3 s for a token, inside the 8 s budget.
   - Test: Task 9, the token box; Task 13, the send.
5. **Opening Privacy mid-flow.**
   - What happens: `g.footer` and `s7.links` link to /privacy, and a reload starts the questions again (D8).
   - Expected: Privacy opens in a new tab, and the flow stays where it was.
   - Test: Task 5, the link's attributes; Task 15, the popup.

## Contracts and seams

**Lane A uses** (index §1.2, §1.3, §2.2):

| What | Owner | Where | Ready |
|---|---|---|---|
| The contract (listed below) | phase 0 | `src/features/funnel/data/contract.ts`, imported through the light entry `@/features/funnel/data/light` | day 1 |
| `copy`, `currencyFor` (`FunnelLight`) | lane C | the light entry, `src/features/funnel/data/light.ts` | day 2 morning, day 2 |
| `composePlan` (`FunnelData`) | lane C | the full entry, `src/features/funnel/data/index.ts`, through `import()` only | day 3 morning |
| `PlanPage`; `HeroPicturePrefetch` | lane C | `src/features/funnel/plan/PlanPage.tsx`; `plan/HeroPicture.tsx` (lane C, Task 12), both through `import()` | day 3 |
| `isValidName`, `isValidEmail`, `toE164` | lane B, Task 1 | `src/shared/lib/contact-checks.ts` | day 1 |
| `/api/funnel/visit`, `/api/funnel/lead` | lane B | the PR's Preview | day 2, day 4 |
| `playwright.config.ts` (web server `vite preview`, specs in `tests/e2e/`) | lane D | repo root | day 3 |
| `INTERIM_BOOKING_URL` | existing | `src/features/pricing/entities/rates.ts:155` | now |

From the contract, lane A uses:
- the option IDs and their types;
- `isOneOf`, `LIMITS`, `CONSENT_VERSION`, `NOTICE_VERSION`, `TURNSTILE_ACTION`, `LEAD_TIMEOUT_MS`, `LEAD_FIELDS`, `STEPS`;
- the types `StepId`, `DayPart`, `Theme`, `DeviceClass`, `ContactError`, `Currency`, `VisitFields`, `VisitRequest`, `VisitResponse`, `LeadRequest`, `LeadPlan`, `LeadField`, `PlanInput`, `PlanDescriptor`, `PlanPageProps`, `PlanProgress`, `CtaFrom`, `FunnelStage` and `FunnelSession`.

Until a piece lands, its test mocks it, as index §2.2 says: `vi.mock("@/features/funnel/data/light", …)` in Vitest, plus `vi.mock("@/features/funnel/data", …)` where `composePlan` runs, or a route in Playwright. Lane A never writes its own copy of another lane's code.

**Lane A provides:**
- `FunnelRoot` (index §1.3), for lane D's `Index.tsx`, on day 2 morning (see Order).
- `funnelSession`, for lane D's header and nav pill, with `leadContact()`, `reportCta(from)`, `stage()` and `subscribe(onChange)`. The stub lands with Task 1 on day 1 (index §1.3, request 9), and Task 13 completes it on day 4. It has no runtime imports.
- The seven `--funnel-*` colours for lane C, plus `--funnel-title-from` and `--funnel-title-to` for the dark `hx.h2` gradient (request 17).
- On `/`, the page colour and `color-scheme` from the funnel's tokens (request 10), and a sheet at least `100svh` tall, so the pinned footer starts below the fold (request 12).
- `PlanPage` through `React.lazy`, with its `import()` started at S5 so it builds as its own chunk, and `HeroPicturePrefetch` mounted from S5 (requests 11 and 18, Task 13).
- `html[data-funnel]` on `/` for the funnel's own CSS: the current `FunnelStage`, removed when the visitor leaves `/`. The header reads `stage()`, not this attribute.

**Requests.** Requests 9–12, 17 and 18 in `.team/ziiro-fleet/funnel/wave9-requests.md` are applied above. The first draft's asks are settled:
- Lane C's copy has S8's two variants, `s8.l1.chips` and `s8.l3.one`.
- The copy lands on day 2 morning, in `light.ts`.
- The light entry keeps the agents data out of the funnel chunk.
- The header reads `stage()`.
- Lane D's `main.tsx` loads Index's chunk before React mounts, so the prerendered S0 and S1 never blank.
- Lane B's Task 1 fixes the three check signatures Task 12 calls.

Three asks are still open. They go into `.team/ziiro-fleet/requests.md`, word for word under **Requests filed** at the end:

| To | Ask |
|---|---|
| worker-4 (index I-T2) | `getByLabel("Email")` also matches the consent box, because `s7.consent` says "email me". It needs `{ exact: true }` |
| worker-4 (index I-T2) | The questions ignore a tap for 350 ms after each step (Review Focus 2), so I-T2 waits 400 ms before each tap |
| worker-2 (lane D's specs) | The same 400 ms pace in every spec that taps through the questions |

## File Structure

| File | Task | Responsibility |
|---|---|---|
| `index.html` (modify, after line 18) | 3 | The greeting map and the boot script |
| `src/index.css` (modify, before line 1) | 1 | Two `@import` lines, so the prerendered S0 and S1 are styled at first paint |
| `src/features/funnel/tokens.css` | 1 | The seven `--funnel-*` colours per theme, and the page colour while the funnel shows |
| `src/features/funnel/flow/flow.css` | 1 | Layout and motion of S0–S8 |
| `src/features/funnel/flow/boot.ts` | 2, 3 | Day-part, second line, theme and greeting; read, applied and cleared on the client; the greeting snippet |
| `src/features/funnel/flow/state.ts` | 4 | Screens, the reducer, progress, steps and the tap gate |
| `src/features/funnel/flow/options.ts` | 4 | Option IDs paired with their copy labels |
| `src/features/funnel/flow/ui.tsx` | 5 | `Question`, `OptionButton`, `TopRow` (the Back arrow and the progress bar), `PrivacyLink` and `FlowNote` |
| `src/features/funnel/flow/hooks.ts` | 5 | `useBoot`, `useFunnelAttributes`, `useFocusOnStep`, `useEarlyTap` and `useIsoLayoutEffect` |
| `src/features/funnel/flow/screens/types.ts`, `screens/index.ts` | 5 | `ScreenProps`, and which component shows each screen |
| `src/features/funnel/flow/screens/Landing.tsx` | 5 | S0 + S1, prerendered |
| `src/features/funnel/flow/FunnelRoot.tsx` | 5, 6, 13, 14 | The seam: state, history, focus, the screens, the send and the saves |
| `src/features/funnel/flow/test/fake-data.ts`, `test/dom.ts` | 4, 5 | Test only: copy lines and fakes for the data mocks (Task 4), and a jsdom mount helper (Task 5) |
| `src/features/funnel/flow/history.ts` | 6 | History entries on one URL, Back and Forward |
| `src/features/funnel/flow/screens/NonOwner.tsx` | 6 | S1b |
| `src/features/funnel/flow/screens/BusinessType.tsx`, `screens/YearsTeam.tsx` | 7 | S2, and S3 + S4 |
| `src/features/funnel/flow/region.ts`, `screens/Revenue.tsx` | 8 | Time zone and dial codes; S5 |
| `src/shared/lib/turnstile.ts`, `src/shared/hooks/useTurnstile.ts`, `src/pages/Contact.tsx` (modify) | 9 | One Turnstile loader for both forms |
| `src/features/funnel/flow/words.ts`, `screens/Problem.tsx` | 10 | What S6's box means; S6 |
| `src/features/funnel/flow/visit-id.ts`, `send.ts`, `visit.ts` | 11, 14 | The visit ID; the two posts; the `/lead` body, its answer and the D18 rule; S8's timing |
| `src/features/funnel/flow/contact.ts`, `screens/ContactForm.tsx` | 12 | S7's checks and form |
| `src/features/funnel/flow/session.ts` | 1, 13 | `funnelSession`: the day-1 stub, completed in Task 13. No runtime imports |
| `src/features/funnel/flow/screens/Analysing.tsx`, `screens/Plan.tsx`, `useLeadSend.ts`, `plan-chunk.ts` | 13 | S8, the send, the plan at S9, and the `import()`s started at S5 |
| `src/features/funnel/flow/useVisitSaves.ts` | 14 | The background saves |
| `src/features/funnel/flow/copy-ids.test.ts` | 17 | Every copy ID lane A uses exists in lane C's data |
| `tests/e2e/questions.spec.ts`, `questions-send.spec.ts`, `questions-a11y.spec.ts`, `support/questions.ts` | 15–17 | Playwright and axe |

Unit tests sit beside their files as `*.test.ts(x)`.

**Shared and seam files.**
- `src/index.css` gets two lines and nothing else. No lane owns it (§13.7).
- `src/pages/Contact.tsx` is lane A's because §13.4 moves its loader into the shared hook. Its form doesn't change.

---

## Tasks

### Task 1: The day-1 seams: the funnel's colours, its styles and the session stub

**Files:**
- Create: `src/features/funnel/tokens.css`, `src/features/funnel/flow/flow.css`, `src/features/funnel/flow/session.ts`
- Modify: `src/index.css:1` (two lines before `@tailwind base;`)
- Test: `src/features/funnel/flow/tokens.test.ts`, `src/features/funnel/flow/session.test.ts`

**Interfaces:**
- Produces the seven colours `--funnel-bg`, `--funnel-fg`, `--funnel-muted`, `--funnel-line`, `--funnel-card`, `--funnel-accent` and `--funnel-on-accent` (index §1.3), plus `--funnel-title-from` and `--funnel-title-to` for `hx.h2` (§6.2: grey in light, a blue-white gradient in dark; request 17):
  - under `[data-theme="light"]`, and also `:root`, for `/` without JavaScript;
  - under `[data-theme="dark"]`.
- Produces the `.f-*` classes that Tasks 5–13 use. `.f-root` is at least `100svh` tall, so the pinned footer starts below the fold (D6, request 12).
- Produces the `funnelSession` stub that lane D's header codes against (index §1.3, request 9). Task 13 completes it. It has type imports only:

```ts
export const funnelSession: FunnelSession;  // leadContact() null, reportCta() does nothing, stage() "questions", subscribe() a no-op
```

All of it needs no copy, so this task is pushed on day 1 (Order).

- [ ] **Step 1: Write the failing tests**

`src/features/funnel/flow/tokens.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import entry from "../../../index.css?raw";
import tokensCss from "../tokens.css?raw";
import flowCss from "./flow.css?raw";

// ?raw imports (typed by vite/client) instead of node:fs, so tsconfig.app.json type-checks this file too.
const tokens = tokensCss.replace(/\/\*[\s\S]*?\*\//g, "");
const NAMES = ["bg", "fg", "muted", "line", "card", "accent", "on-accent", "title-from", "title-to"];

/** The --funnel-* values declared in the block whose selector list contains `selector`. */
function block(selector: string): Record<string, string> {
  const found = [...tokens.matchAll(/([^{}]+)\{([^}]*)\}/g)].find(([, sel]) =>
    sel.split(",").map((s) => s.trim()).includes(selector),
  );
  if (!found) throw new Error(`no block for ${selector}`);
  return Object.fromEntries([...found[2].matchAll(/--funnel-([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)].map(([, k, v]) => [k, v]));
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const THEMES = ['[data-theme="light"]', '[data-theme="dark"]'];

describe("the funnel's colours (index §1.3, §11.4)", () => {
  it.each(THEMES)("%s declares all nine", (theme) => {
    expect(Object.keys(block(theme)).sort()).toEqual([...NAMES].sort());
  });

  it.each(THEMES)("%s keeps text at 4.5:1 and the button at 3:1 against the page", (theme) => {
    const c = block(theme);
    expect(contrast(c.fg, c.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.muted, c.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.fg, c.card)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.muted, c.card)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c["on-accent"], c.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.accent, c.bg)).toBeGreaterThanOrEqual(3);
    expect(contrast(c["title-from"], c.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c["title-to"], c.bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps hx.h2 grey in light and makes it a blue-white gradient in dark (§6.2)", () => {
    const light = block('[data-theme="light"]');
    const dark = block('[data-theme="dark"]');
    expect([light["title-from"], light["title-to"]]).toEqual([light.muted, light.muted]);
    expect([dark["title-from"], dark["title-to"]]).toEqual(["#F4F6FA", "#B9CCF2"]);
  });

  it("gives / without JavaScript the light colours", () => {
    expect(block(":root")).toEqual(block('[data-theme="light"]'));
  });

  it("makes the funnel's sheet at least a screen tall, so the footer starts below the fold (D6)", () => {
    expect(flowCss).toMatch(/\.f-root \{[^}]*min-height: 100svh;/);
  });

  it("loads both files first in the entry stylesheet, so prerendered S0 and S1 are styled at first paint", () => {
    expect(entry.split("\n").slice(0, 3)).toEqual([
      '@import "./features/funnel/tokens.css";',
      '@import "./features/funnel/flow/flow.css";',
      "@tailwind base;",
    ]);
  });
});
```

`src/features/funnel/flow/session.test.ts` (Task 13 replaces it with the full session's tests):

```ts
import { describe, expect, it, vi } from "vitest";
import { funnelSession } from "./session";
import source from "./session.ts?raw";

describe("the funnelSession stub (index §1.3)", () => {
  it("knows no contact, is at the questions, and ignores call-button taps", () => {
    expect(funnelSession.leadContact()).toBeNull();
    expect(funnelSession.stage()).toBe("questions");
    expect(() => funnelSession.reportCta("header")).not.toThrow();
  });

  it("takes a listener and hands back an unsubscribe", () => {
    const onChange = vi.fn();
    const unsubscribe = funnelSession.subscribe(onChange);
    expect(unsubscribe).toBeTypeOf("function");
    unsubscribe();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("has no runtime imports, so the header can load it on every page (index §1.5)", () => {
    const imports = source.split("\n").filter((line) => line.startsWith("import "));
    expect(imports.every((line) => line.startsWith("import type "))).toBe(true);
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run src/features/funnel/flow/tokens.test.ts src/features/funnel/flow/session.test.ts`
Expected: FAIL with `Failed to resolve import "../tokens.css?raw"` and `Failed to resolve import "./session"`.

- [ ] **Step 3: Create `src/features/funnel/tokens.css`**

```css
/* (C) The funnel's colours (spec D9, §11.4; 00-index §1.3). The questions and the plan read only these.
   Light is also the default, so "/" without JavaScript (no data-theme) gets the funnel's look.
   Page, ink, muted and line come from worker-2's r17 web look (funnel/proto/look/web/index.html).
   The accent is the approved sketch's button colour, with a near-black label at 5.2 to 1.
   title-from and title-to colour hx.h2 (§6.2): grey in light, and the r17 look's blue-white gradient in dark. */
:root,
[data-theme="light"] {
  --funnel-bg: #FAFAF8;
  --funnel-fg: #141618;
  --funnel-muted: #5F646B;
  --funnel-line: #DADCDF;
  --funnel-card: #FFFFFF;
  --funnel-accent: #EF4824;
  --funnel-on-accent: #0B0E14;
  --funnel-title-from: #5F646B;
  --funnel-title-to: #5F646B;
}

[data-theme="dark"] {
  --funnel-bg: #060911;
  --funnel-fg: #F4F6FA;
  --funnel-muted: #A9B3C2;
  --funnel-line: #2A3140;
  --funnel-card: #0E1422;
  --funnel-accent: #EF4824;
  --funnel-on-accent: #0B0E14;
  --funnel-title-from: #F4F6FA;
  --funnel-title-to: #B9CCF2;
}

/* Only while the funnel is on screen. FunnelRoot sets data-funnel, and every other page keeps its own look.
   The !important beats the inline color-scheme that next-themes writes for its forced dark theme. */
html[data-funnel] body,
html[data-funnel] .site-sheet {
  background: var(--funnel-bg);
  color: var(--funnel-fg);
}
html[data-funnel][data-theme="light"] {
  color-scheme: light !important;
}
html[data-funnel][data-theme="dark"] {
  color-scheme: dark !important;
}
```

- [ ] **Step 4: Create `src/features/funnel/flow/flow.css`**

```css
/* (C) The funnel's questions, S0 to S8: layout and motion (spec §4, §11). Colours come from tokens.css.
   Motion is transform and opacity only, so nothing shifts (CLS 0.02 at most, §13.10). It runs only under
   html[data-funnel], which the boot script sets, so "/" without JavaScript gets the still, settled S1. */

.f-root {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100svh;
  max-width: 40rem;
  margin: 0 auto;
  padding: calc(var(--nav-h, 84px) + 0.5rem) 1rem 1.5rem;
  color: var(--funnel-fg);
}
.f-root.is-plan { max-width: none; padding: 0; }
.f-screen,
.f-form { position: relative; display: flex; flex: 1; flex-direction: column; }
.f-screen[hidden],
.f-form[hidden] { display: none; }
.f-top { display: flex; align-items: center; gap: 0.5rem; min-height: 44px; margin-bottom: 1.25rem; }
.f-back {
  display: inline-grid; place-items: center; width: 44px; height: 44px; margin-left: -10px;
  border: 0; border-radius: 999px; background: none; color: var(--funnel-fg);
}
.f-bar { display: flex; flex: 1; gap: 6px; }
.f-bar > span { flex: 1; height: 3px; border-radius: 2px; background: var(--funnel-line); }
.f-bar > span.is-on { background: var(--funnel-fg); }

.f-q { font-size: 1.5rem; font-weight: 700; line-height: 1.2; letter-spacing: -0.01em; color: var(--funnel-fg); outline: none; }
.f-hint { margin-top: 0.375rem; font-size: 0.875rem; color: var(--funnel-muted); }
.f-options { display: grid; gap: 0.625rem; margin-top: 1.25rem; }
.f-row2 { margin-top: 2rem; }
.f-option,
.f-tile,
.f-chip {
  min-width: 44px; min-height: 44px; border: 1px solid var(--funnel-line);
  background: var(--funnel-card); color: var(--funnel-fg); font-weight: 600; text-align: left;
}
.f-option { display: flex; align-items: center; min-height: 48px; padding: 0.75rem 1rem; border-radius: 0.75rem; }
.f-tiles,
.f-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem; }
.f-tile { padding: 0.5rem 0.875rem; border-radius: 0.625rem; }
.f-chip { padding: 0.5rem 0.875rem; border-radius: 999px; font-size: 0.875rem; }
.f-option.is-selected,
.f-tile.is-selected,
.f-option[data-pressed],
.f-option[aria-pressed="true"],
.f-chip[aria-pressed="true"] { border-color: var(--funnel-fg); background: var(--funnel-fg); color: var(--funnel-bg); }

.f-field {
  width: 100%; min-height: 48px; padding: 0.75rem 1rem; border: 1px solid var(--funnel-line);
  border-radius: 0.75rem; background: var(--funnel-card); color: var(--funnel-fg); font: inherit;
}
.f-field::placeholder { color: var(--funnel-muted); opacity: 1; }
.f-field[aria-invalid="true"] { border: 2px solid var(--funnel-fg); }
.f-box { min-height: 6.5rem; margin-top: 1rem; resize: vertical; }
.f-other { display: grid; gap: 0.625rem; margin-top: 0.75rem; }
.f-label { display: block; margin: 1rem 0 0.375rem; font-size: 0.875rem; font-weight: 600; }
.f-err { margin-top: 0.375rem; font-size: 0.875rem; font-weight: 600; color: var(--funnel-fg); }
.f-err:empty { display: none; }
.f-small { font-size: 0.8125rem; line-height: 1.45; color: var(--funnel-muted); }
.f-consent { display: flex; gap: 0.75rem; align-items: flex-start; min-height: 44px; margin-top: 1.25rem; }
.f-consent input { flex: none; width: 24px; height: 24px; margin: 0; accent-color: var(--funnel-fg); }
.f-turnstile:empty { display: none; }
.f-act {
  display: grid; place-items: center; width: 100%; min-height: 52px; margin-top: 1.5rem;
  border: 1px solid var(--funnel-accent); border-radius: 999px;
  background: var(--funnel-accent); color: var(--funnel-on-accent); font-weight: 700; text-decoration: none;
}
.f-link { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
.f-about { margin-top: 2rem; font-size: 0.75rem; color: var(--funnel-muted); }
.f-note { margin-top: auto; padding-top: 1.5rem; font-size: 0.75rem; color: var(--funnel-muted); }
.f-back:focus-visible, .f-option:focus-visible, .f-tile:focus-visible, .f-chip:focus-visible,
.f-act:focus-visible, .f-link:focus-visible, .f-field:focus-visible, .f-consent input:focus-visible {
  outline: 2px solid var(--funnel-fg); outline-offset: 2px;
}

/* S0 (§4.2): the greeting fades up big, then settles into the header while S1 rises under it.
   --f-t is 0 in the prerendered HTML. React sets it to minus the time since first paint, because
   createRoot rebuilds these nodes and they must carry on where the prerendered ones were. */
.f-head h1 { font-size: 1.75rem; font-weight: 800; line-height: 1.15; letter-spacing: -0.02em; color: var(--funnel-fg); }
.f-head p { margin-top: 0.25rem; font-size: 0.875rem; color: var(--funnel-muted); }
.f-s1 { margin-top: 1.25rem; }
.f-intro { display: none; }
html[data-funnel] .f-intro-on .f-intro {
  position: absolute; inset: 0; z-index: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 0 1.5rem; text-align: center; pointer-events: none;
  animation: f-fade-up 500ms ease-out both, f-intro-out 450ms ease-in both;
  animation-delay: var(--f-t, 0ms), calc(var(--f-t, 0ms) + 900ms);
}
.f-intro-greet { font-size: clamp(2.75rem, 12vw, 4.5rem); font-weight: 800; line-height: 1.02; letter-spacing: -0.03em; color: var(--funnel-fg); }
.f-intro-sub { margin-top: 1rem; font-weight: 700; color: var(--funnel-fg); }
.f-intro-promise { max-width: 22rem; margin-top: 0.75rem; color: var(--funnel-muted); }
html[data-funnel] .f-intro-on .f-head { animation: f-fade-up 350ms ease-out both; animation-delay: calc(var(--f-t, 0ms) + 1000ms); }
html[data-funnel] .f-intro-on .f-s1 { animation: f-rise 450ms cubic-bezier(0.2, 0.7, 0.2, 1) both; animation-delay: calc(var(--f-t, 0ms) + 900ms); }

/* Each step slides in within a quarter of a second (§4.1), from the left on Back. */
html[data-funnel] .f-screen[data-dir="forward"] { animation: f-in-right 250ms cubic-bezier(0.2, 0.7, 0.2, 1) both; }
html[data-funnel] .f-screen[data-dir="back"] { animation: f-in-left 250ms cubic-bezier(0.2, 0.7, 0.2, 1) both; }
html[data-funnel] .f-row2.is-forward { animation: f-fade-up 300ms ease-out both; }

/* S6's bridge (§4.3) holds about a second over the screen, then clears to leave its small line above
   the question. The overlay is decoration (aria-hidden); the line and the question are always in the page. */
.f-bridge { margin-bottom: 0.5rem; font-size: 0.875rem; color: var(--funnel-muted); }
.f-bridge-hold { display: none; }
html[data-funnel] .f-s6-intro .f-bridge-hold {
  position: absolute; inset: 0; z-index: 1; display: grid; place-items: center; padding: 0 1.5rem;
  background: var(--funnel-bg); color: var(--funnel-fg); font-size: 1.5rem; font-weight: 700; text-align: center;
  pointer-events: none; animation: f-fade-up 400ms ease-out both, f-clear 300ms ease-in 900ms both;
}

/* S8 (§4.3). */
.f-s8 { display: flex; flex: 1; align-items: center; outline: none; }
.f-s8 p { font-size: 1.5rem; font-weight: 700; line-height: 1.25; color: var(--funnel-fg); }
html[data-funnel] .f-s8 span { display: inline-block; animation: f-fade-up 300ms ease-out both; }
.f-plan { outline: none; }

@keyframes f-fade-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes f-intro-out { to { opacity: 0; transform: translateY(-18svh) scale(0.6); visibility: hidden; } }
@keyframes f-rise { from { transform: translateY(58svh); } to { transform: none; } }
@keyframes f-in-right { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: none; } }
@keyframes f-in-left { from { opacity: 0; transform: translateX(-24px); } to { opacity: 1; transform: none; } }
@keyframes f-clear { to { opacity: 0; visibility: hidden; } }

@media (prefers-reduced-motion: reduce) {
  html[data-funnel] .f-root,
  html[data-funnel] .f-root * { animation: none !important; transition: none !important; }
  html[data-funnel] .f-intro-on .f-intro,
  html[data-funnel] .f-s6-intro .f-bridge-hold { display: none; }
}
```

- [ ] **Step 5: Import both files at the top of `src/index.css`**

Insert these two lines above line 1 (`@tailwind base;`). Vite inlines `@import` before Tailwind runs, and an `@import` has to come before every other rule.

```css
@import "./features/funnel/tokens.css";
@import "./features/funnel/flow/flow.css";
```

The `.f-*` rules are class selectors, so Tailwind's preflight, which comes after them, can't override them.

- [ ] **Step 6: Create the `funnelSession` stub, `src/features/funnel/flow/session.ts`**

```ts
/**
 * (C) funnelSession (00-index §1.3): what lane D's header and nav pill read from the funnel. This is the day-1
 * stub, and Task 13 completes it. Type imports only (00-index §1.5), so the header can load it on every page.
 */
import type { FunnelSession } from "@/features/funnel/data/contract";

export const funnelSession: FunnelSession = {
  leadContact: () => null,
  reportCta: () => undefined,
  stage: () => "questions",
  subscribe: () => () => undefined,
};
```

- [ ] **Step 7: Run the tests and the build**

```bash
npx vitest run src/features/funnel/flow/tokens.test.ts src/features/funnel/flow/session.test.ts
npm run typecheck
npm run build
```

Expected: 11 tests pass. `typecheck` and the build exit 0, and `dist/assets/index-*.css` contains `--funnel-bg`.

- [ ] **Step 8: Commit and push on day 1**

```bash
git add src/features/funnel/tokens.css src/features/funnel/flow/flow.css src/index.css src/features/funnel/flow/tokens.test.ts \
  src/features/funnel/flow/session.ts src/features/funnel/flow/session.test.ts
git commit -m "feat(funnel): add the funnel's colours, the questions' styles and the session stub"
git pull --rebase && npm test && git push
```

Then tell the manager that the tokens (lane C) and the `funnelSession` stub (lane D) are on the branch (index §2.2, day 1).

### Task 2: The boot rules

**Files:**
- Create: `src/features/funnel/flow/boot.ts`
- Test: `src/features/funnel/flow/boot.test.ts`

**Interfaces:**
- Consumes: `DayPart`, `Theme`, `FunnelStage` from `@/features/funnel/data/light`.
- Produces the code below. Task 3's head script mirrors its rules, and Tasks 5 and 14 read `Boot`:

```ts
export type SubId = "s0.sub.early" | "s0.sub.day" | "s0.sub.late";
export interface GreetingRow { lang: string; checked: boolean; lines: [string, string, string] }
export interface Boot {
  hour: number; t0: number; dayPart: DayPart; theme: Theme; sub: SubId;
  lang: string; greeting: string; early: string | null; ready: boolean;
}
export const STATIC_GREETING: "Hello.";
export const PRERENDER_BOOT: Boot;
export function dayPartFor(hour: number): DayPart;
export function subFor(hour: number): SubId;
export function themeFor(hour: number, deviceDark: boolean): Theme;
export function pickRow(map: readonly GreetingRow[], languages: readonly string[]): GreetingRow | null;
export function computeBoot(input: BootInput): Boot;
export function readGreetingMap(doc: Document): GreetingRow[] | null;
export function readBoot(win: Window): Boot;
export function applyFunnelAttributes(doc: Document, theme: Theme, stage: FunnelStage): void;
export function clearFunnelAttributes(win: Window): void;
export function introStartMs(win: Window, t0: number): number;
export function introOffsetMs(start: number, now: number): number;
```

- [ ] **Step 1: Write the failing test**

`src/features/funnel/flow/boot.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyFunnelAttributes, clearFunnelAttributes, computeBoot, dayPartFor, introOffsetMs, introStartMs, pickRow,
  readBoot, readGreetingMap, subFor, themeFor, type GreetingRow,
} from "./boot";

const EN: GreetingRow = { lang: "en", checked: true, lines: ["Hello, good morning.", "Hello, good afternoon.", "Hello, good evening."] };
const HI: GreetingRow = { lang: "hi", checked: false, lines: ["नमस्ते, सुप्रभात।", "नमस्ते, शुभ दोपहर।", "नमस्ते, शुभ संध्या।"] };
const HI_ON: GreetingRow = { ...HI, checked: true };

describe("day-parts (§4.2)", () => {
  it.each([[4, "evening"], [5, "morning"], [11, "morning"], [12, "afternoon"], [16, "afternoon"], [17, "evening"], [0, "evening"], [23, "evening"]])(
    "%i:xx is %s", (hour, part) => expect(dayPartFor(hour)).toBe(part),
  );
});

describe("the second line (§4.2)", () => {
  it.each([[4, "s0.sub.late"], [5, "s0.sub.early"], [7, "s0.sub.early"], [8, "s0.sub.day"], [21, "s0.sub.day"], [22, "s0.sub.late"]])(
    "%i:xx shows %s", (hour, id) => expect(subFor(hour)).toBe(id),
  );
});

describe("the theme (D9)", () => {
  it.each([[4, "dark"], [5, "light"], [16, "light"], [17, "dark"]])("%i:xx on a device with no setting is %s", (hour, theme) =>
    expect(themeFor(hour, false)).toBe(theme),
  );
  it("a device set to dark wins at 10:00", () => expect(themeFor(10, true)).toBe("dark"));
});

describe("the greeting's language (D4)", () => {
  it("takes the first browser language with a live row", () => {
    expect(pickRow([EN, HI_ON], ["hi-IN", "en-GB"])).toBe(HI_ON);
    expect(pickRow([EN, HI_ON], ["fr-FR", "hi"])).toBe(HI_ON);
  });
  it("shows English while Hindi's checked flag is off", () => expect(pickRow([EN, HI], ["hi-IN"])).toBe(EN));
  it("falls back to English for a language with no row, or no list", () => {
    expect(pickRow([EN, HI_ON], ["fr-FR"])).toBe(EN);
    expect(pickRow([EN], [])).toBe(EN);
  });
  it("returns null when the map has no live English row", () => expect(pickRow([HI], ["fr"])).toBeNull());
});

describe("computeBoot", () => {
  it("puts it together", () => {
    expect(computeBoot({ hour: 19, deviceDark: false, languages: ["hi-IN"], map: [EN, HI_ON], t0: 42 })).toEqual({
      hour: 19, t0: 42, dayPart: "evening", theme: "dark", sub: "s0.sub.day",
      lang: "hi", greeting: "नमस्ते, शुभ संध्या।", early: null, ready: false,
    });
  });
  it("keeps the static hello when the map is missing (§4.2)", () => {
    expect(computeBoot({ hour: 9, deviceDark: false, languages: ["en"], map: null, t0: 0 })).toMatchObject({ lang: "en", greeting: "Hello." });
  });
});

describe("the intro's clock", () => {
  const paintAt = (startTime?: number) =>
    ({ performance: { getEntriesByName: () => (startTime === undefined ? [] : [{ startTime }]) } }) as unknown as Window;

  it("starts at first paint on a full load of /", () => expect(introStartMs(paintAt(300), 120)).toBe(300));
  it("starts at t0 when the visitor came from another page, or the browser doesn't say", () => {
    expect(introStartMs(paintAt(300), 9_000)).toBe(9_000);
    expect(introStartMs(paintAt(), 120)).toBe(120);
  });
  it("is offset by minus the time since it started, never a positive delay", () => {
    expect(introOffsetMs(200, 950)).toBe(-750);
    expect(introOffsetMs(500, 400)).toBe(0);
  });
});

describe("on the client", () => {
  afterEach(() => {
    clearFunnelAttributes(window);
    document.head.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it("reads the map from index.html's JSON block, or null when it's broken", () => {
    document.head.innerHTML = `<script id="funnel-greetings" type="application/json">${JSON.stringify([EN])}</script>`;
    expect(readGreetingMap(document)).toEqual([EN]);
    document.head.innerHTML = `<script id="funnel-greetings" type="application/json">{oops</script>`;
    expect(readGreetingMap(document)).toBeNull();
  });

  it("uses the head script's result when there is one", () => {
    const fromHead = computeBoot({ hour: 9, deviceDark: false, languages: ["en"], map: [EN], t0: 1 });
    (window as Window & { __funnelBoot?: unknown }).__funnelBoot = fromHead;
    expect(readBoot(window)).toBe(fromHead);
  });

  it("works one out when the visitor came from another page of the site", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    expect(readBoot(window)).toMatchObject({ theme: "dark", greeting: "Hello." });
  });

  it("sets data-theme and data-funnel, and clears both, with the boot, on the way out", () => {
    applyFunnelAttributes(document, "dark", "questions");
    expect(document.documentElement.dataset).toMatchObject({ theme: "dark", funnel: "questions" });
    clearFunnelAttributes(window);
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(document.documentElement.hasAttribute("data-funnel")).toBe(false);
    expect((window as Window & { __funnelBoot?: unknown }).__funnelBoot).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/features/funnel/flow/boot.test.ts`
Expected: FAIL with `Failed to resolve import "./boot"`.

- [ ] **Step 3: Write `src/features/funnel/flow/boot.ts`**

```ts
/**
 * (C) The boot rules (spec §4.2, D4, D9). index.html's head script runs the same rules before
 * first paint on a full load of "/"; head-script.test.ts keeps the two in step.
 */
import type { DayPart, FunnelStage, Theme } from "@/features/funnel/data/light";

export type SubId = "s0.sub.early" | "s0.sub.day" | "s0.sub.late";
/** A row of the greeting map in index.html. `lang` is lower case; `checked` turns the row on (decision 21). */
export interface GreetingRow { lang: string; checked: boolean; lines: [string, string, string] }
export interface Boot {
  hour: number;
  t0: number;                 // performance.now() when worked out
  dayPart: DayPart;
  theme: Theme;
  sub: SubId;
  lang: string;
  greeting: string;
  early: string | null;       // an S1 option tapped before React ran (Review Focus 3)
  ready: boolean;             // set once FunnelRoot has mounted
}
export interface BootInput {
  hour: number;
  deviceDark: boolean;
  languages: readonly string[];
  map: readonly GreetingRow[] | null;
  t0: number;
}
type BootWindow = Window & { __funnelBoot?: Boot };

/** What the prerendered HTML holds, and keeps if the boot script fails (§4.2). */
export const STATIC_GREETING = "Hello.";
/** The boot the prerender (and a server render) uses: "Hello.", the daytime line, light. */
export const PRERENDER_BOOT: Boot = {
  hour: 12, t0: 0, dayPart: "afternoon", theme: "light", sub: "s0.sub.day",
  lang: "en", greeting: STATIC_GREETING, early: null, ready: false,
};
const LINE_FOR: Record<DayPart, 0 | 1 | 2> = { morning: 0, afternoon: 1, evening: 2 };

export function dayPartFor(hour: number): DayPart {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
}

export function subFor(hour: number): SubId {
  if (hour >= 5 && hour < 8) return "s0.sub.early";
  if (hour >= 8 && hour < 22) return "s0.sub.day";
  return "s0.sub.late";
}

export function themeFor(hour: number, deviceDark: boolean): Theme {
  return deviceDark || hour >= 17 || hour < 5 ? "dark" : "light";
}

/** The first browser language with a live row, by full tag and then its first part; else English (D4). */
export function pickRow(map: readonly GreetingRow[], languages: readonly string[]): GreetingRow | null {
  const live = (lang: string) => map.find((row) => row.checked && row.lang === lang);
  for (const tag of languages) {
    const t = String(tag).toLowerCase();
    const row = live(t) ?? live(t.split("-")[0]);
    if (row) return row;
  }
  return live("en") ?? null;
}

export function computeBoot({ hour, deviceDark, languages, map, t0 }: BootInput): Boot {
  const dayPart = dayPartFor(hour);
  const row = map ? pickRow(map, languages) : null;
  return {
    hour, t0, dayPart,
    theme: themeFor(hour, deviceDark),
    sub: subFor(hour),
    lang: row?.lang ?? "en",
    greeting: row ? row.lines[LINE_FOR[dayPart]] : STATIC_GREETING,
    early: null,
    ready: false,
  };
}

export function readGreetingMap(doc: Document): GreetingRow[] | null {
  try {
    const parsed: unknown = JSON.parse(doc.getElementById("funnel-greetings")?.textContent ?? "null");
    return Array.isArray(parsed) ? (parsed as GreetingRow[]) : null;
  } catch {
    return null;
  }
}

/** The head script's result on a full load of "/"; worked out here when the visitor came from another page. */
export function readBoot(win: BootWindow): Boot {
  if (win.__funnelBoot) return win.__funnelBoot;
  let deviceDark = false;
  try {
    deviceDark = win.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    deviceDark = false;       // no matchMedia: the clock decides
  }
  const nav = win.navigator;
  const boot = computeBoot({
    hour: new Date().getHours(),
    deviceDark,
    languages: nav.languages?.length ? nav.languages : [nav.language || "en"],
    map: readGreetingMap(win.document),
    t0: win.performance.now(),
  });
  win.__funnelBoot = boot;
  return boot;
}

/** data-funnel marks "/" for the funnel's own CSS. The header reads funnelSession.stage(), not this attribute. */
export function applyFunnelAttributes(doc: Document, theme: Theme, stage: FunnelStage): void {
  doc.documentElement.setAttribute("data-theme", theme);
  doc.documentElement.setAttribute("data-funnel", stage);
}

/** Leaving "/": other pages keep their own look, and a later visit to "/" works its boot out afresh. */
export function clearFunnelAttributes(win: BootWindow): void {
  win.document.documentElement.removeAttribute("data-theme");
  win.document.documentElement.removeAttribute("data-funnel");
  delete win.__funnelBoot;
}

/** When the S0 intro started: first paint on a full load of "/", or t0 when the visitor came from another page. */
export function introStartMs(win: Window, t0: number): number {
  const paint = win.performance.getEntriesByName?.("first-contentful-paint")?.[0];
  return Math.max(paint ? paint.startTime : t0, t0);
}

/** How far the S0 intro already is, as a negative delay for flow.css's --f-t. */
export function introOffsetMs(start: number, now: number): number {
  return Math.min(0, Math.round(start - now));
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/features/funnel/flow/boot.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/funnel/flow/boot.ts src/features/funnel/flow/boot.test.ts
git commit -m "feat(funnel): add the greeting, day-part and theme rules"
```

### Task 3: The head script and the greeting snippet

**Files:**
- Modify: `index.html` (insert after line 18, `<script>document.documentElement.classList.add("js");</script>`)
- Modify: `src/features/funnel/flow/boot.ts` (add `greetingSnippet`)
- Test: `src/features/funnel/flow/head-script.test.ts`

**Interfaces:**
- Consumes: Task 2's `computeBoot`, `Boot`, `GreetingRow`, `SubId`.
- Produces, before first paint on a full load of `/`:
  - `window.__funnelBoot`, a `Boot`;
  - `data-theme` and `data-funnel="questions"` on `<html>`;
  - an S1 tap on any `[data-early]` button, kept in `__funnelBoot.early` until `ready` is true.
- Produces `export function greetingSnippet(subs: Readonly<Record<SubId, string>>): string` for Landing (Task 5).

- [ ] **Step 1: Write the failing test**

`src/features/funnel/flow/head-script.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import html from "../../../../index.html?raw";
import { computeBoot, greetingSnippet, type Boot, type GreetingRow } from "./boot";

const mapText = html.match(/<script id="funnel-greetings" type="application\/json">([\s\S]*?)<\/script>/)?.[1] ?? "";
const bootText = html.match(/<script id="funnel-boot">([\s\S]*?)<\/script>/)?.[1] ?? "";
const MAP = JSON.parse(mapText || "[]") as GreetingRow[];
const HI_ON = MAP.map((row) => (row.lang === "hi" ? { ...row, checked: true } : row));
const SUBS = { "s0.sub.early": "You're up early.", "s0.sub.day": "Glad you're here.", "s0.sub.late": "Late one? I'll keep it quick." };
const bytes = (text: string) => new TextEncoder().encode(text).length;

type BootWindow = Window & { __funnelBoot?: Boot };
const bootNow = () => (window as BootWindow).__funnelBoot;

function runHead(o: { hour: number; dark: boolean; languages: string[]; map: readonly GreetingRow[] | string }): Boot | undefined {
  vi.setSystemTime(new Date(2026, 9, 9, o.hour, 30));
  vi.stubGlobal("matchMedia", () => ({ matches: o.dark }));
  Object.defineProperty(window.navigator, "languages", { value: o.languages, configurable: true });
  const json = typeof o.map === "string" ? o.map : JSON.stringify(o.map);
  document.head.innerHTML = `<script id="funnel-greetings" type="application/json">${json}</script>`;
  new Function(bootText)();
  return bootNow();
}

beforeEach(() => vi.useFakeTimers({ toFake: ["Date"] }));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete (window as BootWindow).__funnelBoot;
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-funnel");
  document.body.innerHTML = "";
  window.history.replaceState(null, "", "/");
});

describe("index.html's head script (§4.2, §13.1)", () => {
  it("is small enough to inline: the script 2 KB, the map 3 KB (§13.10)", () => {
    expect(bytes(bootText)).toBeGreaterThan(0);
    expect(bytes(bootText)).toBeLessThanOrEqual(2_048);
    expect(bytes(mapText)).toBeLessThanOrEqual(3_072);
  });

  it("sits in the head, after the js class and before the app's module", () => {
    const at = (needle: string) => html.indexOf(needle);
    expect(at('id="funnel-greetings"')).toBeGreaterThan(at('classList.add("js")'));
    expect(at('id="funnel-boot"')).toBeGreaterThan(at('id="funnel-greetings"'));
    expect(at('id="funnel-boot"')).toBeLessThan(at('<script type="module"'));
  });

  it("ships English on, and Hindi in the map with its checked flag off (decision 21)", () => {
    expect(MAP.find((row) => row.lang === "en")).toEqual({
      lang: "en", checked: true, lines: ["Hello, good morning.", "Hello, good afternoon.", "Hello, good evening."],
    });
    expect(MAP.find((row) => row.lang === "hi")).toMatchObject({ checked: false, lines: ["नमस्ते, सुप्रभात।", "नमस्ते, शुभ दोपहर।", "नमस्ते, शुभ संध्या।"] });
  });

  it("agrees with computeBoot at every hour, both device settings, three language lists and the Hindi flag", () => {
    for (let hour = 0; hour < 24; hour++) {
      for (const dark of [false, true]) {
        for (const languages of [["en-IN"], ["hi-IN", "en"], ["fr-FR"]]) {
          for (const map of [MAP, HI_ON]) {
            const got = runHead({ hour, dark, languages, map });
            expect({ ...got, t0: 0 }).toEqual(computeBoot({ hour, deviceDark: dark, languages, map, t0: 0 }));
          }
        }
      }
    }
  });

  it("sets the theme and the questions mode on <html>", () => {
    runHead({ hour: 22, dark: false, languages: ["en"], map: MAP });
    expect(document.documentElement.dataset).toMatchObject({ theme: "dark", funnel: "questions" });
  });

  it("keeps Hello. and still sets the theme when the map is broken (§10)", () => {
    expect(runHead({ hour: 10, dark: false, languages: ["en"], map: "{oops" })).toMatchObject({ greeting: "Hello.", theme: "light" });
  });

  it("does nothing off /", () => {
    window.history.replaceState(null, "", "/privacy");
    expect(runHead({ hour: 10, dark: false, languages: ["en"], map: MAP })).toBeUndefined();
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("keeps the first S1 tap made before the app is ready, and none after (Review Focus 3)", () => {
    const boot = runHead({ hour: 10, dark: false, languages: ["en"], map: MAP });
    document.body.innerHTML = '<button data-early="agency"><span>I run an agency</span></button><button data-early="business">x</button>';
    (document.querySelector("span") as HTMLElement).click();
    expect(boot?.early).toBe("agency");
    expect(document.querySelector('[data-early="agency"]')?.hasAttribute("data-pressed")).toBe(true);
    if (boot) boot.ready = true;
    (document.querySelector('[data-early="business"]') as HTMLElement).click();
    expect(boot?.early).toBe("agency");
  });
});

describe("greetingSnippet", () => {
  it("writes the visitor's greeting, its lang and the second line into the prerendered elements", () => {
    document.body.innerHTML = '<h1 data-greet>Hello.</h1><p data-greet>Hello.</p><p data-sub>Glad you\'re here.</p>';
    (window as BootWindow).__funnelBoot = computeBoot({ hour: 6, deviceDark: false, languages: ["hi"], map: HI_ON, t0: 0 });
    new Function(greetingSnippet(SUBS))();
    const greets = [...document.querySelectorAll("[data-greet]")];
    expect(greets.map((el) => [el.textContent, el.getAttribute("lang")])).toEqual([["नमस्ते, सुप्रभात।", "hi"], ["नमस्ते, सुप्रभात।", "hi"]]);
    expect(document.querySelector("[data-sub]")?.textContent).toBe("You're up early.");
  });

  it("leaves the static lines alone when the head script didn't run", () => {
    document.body.innerHTML = "<h1 data-greet>Hello.</h1>";
    new Function(greetingSnippet(SUBS))();
    expect(document.querySelector("h1")?.textContent).toBe("Hello.");
  });

  it("can't be closed early by a line", () => {
    expect(greetingSnippet({ ...SUBS, "s0.sub.day": "</script><b>" })).not.toContain("</script>");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/features/funnel/flow/head-script.test.ts`
Expected: FAIL. The size test fails with `expected 0 to be greater than 0`, and the snippet tests fail with `greetingSnippet is not a function`.

- [ ] **Step 3: Insert the greeting map and the boot script into `index.html`, after line 18**

```html
    <!-- (C) The funnel's greeting map (spec §4.2, decision 21). A row shows only when "checked" is true.
         Hindi turns on once the owner has checked its three lines. 3 KB at most (§13.10). -->
    <script id="funnel-greetings" type="application/json">[{"lang":"en","checked":true,"lines":["Hello, good morning.","Hello, good afternoon.","Hello, good evening."]},{"lang":"hi","checked":false,"lines":["नमस्ते, सुप्रभात।","नमस्ते, शुभ दोपहर।","नमस्ते, शुभ संध्या।"]}]</script>
    <!-- (C) The funnel's boot (§4.2, §13.1, D9): theme, day-part and greeting before first paint, on "/" only.
         It mirrors src/features/funnel/flow/boot.ts; head-script.test.ts keeps them in step. 2 KB at most. -->
    <script id="funnel-boot">
      (function () {
        try {
          if (location.pathname !== "/") return;
          var d = document, w = window, h = new Date().getHours(), dark = false;
          try { dark = w.matchMedia("(prefers-color-scheme: dark)").matches; } catch (e) {}
          var part = h >= 5 && h < 12 ? 0 : h >= 12 && h < 17 ? 1 : 2;
          var b = {
            hour: h, t0: w.performance.now(), dayPart: ["morning", "afternoon", "evening"][part],
            theme: dark || h >= 17 || h < 5 ? "dark" : "light",
            sub: h >= 5 && h < 8 ? "s0.sub.early" : h >= 8 && h < 22 ? "s0.sub.day" : "s0.sub.late",
            lang: "en", greeting: "Hello.", early: null, ready: false
          };
          w.__funnelBoot = b;
          d.documentElement.setAttribute("data-theme", b.theme);
          d.documentElement.setAttribute("data-funnel", "questions");
          d.addEventListener("click", function (e) {
            var el = e.target && e.target.closest ? e.target.closest("[data-early]") : null;
            if (!el || b.ready) return;
            if (b.early === null) b.early = el.getAttribute("data-early");
            el.setAttribute("data-pressed", "");
          }, true);
          var map = JSON.parse(d.getElementById("funnel-greetings").textContent);
          var n = w.navigator, langs = n.languages && n.languages.length ? n.languages : [n.language || "en"];
          var live = function (l) { for (var i = 0; i < map.length; i++) if (map[i].checked && map[i].lang === l) return map[i]; };
          var row;
          for (var j = 0; j < langs.length && !row; j++) { var t = String(langs[j]).toLowerCase(); row = live(t) || live(t.split("-")[0]); }
          row = row || live("en");
          if (row) { b.lang = row.lang; b.greeting = row.lines[part]; }
        } catch (e) {}
      })();
    </script>
```

The theme is set before the map is parsed, so a broken map still gets the right theme. Only the first early tap counts (`b.early === null`), which is what the test expects.

- [ ] **Step 4: Add `greetingSnippet` to the end of `src/features/funnel/flow/boot.ts`**

```ts
/**
 * The inline script Landing prints right after the greeting (§13.1). In the prerendered HTML it writes the
 * visitor's greeting, its lang and the second line before the browser paints. If anything fails, "Hello." stays.
 * React's own render doesn't run it; by then the boot is in state.
 */
export function greetingSnippet(subs: Readonly<Record<SubId, string>>): string {
  const json = JSON.stringify(subs).replace(/</g, "\\u003c");
  return (
    `(function(s){try{var b=window.__funnelBoot;if(!b)return;` +
    `document.querySelectorAll("[data-greet]").forEach(function(e){e.textContent=b.greeting;e.setAttribute("lang",b.lang)});` +
    `document.querySelectorAll("[data-sub]").forEach(function(e){e.textContent=s[b.sub]})}catch(e){}})(${json})`
  );
}
```

- [ ] **Step 5: Run the test and the build**

```bash
npx vitest run src/features/funnel/flow/head-script.test.ts src/features/funnel/flow/boot.test.ts
npm run build
```

Expected: all tests pass. The build exits 0, and `dist/index.html` contains `id="funnel-boot"` once.

- [ ] **Step 6: Commit**

```bash
git add index.html src/features/funnel/flow/boot.ts src/features/funnel/flow/head-script.test.ts
git commit -m "feat(funnel): set the theme and the greeting before first paint"
```

### Task 4: The questions' state and option lists

**Files:**
- Create: `src/features/funnel/flow/state.ts`, `src/features/funnel/flow/options.ts`, `src/features/funnel/flow/test/fake-data.ts`
- Test: `src/features/funnel/flow/state.test.ts`, `src/features/funnel/flow/options.test.ts`

**Interfaces:**
- Consumes: `LIMITS`, the option ID lists and types, `PlanDescriptor`, `PlanPageProps`, `PlanProgress`, `StepId`, `FunnelStage`, `copy` (mocked until lane C lands it).
- Produces, for Tasks 5–14:

```ts
// state.ts
export const SCREENS: readonly ["s1", "s1b", "s2", "s34", "s5", "s6", "s7", "s8", "plan"];
export type Screen = (typeof SCREENS)[number];
export const PROGRESS: Readonly<Partial<Record<Screen, number>>>;   // s1 1 … s7 6
export const PROGRESS_TOTAL = 6;
export const STEP_OF: Readonly<Record<Screen, StepId>>;
export const TAP_LOCK_MS = 350;
export interface Answers { /* see Step 3 */ }
export interface ContactDraft { name: string; email: string; phone: string; consent: boolean }
export type ContactField = "name" | "email" | "phone" | "consent";
export type SaveNotice = PlanPageProps["saveNotice"];
export type SendLine = "s7.err.bot" | "g.error";
export type SendResult =
  | { to: "plan"; notice: SaveNotice; error: ContactError | null }
  | { to: "s7"; error: ContactError; field: ContactField | null; line: SendLine | null };
export interface FlowState { /* see Step 3 */ }
export type FlowAction = /* see Step 3 */;
export function initialFlow(starter: string): FlowState;
export function reduce(state: FlowState, action: FlowAction): FlowState;
export function funnelStageOf(state: FlowState): FunnelStage;
export interface TapGate { lock(now: number): void; allow(now: number): boolean }
export function createTapGate(lockMs?: number): TapGate;

// options.ts
export interface Option<T extends string> { id: T; label: string }
export function listOptions<T extends string>(ids: readonly T[], lineId: string): Option<T>[];
export function numberedOptions<T extends string>(ids: readonly T[], prefix: string): Option<T>[];
export const segmentOptions, nonOwnerOptions, businessOptions, yearsOptions, teamOptions, chipOptions: () => Option<…>[];
export function revenueOptions(currency: Currency): Option<RevenueBand>[];

// test/fake-data.ts (tests only)
export const LINES: Readonly<Record<string, string>>;
export function fakeCopy(id: string, vars?: Readonly<Record<string, string | number>>): string;
export const FAKE_PLAN: PlanDescriptor;
export const FAKE_DATA: { copy; currencyFor; composePlan };
```

Every flow test that renders words mocks the light entry the same way. A test that also runs `composePlan` mocks `@/features/funnel/data` with the same object (Task 13):

```ts
vi.mock("@/features/funnel/data/light", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import("./test/fake-data")).FAKE_DATA,   // "../test/fake-data" from screens/
}));
```

- [ ] **Step 1: Create the test data, `src/features/funnel/flow/test/fake-data.ts`**

```ts
/**
 * (C) Test only. The lines lane A's screens show (copy.md, with spec §4.5's changes and the two S8 variants in
 * lane C's copy) and fakes to spread inside vi.mock of the light entry, and of the full entry where composePlan
 * runs, so the flow's tests don't wait on lane C. copy-ids.test.ts (Task 17) checks the real copy has every ID.
 */
import type { Currency, PlanDescriptor, PlanInput } from "@/features/funnel/data/light";

export const LINES: Readonly<Record<string, string>> = {
  "g.about": "ziiro AI is an AI consultancy based in India, working with teams worldwide.",
  "g.back": "Back",
  "g.progress": "Step {n} of {total}",
  "g.footer": "Your answers are saved to shape your plan. · Privacy",
  "g.error": "Something went wrong on our end. Try that again?",
  "g.noscript": "This page needs JavaScript to build your plan. Rather talk? Book a call.",
  "nav.btn": "Book a call",
  "s0.sub.early": "You're up early.",
  "s0.sub.day": "Glad you're here.",
  "s0.sub.late": "Late one? I'll keep it quick.",
  "s0.promise": "A few taps and I'll put together a plan for your business. Takes about a minute.",
  "s1.q": "What do you do?",
  "s1.o1": "I run a business",
  "s1.o2": "I run an agency",
  "s1.o3": "I freelance",
  "s1.o4": "I'm starting something",
  "s1.o5": "Student, or just curious",
  "s1b.q": "What brought you here?",
  "s1b.o1": "Ideas for my own work",
  "s1b.o2": "Thinking about starting a business",
  "s1b.o3": "Learning how businesses use AI",
  "s1b.o4": "Saw a reel or a post",
  "s1b.o5": "Something else",
  "s1b.done": "Got it, thanks. Everything's open, have a look around.",
  "s1b.btn": "Show me the site",
  "s2.q": "What kind of business?",
  "s2.hint": "Pick the closest one.",
  "s2.o": "Interior design / architecture · Clinic / healthcare · Real estate · Education / coaching / study abroad · Insurance / loans · Law / consultancy · Marketing or creative agency · Retail / boutique / D2C · Gym / salon / fitness · Manufacturing · Restaurant / food · Other",
  "s2.other": "Type it in a few words, like \"printing press\" or \"travel agency\"",
  "s3.q": "How long have you been at it?",
  "s3.why": "This tells me what's probably already in place.",
  "s3.o": "Less than a year · 1–3 years · 3–5 years · 5–10 years · 10+ years",
  "s4.q": "How big is the team?",
  "s4.why": "Count yourself. The plan should fit the people you actually have.",
  "s4.o": "Just me · 2–5 · 6–20 · 21–50 · 50+",
  "s5.q": "Roughly, what does it make in a year?",
  "s5.why": "A band is fine. I only use it to size your plan.",
  "s5.o.IN": "Under ₹25L · ₹25L–1Cr · ₹1–5Cr · ₹5–25Cr · ₹25Cr+",
  "s5.o.other": "Under $250k · $250k–1M · $1–5M · $5–25M · $25M+",
  "s5.skip": "Rather not say",
  "s6.bridge": "Now let's talk about why you're here.",
  "s6.q": "Between you and me, what's the one thing in your business that's hurting right now?",
  "s6.hint": "Say it however it comes out. I'm listening.",
  "s6.text": "Honestly, I'm struggling with ___ because ___.",
  "s6.chips.lead": "Or tap up to three:",
  "s6.chips": "Not enough leads · Leads don't convert · Follow-ups slip · Ads burn money · No time for content · I don't know my numbers · Payments get stuck · Team chaos · Customer support",
  "s6.chips.max": "Three's plenty. Untap one to swap.",
  "s6.btn": "That's it",
  "s6.empty": "Give me something to work with: a few words, a chip, anything.",
  "s7.q": "Where should I send your plan?",
  "s7.sub": "It opens right here in a second, and a copy goes to your inbox.",
  "s7.name": "Your name",
  "s7.name.ph": "First name is fine",
  "s7.email": "Email",
  "s7.email.ph": "The one you actually check",
  "s7.phone": "Phone (optional)",
  "s7.phone.why": "Only if you'd like a call. I won't WhatsApp you unless you ask.",
  "s7.consent": "I agree that ziiro can save my answers and email me about this plan. If I add a phone number, ziiro can call me about it too, but won't message me on WhatsApp unless I ask. I can ask for my data to be deleted at any time.",
  "s7.links": "Privacy · For business owners 18+",
  "s7.btn": "Show me my plan",
  "s7.err.name": "What should I call you?",
  "s7.err.email": "That email doesn't look right. Mind checking it?",
  "s7.err.phone": "That number doesn't look right. You can leave it blank.",
  "s7.err.consent": "Tick the box so I'm allowed to save this.",
  "s7.err.bot": "The spam check didn't go through. Mind trying once more?",
  "s8.l1": "Reading what you wrote…",
  "s8.l1.chips": "Looking at what you picked…",
  "s8.l2": "Matching it against a map of 137 business jobs…",
  "s8.l3": "Sizing it for a team of {team}…",
  "s8.l3.one": "Sizing it for a team of one…",
};

/** Throws like the real copy(): on an unknown ID, and on a placeholder left unfilled. */
export function fakeCopy(id: string, vars: Readonly<Record<string, string | number>> = {}): string {
  const line = LINES[id];
  if (line === undefined) throw new Error(`unknown copy id: ${id}`);
  return line.replace(/\{([^}]+)\}/g, (_match, key: string) => {
    if (!(key in vars)) throw new Error(`${id}: {${key}} is not filled`);
    return String(vars[key]);
  });
}

/** A fixed plan for the flow's tests. The values are illustrative; lane C's composePlan decides real plans. */
export const FAKE_PLAN: PlanDescriptor = {
  bucketPrimary: "sales", bucketSecondary: "lead_gen", bucketScores: { sales: 6, lead_gen: 2 },
  matchedPhrases: ["gone cold"], template: "B", orderVariant: "B-convert", lane: null, tier: "M",
  agentIds: ["deals-inbound", "deals-reply-handling", "sales-sequencing-send", "deals-call-cycle", "intelligence-people", "deals-pipeline-ops"],
  jobIds: [], stops: [], marks: { runs: 0, build: 0, mapped: 0 }, litDiscs: [], pilot: true, fallback: false,
  currency: "INR", classifierVersion: "kw-1", agentsVersion: "2026-10-04",
};

export const fakeComposePlan = (input: PlanInput): PlanDescriptor => ({ ...FAKE_PLAN, currency: input.currency });

export const fakeCurrencyFor = (country: string | null, timeZone: string | null): Currency =>
  country === "IN" || (country === null && (timeZone === "Asia/Kolkata" || timeZone === "Asia/Calcutta")) ? "INR" : "USD";

/** Spread over the real module inside vi.mock("@/features/funnel/data/light"), and "@/features/funnel/data" in Task 13. */
export const FAKE_DATA = { copy: fakeCopy, currencyFor: fakeCurrencyFor, composePlan: fakeComposePlan };
```

- [ ] **Step 2: Write the failing tests**

`src/features/funnel/flow/state.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { FAKE_PLAN } from "./test/fake-data";
import { createTapGate, funnelStageOf, initialFlow, reduce, type FlowAction, type FlowState } from "./state";

const STARTER = "Honestly, I'm struggling with ___ because ___.";
const from = (state: FlowState, ...actions: FlowAction[]) => actions.reduce(reduce, state);
const run = (...actions: FlowAction[]) => from(initialFlow(STARTER), ...actions);

const TO_S6: FlowAction[] = [
  { type: "segment", value: "business" }, { type: "business", value: "interior" },
  { type: "years", value: "5_10" }, { type: "team", value: "6_20" }, { type: "revenue", value: "band_3", currency: "INR" },
];
const TO_S7: FlowAction[] = [...TO_S6, { type: "problemDone", hasWords: true }];
const SENT: FlowAction[] = [...TO_S7, { type: "sendStarted", visitor: { name: "Ananya", email: "ananya@example.com" } }, { type: "planReady", plan: FAKE_PLAN }];
const AT_PLAN: FlowAction[] = [...SENT, { type: "sendFinished", result: { to: "plan", notice: null, error: null } }];

describe("the questions' state (§4.1, §4.3)", () => {
  it("starts on S1 with the S6 starter in the box and nothing in history", () => {
    expect(initialFlow(STARTER)).toMatchObject({ screen: "s1", nav: { mode: "none", seq: 0 }, answers: { problemText: STARTER, chips: [] } });
  });

  it("S1: an owner goes to S2, anyone else to S1b, each adding a history entry", () => {
    expect(run({ type: "segment", value: "business" })).toMatchObject({ screen: "s2", nav: { mode: "push", seq: 1 } });
    expect(run({ type: "segment", value: "freelance" }).screen).toBe("s1b");
  });

  it("s1.o2 preselects the agency type on S2, but never over a type already chosen", () => {
    expect(run({ type: "segment", value: "agency" }).answers.businessType).toBe("agency");
    expect(run(...TO_S6.slice(0, 2), { type: "popTo", screen: "s1" }, { type: "segment", value: "agency" }).answers.businessType).toBe("interior");
  });

  it("S1b: the answer shows s1b.done on the same screen, replacing its entry, with the header still closed", () => {
    const s = run({ type: "segment", value: "student" }, { type: "nonOwner", value: "learning" });
    expect(s).toMatchObject({ screen: "s1b", nonOwnerDone: true, nav: { mode: "replace", seq: 2 } });
    expect(funnelStageOf(s)).toBe("questions");  // FunnelStage is "plan" from S9 only; s1b.btn leads on (D15)
  });

  it("S2: a type moves on; Other opens the box, which stops at 80, and its button moves on", () => {
    expect(run(...TO_S6.slice(0, 2)).screen).toBe("s34");
    const s = run({ type: "segment", value: "business" }, { type: "business", value: "other" }, { type: "businessOther", text: "x".repeat(100) });
    expect(s).toMatchObject({ screen: "s2", answers: { businessType: "other" } });
    expect(s.answers.businessOther).toHaveLength(80);
    expect(reduce(s, { type: "businessOtherDone" }).screen).toBe("s34");
  });

  it("S3 + S4: the first tap brings the team row forward; the second moves on, in either order", () => {
    const s = run(...TO_S6.slice(0, 3));
    expect(s).toMatchObject({ screen: "s34", teamRowForward: true, nav: { mode: "replace" } });
    expect(reduce(s, { type: "team", value: "6_20" }).screen).toBe("s5");
    expect(run(...TO_S6.slice(0, 2), { type: "team", value: "solo" }, { type: "years", value: "1_3" }).screen).toBe("s5");
  });

  it("S5: a band, or Rather not say, moves on and keeps the currency it was shown in", () => {
    expect(run(...TO_S6.slice(0, 4), { type: "revenue", value: "undisclosed", currency: "USD" })).toMatchObject({
      screen: "s6", answers: { revenueBand: "undisclosed", revenueCurrency: "USD" },
    });
  });

  it("S6: the box stops at 600 characters", () => {
    expect(run(...TO_S6, { type: "problemText", text: "y".repeat(700) }).answers.problemText).toHaveLength(600);
  });

  it("S6: three chips at most; a fourth shows s6.chips.max, and untapping one clears it", () => {
    const four: FlowAction[] = (["leads", "ads", "team", "content"] as const).map((value) => ({ type: "chip", value }));
    const s = run(...TO_S6, ...four);
    expect(s).toMatchObject({ chipsFull: true, answers: { chips: ["leads", "ads", "team"] } });
    expect(reduce(s, { type: "chip", value: "ads" })).toMatchObject({ chipsFull: false, answers: { chips: ["leads", "team"] } });
  });

  it("S6: That's it with nothing shows s6.empty; words or a chip move on", () => {
    expect(run(...TO_S6, { type: "problemDone", hasWords: false })).toMatchObject({ screen: "s6", problemEmpty: true });
    expect(run(...TO_S7)).toMatchObject({ screen: "s7", problemDone: true });
    expect(run(...TO_S6, { type: "chip", value: "leads" }, { type: "problemDone", hasWords: false }).screen).toBe("s7");
  });

  it("S7: a failed check logs its fields; editing a field clears its own error", () => {
    const s = run(...TO_S7, { type: "contactInvalid", fields: ["name", "consent"] });
    expect(s).toMatchObject({ fieldErrors: ["name", "consent"], contactErrors: ["name", "consent"] });
    expect(reduce(s, { type: "contact", patch: { name: "A" } }).fieldErrors).toEqual(["consent"]);
  });

  it("keeps the first 10 contact errors (Appendix C)", () => {
    const eleven: FlowAction[] = Array.from({ length: 11 }, () => ({ type: "contactInvalid", fields: ["email"] }));
    expect(run(...TO_S7, ...eleven).contactErrors).toHaveLength(10);
  });

  it("sending puts S8 in S7's place and counts the try", () => {
    expect(run(...SENT)).toMatchObject({ screen: "s8", nav: { mode: "replace" }, attempt: 1, visitor: { name: "Ananya" }, plan: FAKE_PLAN });
  });

  it("a first failure goes back to S7 with its line; a 400 marks its field (index §1.3)", () => {
    const bot = run(...SENT, { type: "sendFinished", result: { to: "s7", error: "bot", field: null, line: "s7.err.bot" } });
    expect(bot).toMatchObject({ screen: "s7", dir: "back", sendLine: "s7.err.bot", contactErrors: ["bot"], nav: { mode: "replace" } });
    const email = run(...SENT, { type: "sendFinished", result: { to: "s7", error: "email", field: "email", line: null } });
    expect(email).toMatchObject({ fieldErrors: ["email"], sendLine: null });
  });

  it("a send that worked, or a second failure, opens the plan in S7's place with its notice", () => {
    expect(run(...AT_PLAN)).toMatchObject({ screen: "plan", nav: { mode: "replace" }, saveNotice: null });
    const unsure = run(...SENT, { type: "sendFinished", result: { to: "plan", notice: "unsure", error: "timeout" } });
    expect(unsure).toMatchObject({ screen: "plan", saveNotice: "unsure", contactErrors: ["timeout"] });
  });

  it("logs a result that arrives after the visitor went Back, and changes no screen", () => {
    const s = run(...SENT, { type: "popTo", screen: "s6" }, { type: "sendFinished", result: { to: "s7", error: "timeout", field: null, line: "g.error" } });
    expect(s).toMatchObject({ screen: "s6", contactErrors: ["timeout"] });
  });

  it("Back and Forward: the entry decides, S8 means S7, and a plan that's gone means S6", () => {
    expect(run(...TO_S6.slice(0, 4), { type: "popTo", screen: "s34" })).toMatchObject({ screen: "s34", dir: "back", nav: { mode: "none", seq: 5 } });
    expect(run(...SENT, { type: "popTo", screen: "s8" }).screen).toBe("s7");
    expect(run(...TO_S7, { type: "popTo", screen: "plan" }).screen).toBe("s6");
  });

  it("leaving the plan starts a new visit: the round goes up and the try count, errors and plan reset (§4.1)", () => {
    const s = run(...AT_PLAN, { type: "popTo", screen: "s6" });
    expect(s).toMatchObject({ screen: "s6", round: 1, attempt: 0, contactErrors: [], plan: null, saveNotice: null });
    expect(s.contact).toEqual(run(...AT_PLAN).contact);
  });

  it("merges what the plan reports, and caps the time to plan at a day", () => {
    const s = run({ type: "progress", fields: { planDepth: 2 } }, { type: "progress", fields: { filmPlayed: true } }, { type: "planShown", seconds: 100_000 });
    expect(s.progress).toEqual({ planDepth: 2, filmPlayed: true });
    expect(s.secondsToResult).toBe(86_400);
  });

  it("is at the plan stage on the plan only (index §1.2's FunnelStage)", () => {
    expect(funnelStageOf(run(...AT_PLAN))).toBe("plan");
    expect(funnelStageOf(run(...AT_PLAN, { type: "popTo", screen: "s6" }))).toBe("questions");
  });
});

describe("the tap gate (Review Focus 2)", () => {
  it("lets taps through, then ignores them for 350 ms after a step changes", () => {
    const gate = createTapGate();
    expect(gate.allow(0)).toBe(true);
    gate.lock(1_000);
    expect(gate.allow(1_200)).toBe(false);
    expect(gate.allow(1_350)).toBe(true);
  });
});
```

`src/features/funnel/flow/options.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { businessOptions, chipOptions, listOptions, nonOwnerOptions, revenueOptions, segmentOptions, teamOptions, yearsOptions } from "./options";

vi.mock("@/features/funnel/data/light", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import("./test/fake-data")).FAKE_DATA,
}));

describe("option lists (index §1.2)", () => {
  it("pairs S1's and S1b's IDs with their numbered lines", () => {
    expect(segmentOptions().map((o) => o.id)).toEqual(["business", "agency", "freelance", "starting", "student"]);
    expect(segmentOptions()[0].label).toBe("I run a business");
    expect(nonOwnerOptions()[4]).toEqual({ id: "something_else", label: "Something else" });
  });

  it("pairs the 12 S2 types with s2.o in order", () => {
    const options = businessOptions();
    expect(options).toHaveLength(12);
    expect(options[0]).toEqual({ id: "interior", label: "Interior design / architecture" });
    expect(options[6]).toEqual({ id: "agency", label: "Marketing or creative agency" });
    expect(options[11]).toEqual({ id: "other", label: "Other" });
  });

  it("labels S3, S4 and the nine chips", () => {
    expect(yearsOptions()[3]).toEqual({ id: "5_10", label: "5–10 years" });
    expect(teamOptions()[0]).toEqual({ id: "solo", label: "Just me" });
    expect(chipOptions().map((o) => o.id)).toEqual(["leads", "convert", "followups", "ads", "content", "numbers", "payments", "team", "support"]);
  });

  it("shows rupee bands in India and dollar bands elsewhere, then Rather not say (D10)", () => {
    expect(revenueOptions("INR").map((o) => o.label)).toEqual(["Under ₹25L", "₹25L–1Cr", "₹1–5Cr", "₹5–25Cr", "₹25Cr+", "Rather not say"]);
    expect(revenueOptions("USD")[2]).toEqual({ id: "band_3", label: "$1–5M" });
    expect(revenueOptions("USD")[5].id).toBe("undisclosed");
  });

  it("refuses a line whose item count doesn't match its IDs", () => {
    expect(() => listOptions(["a", "b"], "s4.o")).toThrow("s4.o has 5 items, expected 2");
  });
});
```

- [ ] **Step 3: Run them and watch them fail**

Run: `npx vitest run src/features/funnel/flow/state.test.ts src/features/funnel/flow/options.test.ts`
Expected: FAIL with `Failed to resolve import "./state"` and `Failed to resolve import "./options"`.

- [ ] **Step 4: Write `src/features/funnel/flow/state.ts`**

```ts
/**
 * (C) The questions' state (spec §4.1, §4.3, §10): one pure reducer over screens and answers.
 * Screens, history (Task 6) and the send (Task 13) only dispatch; nothing here touches the DOM or the network.
 */
import {
  LIMITS, type BusinessType, type ChipId, type ContactError, type Currency, type NonOwnerReason, type PlanDescriptor,
  type FunnelStage, type PlanPageProps, type PlanProgress, type RevenueBand, type Segment, type StepId, type TeamBand,
  type YearsBand,
} from "@/features/funnel/data/light";

export const SCREENS = ["s1", "s1b", "s2", "s34", "s5", "s6", "s7", "s8", "plan"] as const;
export type Screen = (typeof SCREENS)[number];

/** The bar's segment for each screen that asks something (§4.1). S1b, S8 and the plan show no bar. */
export const PROGRESS: Readonly<Partial<Record<Screen, number>>> = { s1: 1, s2: 2, s34: 3, s5: 4, s6: 5, s7: 6 };
export const PROGRESS_TOTAL = 6;

/** The step a screen saves as (§9). A visit's first save is S0; S3 + S4 saves S4 once the team row is forward. */
export const STEP_OF: Readonly<Record<Screen, StepId>> = {
  s1: "S1", s1b: "S1b", s2: "S2", s34: "S3", s5: "S5", s6: "S6", s7: "S7", s8: "S8", plan: "S9",
};

/** A tap this soon after a step change is the tail of a double tap (Review Focus 2). */
export const TAP_LOCK_MS = 350;

export interface Answers {
  segment: Segment | null;
  nonOwnerReason: NonOwnerReason | null;
  businessType: BusinessType | null;
  businessOther: string;               // the S2 box; it travels only inside /lead (D13)
  yearsBand: YearsBand | null;
  teamBand: TeamBand | null;
  revenueBand: RevenueBand | null;
  revenueCurrency: Currency | null;    // the currency S5 showed when it was tapped
  problemText: string;                 // the S6 box as it stands, starter included
  chips: ChipId[];                     // tap order
}

export interface ContactDraft { name: string; email: string; phone: string; consent: boolean }
export type ContactField = "name" | "email" | "phone" | "consent";
export type SaveNotice = PlanPageProps["saveNotice"];
export type SendLine = "s7.err.bot" | "g.error";

/** What a send comes to (index §1.3). send.ts's afterSend makes it (Task 11). */
export type SendResult =
  | { to: "plan"; notice: SaveNotice; error: ContactError | null }
  | { to: "s7"; error: ContactError; field: ContactField | null; line: SendLine | null };

export interface FlowState {
  screen: Screen;
  dir: "forward" | "back";
  nav: { mode: "push" | "replace" | "none"; seq: number };  // seq goes up on every step change
  answers: Answers;
  nonOwnerDone: boolean;               // S1b answered: s1b.done shows
  teamRowForward: boolean;             // S3 answered first: the team row is forward
  problemDone: boolean;                // "That's it" passed once: chips and inputMode are saved (§9)
  problemEmpty: boolean;               // s6.empty shows
  chipsFull: boolean;                  // s6.chips.max shows
  contact: ContactDraft;
  fieldErrors: ContactField[];         // s7.err.<field> under each field
  sendLine: SendLine | null;           // s7.err.bot or g.error above the button
  attempt: number;                     // sends in this visit; the second carries retry (§10)
  contactErrors: ContactError[];       // in the order they happened, the first LIMITS.contactErrors
  visitor: { name: string; email: string } | null;
  plan: PlanDescriptor | null;
  saveNotice: SaveNotice;
  secondsToResult: number | null;
  progress: PlanProgress;
  round: number;                       // goes up each time the visitor leaves the plan: a new visit (§4.1)
}

export type FlowAction =
  | { type: "segment"; value: Segment }
  | { type: "nonOwner"; value: NonOwnerReason }
  | { type: "business"; value: BusinessType }
  | { type: "businessOther"; text: string }
  | { type: "businessOtherDone" }
  | { type: "years"; value: YearsBand }
  | { type: "team"; value: TeamBand }
  | { type: "revenue"; value: RevenueBand; currency: Currency }
  | { type: "problemText"; text: string }
  | { type: "chip"; value: ChipId }
  | { type: "problemDone"; hasWords: boolean }
  | { type: "contact"; patch: Partial<ContactDraft> }
  | { type: "contactInvalid"; fields: ContactField[] }
  | { type: "sendStarted"; visitor: { name: string; email: string } }
  | { type: "planReady"; plan: PlanDescriptor }
  | { type: "sendFinished"; result: SendResult }
  | { type: "planShown"; seconds: number }
  | { type: "progress"; fields: PlanProgress }
  | { type: "popTo"; screen: Screen };

export function initialFlow(starter: string): FlowState {
  return {
    screen: "s1",
    dir: "forward",
    nav: { mode: "none", seq: 0 },
    answers: {
      segment: null, nonOwnerReason: null, businessType: null, businessOther: "", yearsBand: null,
      teamBand: null, revenueBand: null, revenueCurrency: null, problemText: starter, chips: [],
    },
    nonOwnerDone: false, teamRowForward: false, problemDone: false, problemEmpty: false, chipsFull: false,
    contact: { name: "", email: "", phone: "", consent: false },
    fieldErrors: [], sendLine: null, attempt: 0, contactErrors: [], visitor: null, plan: null,
    saveNotice: null, secondsToResult: null, progress: {}, round: 0,
  };
}

const answer = (state: FlowState, patch: Partial<Answers>): FlowState => ({ ...state, answers: { ...state.answers, ...patch } });

/** A step change. "replace" keeps the history entry count; "push" adds one (§4.1). */
function go(state: FlowState, screen: Screen, mode: "push" | "replace" = "push"): FlowState {
  return { ...state, screen, dir: "forward", nav: { mode, seq: state.nav.seq + 1 } };
}

function logErrors(list: readonly ContactError[], more: readonly ContactError[]): ContactError[] {
  return [...list, ...more].slice(0, LIMITS.contactErrors);
}

function popTo(state: FlowState, target: Screen): FlowState {
  const leavingPlan = state.screen === "plan" && target !== "plan";
  const base: FlowState = leavingPlan
    ? { ...state, round: state.round + 1, attempt: 0, contactErrors: [], plan: null, saveNotice: null, secondsToResult: null, progress: {} }
    : state;
  const wanted: Screen = target === "s8" ? "s7" : target === "plan" && !base.plan ? "s6" : target;
  return {
    ...base,
    screen: wanted,
    dir: SCREENS.indexOf(wanted) < SCREENS.indexOf(state.screen) ? "back" : "forward",
    nav: { mode: "none", seq: base.nav.seq + 1 },  // the browser already moved
    fieldErrors: [],
    sendLine: null,
    problemEmpty: false,
  };
}

export function reduce(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case "segment": {
      const owner = action.value === "business" || action.value === "agency";
      const preselect = action.value === "agency" && !state.answers.businessType ? "agency" : state.answers.businessType;
      const next = answer(state, { segment: action.value, businessType: preselect });
      return owner ? go(next, "s2") : go({ ...next, nonOwnerDone: false }, "s1b");
    }
    case "nonOwner":
      return go(answer({ ...state, nonOwnerDone: true }, { nonOwnerReason: action.value }), "s1b", "replace");
    case "business":
      if (action.value === "other") return answer(state, { businessType: "other" });
      return go(answer(state, { businessType: action.value }), "s34");
    case "businessOther":
      return answer(state, { businessOther: action.text.slice(0, LIMITS.businessOtherChars) });
    case "businessOtherDone":
      return go(state, "s34");
    case "years": {
      const next = answer(state, { yearsBand: action.value });
      if (state.answers.teamBand) return go(next, "s5");
      return { ...next, teamRowForward: true, nav: { mode: "replace", seq: state.nav.seq + 1 } };
    }
    case "team": {
      const next = answer(state, { teamBand: action.value });
      return state.answers.yearsBand ? go(next, "s5") : next;
    }
    case "revenue":
      return go(answer(state, { revenueBand: action.value, revenueCurrency: action.currency }), "s6");
    case "problemText":
      return { ...answer(state, { problemText: action.text.slice(0, LIMITS.problemTextChars) }), problemEmpty: false };
    case "chip": {
      const { chips } = state.answers;
      if (chips.includes(action.value)) {
        return { ...answer(state, { chips: chips.filter((chip) => chip !== action.value) }), chipsFull: false, problemEmpty: false };
      }
      if (chips.length >= LIMITS.chips) return { ...state, chipsFull: true };
      return { ...answer(state, { chips: [...chips, action.value] }), problemEmpty: false };
    }
    case "problemDone":
      if (!action.hasWords && state.answers.chips.length === 0) return { ...state, problemEmpty: true };
      return go({ ...state, problemDone: true, problemEmpty: false, chipsFull: false }, "s7");
    case "contact":
      return {
        ...state,
        contact: { ...state.contact, ...action.patch },
        fieldErrors: state.fieldErrors.filter((field) => !(field in action.patch)),
        sendLine: null,
      };
    case "contactInvalid":
      return { ...state, fieldErrors: action.fields, sendLine: null, contactErrors: logErrors(state.contactErrors, action.fields) };
    case "sendStarted":
      return { ...go(state, "s8", "replace"), attempt: state.attempt + 1, visitor: action.visitor, fieldErrors: [], sendLine: null };
    case "planReady":
      return { ...state, plan: action.plan };
    case "sendFinished": {
      const { result } = action;
      const contactErrors = result.error ? logErrors(state.contactErrors, [result.error]) : state.contactErrors;
      if (state.screen !== "s8") return { ...state, contactErrors };  // they went Back during S8
      if (result.to === "plan") return { ...go(state, "plan", "replace"), contactErrors, saveNotice: result.notice };
      return {
        ...go(state, "s7", "replace"),
        dir: "back",
        contactErrors,
        fieldErrors: result.field ? [result.field] : [],
        sendLine: result.line,
      };
    }
    case "planShown":
      return { ...state, secondsToResult: Math.min(action.seconds, LIMITS.secondsToResultMax) };
    case "progress":
      return { ...state, progress: { ...state.progress, ...action.fields } };
    case "popTo":
      return popTo(state, action.screen);
  }
}

/** "plan" from S9 on, and "questions" before it and after Back from S9 (index §1.2). The header reads it (D6). */
export function funnelStageOf(state: FlowState): FunnelStage {
  return state.screen === "plan" ? "plan" : "questions";
}

export interface TapGate { lock(now: number): void; allow(now: number): boolean }

/** Ignores a tap within lockMs of a step change, so a double tap can't answer the next screen. */
export function createTapGate(lockMs: number = TAP_LOCK_MS): TapGate {
  let lockedAt = Number.NEGATIVE_INFINITY;
  return {
    lock(now) {
      lockedAt = now;
    },
    allow(now) {
      return now - lockedAt >= lockMs;
    },
  };
}
```

- [ ] **Step 5: Write `src/features/funnel/flow/options.ts`**

```ts
/** (C) Each screen's option IDs (contract.ts) paired with their labels (copy lines), in display order (index §1.2). */
import {
  BUSINESS_TYPES, CHIPS, NON_OWNER_REASONS, REVENUE_BANDS, SEGMENTS, TEAM_BANDS, YEARS_BANDS, copy,
  type Currency, type RevenueBand,
} from "@/features/funnel/data/light";

export interface Option<T extends string> { id: T; label: string }

/** Item i of a " · " line, paired with ID i. Throws when the counts differ, so a copy edit can't shift answers. */
export function listOptions<T extends string>(ids: readonly T[], lineId: string): Option<T>[] {
  const labels = copy(lineId).split(" · ");
  if (labels.length !== ids.length) throw new Error(`${lineId} has ${labels.length} items, expected ${ids.length}`);
  return ids.map((id, i) => ({ id, label: labels[i] }));
}

/** IDs paired with numbered lines: s1.o1 to s1.o5. */
export function numberedOptions<T extends string>(ids: readonly T[], prefix: string): Option<T>[] {
  return ids.map((id, i) => ({ id, label: copy(`${prefix}${i + 1}`) }));
}

const BANDS = REVENUE_BANDS.filter((band) => band !== "undisclosed");

export const segmentOptions = () => numberedOptions(SEGMENTS, "s1.o");
export const nonOwnerOptions = () => numberedOptions(NON_OWNER_REASONS, "s1b.o");
export const businessOptions = () => listOptions(BUSINESS_TYPES, "s2.o");
export const yearsOptions = () => listOptions(YEARS_BANDS, "s3.o");
export const teamOptions = () => listOptions(TEAM_BANDS, "s4.o");
export const chipOptions = () => listOptions(CHIPS, "s6.chips");

/** S5: the five bands in the visitor's currency (D10), then s5.skip, which is a full answer. */
export function revenueOptions(currency: Currency): Option<RevenueBand>[] {
  return [...listOptions(BANDS, currency === "INR" ? "s5.o.IN" : "s5.o.other"), { id: "undisclosed", label: copy("s5.skip") }];
}
```

- [ ] **Step 6: Run the tests and the type check**

```bash
npx vitest run src/features/funnel/flow/state.test.ts src/features/funnel/flow/options.test.ts
npm run typecheck
```

Expected: both files pass. `typecheck` exits 0 once lane C's `copy` is exported from `data/index.ts`. Before that it fails only on `copy` in `options.ts` (see Order).

- [ ] **Step 7: Commit**

```bash
git add src/features/funnel/flow/state.ts src/features/funnel/flow/options.ts src/features/funnel/flow/test/fake-data.ts \
  src/features/funnel/flow/state.test.ts src/features/funnel/flow/options.test.ts
git commit -m "feat(funnel): add the questions' state and option lists"
```

### Task 5: The shell: FunnelRoot, S0 + S1, and the small parts

**Files:**
- Create: `src/features/funnel/flow/ui.tsx`, `src/features/funnel/flow/hooks.ts`, `src/features/funnel/flow/screens/types.ts`, `src/features/funnel/flow/screens/index.ts`, `src/features/funnel/flow/screens/Landing.tsx`, `src/features/funnel/flow/FunnelRoot.tsx`, `src/features/funnel/flow/test/dom.ts`
- Test: `src/features/funnel/flow/FunnelRoot.test.tsx`, `src/features/funnel/flow/FunnelRoot.server.test.tsx`

**Interfaces:**
- Consumes:
  - Task 2's `Boot`, `PRERENDER_BOOT`, `readBoot`, `applyFunnelAttributes`, `clearFunnelAttributes`, `introStartMs`, `introOffsetMs`;
  - Task 3's `greetingSnippet`;
  - Task 4's `reduce`, `initialFlow`, `createTapGate`, `funnelStageOf`, `PROGRESS`, `PROGRESS_TOTAL` and `segmentOptions`;
  - `copy`, `isOneOf`, `SEGMENTS`, and `INTERIM_BOOKING_URL`.
- Produces:
  - `export function FunnelRoot(): JSX.Element` (index §1.3, for lane D's `Index.tsx`).
  - For every later screen:

```ts
// ui.tsx
export function Question(props: { id?: string; focusFirst?: boolean; children: ReactNode }): JSX.Element;
export function OptionButton(props: OptionButtonProps): JSX.Element;  // label, onPick, kind?, selected?, pressed?, early?, expanded?, controls?
export function TopRow(props: { screen: Screen; back?: boolean }): JSX.Element;  // Back arrow + bar
export function PrivacyLink(props: { label: string }): JSX.Element;
export function FlowNote(): JSX.Element;

// hooks.ts
export const useIsoLayoutEffect: typeof useLayoutEffect;
export function useBoot(): Boot;
export function useFunnelAttributes(theme: Theme, stage: FunnelStage): void;
export function useFocusOnStep(seq: number, screen: Screen, root: RefObject<HTMLElement>): void;
export function useEarlyTap(boot: Boot, onTap: (id: string) => void): void;

// screens/types.ts
export interface TokenSource { waitForToken(ms: number): Promise<string>; reset(): void }
export interface CheckedContact { name: string; email: string; phone?: string }
export interface FlowEnv {
  boot: Boot; introOffsetMs: number | null; country: string | null; timeZone: string | null; starter: string;
  send(widget: TokenSource, contact: CheckedContact): void;
}
export interface ScreenProps { state: FlowState; act(action: FlowAction): void; edit(action: FlowAction): void; env: FlowEnv }

// screens/index.ts: Tasks 6, 7, 8, 10, 12 and 13 each add their screens here
export const SCREEN_UI: Readonly<Partial<Record<Screen, ComponentType<ScreenProps>>>>;

// test/dom.ts (tests only)
export function mount(node: ReactNode): Mounted;           // { container, unmount() }
export function click(el: Element | null): void;
export function typeInto(el: Element | null, value: string): void;
export function button(root: ParentNode, name: string): HTMLButtonElement | null;
export function stubBrowser(media?: Record<string, boolean>): void;  // matchMedia and scrollTo
export async function settle(ms?: number): Promise<void>;
export function stubClock(): void;                                    // performance.now() under test control
export function advance(ms: number): void;
export function tap(el: Element | null): void;                        // a click, a second after the last
export function tapThrough(root: ParentNode, ...labels: string[]): void;
```

`act` is for taps: it passes the tap gate. `edit` is for typing, ticking and plan progress, and goes straight to the reducer. A screen is mounted with `key={screen}`, so a step within one screen keeps its DOM. Examples are S3 + S4's team row coming forward and S1b's closing line.

- [ ] **Step 1: Create the jsdom helpers, `src/features/funnel/flow/test/dom.ts`**

```ts
/** (C) Test only: mount React trees in jsdom with React's act, and stub what jsdom lacks. */
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

export interface Mounted { container: HTMLElement; unmount(): void }

export function mount(node: ReactNode): Mounted {
  const container = document.body.appendChild(document.createElement("div"));
  const root = createRoot(container);
  act(() => root.render(node));
  return {
    container,
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

export function click(el: Element | null): void {
  if (!el) throw new Error("nothing to click");
  act(() => (el as HTMLElement).click());
}

/** Types into a controlled field: the native setter, then the input event React listens for. */
export function typeInto(el: Element | null, value: string): void {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) throw new Error("not a text field");
  const proto = el instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/** The button whose accessible name is exactly `name`: its aria-label, else its text. */
export function button(root: ParentNode, name: string): HTMLButtonElement | null {
  return [...root.querySelectorAll("button")].find((b) => (b.getAttribute("aria-label") ?? b.textContent ?? "").trim() === name) ?? null;
}

/** jsdom has no matchMedia, and its scrollTo only logs "not implemented". */
export function stubBrowser(media: Record<string, boolean> = {}): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: media[query] ?? false, media: query, addEventListener() {}, removeEventListener() {},
  }));
  vi.stubGlobal("scrollTo", () => undefined);
}

/** Lets timers, promises and the React updates they cause run. */
export async function settle(ms = 0): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

let clock = 0;

/** Puts performance.now() under the test's control, so taps are a person's pace apart, or a double tap's.
 *  Undo it with vi.restoreAllMocks() in afterEach. */
export function stubClock(): void {
  clock = 0;
  vi.spyOn(performance, "now").mockImplementation(() => clock);
}

export function advance(ms: number): void {
  clock += ms;
}

/** A deliberate tap, a second after whatever came before, so the tap gate never takes it for a double tap. */
export function tap(el: Element | null): void {
  advance(1_000);
  click(el);
}

/** Taps options by their exact labels, a second apart. */
export function tapThrough(root: ParentNode, ...labels: string[]): void {
  for (const label of labels) tap(button(root, label));
}
```

- [ ] **Step 2: Write the failing tests**

`src/features/funnel/flow/FunnelRoot.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Boot } from "./boot";
import { FunnelRoot } from "./FunnelRoot";
import { button, click, mount, stubBrowser, type Mounted } from "./test/dom";

vi.mock("@/features/funnel/data/light", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import("./test/fake-data")).FAKE_DATA,
}));

type BootWindow = Window & { __funnelBoot?: Boot };
const HEAD_BOOT: Boot = {
  hour: 6, t0: 0, dayPart: "morning", theme: "dark", sub: "s0.sub.early",
  lang: "hi", greeting: "नमस्ते, सुप्रभात।", early: null, ready: false,
};
let view: Mounted | undefined;
const screenOf = () => view?.container.querySelector(".f-root")?.getAttribute("data-screen");

beforeEach(() => stubBrowser());
afterEach(() => {
  view?.unmount();
  view = undefined;
  vi.unstubAllGlobals();
  delete (window as BootWindow).__funnelBoot;
});

describe("FunnelRoot on landing (S0 + S1)", () => {
  it("shows the greeting, S1's question, its five options as buttons, g.about and the footer note", () => {
    view = mount(<FunnelRoot />);
    const root = view.container;
    expect(root.querySelector("h1")?.textContent).toBe("Hello.");
    expect(root.querySelector("h2")?.textContent).toBe("What do you do?");
    expect([...root.querySelectorAll(".f-s1 .f-options button")].map((b) => b.textContent)).toEqual([
      "I run a business", "I run an agency", "I freelance", "I'm starting something", "Student, or just curious",
    ]);
    expect(root.textContent).toContain("ziiro AI is an AI consultancy based in India");
    expect(root.querySelector(".f-note")?.textContent).toBe("Your answers are saved to shape your plan. · Privacy");
  });

  it("opens Privacy in a new tab, so the questions stay put (Review Focus 5)", () => {
    view = mount(<FunnelRoot />);
    const link = view.container.querySelector(".f-note a");
    expect(link?.getAttribute("href")).toBe("/privacy");
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toContain("noopener");
  });

  it("uses the head script's greeting, its lang and its theme", () => {
    (window as BootWindow).__funnelBoot = { ...HEAD_BOOT };
    view = mount(<FunnelRoot />);
    const h1 = view.container.querySelector("h1");
    expect([h1?.textContent, h1?.getAttribute("lang")]).toEqual(["नमस्ते, सुप्रभात।", "hi"]);
    expect(view.container.querySelector("header p")?.textContent).toBe("You're up early.");
    expect(document.documentElement.dataset).toMatchObject({ theme: "dark", funnel: "questions" });
  });

  it("takes data-theme and data-funnel off <html> when it unmounts", () => {
    view = mount(<FunnelRoot />);
    view.unmount();
    view = undefined;
    expect(document.documentElement.hasAttribute("data-funnel")).toBe(false);
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("plays the S0 intro on landing and carries the greeting snippet", () => {
    view = mount(<FunnelRoot />);
    const landing = view.container.querySelector(".f-landing");
    expect(landing?.classList.contains("f-intro-on")).toBe(true);
    expect(landing?.querySelector(".f-intro")?.getAttribute("aria-hidden")).toBe("true");
    expect(landing?.querySelector("script")?.textContent).toContain("__funnelBoot");
  });

  it("moves on when an option is tapped, and announces the step", () => {
    view = mount(<FunnelRoot />);
    click(button(view.container, "I run a business"));
    expect(screenOf()).toBe("s2");
    expect(view.container.querySelector("[aria-live]")?.textContent).toBe("Step 2 of 6");
  });

  it("answers an S1 tap made before the app ran, once (Review Focus 3)", () => {
    const boot = { ...HEAD_BOOT, early: "agency" };
    (window as BootWindow).__funnelBoot = boot;
    view = mount(<FunnelRoot />);
    expect(screenOf()).toBe("s2");
    expect(boot).toMatchObject({ ready: true, early: null });
  });
});
```

`src/features/funnel/flow/FunnelRoot.server.test.tsx` (no jsdom, so `window` is undefined, as in the prerender):

```tsx
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FunnelRoot } from "./FunnelRoot";

vi.mock("@/features/funnel/data/light", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import("./test/fake-data")).FAKE_DATA,
}));

describe("FunnelRoot in the prerender (§4.2, §10: / without JavaScript)", () => {
  const html = renderToString(<FunnelRoot />);

  it("holds Hello., the daytime line and S1's five options as real buttons", () => {
    expect(html).toContain(">Hello.</h1>");
    expect(html).toContain("Glad you&#x27;re here.");
    expect(html.match(/<button[^>]*data-early="/g)).toHaveLength(5);
  });

  it("prints the greeting snippet right after the header, so it runs before first paint", () => {
    expect(html).toMatch(/<\/header><script>\(function\(s\)\{try\{var b=window.__funnelBoot/);
  });

  it("has g.noscript with a plain Calendly link", () => {
    expect(html).toContain("<noscript>");
    expect(html).toContain('<a class="f-link" href="https://calendly.com/ziiro-work/30min">Book a call</a>');
  });
});
```

- [ ] **Step 3: Run them and watch them fail**

Run: `npx vitest run src/features/funnel/flow/FunnelRoot.test.tsx src/features/funnel/flow/FunnelRoot.server.test.tsx`
Expected: FAIL with `Failed to resolve import "./FunnelRoot"`.

- [ ] **Step 4: Write `src/features/funnel/flow/ui.tsx`**

```tsx
/** (C) The questions' small parts (spec §4.1, §11). Words come from copy lines; styles from flow.css. */
import type { ReactNode } from "react";
import { copy } from "@/features/funnel/data/light";
import { PROGRESS, PROGRESS_TOTAL, type Screen } from "./state";

/** A screen's question: an H2 that takes focus on each step (§11.2). focusFirst wins over the first H2. */
export function Question({ id, focusFirst = false, children }: { id?: string; focusFirst?: boolean; children: ReactNode }) {
  return (
    <h2 id={id} className="f-q" tabIndex={-1} data-question="" data-focus-first={focusFirst ? "" : undefined}>
      {children}
    </h2>
  );
}

export interface OptionButtonProps {
  label: string;
  onPick(): void;
  kind?: "option" | "tile" | "chip";
  selected?: boolean;   // shown as chosen, as on S2 after s1.o2; no ARIA state, because tapping moves on
  pressed?: boolean;    // a toggle: S3 + S4's rows and S6's chips (§11.1)
  early?: string;       // S1 only: the ID the head script keeps for a tap made before React runs
  expanded?: boolean;   // S2's Other, which opens a box
  controls?: string;
}

export function OptionButton({ label, onPick, kind = "option", selected = false, pressed, early, expanded, controls }: OptionButtonProps) {
  return (
    <button
      type="button"
      className={`f-${kind}${selected ? " is-selected" : ""}`}
      aria-pressed={pressed}
      aria-expanded={expanded}
      aria-controls={controls}
      data-early={early}
      onClick={() => onPick()}
    >
      {label}
    </button>
  );
}

/** The six-segment bar (§4.1). Hidden from screen readers; FunnelRoot announces g.progress instead. */
function Progress({ screen }: { screen: Screen }) {
  const step = PROGRESS[screen];
  if (!step) return null;
  return (
    <div className="f-bar" aria-hidden="true">
      {Array.from({ length: PROGRESS_TOTAL }, (_, i) => (
        <span key={i} className={i < step ? "is-on" : undefined} />
      ))}
    </div>
  );
}

/** One step back through the browser's history, so its Back button and this arrow agree (§4.1). */
function BackArrow() {
  return (
    <button type="button" className="f-back" aria-label={copy("g.back")} onClick={() => window.history.back()}>
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/** The top of each screen: the Back arrow on every screen after S1, then the bar. */
export function TopRow({ screen, back = true }: { screen: Screen; back?: boolean }) {
  return (
    <div className="f-top">
      {back && <BackArrow />}
      <Progress screen={screen} />
    </div>
  );
}

/** Privacy opens in a new tab, because a reload would start the questions again (D8, Review Focus 5). */
export function PrivacyLink({ label }: { label: string }) {
  return (
    <a className="f-link" href="/privacy" target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  );
}

/** g.footer under the questions: the sentence, then Privacy as a link. */
export function FlowNote() {
  const [text, link] = copy("g.footer").split(" · ");
  return (
    <p className="f-note">
      {text} · <PrivacyLink label={link} />
    </p>
  );
}
```

- [ ] **Step 5: Write `src/features/funnel/flow/hooks.ts`**

```ts
/** (C) The questions' browser hooks: the boot, <html>'s attributes, focus, and the tap made before React ran. */
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { FunnelStage, Theme } from "@/features/funnel/data/light";
import { PRERENDER_BOOT, applyFunnelAttributes, clearFunnelAttributes, readBoot, type Boot } from "./boot";
import type { Screen } from "./state";

/** useLayoutEffect in the browser; useEffect in the prerender, where neither runs and React won't warn. */
export const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** The head script's boot, or one worked out now; the prerender's fixed boot without a window. */
export function useBoot(): Boot {
  const [boot] = useState(() => (typeof window === "undefined" ? PRERENDER_BOOT : readBoot(window)));
  return boot;
}

/** data-theme and data-funnel on <html> while the questions are mounted, cleared when they unmount. */
export function useFunnelAttributes(theme: Theme, stage: FunnelStage): void {
  useIsoLayoutEffect(() => {
    applyFunnelAttributes(document, theme, stage);
  }, [theme, stage]);
  useIsoLayoutEffect(() => () => clearFunnelAttributes(window), []);
}

/**
 * On each step, focus moves to the new question (§11.2): the screen's [data-focus-first], else its H2.
 * A new screen starts at the top. A step within a screen scrolls only as far as the focus needs.
 */
export function useFocusOnStep(seq: number, screen: Screen, root: RefObject<HTMLElement>): void {
  const lastScreen = useRef(screen);
  useIsoLayoutEffect(() => {
    const moved = lastScreen.current !== screen;
    lastScreen.current = screen;
    if (seq === 0 || !root.current) return;  // landing keeps the browser's own focus
    const target =
      root.current.querySelector<HTMLElement>("[data-focus-first]") ?? root.current.querySelector<HTMLElement>("[data-question]");
    if (moved) window.scrollTo(0, 0);
    target?.focus({ preventScroll: moved });
  }, [seq]);
}

/**
 * Review Focus 3: an S1 option tapped before React ran is kept by the head script and answered here, once.
 * The boot object is the head script's own, shared on purpose, so this marks it ready in place. It runs as a
 * layout effect, so a tap after React's first commit is never answered twice.
 */
export function useEarlyTap(boot: Boot, onTap: (id: string) => void): void {
  useIsoLayoutEffect(() => {
    boot.ready = true;
    const id = boot.early;
    boot.early = null;
    if (id) onTap(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);
}
```

- [ ] **Step 6: Write the screen types, Landing and the registry**

`src/features/funnel/flow/screens/types.ts`:

```ts
/** (C) What every screen gets from FunnelRoot. */
import type { Boot } from "../boot";
import type { FlowAction, FlowState } from "../state";

/** What S7's send needs from the Turnstile widget. useTurnstile (Task 9) returns a superset. */
export interface TokenSource {
  waitForToken(ms: number): Promise<string>;
  reset(): void;
}

/** S7's fields after its checks: the name and email trimmed, the phone in E.164 and absent when blank. */
export interface CheckedContact { name: string; email: string; phone?: string }

export interface FlowEnv {
  boot: Boot;
  introOffsetMs: number | null;   // S0's intro: where it already is; null when it doesn't play
  country: string | null;         // from the first /visit save (Task 14)
  timeZone: string | null;        // the device's (Task 8)
  starter: string;                // s6.text
  send(widget: TokenSource, contact: CheckedContact): void;  // S7's "Show me my plan" (Task 13)
}

export interface ScreenProps {
  state: FlowState;
  act(action: FlowAction): void;  // a tap, through the tap gate (Review Focus 2)
  edit(action: FlowAction): void; // typing, ticking and plan progress, straight to the reducer
  env: FlowEnv;
}
```

`src/features/funnel/flow/screens/Landing.tsx`:

```tsx
/**
 * (C) S0 + S1 (spec §4.2, §4.3): the greeting, its second line and the promise, then "What do you do?".
 * The prerender puts this in the HTML, so the greeting is the LCP and S1 reads as text without JavaScript.
 */
import type { CSSProperties } from "react";
import { copy } from "@/features/funnel/data/light";
import { INTERIM_BOOKING_URL } from "@/features/pricing/entities/rates";
import { greetingSnippet, type SubId } from "../boot";
import { segmentOptions } from "../options";
import { OptionButton, Question, TopRow } from "../ui";
import type { ScreenProps } from "./types";

const SUBS: readonly SubId[] = ["s0.sub.early", "s0.sub.day", "s0.sub.late"];

/** The line around a link's words, so the words stay in the copy line: [before, after]. */
function around(line: string, words: string): [string, string] {
  const at = line.indexOf(words);
  if (at < 0) throw new Error(`"${words}" is not in "${line}"`);
  return [line.slice(0, at), line.slice(at + words.length)];
}

export function Landing({ state, act, env }: ScreenProps) {
  const { boot, introOffsetMs } = env;
  const intro = introOffsetMs !== null;
  const subs = Object.fromEntries(SUBS.map((id) => [id, copy(id)])) as Record<SubId, string>;
  const book = copy("nav.btn");
  const [beforeBook, afterBook] = around(copy("g.noscript"), book);
  return (
    <section
      className={`f-screen f-landing${intro ? " f-intro-on" : ""}`}
      data-dir={intro ? undefined : state.dir}
      style={intro ? ({ "--f-t": `${introOffsetMs}ms` } as CSSProperties) : undefined}
    >
      {intro && (
        <div className="f-intro" aria-hidden="true">
          <p className="f-intro-greet" data-greet="" lang={boot.lang} suppressHydrationWarning>{boot.greeting}</p>
          <p className="f-intro-sub" data-sub="" suppressHydrationWarning>{subs[boot.sub]}</p>
          <p className="f-intro-promise">{copy("s0.promise")}</p>
        </div>
      )}
      <header className="f-head">
        <h1 data-greet="" lang={boot.lang} suppressHydrationWarning>{boot.greeting}</h1>
        <p data-sub="" suppressHydrationWarning>{subs[boot.sub]}</p>
        <p className="sr-only">{copy("s0.promise")}</p>
      </header>
      {intro && <script dangerouslySetInnerHTML={{ __html: greetingSnippet(subs) }} />}
      <div className="f-s1">
        <TopRow screen="s1" back={false} />
        <Question>{copy("s1.q")}</Question>
        <div className="f-options">
          {segmentOptions().map((option) => (
            <OptionButton
              key={option.id}
              label={option.label}
              early={option.id}
              selected={state.answers.segment === option.id}
              onPick={() => act({ type: "segment", value: option.id })}
            />
          ))}
        </div>
        <p className="f-about">{copy("g.about")}</p>
      </div>
      <noscript>
        <p className="f-small">
          {beforeBook}<a className="f-link" href={INTERIM_BOOKING_URL}>{book}</a>{afterBook}
        </p>
      </noscript>
    </section>
  );
}
```

`src/features/funnel/flow/screens/index.ts`:

```ts
/** (C) Which component shows each screen. Tasks 6, 7, 8, 10, 12 and 13 add theirs. */
import type { ComponentType } from "react";
import type { Screen } from "../state";
import { Landing } from "./Landing";
import type { ScreenProps } from "./types";

export const SCREEN_UI: Readonly<Partial<Record<Screen, ComponentType<ScreenProps>>>> = {
  s1: Landing,
};
```

- [ ] **Step 7: Write `src/features/funnel/flow/FunnelRoot.tsx`**

```tsx
/**
 * (C) The funnel at "/" (spec §4; index §1.3): lane D's Index renders <FunnelRoot />.
 * One reducer holds the questions. The screens dispatch, and history, the send and the saves hang off it.
 */
import { useCallback, useReducer, useRef, useState } from "react";
import { SEGMENTS, copy, isOneOf } from "@/features/funnel/data/light";
import { introOffsetMs, introStartMs } from "./boot";
import { useBoot, useEarlyTap, useFocusOnStep, useFunnelAttributes, useIsoLayoutEffect } from "./hooks";
import { SCREEN_UI } from "./screens";
import type { FlowEnv, ScreenProps } from "./screens/types";
import { PROGRESS, PROGRESS_TOTAL, createTapGate, funnelStageOf, initialFlow, reduce, type FlowAction, type Screen } from "./state";
import { FlowNote } from "./ui";

/** g.footer sits under the questions (§4.5): S1 to S7. */
const NOTE_ON: ReadonlySet<Screen> = new Set<Screen>(["s1", "s1b", "s2", "s34", "s5", "s6", "s7"]);

export function FunnelRoot(): JSX.Element {
  const boot = useBoot();
  const [starter] = useState(() => copy("s6.text"));
  const [state, dispatch] = useReducer(reduce, starter, initialFlow);
  const [gate] = useState(() => createTapGate());
  const [introOffset] = useState(() =>
    typeof window === "undefined" ? 0 : introOffsetMs(introStartMs(window, boot.t0), performance.now()),
  );
  const rootRef = useRef<HTMLDivElement>(null);

  const act = useCallback(
    (action: FlowAction) => {
      if (gate.allow(performance.now())) dispatch(action);
    },
    [gate],
  );

  useIsoLayoutEffect(() => {
    if (state.nav.seq > 0) gate.lock(performance.now());
  }, [state.nav.seq]);
  useFunnelAttributes(boot.theme, funnelStageOf(state));
  useEarlyTap(boot, (id) => {
    if (isOneOf(SEGMENTS, id)) dispatch({ type: "segment", value: id });
  });
  useFocusOnStep(state.nav.seq, state.screen, rootRef);

  const env: FlowEnv = {
    boot,
    introOffsetMs: state.nav.seq === 0 && state.screen === "s1" ? introOffset : null,
    country: null,
    timeZone: null,
    starter,
    send: () => undefined,
  };
  const props: ScreenProps = { state, act, edit: dispatch, env };
  // S7 stays mounted, hidden, while S8 plays, so its fields and the spam check survive a failed send (§10).
  const Form = state.screen === "s7" || state.screen === "s8" ? SCREEN_UI.s7 : undefined;
  const Current = state.screen === "s7" ? undefined : SCREEN_UI[state.screen];
  const step = PROGRESS[state.screen];

  return (
    <div ref={rootRef} className={`f-root${state.screen === "plan" ? " is-plan" : ""}`} data-screen={state.screen}>
      <p className="sr-only" aria-live="polite">
        {step ? copy("g.progress", { n: step, total: PROGRESS_TOTAL }) : ""}
      </p>
      {Form && <Form {...props} />}
      {Current && <Current key={state.screen} {...props} />}
      {NOTE_ON.has(state.screen) && <FlowNote />}
    </div>
  );
}
```

- [ ] **Step 8: Run the tests, the type check and the build**

```bash
npx vitest run src/features/funnel/flow
npm run typecheck
npm run build
```

Expected: every flow test passes. `typecheck` and `build` exit 0 once lane C's `copy` is on the branch (see Order).

- [ ] **Step 9: Commit, and tell lane D**

```bash
git add src/features/funnel/flow/ui.tsx src/features/funnel/flow/hooks.ts src/features/funnel/flow/screens \
  src/features/funnel/flow/FunnelRoot.tsx src/features/funnel/flow/test/dom.ts \
  src/features/funnel/flow/FunnelRoot.test.tsx src/features/funnel/flow/FunnelRoot.server.test.tsx
git commit -m "feat(funnel): add FunnelRoot with the greeting and S1"
```

Push with `copy` (see Order), then tell the manager that `FunnelRoot` is on the branch for lane D's Index swap.

### Task 6: History, Back and S1b

**Files:**
- Create: `src/features/funnel/flow/history.ts`, `src/features/funnel/flow/screens/NonOwner.tsx`
- Modify: `src/features/funnel/flow/screens/index.ts`, `src/features/funnel/flow/FunnelRoot.tsx`
- Test: `src/features/funnel/flow/history.test.tsx`

**Interfaces:**
- Consumes: Task 4's `SCREENS`, `FlowState["nav"]` and the `popTo` action; Task 5's `ScreenProps`, `TopRow`, `Question`, `OptionButton`; `nonOwnerOptions`.
- Produces:

```ts
export function tagEntry(win: Window, screen: Screen, mode: "push" | "replace"): void;
export function screenOfEntry(state: unknown): Screen | null;
export function useFlowHistory(nav: FlowState["nav"], screen: Screen, onPop: (screen: Screen) => void): void;
export function NonOwner(props: ScreenProps): JSX.Element;   // SCREEN_UI.s1b
```

Each entry keeps react-router's own state (`{ usr, key, idx }`) and adds `funnel: <screen>`, on the same URL. React Router sees the same location on Back and keeps `Index` mounted, and the reducer's `popTo` does the rest.

- [ ] **Step 1: Write the failing test**

`src/features/funnel/flow/history.test.tsx`:

```tsx
// @vitest-environment jsdom
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FunnelRoot } from "./FunnelRoot";
import { screenOfEntry, tagEntry } from "./history";
import { button, mount, settle, stubBrowser, stubClock, tap, type Mounted } from "./test/dom";

vi.mock("@/features/funnel/data/light", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import("./test/fake-data")).FAKE_DATA,
}));

let view: Mounted | undefined;
const root = () => view?.container ?? document.body;
const screenNow = () => root().querySelector(".f-root")?.getAttribute("data-screen");
const start = () => {
  view = mount(<MemoryRouter><FunnelRoot /></MemoryRouter>);
};

beforeEach(() => {
  stubBrowser();
  stubClock();
  window.history.replaceState(null, "", "/");
});
afterEach(() => {
  view?.unmount();
  view = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("history entries (§4.1)", () => {
  it("keep react-router's state and add the screen, on the same URL", () => {
    window.history.replaceState({ usr: null, key: "k1", idx: 0 }, "");
    const length = window.history.length;
    tagEntry(window, "s2", "push");
    expect(window.history.state).toEqual({ usr: null, key: "k1", idx: 0, funnel: "s2" });
    expect(window.history.length).toBe(length + 1);
    expect(window.location.pathname).toBe("/");
  });

  it("read back as a screen, and an entry that isn't the funnel's reads as none", () => {
    expect(screenOfEntry({ funnel: "s34" })).toBe("s34");
    expect(screenOfEntry({ funnel: "s9" })).toBeNull();
    expect(screenOfEntry(null)).toBeNull();
  });
});

describe("S1b and Back", () => {
  it("tags the landing entry, then adds one for S1b", () => {
    start();
    expect(window.history.state?.funnel).toBe("s1");
    tap(button(root(), "I'm starting something"));
    expect(screenNow()).toBe("s1b");
    expect(window.history.state?.funnel).toBe("s1b");
  });

  it("S1b has a Back arrow and no bar; its answer shows s1b.done and the way to /products in the same entry (D15)", () => {
    start();
    tap(button(root(), "I freelance"));
    expect(root().querySelector(".f-bar")).toBeNull();
    expect(button(root(), "Back")).not.toBeNull();
    const length = window.history.length;
    tap(button(root(), "Saw a reel or a post"));
    const done = "Got it, thanks. Everything's open, have a look around.";
    expect(root().querySelector("h2")?.textContent).toBe(done);
    expect(document.activeElement?.textContent).toBe(done);
    expect(root().querySelector("a.f-act")?.getAttribute("href")).toBe("/products");
    expect(window.history.length).toBe(length);
    expect(document.documentElement.dataset.funnel).toBe("questions");
  });

  it("Back goes one step with the answer kept, and Forward comes back (§4.1)", async () => {
    start();
    tap(button(root(), "Student, or just curious"));
    tap(button(root(), "Back"));
    await settle(20);
    expect(screenNow()).toBe("s1");
    expect(button(root(), "Student, or just curious")?.classList.contains("is-selected")).toBe(true);
    window.history.forward();
    await settle(20);
    expect(screenNow()).toBe("s1b");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/features/funnel/flow/history.test.tsx`
Expected: FAIL with `Failed to resolve import "./history"`.

- [ ] **Step 3: Write `src/features/funnel/flow/history.ts`**

```ts
/**
 * (C) The questions in the browser's history (spec §4.1). S1 to S7 each add an entry on the same URL, and S8
 * and the plan take S7's, so Back from the plan lands on S6. Each entry keeps react-router's own state.
 */
import { useEffect } from "react";
import { isOneOf } from "@/features/funnel/data/light";
import { SCREENS, type FlowState, type Screen } from "./state";

export function tagEntry(win: Window, screen: Screen, mode: "push" | "replace"): void {
  const state = { ...((win.history.state as Record<string, unknown> | null) ?? {}), funnel: screen };
  if (mode === "push") win.history.pushState(state, "", win.location.href);
  else win.history.replaceState(state, "", win.location.href);
}

export function screenOfEntry(state: unknown): Screen | null {
  const screen = (state as { funnel?: unknown } | null)?.funnel;
  return isOneOf(SCREENS, screen) ? screen : null;
}

/** Mirrors each step into history, and turns the browser's Back and Forward into popTo. */
export function useFlowHistory(nav: FlowState["nav"], screen: Screen, onPop: (screen: Screen) => void): void {
  useEffect(() => {
    tagEntry(window, "s1", "replace");  // the landing entry
  }, []);

  useEffect(() => {
    if (nav.seq === 0 || nav.mode === "none") return;
    tagEntry(window, screen, nav.mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per step; seq changes with every step
  }, [nav.seq]);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const target = screenOfEntry(event.state);
      if (target) onPop(target);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [onPop]);
}
```

- [ ] **Step 4: Write `src/features/funnel/flow/screens/NonOwner.tsx`**

```tsx
/** (C) S1b (spec §4.3, D15): for visitors who don't run a business. One tap is saved, then the site opens up. */
import { Link } from "react-router-dom";
import { copy } from "@/features/funnel/data/light";
import { nonOwnerOptions } from "../options";
import { OptionButton, Question, TopRow } from "../ui";
import type { ScreenProps } from "./types";

export function NonOwner({ state, act }: ScreenProps) {
  if (state.nonOwnerDone) {
    return (
      <section className="f-screen" data-dir={state.dir}>
        <TopRow screen="s1b" />
        <Question>{copy("s1b.done")}</Question>
        <Link className="f-act" to="/products">{copy("s1b.btn")}</Link>
      </section>
    );
  }
  return (
    <section className="f-screen" data-dir={state.dir}>
      <TopRow screen="s1b" />
      <Question>{copy("s1b.q")}</Question>
      <div className="f-options">
        {nonOwnerOptions().map((option) => (
          <OptionButton
            key={option.id}
            label={option.label}
            selected={state.answers.nonOwnerReason === option.id}
            onPick={() => act({ type: "nonOwner", value: option.id })}
          />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Register S1b, and wire history into `FunnelRoot.tsx`**

`src/features/funnel/flow/screens/index.ts` becomes:

```ts
/** (C) Which component shows each screen. Tasks 7, 8, 10, 12 and 13 add theirs. */
import type { ComponentType } from "react";
import type { Screen } from "../state";
import { Landing } from "./Landing";
import { NonOwner } from "./NonOwner";
import type { ScreenProps } from "./types";

export const SCREEN_UI: Readonly<Partial<Record<Screen, ComponentType<ScreenProps>>>> = {
  s1: Landing,
  s1b: NonOwner,
};
```

In `FunnelRoot.tsx`, add the import below the `./hooks` import:

```tsx
import { useFlowHistory } from "./history";
```

Then add these two lines right after `useFocusOnStep(state.nav.seq, state.screen, rootRef);`:

```tsx
  const onPop = useCallback((screen: Screen) => dispatch({ type: "popTo", screen }), []);
  useFlowHistory(state.nav, state.screen, onPop);
```

- [ ] **Step 6: Run the flow tests**

Run: `npx vitest run src/features/funnel/flow`
Expected: PASS, including Task 5's.

- [ ] **Step 7: Commit**

```bash
git add src/features/funnel/flow/history.ts src/features/funnel/flow/history.test.tsx \
  src/features/funnel/flow/screens/NonOwner.tsx src/features/funnel/flow/screens/index.ts src/features/funnel/flow/FunnelRoot.tsx
git commit -m "feat(funnel): add history entries, Back and S1b"
```

### Task 7: S2, and S3 + S4

**Files:**
- Create: `src/features/funnel/flow/screens/BusinessType.tsx`, `src/features/funnel/flow/screens/YearsTeam.tsx`
- Modify: `src/features/funnel/flow/screens/index.ts`
- Test: `src/features/funnel/flow/screens/BusinessType.test.tsx`, `src/features/funnel/flow/screens/YearsTeam.test.tsx`

**Interfaces:**
- Consumes: `businessOptions`, `yearsOptions`, `teamOptions`; the `business`, `businessOther`, `businessOtherDone`, `years` and `team` actions; `LIMITS.businessOtherChars`.
- Produces: `BusinessType` (`SCREEN_UI.s2`) and `YearsTeam` (`SCREEN_UI.s34`), both `(props: ScreenProps) => JSX.Element`.

Two notes:
- S2's box button uses `s6.btn`'s words ("That's it"). §4.3 gives the box no button, and lane C's copy has no `s2.other.btn` (Deviation 2). If one is added later, it's the one `copy("s6.btn")` call in `BusinessType.tsx`.
- On S3 + S4 the years row uses `aria-pressed`, as §11.1 says ("the first row uses aria-pressed"). A tap in the team row moves on, so that row only shows its choice.

- [ ] **Step 1: Write the failing tests**

`src/features/funnel/flow/screens/BusinessType.test.tsx`:

```tsx
// @vitest-environment jsdom
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FunnelRoot } from "../FunnelRoot";
import { advance, button, click, mount, stubBrowser, stubClock, tap, tapThrough, typeInto, type Mounted } from "../test/dom";

vi.mock("@/features/funnel/data/light", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import("../test/fake-data")).FAKE_DATA,
}));

let view: Mounted;
const root = () => view.container;
const screenNow = () => root().querySelector(".f-root")?.getAttribute("data-screen");

beforeEach(() => {
  stubBrowser();
  stubClock();
  view = mount(<MemoryRouter><FunnelRoot /></MemoryRouter>);
});
afterEach(() => {
  view.unmount();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("S2 (§4.3)", () => {
  it("asks its question with its hint and 12 types, on step 2 of 6", () => {
    tap(button(root(), "I run a business"));
    expect(root().querySelector("h2")?.textContent).toBe("What kind of business?");
    expect(root().querySelector(".f-hint")?.textContent).toBe("Pick the closest one.");
    expect(root().querySelectorAll(".f-tile")).toHaveLength(12);
    expect(root().querySelectorAll(".f-bar .is-on")).toHaveLength(2);
  });

  it("preselects the agency type after s1.o2, and still waits for a tap", () => {
    tap(button(root(), "I run an agency"));
    expect(button(root(), "Marketing or creative agency")?.classList.contains("is-selected")).toBe(true);
    expect(screenNow()).toBe("s2");
    tap(button(root(), "Marketing or creative agency"));
    expect(screenNow()).toBe("s34");
  });

  it("opens a box for Other that stops at 80 characters, and its button moves on", () => {
    tapThrough(root(), "I run a business", "Other");
    expect(screenNow()).toBe("s2");
    expect(button(root(), "Other")?.getAttribute("aria-expanded")).toBe("true");
    const box = root().querySelector<HTMLInputElement>("#f-s2-other-text");
    expect(box?.maxLength).toBe(80);
    typeInto(box, "Printing press");
    expect(box?.value).toBe("Printing press");
    tap(button(root(), "That's it"));
    expect(screenNow()).toBe("s34");
  });

  it("ignores the second tap of a double tap, which lands on S3 + S4 (Review Focus 2)", () => {
    tapThrough(root(), "I run a business", "Interior design / architecture");
    advance(120);
    click(button(root(), "Less than a year"));
    expect(button(root(), "Less than a year")?.getAttribute("aria-pressed")).toBe("false");
    advance(400);
    click(button(root(), "Less than a year"));
    expect(button(root(), "Less than a year")?.getAttribute("aria-pressed")).toBe("true");
  });
});
```

`src/features/funnel/flow/screens/YearsTeam.test.tsx`:

```tsx
// @vitest-environment jsdom
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FunnelRoot } from "../FunnelRoot";
import { button, mount, settle, stubBrowser, stubClock, tap, tapThrough, type Mounted } from "../test/dom";

vi.mock("@/features/funnel/data/light", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import("../test/fake-data")).FAKE_DATA,
}));

let view: Mounted;
const root = () => view.container;
const screenNow = () => root().querySelector(".f-root")?.getAttribute("data-screen");

beforeEach(() => {
  stubBrowser();
  stubClock();
  window.history.replaceState(null, "", "/");
  view = mount(<MemoryRouter><FunnelRoot /></MemoryRouter>);
  tapThrough(root(), "I run a business", "Interior design / architecture");
});
afterEach(() => {
  view.unmount();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("S3 + S4 (§4.3, §11.1)", () => {
  it("asks both on one screen, step 3 of 6", () => {
    expect([...root().querySelectorAll("h2")].map((h) => h.textContent)).toEqual(["How long have you been at it?", "How big is the team?"]);
    expect(root().querySelectorAll(".f-bar .is-on")).toHaveLength(3);
  });

  it("presses the first tap, brings the team row forward and moves focus to its question", () => {
    tap(button(root(), "5–10 years"));
    expect(button(root(), "5–10 years")?.getAttribute("aria-pressed")).toBe("true");
    expect(root().querySelector(".f-row2")?.classList.contains("is-forward")).toBe(true);
    expect(document.activeElement?.textContent).toBe("How big is the team?");
    expect(screenNow()).toBe("s34");
  });

  it("moves on with the second tap, whichever row comes first", () => {
    tapThrough(root(), "Just me", "1–3 years");
    expect(screenNow()).toBe("s5");
  });

  it("keeps both answers when Back comes from S5", async () => {
    tapThrough(root(), "5–10 years", "6–20");
    window.history.back();
    await settle(20);
    expect(screenNow()).toBe("s34");
    expect(button(root(), "5–10 years")?.getAttribute("aria-pressed")).toBe("true");
    expect(button(root(), "6–20")?.classList.contains("is-selected")).toBe(true);
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run src/features/funnel/flow/screens`
Expected: FAIL. S2 renders nothing yet, so `button(root(), "Other")` is null and `click` throws `nothing to click`.

- [ ] **Step 3: Write `src/features/funnel/flow/screens/BusinessType.tsx`**

```tsx
/** (C) S2 (spec §4.3): the kind of business. Twelve types; Other opens a box of 80 characters (§10). */
import type { FormEvent } from "react";
import { LIMITS, copy } from "@/features/funnel/data/light";
import { businessOptions } from "../options";
import { OptionButton, Question, TopRow } from "../ui";
import type { ScreenProps } from "./types";

const BOX = "f-s2-other";

export function BusinessType({ state, act, edit }: ScreenProps) {
  const chosen = state.answers.businessType;
  const otherOpen = chosen === "other";
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    act({ type: "businessOtherDone" });
  };
  return (
    <section className="f-screen" data-dir={state.dir}>
      <TopRow screen="s2" />
      <Question>{copy("s2.q")}</Question>
      <p className="f-hint">{copy("s2.hint")}</p>
      <div className="f-tiles">
        {businessOptions().map((option) => (
          <OptionButton
            key={option.id}
            kind="tile"
            label={option.label}
            selected={chosen === option.id}
            expanded={option.id === "other" ? otherOpen : undefined}
            controls={option.id === "other" && otherOpen ? BOX : undefined}
            onPick={() => act({ type: "business", value: option.id })}
          />
        ))}
      </div>
      {otherOpen && (
        <form id={BOX} className="f-other" onSubmit={onSubmit}>
          <label className="sr-only" htmlFor={`${BOX}-text`}>{copy("s2.other")}</label>
          <input
            id={`${BOX}-text`}
            className="f-field"
            type="text"
            autoFocus
            maxLength={LIMITS.businessOtherChars}
            placeholder={copy("s2.other")}
            value={state.answers.businessOther}
            onChange={(event) => edit({ type: "businessOther", text: event.target.value })}
          />
          {/* §4.3 gives the box no button of its own, so it borrows s6.btn's words */}
          <button type="submit" className="f-act">{copy("s6.btn")}</button>
        </form>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Write `src/features/funnel/flow/screens/YearsTeam.tsx`**

```tsx
/** (C) S3 + S4 (spec §4.3): years and team on one screen. The first tap fills its row and brings the team row forward. */
import { copy } from "@/features/funnel/data/light";
import { teamOptions, yearsOptions } from "../options";
import { OptionButton, Question, TopRow } from "../ui";
import type { ScreenProps } from "./types";

export function YearsTeam({ state, act }: ScreenProps) {
  const { yearsBand, teamBand } = state.answers;
  return (
    <section className="f-screen" data-dir={state.dir}>
      <TopRow screen="s34" />
      <Question id="f-s3-q">{copy("s3.q")}</Question>
      <p className="f-hint">{copy("s3.why")}</p>
      <div className="f-options" role="group" aria-labelledby="f-s3-q">
        {yearsOptions().map((option) => (
          <OptionButton
            key={option.id}
            label={option.label}
            pressed={yearsBand === option.id}
            onPick={() => act({ type: "years", value: option.id })}
          />
        ))}
      </div>
      <div className={`f-row2${state.teamRowForward ? " is-forward" : ""}`}>
        <Question id="f-s4-q" focusFirst={state.teamRowForward}>{copy("s4.q")}</Question>
        <p className="f-hint">{copy("s4.why")}</p>
        <div className="f-options" role="group" aria-labelledby="f-s4-q">
          {teamOptions().map((option) => (
            <OptionButton
              key={option.id}
              label={option.label}
              selected={teamBand === option.id}
              onPick={() => act({ type: "team", value: option.id })}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Register both screens**

In `src/features/funnel/flow/screens/index.ts`, add the imports and the two entries. The comment's task list loses 7:

```ts
import { BusinessType } from "./BusinessType";
import { YearsTeam } from "./YearsTeam";
// …
export const SCREEN_UI: Readonly<Partial<Record<Screen, ComponentType<ScreenProps>>>> = {
  s1: Landing,
  s1b: NonOwner,
  s2: BusinessType,
  s34: YearsTeam,
};
```

- [ ] **Step 6: Run the flow tests**

Run: `npx vitest run src/features/funnel/flow`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/funnel/flow/screens/BusinessType.tsx src/features/funnel/flow/screens/YearsTeam.tsx \
  src/features/funnel/flow/screens/BusinessType.test.tsx src/features/funnel/flow/screens/YearsTeam.test.tsx \
  src/features/funnel/flow/screens/index.ts
git commit -m "feat(funnel): add S2 and the years-and-team screen"
```

### Task 8: S5, and where the visitor is

**Files:**
- Create: `src/features/funnel/flow/region.ts`, `src/features/funnel/flow/screens/Revenue.tsx`
- Modify: `src/features/funnel/flow/screens/index.ts`, `src/features/funnel/flow/FunnelRoot.tsx`
- Test: `src/features/funnel/flow/region.test.ts`, `src/features/funnel/flow/screens/Revenue.test.tsx`

**Interfaces:**
- Consumes: `currencyFor(country, timeZone)` (lane C, day 2); `revenueOptions`; the `revenue` action.
- Produces:

```ts
// region.ts
export function localTimeZone(): string | null;
export const DIAL_CODES: Readonly<Record<string, string>>;           // ISO 3166 alpha-2 → "+91"
export function dialCodeFor(country: string | null, timeZone: string | null): string;  // "" when unknown
// screens/Revenue.tsx
export function Revenue(props: ScreenProps): JSX.Element;            // SCREEN_UI.s5
```

- `FlowEnv.timeZone` is filled from here.
- Until the first `/visit` save answers (Task 14), `country` is null. `currencyFor(null, timeZone)` then decides on the clock alone. That's lane C's §5.3 rule.

- [ ] **Step 1: Write the failing tests**

`src/features/funnel/flow/region.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DIAL_CODES, dialCodeFor, localTimeZone } from "./region";

describe("where the visitor is (§4.4, D10)", () => {
  it("reads the device's time zone", () => {
    expect(localTimeZone()).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });

  it("prefills the dial code of the country /visit returned", () => {
    expect(dialCodeFor("IN", null)).toBe("+91");
    expect(dialCodeFor("us", "Asia/Kolkata")).toBe("+1");
    expect(dialCodeFor("ZZ", null)).toBe("");
  });

  it("falls back to India's code on India's clock, and to none elsewhere", () => {
    expect(dialCodeFor(null, "Asia/Kolkata")).toBe("+91");
    expect(dialCodeFor(null, "Asia/Calcutta")).toBe("+91");
    expect(dialCodeFor(null, "Europe/London")).toBe("");
    expect(dialCodeFor(null, null)).toBe("");
  });

  it("writes every code as + and digits", () => {
    for (const code of Object.values(DIAL_CODES)) expect(code).toMatch(/^\+\d{1,4}$/);
  });
});
```

`src/features/funnel/flow/screens/Revenue.test.tsx`:

```tsx
// @vitest-environment jsdom
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FunnelRoot } from "../FunnelRoot";
import { localTimeZone } from "../region";
import { button, mount, stubBrowser, stubClock, tap, tapThrough, type Mounted } from "../test/dom";

vi.mock("@/features/funnel/data/light", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import("../test/fake-data")).FAKE_DATA,
}));
vi.mock("../region", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../region")>()),
  localTimeZone: vi.fn(() => "Asia/Kolkata"),
}));

let view: Mounted | undefined;
const root = () => view?.container ?? document.body;
const toS5 = () => {
  view = mount(<MemoryRouter><FunnelRoot /></MemoryRouter>);
  tapThrough(root(), "I run a business", "Clinic / healthcare", "3–5 years", "2–5");
};
const labels = () => [...root().querySelectorAll(".f-options button")].map((b) => b.textContent);

beforeEach(() => {
  stubBrowser();
  stubClock();
  vi.mocked(localTimeZone).mockReturnValue("Asia/Kolkata");
});
afterEach(() => {
  view?.unmount();
  view = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("S5 (§4.3, D10)", () => {
  it("shows rupee bands on India's clock, then Rather not say, on step 4 of 6", () => {
    toS5();
    expect(root().querySelector("h2")?.textContent).toBe("Roughly, what does it make in a year?");
    expect(labels()).toEqual(["Under ₹25L", "₹25L–1Cr", "₹1–5Cr", "₹5–25Cr", "₹25Cr+", "Rather not say"]);
    expect(root().querySelectorAll(".f-bar .is-on")).toHaveLength(4);
  });

  it("shows dollar bands elsewhere", () => {
    vi.mocked(localTimeZone).mockReturnValue("America/New_York");
    toS5();
    expect(labels()).toEqual(["Under $250k", "$250k–1M", "$1–5M", "$5–25M", "$25M+", "Rather not say"]);
  });

  it("takes Rather not say as a full answer", () => {
    toS5();
    tap(button(root(), "Rather not say"));
    expect(root().querySelector(".f-root")?.getAttribute("data-screen")).toBe("s6");
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run src/features/funnel/flow/region.test.ts src/features/funnel/flow/screens/Revenue.test.tsx`
Expected: FAIL with `Failed to resolve import "./region"`.

- [ ] **Step 3: Write `src/features/funnel/flow/region.ts`**

```ts
/** (C) Where the visitor is, as far as the questions need: the device's time zone, and a dial code for S7 (§4.4, D10). */

export function localTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/** Dial codes for the countries visitors most likely come from, by ISO 3166 alpha-2. Others get no prefill. */
export const DIAL_CODES: Readonly<Record<string, string>> = {
  IN: "+91", US: "+1", CA: "+1", GB: "+44", AE: "+971", SA: "+966", QA: "+974", KW: "+965", OM: "+968", BH: "+973",
  SG: "+65", MY: "+60", ID: "+62", TH: "+66", VN: "+84", PH: "+63", HK: "+852", CN: "+86", JP: "+81", KR: "+82",
  TW: "+886", AU: "+61", NZ: "+64", NP: "+977", BD: "+880", LK: "+94", PK: "+92", DE: "+49", FR: "+33", ES: "+34",
  IT: "+39", NL: "+31", BE: "+32", CH: "+41", AT: "+43", IE: "+353", PT: "+351", SE: "+46", NO: "+47", DK: "+45",
  FI: "+358", PL: "+48", CZ: "+420", RO: "+40", GR: "+30", TR: "+90", RU: "+7", UA: "+380", IL: "+972", ZA: "+27",
  NG: "+234", KE: "+254", EG: "+20", MA: "+212", BR: "+55", MX: "+52", AR: "+54", CL: "+56", CO: "+57", PE: "+51",
};

const INDIA_ZONES: ReadonlySet<string> = new Set(["Asia/Kolkata", "Asia/Calcutta"]);

/** The country's code; India's when the country is unknown but the clock is India's; else "". */
export function dialCodeFor(country: string | null, timeZone: string | null): string {
  if (country) return DIAL_CODES[country.toUpperCase()] ?? "";
  return timeZone && INDIA_ZONES.has(timeZone) ? "+91" : "";
}
```

- [ ] **Step 4: Write `src/features/funnel/flow/screens/Revenue.tsx`**

```tsx
/** (C) S5 (spec §4.3, D10): a year's revenue as a band, in rupees for India and dollars elsewhere. */
import { copy, currencyFor } from "@/features/funnel/data/light";
import { revenueOptions } from "../options";
import { OptionButton, Question, TopRow } from "../ui";
import type { ScreenProps } from "./types";

export function Revenue({ state, act, env }: ScreenProps) {
  const currency = currencyFor(env.country, env.timeZone);
  return (
    <section className="f-screen" data-dir={state.dir}>
      <TopRow screen="s5" />
      <Question>{copy("s5.q")}</Question>
      <p className="f-hint">{copy("s5.why")}</p>
      <div className="f-options">
        {revenueOptions(currency).map((option) => (
          <OptionButton
            key={option.id}
            label={option.label}
            selected={state.answers.revenueBand === option.id}
            onPick={() => act({ type: "revenue", value: option.id, currency })}
          />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Register S5, and give FunnelRoot the time zone**

In `src/features/funnel/flow/screens/index.ts`, add `import { Revenue } from "./Revenue";` and the entry `s5: Revenue,` after `s34`.

In `FunnelRoot.tsx`, add the import `import { localTimeZone } from "./region";`. Below `const rootRef = useRef<HTMLDivElement>(null);`, add:

```tsx
  const [timeZone] = useState(() => (typeof window === "undefined" ? null : localTimeZone()));
```

In the `env` object, replace `timeZone: null,` with `timeZone,`.

- [ ] **Step 6: Run the flow tests**

Run: `npx vitest run src/features/funnel/flow`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/funnel/flow/region.ts src/features/funnel/flow/region.test.ts src/features/funnel/flow/screens/Revenue.tsx \
  src/features/funnel/flow/screens/Revenue.test.tsx src/features/funnel/flow/screens/index.ts src/features/funnel/flow/FunnelRoot.tsx
git commit -m "feat(funnel): add S5 with bands in the visitor's currency"
```

### Task 9: One Turnstile loader for /contact and S7

**Files:**
- Create: `src/shared/lib/turnstile.ts`, `src/shared/hooks/useTurnstile.ts`
- Modify: `src/pages/Contact.tsx` (the Turnstile constants and interface below the key comment, the token state, refs and loader `useEffect`, the reset after a send, and the widget host `div`)
- Test: `src/shared/lib/turnstile.test.ts`, `src/shared/hooks/useTurnstile.test.tsx`

**Interfaces:**
- Produces, for Task 10 (the script at S6), Task 12 (the widget at S7), Task 13 (the token at send) and `/contact`:

```ts
// src/shared/lib/turnstile.ts
export const TURNSTILE_SRC: string;
export const TURNSTILE_SITE_KEY: string | undefined;   // import.meta.env.VITE_TURNSTILE_SITE_KEY
export interface TurnstileRenderOptions { sitekey; action?; appearance?; theme?; callback; "expired-callback"; "error-callback" }
export interface TurnstileApi { render(host, options): string; reset(id?): void; remove(id?): void }
export function loadTurnstile(siteKey: string | undefined, doc?: Document): Promise<TurnstileApi | null>;
export interface TokenBox { get(): string; set(token: string): void; wait(ms: number): Promise<string> }
export function createTokenBox(): TokenBox;

// src/shared/hooks/useTurnstile.ts
export interface TurnstileOptions { siteKey: string | undefined; action?: string; appearance?; theme? }
export interface TurnstileHandle { hostRef: RefObject<HTMLDivElement>; token: string; waitForToken(ms: number): Promise<string>; reset(): void }
export function useTurnstile(options: TurnstileOptions): TurnstileHandle;   // structurally a TokenSource (Task 5)
```

- [ ] **Step 1: Write the failing tests**

`src/shared/lib/turnstile.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type TurnstileModule = typeof import("./turnstile");
type TurnstileWindow = Window & { turnstile?: unknown };
let mod: TurnstileModule;

beforeEach(async () => {
  vi.resetModules();   // the loader keeps one promise per page; each test gets a fresh page
  mod = await import("./turnstile");
  document.head.innerHTML = "";
});
afterEach(() => {
  vi.useRealTimers();
  delete (window as TurnstileWindow).turnstile;
});

describe("loadTurnstile (§13.4)", () => {
  it("fetches nothing without a site key", async () => {
    await expect(mod.loadTurnstile(undefined)).resolves.toBeNull();
    expect(document.querySelector("script")).toBeNull();
  });

  it("adds the script once, however many forms ask, and resolves with the API when it loads", async () => {
    const first = mod.loadTurnstile("key");
    const second = mod.loadTurnstile("key");
    const scripts = document.querySelectorAll(`script[src="${mod.TURNSTILE_SRC}"]`);
    expect(scripts).toHaveLength(1);
    const api = { render: vi.fn(), reset: vi.fn(), remove: vi.fn() };
    (window as TurnstileWindow).turnstile = api;
    scripts[0].dispatchEvent(new Event("load"));
    await expect(first).resolves.toBe(api);
    await expect(second).resolves.toBe(api);
  });

  it("can try again after the script fails to load", async () => {
    const failed = mod.loadTurnstile("key");
    document.querySelector("script")?.dispatchEvent(new Event("error"));
    await expect(failed).rejects.toThrow("Turnstile did not load");
    void mod.loadTurnstile("key").catch(() => undefined);
    expect(document.querySelectorAll("script")).toHaveLength(1);
  });
});

describe("the token box (Review Focus 4)", () => {
  it("hands over a token it already has at once", async () => {
    const box = mod.createTokenBox();
    box.set("t1");
    await expect(box.wait(3_000)).resolves.toBe("t1");
  });

  it("waits for a token that comes in time", async () => {
    vi.useFakeTimers();
    const box = mod.createTokenBox();
    const got = box.wait(3_000);
    vi.advanceTimersByTime(1_000);
    box.set("t2");
    await expect(got).resolves.toBe("t2");
  });

  it("gives up with an empty token when none comes", async () => {
    vi.useFakeTimers();
    const box = mod.createTokenBox();
    const got = box.wait(3_000);
    vi.advanceTimersByTime(3_000);
    await expect(got).resolves.toBe("");
  });

  it("waits for a fresh token once the used one is cleared", async () => {
    vi.useFakeTimers();
    const box = mod.createTokenBox();
    box.set("used");
    box.set("");
    const got = box.wait(3_000);
    box.set("fresh");
    await expect(got).resolves.toBe("fresh");
  });
});
```

`src/shared/hooks/useTurnstile.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, settle, type Mounted } from "@/features/funnel/flow/test/dom";
import type { TurnstileRenderOptions } from "@/shared/lib/turnstile";
import { useTurnstile, type TurnstileHandle } from "./useTurnstile";

const api = vi.hoisted(() => ({
  render: vi.fn((_host: HTMLElement, _options: TurnstileRenderOptions) => "w1"),
  reset: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("@/shared/lib/turnstile", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/lib/turnstile")>()),
  loadTurnstile: vi.fn(async (siteKey?: string) => (siteKey ? api : null)),
}));

let handle: TurnstileHandle | undefined;
function Probe({ siteKey }: { siteKey?: string }) {
  handle = useTurnstile({ siteKey, action: "funnel_lead", appearance: "interaction-only", theme: "dark" });
  return <div ref={handle.hostRef} />;
}

let view: Mounted | undefined;
afterEach(() => {
  view?.unmount();
  view = undefined;
  vi.clearAllMocks();
});

describe("useTurnstile (§13.4)", () => {
  it("renders the widget once, with the action, appearance and theme it's given", async () => {
    view = mount(<Probe siteKey="key" />);
    await settle();
    expect(api.render).toHaveBeenCalledTimes(1);
    expect(api.render.mock.calls[0][1]).toMatchObject({
      sitekey: "key", action: "funnel_lead", appearance: "interaction-only", theme: "dark",
    });
  });

  it("hands over the widget's token; reset clears it and asks the widget for another", async () => {
    view = mount(<Probe siteKey="key" />);
    await settle();
    act(() => api.render.mock.calls[0][1].callback("tok"));
    expect(handle?.token).toBe("tok");
    await expect(handle?.waitForToken(1_000)).resolves.toBe("tok");
    act(() => handle?.reset());
    expect(handle?.token).toBe("");
    expect(api.reset).toHaveBeenCalledWith("w1");
  });

  it("without a site key, renders nothing and answers an empty token at once", async () => {
    view = mount(<Probe />);
    await settle();
    expect(api.render).not.toHaveBeenCalled();
    await expect(handle?.waitForToken(3_000)).resolves.toBe("");
  });

  it("removes the widget when the form unmounts", async () => {
    view = mount(<Probe siteKey="key" />);
    await settle();
    view.unmount();
    view = undefined;
    expect(api.remove).toHaveBeenCalledWith("w1");
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run src/shared/lib/turnstile.test.ts src/shared/hooks/useTurnstile.test.tsx`
Expected: FAIL with `Failed to resolve import "./turnstile"` and `Failed to resolve import "./useTurnstile"`.

- [ ] **Step 3: Write `src/shared/lib/turnstile.ts`**

```ts
/**
 * (C) Cloudflare Turnstile, shared by /contact and the funnel's S7 (spec §13.4): one script, loaded once per page,
 * and a box that hands out the widget's token. A token is single use and lasts 300 s; the widget renews it itself.
 */
export const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** The public half of the key, read at build time. Without it there is no widget and no third-party request. */
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

export interface TurnstileRenderOptions {
  sitekey: string;
  action?: string;
  appearance?: "always" | "execute" | "interaction-only";
  theme?: "light" | "dark" | "auto";
  callback(token: string): void;
  "expired-callback"(): void;
  "error-callback"(): void;
}

export interface TurnstileApi {
  render(host: HTMLElement, options: TurnstileRenderOptions): string;
  reset(widgetId?: string): void;
  remove(widgetId?: string): void;
}

type TurnstileWindow = Window & { turnstile?: TurnstileApi };
let loading: Promise<TurnstileApi | null> | null = null;

/** Loads the script once per page, or never without a site key. After a failed load, the next call tries again. */
export function loadTurnstile(siteKey: string | undefined, doc: Document = document): Promise<TurnstileApi | null> {
  if (!siteKey) return Promise.resolve(null);
  const api = () => (doc.defaultView as TurnstileWindow | null)?.turnstile ?? null;
  const ready = api();
  if (ready) return Promise.resolve(ready);
  if (loading) return loading;
  loading = new Promise<TurnstileApi | null>((resolve, reject) => {
    const existing = doc.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SRC}"]`);
    const script = existing ?? doc.createElement("script");
    script.addEventListener("load", () => resolve(api()));
    script.addEventListener("error", () => {
      loading = null;
      script.remove();
      reject(new Error("Turnstile did not load"));
    });
    if (!existing) {
      script.src = TURNSTILE_SRC;
      script.async = true;
      script.defer = true;
      doc.head.appendChild(script);
    }
  });
  return loading;
}

export interface TokenBox {
  get(): string;
  set(token: string): void;
  /** The token now, or the next one within ms; "" if none comes (Review Focus 4). */
  wait(ms: number): Promise<string>;
}

export function createTokenBox(): TokenBox {
  let token = "";
  let waiting: ReadonlyArray<(token: string) => void> = [];
  return {
    get: () => token,
    set(next) {
      token = next;
      if (!next) return;
      const ready = waiting;
      waiting = [];
      ready.forEach((resolve) => resolve(next));
    },
    wait(ms) {
      if (token) return Promise.resolve(token);
      return new Promise<string>((resolve) => {
        const done = (value: string) => {
          clearTimeout(timer);
          resolve(value);
        };
        const timer = setTimeout(() => {
          waiting = waiting.filter((waiter) => waiter !== done);
          resolve("");
        }, Math.max(0, ms));
        waiting = [...waiting, done];
      });
    },
  };
}
```

- [ ] **Step 4: Write `src/shared/hooks/useTurnstile.ts`**

```ts
/** (C) The Turnstile widget as a hook, for /contact and the funnel's S7 (spec §13.4). */
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { createTokenBox, loadTurnstile, type TurnstileApi, type TurnstileRenderOptions } from "@/shared/lib/turnstile";

export interface TurnstileOptions {
  siteKey: string | undefined;
  action?: string;
  appearance?: TurnstileRenderOptions["appearance"];
  theme?: TurnstileRenderOptions["theme"];
}

export interface TurnstileHandle {
  hostRef: RefObject<HTMLDivElement>;
  token: string;
  /** The token, waiting up to ms for one. "" at once when there's no site key. */
  waitForToken(ms: number): Promise<string>;
  /** Clears the token and asks the widget for a fresh one, because a token is single use. */
  reset(): void;
}

export function useTurnstile({ siteKey, action, appearance, theme = "auto" }: TurnstileOptions): TurnstileHandle {
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<TurnstileApi | null>(null);
  const widgetRef = useRef<string | null>(null);
  const [box] = useState(createTokenBox);
  const [token, setToken] = useState("");

  const take = useCallback(
    (next: string) => {
      box.set(next);
      setToken(next);
    },
    [box],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!siteKey || !host) return;
    let cancelled = false;
    loadTurnstile(siteKey)
      .then((api) => {
        if (cancelled || !api || widgetRef.current) return;
        apiRef.current = api;
        widgetRef.current = api.render(host, {
          sitekey: siteKey,
          ...(action ? { action } : {}),
          ...(appearance ? { appearance } : {}),
          theme,
          callback: take,
          "expired-callback": () => take(""),
          "error-callback": () => take(""),
        });
      })
      // No script means no token. The send goes without one, and the server treats that as a failed check (§10).
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (apiRef.current && widgetRef.current) apiRef.current.remove(widgetRef.current);
      widgetRef.current = null;
    };
  }, [siteKey, action, appearance, theme, take]);

  const waitForToken = useCallback((ms: number) => (siteKey ? box.wait(ms) : Promise.resolve("")), [box, siteKey]);
  const reset = useCallback(() => {
    take("");
    if (apiRef.current && widgetRef.current) apiRef.current.reset(widgetRef.current);
  }, [take]);

  return { hostRef, token, waitForToken, reset };
}
```

- [ ] **Step 5: Switch `src/pages/Contact.tsx` to the shared hook**

Four edits. The form, its words and its behaviour stay as they are.

1. Add these imports below `import { CONTACT_EMAIL } from "@/shared/lib/contact";`:

   ```tsx
   import { useTurnstile } from "@/shared/hooks/useTurnstile";
   import { TURNSTILE_SITE_KEY } from "@/shared/lib/turnstile";
   ```

2. Keep the comment block that starts `Cloudflare Turnstile, the bot check the restored endpoint requires.` Below it, replace the `SITE_KEY` and `TURNSTILE_SRC` constants and the `interface TurnstileApi { … }` block with:

   ```tsx
   const SITE_KEY = TURNSTILE_SITE_KEY;
   ```

3. Replace the token state, the `widgetHost` and `widgetId` refs, and the whole loader `useEffect` with the line below. The doc comment above the state stays. The effect is the one that starts with `// Load the Turnstile script and render the widget, but only when a site key` and ends at its `}, []);`.

   ```tsx
   const turnstile = useTurnstile({ siteKey: SITE_KEY, theme: "light" });
   ```

4. Make three small changes:
   - In `onSubmit`, change `turnstileToken: token,` to `turnstileToken: turnstile.token,`.
   - After a successful send, replace the three lines after the comment `// Single-use token: …` with `turnstile.reset();`. Those are the `const api = …` line, the `api.reset(...)` line and `setToken("")`.
   - Change the widget host to `<div ref={turnstile.hostRef} className="mt-8 empty:mt-0" />`.

- [ ] **Step 6: Run the tests, the type check and the build, and check /contact by hand**

```bash
npx vitest run src/shared
npm run typecheck
npm run build
grep -c "challenges.cloudflare.com" src/pages/Contact.tsx src/shared/lib/turnstile.ts
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA npm run build && npx vite preview --port 4173
```

Expected:
- 11 tests pass, and `typecheck` and `build` exit 0.
- `grep` prints `src/pages/Contact.tsx:0` and `src/shared/lib/turnstile.ts:1`.
- On `http://localhost:4173/contact`, the widget renders with Cloudflare's always-pass test key. A test message gets as far as the server's answer, which is unchanged from before.

Stop the preview, then run `npm run build` again without the key, so `dist/` doesn't keep it.

- [ ] **Step 7: Commit**

```bash
git add src/shared/lib/turnstile.ts src/shared/lib/turnstile.test.ts src/shared/hooks/useTurnstile.ts \
  src/shared/hooks/useTurnstile.test.tsx src/pages/Contact.tsx
git commit -m "feat(funnel): share one Turnstile loader between /contact and the funnel"
```

### Task 10: S6, and what its box means

**Files:**
- Create: `src/features/funnel/flow/words.ts`, `src/features/funnel/flow/screens/Problem.tsx`
- Modify: `src/features/funnel/flow/screens/index.ts`
- Test: `src/features/funnel/flow/words.test.ts`, `src/features/funnel/flow/screens/Problem.test.tsx`

**Interfaces:**
- Consumes:
  - `chipOptions` and `LIMITS`;
  - the `problemText`, `chip` and `problemDone` actions;
  - `FlowEnv.starter`;
  - Task 9's `loadTurnstile` and `TURNSTILE_SITE_KEY`.
- Produces:

```ts
// words.ts, used by Problem (here), the send (Task 13) and the saves (Task 14)
export const BLANK = "___";
export function problemTextFrom(value: string, starter: string): string;   // "" when nothing of their own is left
export function inputModeOf(problemText: string, chips: readonly ChipId[]): InputMode;  // typed | chips | mixed
// screens/Problem.tsx
export function Problem(props: ScreenProps): JSX.Element;   // SCREEN_UI.s6
```

**How the starter is read (Review Focus 1).**
- A blank still in the box takes the starter's own lead-in with it: "Honestly, I'm struggling with ___" and " because ___".
- Any other blank becomes a space. Then spacing and leading punctuation are tidied.
- Text with no letter or digit left counts as nothing typed.
- Untouched, the starter gives "", so `s6.empty` shows unless a chip is tapped.

- [ ] **Step 1: Write the failing tests**

`src/features/funnel/flow/words.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { inputModeOf, problemTextFrom } from "./words";

const STARTER = "Honestly, I'm struggling with ___ because ___.";

describe("problemTextFrom (Review Focus 1)", () => {
  it.each([
    ["the untouched starter", STARTER, ""],
    ["the first blank filled", "Honestly, I'm struggling with leads because ___.", "Honestly, I'm struggling with leads."],
    ["the second blank filled", "Honestly, I'm struggling with ___ because nobody calls back.", "because nobody calls back."],
    ["both blanks filled", "Honestly, I'm struggling with leads because nobody calls back.", "Honestly, I'm struggling with leads because nobody calls back."],
    ["their own sentence", "Enquiries come in, but by the time someone calls back they've gone cold.", "Enquiries come in, but by the time someone calls back they've gone cold."],
    ["the starter left and words after it", `${STARTER} Leads go cold`, "Leads go cold"],
    ["a stray blank in their words", "leads ___ go cold", "leads go cold"],
    ["spacing and lines tidied", "  Leads \n\n go   cold .", "Leads go cold."],
    ["only punctuation left", "Honestly, I'm struggling with ___ because ___!!", ""],
    ["Hindi typed in", "लीड्स ठंडी पड़ जाती हैं", "लीड्स ठंडी पड़ जाती हैं"],
  ])("%s", (_case, value, expected) => {
    expect(problemTextFrom(value, STARTER)).toBe(expected);
  });

  it("never passes 600 characters", () => {
    expect(problemTextFrom("a".repeat(700), STARTER)).toHaveLength(600);
  });
});

describe("inputModeOf (§9)", () => {
  it("is typed, chips or mixed", () => {
    expect(inputModeOf("Leads go cold", [])).toBe("typed");
    expect(inputModeOf("", ["leads"])).toBe("chips");
    expect(inputModeOf("Leads go cold", ["leads"])).toBe("mixed");
  });
});
```

`src/features/funnel/flow/screens/Problem.test.tsx`:

```tsx
// @vitest-environment jsdom
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadTurnstile } from "@/shared/lib/turnstile";
import { FunnelRoot } from "../FunnelRoot";
import { button, mount, settle, stubBrowser, stubClock, tap, tapThrough, typeInto, type Mounted } from "../test/dom";

vi.mock("@/features/funnel/data/light", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import("../test/fake-data")).FAKE_DATA,
}));
vi.mock("@/shared/lib/turnstile", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/lib/turnstile")>()),
  loadTurnstile: vi.fn(async () => null),
}));

let view: Mounted;
const root = () => view.container;
const screenNow = () => root().querySelector(".f-root")?.getAttribute("data-screen");
const box = () => root().querySelector("textarea");

beforeEach(() => {
  stubBrowser();
  stubClock();
  window.history.replaceState(null, "", "/");
  view = mount(<MemoryRouter><FunnelRoot /></MemoryRouter>);
  tapThrough(root(), "I run a business", "Clinic / healthcare", "3–5 years", "2–5", "₹1–5Cr");
});
afterEach(() => {
  view.unmount();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("S6 (§4.3, §4.4)", () => {
  it("shows the bridge, the question, the hint, the starter in the box and nine chips, on step 5 of 6", () => {
    expect(root().querySelector(".f-bridge")?.textContent).toBe("Now let's talk about why you're here.");
    expect(root().querySelector(".f-bridge-hold")?.getAttribute("aria-hidden")).toBe("true");
    expect(root().querySelector("h2")?.textContent).toBe("Between you and me, what's the one thing in your business that's hurting right now?");
    expect(box()?.value).toBe("Honestly, I'm struggling with ___ because ___.");
    expect(box()?.maxLength).toBe(600);
    expect(root().querySelectorAll(".f-chip")).toHaveLength(9);
    expect(root().querySelectorAll(".f-bar .is-on")).toHaveLength(5);
  });

  it("loads the spam check's script when it opens (§4.4)", () => {
    expect(loadTurnstile).toHaveBeenCalled();
  });

  it("asks for something when That's it comes with the untouched starter and no chip", () => {
    tap(button(root(), "That's it"));
    expect(screenNow()).toBe("s6");
    expect(root().querySelector('[role="alert"]')?.textContent).toBe("Give me something to work with: a few words, a chip, anything.");
  });

  it("moves on with their own words", () => {
    typeInto(box(), "Patients book and then don't show up.");
    tap(button(root(), "That's it"));
    expect(screenNow()).toBe("s7");
  });

  it("moves on with a chip alone", () => {
    tapThrough(root(), "Payments get stuck", "That's it");
    expect(screenNow()).toBe("s7");
  });

  it("takes three chips at most, and says so on a fourth", () => {
    tapThrough(root(), "Not enough leads", "Ads burn money", "Team chaos", "Customer support");
    expect(root().querySelectorAll('.f-chip[aria-pressed="true"]')).toHaveLength(3);
    expect(button(root(), "Customer support")?.getAttribute("aria-pressed")).toBe("false");
    expect(root().querySelector('[role="status"]')?.textContent).toBe("Three's plenty. Untap one to swap.");
  });

  it("keeps the words when Back comes from S7", async () => {
    typeInto(box(), "Patients don't show up.");
    tap(button(root(), "That's it"));
    window.history.back();
    await settle(20);
    expect(screenNow()).toBe("s6");
    expect(box()?.value).toBe("Patients don't show up.");
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run src/features/funnel/flow/words.test.ts src/features/funnel/flow/screens/Problem.test.tsx`
Expected: FAIL with `Failed to resolve import "./words"`, and S6 renders nothing yet.

- [ ] **Step 3: Write `src/features/funnel/flow/words.ts`**

```ts
/**
 * (C) What S6's box means (spec §4.3, §4.4; Review Focus 1). The box opens with s6.text, a sentence starter with
 * blanks, and most people type into it rather than clearing it. Only what they wrote counts.
 */
import { LIMITS, type ChipId, type InputMode } from "@/features/funnel/data/light";

export const BLANK = "___";

/** Their words, without the starter's unfilled parts. "" when nothing of their own is left. */
export function problemTextFrom(value: string, starter: string): string {
  const leadIns = starter.split(BLANK).slice(0, -1);   // "Honestly, I'm struggling with ", " because "
  const unblanked = leadIns
    .reduce((text, leadIn) => text.replace(`${leadIn}${BLANK}`, ""), value)
    .split(BLANK)
    .join(" ");
  const tidy = unblanked
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/^[\s.,;:!?-]+/, "")
    .trim();
  return /[\p{L}\p{N}]/u.test(tidy) ? tidy.slice(0, LIMITS.problemTextChars) : "";
}

/** typed, chips or mixed (§9). "voice" comes with phase 2. */
export function inputModeOf(problemText: string, chips: readonly ChipId[]): InputMode {
  if (problemText && chips.length > 0) return "mixed";
  return chips.length > 0 ? "chips" : "typed";
}
```

- [ ] **Step 4: Write `src/features/funnel/flow/screens/Problem.tsx`**

```tsx
/**
 * (C) S6 (spec §4.3, §4.4): the one question that matters. The text box and the chips in the first release;
 * voice comes in phase 2 (decision 20).
 */
import { useEffect } from "react";
import { LIMITS, copy } from "@/features/funnel/data/light";
import { TURNSTILE_SITE_KEY, loadTurnstile } from "@/shared/lib/turnstile";
import { chipOptions } from "../options";
import { OptionButton, Question, TopRow } from "../ui";
import { BLANK, problemTextFrom } from "../words";
import type { ScreenProps } from "./types";

export function Problem({ state, act, edit, env }: ScreenProps) {
  const { problemText, chips } = state.answers;

  useEffect(() => {
    // §4.4: the spam check's script loads when S6 opens, so S7's widget is ready when they send.
    loadTurnstile(TURNSTILE_SITE_KEY).catch(() => undefined);  // no script: the send goes without a token (§10)
  }, []);

  /** copy.md: "cursor on the first blank". Only on the untouched starter, so an edit keeps their own cursor. */
  const toFirstBlank = (box: HTMLTextAreaElement) => {
    if (box.value !== env.starter) return;
    requestAnimationFrame(() => {
      const at = box.value.indexOf(BLANK);
      if (at >= 0) box.setSelectionRange(at, at + BLANK.length);
    });
  };

  return (
    <section className={`f-screen${state.dir === "forward" ? " f-s6-intro" : ""}`} data-dir={state.dir}>
      <div className="f-bridge-hold" aria-hidden="true">{copy("s6.bridge")}</div>
      <TopRow screen="s6" />
      <p className="f-bridge">{copy("s6.bridge")}</p>
      <Question id="f-s6-q">{copy("s6.q")}</Question>
      <p id="f-s6-hint" className="f-hint">{copy("s6.hint")}</p>
      <textarea
        className="f-field f-box"
        aria-labelledby="f-s6-q"
        aria-describedby="f-s6-hint"
        maxLength={LIMITS.problemTextChars}
        value={problemText}
        onFocus={(event) => toFirstBlank(event.currentTarget)}
        onChange={(event) => edit({ type: "problemText", text: event.target.value })}
      />
      <p className="f-small">{copy("s6.chips.lead")}</p>
      <div className="f-chips">
        {chipOptions().map((option) => (
          <OptionButton
            key={option.id}
            kind="chip"
            label={option.label}
            pressed={chips.includes(option.id)}
            onPick={() => act({ type: "chip", value: option.id })}
          />
        ))}
      </div>
      <p className="f-err" role="status">{state.chipsFull ? copy("s6.chips.max") : ""}</p>
      <p className="f-err" role="alert">{state.problemEmpty ? copy("s6.empty") : ""}</p>
      <button
        type="button"
        className="f-act"
        onClick={() => act({ type: "problemDone", hasWords: problemTextFrom(problemText, env.starter) !== "" })}
      >
        {copy("s6.btn")}
      </button>
    </section>
  );
}
```

Chips go through `act`, the tap gate, so the tail of a double tap on S5 can't tick a chip. Typing goes through `edit`.

- [ ] **Step 5: Register S6**

In `src/features/funnel/flow/screens/index.ts`, add `import { Problem } from "./Problem";` and the entry `s6: Problem,` after `s5`.

- [ ] **Step 6: Run the flow tests**

Run: `npx vitest run src/features/funnel/flow`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/funnel/flow/words.ts src/features/funnel/flow/words.test.ts src/features/funnel/flow/screens/Problem.tsx \
  src/features/funnel/flow/screens/Problem.test.tsx src/features/funnel/flow/screens/index.ts
git commit -m "feat(funnel): add S6 with the sentence starter and chips"
```

### Task 11: The visit ID, the two posts and the send rules

**Files:**
- Create: `src/features/funnel/flow/visit-id.ts`, `src/features/funnel/flow/send.ts`, `src/features/funnel/flow/visit.ts`
- Test: `src/features/funnel/flow/visit-id.test.ts`, `src/features/funnel/flow/send.test.ts`, `src/features/funnel/flow/visit.test.ts`

**Interfaces:**
- Consumes:
  - `CONSENT_VERSION`, `LEAD_FIELDS`, `STEPS`, `isOneOf`;
  - the types `LeadRequest`, `LeadField`, `PlanDescriptor`, `VisitRequest`, `VisitResponse`, `StepId`, `TeamBand`, `ChipId`;
  - Task 4's `Answers`, `ContactField`, `SendResult`;
  - Task 5's `CheckedContact`;
  - Task 10's `inputModeOf`.
- Produces, for Tasks 13 and 14:

```ts
// visit-id.ts
export interface StoredVisit { id: string; lead: boolean; step: StepId }
export function startVisit(newId?: () => string): StoredVisit;    // on landing; a visit that sent a lead is over
export function currentVisit(newId?: () => string): StoredVisit;  // made if there is none
export function peekVisit(): StoredVisit | null;
export function rotateVisit(newId?: () => string): StoredVisit;   // leaving the plan
export function markLeadSent(): StoredVisit;
export function markStep(step: StepId): StoredVisit;              // keeps the furthest step

// send.ts
export const LEAD_URL = "/api/funnel/lead";
export const TOKEN_WAIT_MS = 3_000;
export const S8_LINE_AT_MS: readonly [0, 700, 1_400];
export const S8_MIN_MS = 2_100;
export interface LeadInput { visitId; retry; contact: CheckedContact; token; answers: Answers; words: { problemText; chips }; plan: PlanDescriptor }
export function leadRequest(input: LeadInput): LeadRequest;
export type LeadOutcome = { kind: "saved" } | { kind: "field"; field: LeadField } | { kind: "refused"; status: number } | { kind: "timeout" };
export function postLead(body: LeadRequest, timeoutMs: number, fetchImpl?: typeof fetch): Promise<LeadOutcome>;
export function afterSend(outcome: LeadOutcome, isRetry: boolean): SendResult;
export interface S8Line { id: string; vars?: Readonly<Record<string, string>> }
export function s8Lines(input: { problemText: string; chips: readonly ChipId[]; teamBand: TeamBand | null; teamLabel: string }): readonly S8Line[];
export function s8LineAt(elapsedMs: number): number;

// visit.ts (Task 14 adds the field builders)
export const VISIT_URL = "/api/funnel/visit";
export function postVisit(body: VisitRequest, fetchImpl?: typeof fetch): Promise<VisitResponse | null>;
```

**S8's timing.** "The lines play over 1.5 to 2.5 s, each replacing the one before" (§4.3). The lines change at 0.7 s and 1.4 s, and S8 holds at least 2.1 s, so each line is up for 0.7 s. The last line holds until the lead is saved or `LEAD_TIMEOUT_MS` has passed since the tap.

- [ ] **Step 1: Write the failing tests**

`src/features/funnel/flow/visit-id.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type VisitIdModule = typeof import("./visit-id");
let visits: VisitIdModule;
let n = 0;
const nextId = () => `id-${++n}`;

beforeEach(async () => {
  vi.resetModules();   // a fresh page: no visit in memory
  visits = await import("./visit-id");
  sessionStorage.clear();
  n = 0;
});
afterEach(() => vi.restoreAllMocks());

describe("the visit ID (§13.2, §4.1)", () => {
  it("has none before the funnel makes one", () => {
    expect(visits.peekVisit()).toBeNull();
  });

  it("makes a v4 UUID on landing and keeps it in sessionStorage", () => {
    const visit = visits.startVisit();
    expect(visit.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(JSON.parse(sessionStorage.getItem("ziiro.funnel.visit") ?? "{}")).toEqual({ id: visit.id, lead: false, step: "S0" });
  });

  it("keeps a visit that hasn't sent a lead across a reload, and starts a new one after a send", () => {
    const first = visits.startVisit(nextId);
    expect(visits.startVisit(nextId).id).toBe(first.id);
    visits.markLeadSent();
    expect(visits.startVisit(nextId)).toEqual({ id: "id-2", lead: false, step: "S0" });
  });

  it("starts a new visit when the visitor leaves the plan", () => {
    visits.startVisit(nextId);
    visits.markLeadSent();
    expect(visits.rotateVisit(nextId)).toEqual({ id: "id-2", lead: false, step: "S0" });
  });

  it("keeps the furthest step", () => {
    visits.startVisit(nextId);
    visits.markStep("S5");
    visits.markStep("S2");
    expect(visits.peekVisit()?.step).toBe("S5");
  });

  it("lives in memory when storage is blocked (§10)", () => {
    vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    const visit = visits.currentVisit(nextId);
    expect(visits.currentVisit(nextId)).toEqual(visit);
  });
});
```

`src/features/funnel/flow/send.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { LEAD_URL, afterSend, leadRequest, postLead, s8LineAt, s8Lines, type LeadInput, type LeadOutcome } from "./send";
import { initialFlow, type Answers, type SendResult } from "./state";
import { FAKE_PLAN } from "./test/fake-data";

const WORDS = "Enquiries come in, but by the time someone calls back they've gone cold.";
const ANSWERS: Answers = {
  ...initialFlow("").answers,
  segment: "business", businessType: "interior", yearsBand: "5_10", teamBand: "6_20",
  revenueBand: "band_3", revenueCurrency: "INR", problemText: WORDS,
};
const BASE: LeadInput = {
  visitId: "v-1", retry: false, contact: { name: "Ananya", email: "ananya@example.com" }, token: "",
  answers: ANSWERS, words: { problemText: WORDS, chips: [] }, plan: FAKE_PLAN,
};
const reply = (status: number, json: unknown) => vi.fn(async () => new Response(JSON.stringify(json), { status }));

describe("leadRequest (index §1.2)", () => {
  it("builds a first try with only the keys that hold something", () => {
    expect(leadRequest(BASE)).toEqual({
      visitId: "v-1", name: "Ananya", email: "ananya@example.com",
      consent: { given: true, version: "2026-10-08" },
      answers: { problemText: WORDS, chips: [], inputMode: "typed" },
      plan: {
        template: "B", orderVariant: "B-convert", tier: "M", agentIds: FAKE_PLAN.agentIds,
        matchedPhrases: ["gone cold"], classifierVersion: "kw-1", agentsVersion: "2026-10-04", fallback: false,
      },
    });
  });

  it("adds retry, the phone, the token and the Other text when there are any", () => {
    const body = leadRequest({
      ...BASE, retry: true, token: "tok", contact: { ...BASE.contact, phone: "+919876543210" },
      answers: { ...ANSWERS, businessType: "other", businessOther: "  Printing press " },
      words: { problemText: "", chips: ["payments"] },
    });
    expect(body).toMatchObject({
      retry: true, phone: "+919876543210", turnstileToken: "tok",
      answers: { businessOther: "Printing press", chips: ["payments"], inputMode: "chips" },
    });
    expect(body.answers).not.toHaveProperty("problemText");
  });

  it("keeps the Other text out unless S2's answer is Other", () => {
    expect(leadRequest({ ...BASE, answers: { ...ANSWERS, businessOther: "left over" } }).answers).not.toHaveProperty("businessOther");
  });

  it("stays under the 10,000-byte cap with the longest answers (§13.2)", () => {
    const body = leadRequest({
      ...BASE,
      answers: { ...ANSWERS, businessType: "other", businessOther: "x".repeat(80) },
      words: { problemText: "ह".repeat(600), chips: ["leads", "ads", "team"] },
    });
    expect(new TextEncoder().encode(JSON.stringify(body)).length).toBeLessThan(10_000);
  });
});

describe("postLead (§13.2)", () => {
  const body = leadRequest(BASE);
  afterEach(() => vi.useRealTimers());

  it("posts JSON to /api/funnel/lead", async () => {
    const fetchImpl = reply(200, { success: true, planEmail: "sent" });
    await postLead(body, 8_000, fetchImpl);
    expect(fetchImpl).toHaveBeenCalledWith(LEAD_URL, expect.objectContaining({
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }));
  });

  it.each<[string, number, unknown, LeadOutcome]>([
    ["a save", 200, { success: true, planEmail: "held" }, { kind: "saved" }],
    ["a field the server rejects", 400, { success: false, field: "email" }, { kind: "field", field: "email" }],
    ["a bad payload", 400, { success: false, field: "payload" }, { kind: "field", field: "payload" }],
    ["the spam check", 403, { success: false }, { kind: "refused", status: 403 }],
    ["the rate limit", 429, { success: false }, { kind: "refused", status: 429 }],
    ["our server failing", 502, { success: false }, { kind: "refused", status: 502 }],
  ])("reads %s", async (_case, status, json, outcome) => {
    await expect(postLead(body, 8_000, reply(status, json))).resolves.toEqual(outcome);
  });

  it("counts a network failure as no answer", async () => {
    const offline = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(postLead(body, 8_000, offline)).resolves.toEqual({ kind: "timeout" });
  });

  it("gives up when its time runs out", async () => {
    vi.useFakeTimers();
    const hanging: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))));
    const outcome = postLead(body, 5_000, hanging);
    await vi.advanceTimersByTimeAsync(5_000);
    await expect(outcome).resolves.toEqual({ kind: "timeout" });
  });
});

describe("afterSend (index §1.3, §10, D18)", () => {
  it.each<[string, LeadOutcome, SendResult, SendResult]>([
    ["200", { kind: "saved" }, { to: "plan", notice: null, error: null }, { to: "plan", notice: null, error: null }],
    ["400 email", { kind: "field", field: "email" }, { to: "s7", error: "email", field: "email", line: null }, { to: "plan", notice: "fail", error: "email" }],
    ["400 payload", { kind: "field", field: "payload" }, { to: "s7", error: "server", field: null, line: "g.error" }, { to: "plan", notice: "fail", error: "server" }],
    ["403", { kind: "refused", status: 403 }, { to: "s7", error: "bot", field: null, line: "s7.err.bot" }, { to: "plan", notice: "fail", error: "bot" }],
    ["429", { kind: "refused", status: 429 }, { to: "s7", error: "rate", field: null, line: "g.error" }, { to: "plan", notice: "fail", error: "rate" }],
    ["415", { kind: "refused", status: 415 }, { to: "s7", error: "server", field: null, line: "g.error" }, { to: "plan", notice: "fail", error: "server" }],
    ["502", { kind: "refused", status: 502 }, { to: "s7", error: "server", field: null, line: "g.error" }, { to: "plan", notice: "fail", error: "server" }],
    ["no answer", { kind: "timeout" }, { to: "s7", error: "timeout", field: null, line: "g.error" }, { to: "plan", notice: "unsure", error: "timeout" }],
  ])("%s: back to S7 on the first try, the plan on the second", (_case, outcome, first, second) => {
    expect(afterSend(outcome, false)).toEqual(first);
    expect(afterSend(outcome, true)).toEqual(second);
  });
});

describe("S8's lines (§4.3)", () => {
  it("reads what they wrote, or looks at what they picked", () => {
    expect(s8Lines({ problemText: "Leads go cold", chips: [], teamBand: "6_20", teamLabel: "6–20" })).toEqual([
      { id: "s8.l1" }, { id: "s8.l2" }, { id: "s8.l3", vars: { team: "6–20" } },
    ]);
    expect(s8Lines({ problemText: "", chips: ["leads"], teamBand: "6_20", teamLabel: "6–20" })[0]).toEqual({ id: "s8.l1.chips" });
  });

  it("sizes it for a team of one when it's just them", () => {
    expect(s8Lines({ problemText: "x", chips: [], teamBand: "solo", teamLabel: "Just me" })[2]).toEqual({ id: "s8.l3.one" });
  });

  it("changes line at 0.7 s and 1.4 s, then holds the last", () => {
    expect([0, 699, 700, 1_399, 1_400, 8_000].map(s8LineAt)).toEqual([0, 0, 1, 1, 2, 2]);
  });
});
```

`src/features/funnel/flow/visit.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import type { VisitRequest } from "@/features/funnel/data/light";
import { VISIT_URL, postVisit } from "./visit";

const BODY: VisitRequest = { id: "v-1", step: "S0", fields: { noticeVersion: "2026-10-08" } };
const answer = (body: string, status = 200) => vi.fn(async () => new Response(body, { status }));

describe("postVisit (§13.2)", () => {
  it("posts JSON with keepalive and returns the answer", async () => {
    const fetchImpl = answer(JSON.stringify({ success: true, country: "IN" }));
    await expect(postVisit(BODY, fetchImpl)).resolves.toEqual({ success: true, country: "IN" });
    expect(fetchImpl).toHaveBeenCalledWith(VISIT_URL, expect.objectContaining({ method: "POST", keepalive: true, body: JSON.stringify(BODY) }));
  });

  it("drops a failure without throwing (§10)", async () => {
    const offline = vi.fn(async () => {
      throw new TypeError("offline");
    });
    await expect(postVisit(BODY, offline)).resolves.toBeNull();
    await expect(postVisit(BODY, answer("<html>", 502))).resolves.toBeNull();
  });

  it("ignores an answer it doesn't recognise", async () => {
    await expect(postVisit(BODY, answer(JSON.stringify({ country: 7 })))).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run src/features/funnel/flow/visit-id.test.ts src/features/funnel/flow/send.test.ts src/features/funnel/flow/visit.test.ts`
Expected: FAIL with `Failed to resolve import` for `./visit-id`, `./send` and `./visit`.

- [ ] **Step 3: Write `src/features/funnel/flow/visit-id.ts`**

```ts
/**
 * (C) The visit's ID (spec §13.2): a v4 UUID kept in sessionStorage, or in memory when storage is blocked (§10).
 * A visit that sent its lead is over: a reload, or leaving the plan, starts a new one (§4.1).
 */
import { STEPS, isOneOf, type StepId } from "@/features/funnel/data/light";

export interface StoredVisit { id: string; lead: boolean; step: StepId }

const KEY = "ziiro.funnel.visit";
let memory: StoredVisit | null = null;

const uuid = () => crypto.randomUUID();
const fresh = (newId: () => string): StoredVisit => ({ id: newId(), lead: false, step: "S0" });

function isStoredVisit(value: unknown): value is StoredVisit {
  const visit = value as Partial<StoredVisit> | null;
  return typeof visit?.id === "string" && typeof visit.lead === "boolean" && isOneOf(STEPS, visit.step);
}

function read(): StoredVisit | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (isStoredVisit(parsed)) return parsed;
  } catch {
    // Blocked or unreadable storage: the copy in memory decides for this page view.
  }
  return memory;
}

function write(visit: StoredVisit): StoredVisit {
  memory = visit;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(visit));
  } catch {
    // Blocked storage (private mode): the visit lives in memory for this page view (§10).
  }
  return visit;
}

export function startVisit(newId: () => string = uuid): StoredVisit {
  const stored = read();
  return write(stored && !stored.lead ? stored : fresh(newId));
}

export function currentVisit(newId: () => string = uuid): StoredVisit {
  return read() ?? write(fresh(newId));
}

export function peekVisit(): StoredVisit | null {
  return read();
}

export function rotateVisit(newId: () => string = uuid): StoredVisit {
  return write(fresh(newId));
}

export function markLeadSent(): StoredVisit {
  return write({ ...currentVisit(), lead: true });
}

/** The furthest step saved. funnelSession's call-button save reuses it; the server only moves last_step forward. */
export function markStep(step: StepId): StoredVisit {
  const visit = currentVisit();
  return STEPS.indexOf(step) > STEPS.indexOf(visit.step) ? write({ ...visit, step }) : visit;
}
```

- [ ] **Step 4: Write `src/features/funnel/flow/send.ts`**

```ts
/**
 * (C) Sending the lead (spec §10, §13.2; index §1.3): the /lead body, reading its answer, the D18 rule,
 * and S8's lines and timing. Only postLead touches the network; useLeadSend (Task 13) puts them together.
 */
import {
  CONSENT_VERSION, LEAD_FIELDS, isOneOf,
  type ChipId, type LeadField, type LeadRequest, type PlanDescriptor, type TeamBand,
} from "@/features/funnel/data/light";
import type { CheckedContact } from "./screens/types";
import type { Answers, SendResult } from "./state";
import { inputModeOf } from "./words";

export const LEAD_URL = "/api/funnel/lead";
/** How long the send waits for Turnstile's token, inside the 8 s budget (Review Focus 4). */
export const TOKEN_WAIT_MS = 3_000;
/** S8's lines change at these times; each replaces the one before (§4.3). */
export const S8_LINE_AT_MS = [0, 700, 1_400] as const;
/** S8 holds at least this long, so each line is up for 0.7 s. */
export const S8_MIN_MS = 2_100;

export interface LeadInput {
  visitId: string;
  retry: boolean;
  contact: CheckedContact;
  token: string;
  answers: Answers;
  words: { problemText: string; chips: ChipId[] };
  plan: PlanDescriptor;
}

/** The /lead body. Empty keys stay out: no retry on a first try, no phone left blank, no token the widget never gave. */
export function leadRequest({ visitId, retry, contact, token, answers, words, plan }: LeadInput): LeadRequest {
  const other = answers.businessType === "other" ? answers.businessOther.trim() : "";
  return {
    visitId,
    ...(retry ? { retry: true } : {}),
    name: contact.name,
    email: contact.email,
    ...(contact.phone ? { phone: contact.phone } : {}),
    consent: { given: true, version: CONSENT_VERSION },
    ...(token ? { turnstileToken: token } : {}),
    answers: {
      ...(other ? { businessOther: other } : {}),
      ...(words.problemText ? { problemText: words.problemText } : {}),
      chips: [...words.chips],
      inputMode: inputModeOf(words.problemText, words.chips),
    },
    plan: {
      template: plan.template,
      orderVariant: plan.orderVariant,
      tier: plan.tier,
      agentIds: [...plan.agentIds],
      matchedPhrases: [...plan.matchedPhrases],
      classifierVersion: plan.classifierVersion,
      agentsVersion: plan.agentsVersion,
      fallback: plan.fallback,  // the email picks em.need.fallback from it (index §1.5, request 16)
    },
  };
}

export type LeadOutcome =
  | { kind: "saved" }
  | { kind: "field"; field: LeadField }
  | { kind: "refused"; status: number }
  | { kind: "timeout" };

/** Posts the lead and gives up after timeoutMs. No answer and a network failure both read as "timeout". */
export async function postLead(body: LeadRequest, timeoutMs: number, fetchImpl: typeof fetch = fetch): Promise<LeadOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(0, timeoutMs));
  try {
    const response = await fetchImpl(LEAD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (response.ok) return { kind: "saved" };  // the server answers 200 only once the lead is saved (§13.2)
    const answer = (await response.json().catch(() => null)) as { field?: unknown } | null;
    const field = answer?.field;
    if (response.status === 400 && isOneOf(LEAD_FIELDS, field)) return { kind: "field", field };
    return { kind: "refused", status: response.status };
  } catch {
    return { kind: "timeout" };
  } finally {
    clearTimeout(timer);
  }
}

/** What the visitor sees next (index §1.3, §10, D18): back to S7 once, then the plan anyway. */
export function afterSend(outcome: LeadOutcome, isRetry: boolean): SendResult {
  if (outcome.kind === "saved") return { to: "plan", notice: null, error: null };
  if (outcome.kind === "timeout") {
    return isRetry ? { to: "plan", notice: "unsure", error: "timeout" } : { to: "s7", error: "timeout", field: null, line: "g.error" };
  }
  if (outcome.kind === "field" && outcome.field !== "payload") {
    const field = outcome.field;
    return isRetry ? { to: "plan", notice: "fail", error: field } : { to: "s7", error: field, field, line: null };
  }
  const status = outcome.kind === "refused" ? outcome.status : 400;
  const error = status === 403 ? "bot" : status === 429 ? "rate" : "server";
  if (isRetry) return { to: "plan", notice: "fail", error };  // a second try is saved flagged, so this is defensive
  return { to: "s7", error, field: null, line: error === "bot" ? "s7.err.bot" : "g.error" };
}

export interface S8Line { id: string; vars?: Readonly<Record<string, string>> }

/** S8's three lines with §4.3's variants: chips only → s8.l1.chips; "Just me" → s8.l3.one. */
export function s8Lines(input: { problemText: string; chips: readonly ChipId[]; teamBand: TeamBand | null; teamLabel: string }): readonly S8Line[] {
  const first: S8Line = { id: !input.problemText && input.chips.length > 0 ? "s8.l1.chips" : "s8.l1" };
  const third: S8Line = input.teamBand === "solo" ? { id: "s8.l3.one" } : { id: "s8.l3", vars: { team: input.teamLabel } };
  return [first, { id: "s8.l2" }, third];
}

/** Which of S8's lines shows after elapsedMs. The last one holds. */
export function s8LineAt(elapsedMs: number): number {
  return Math.max(0, S8_LINE_AT_MS.filter((at) => elapsedMs >= at).length - 1);
}
```

`s8.l1.chips` and `s8.l3.one` are in lane C's copy, among its §4.5 additions. Task 17's `copy-ids.test.ts` checks that they, and every other ID S8 uses, are there.

- [ ] **Step 5: Write `src/features/funnel/flow/visit.ts`**

```ts
/** (C) The background saves (spec §9, §13.2): one /visit post per step, never waited on, failures dropped (§10). */
import type { VisitRequest, VisitResponse } from "@/features/funnel/data/light";

export const VISIT_URL = "/api/funnel/visit";

function isVisitResponse(value: unknown): value is VisitResponse {
  const answer = value as { success?: unknown; country?: unknown } | null;
  return answer?.success === false || (answer?.success === true && (answer.country === null || typeof answer.country === "string"));
}

/** Sent with keepalive, so a save survives the page going away. Never throws. */
export async function postVisit(body: VisitRequest, fetchImpl: typeof fetch = fetch): Promise<VisitResponse | null> {
  try {
    const response = await fetchImpl(VISIT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
    const answer: unknown = await response.json();
    return isVisitResponse(answer) ? answer : null;
  } catch {
    return null;  // a dropped save: the next one carries every answer so far (§10)
  }
}
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/features/funnel/flow/visit-id.test.ts src/features/funnel/flow/send.test.ts src/features/funnel/flow/visit.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/funnel/flow/visit-id.ts src/features/funnel/flow/visit-id.test.ts src/features/funnel/flow/send.ts \
  src/features/funnel/flow/send.test.ts src/features/funnel/flow/visit.ts src/features/funnel/flow/visit.test.ts
git commit -m "feat(funnel): add the visit ID, the lead body and the send rules"
```

### Task 12: S7, the contact form

**Files:**
- Create: `src/features/funnel/flow/contact.ts`, `src/features/funnel/flow/screens/ContactForm.tsx`
- Modify: `src/features/funnel/flow/screens/index.ts`
- Test: `src/features/funnel/flow/contact.test.ts`, `src/features/funnel/flow/screens/ContactForm.test.tsx`

**Interfaces:**
- Consumes:
  - lane B's `isValidName(name: string): boolean`, `isValidEmail(email: string): boolean` (with the disposable list, §13.2) and `toE164(raw: string, dialCode: string): string | null`, from `@/shared/lib/contact-checks` (as lane B's Task 1 declares them);
  - `dialCodeFor`, Task 9's `useTurnstile` and `TURNSTILE_SITE_KEY`;
  - `TURNSTILE_ACTION`, `LIMITS`;
  - the `contact` and `contactInvalid` actions, and `FlowEnv.send`.
- Produces:

```ts
// contact.ts
export type PhoneRead = { kind: "blank" } | { kind: "ok"; e164: string } | { kind: "bad" };
export function readPhone(raw: string, dialCode: string): PhoneRead;
export type ContactCheck = { ok: true; contact: CheckedContact } | { ok: false; fields: ContactField[] };
export function checkContact(draft: ContactDraft, dialCode: string): ContactCheck;
// screens/ContactForm.tsx
export function ContactForm(props: ScreenProps): JSX.Element;   // SCREEN_UI.s7, hidden while S8 shows
```

**What lane D's I-T2 relies on.** The labels are `s7.name` "Your name" and `s7.email` "Email", there's one checkbox, and the button is `s7.btn` "Show me my plan". A blank phone sends no `phone` key. `getByLabel("Email")` also matches the consent box, whose label says "email me", so I-T2 needs `{ exact: true }`. That's asked in `requests.md`.

**Focus.**
- After a failed check, focus moves to the first field that failed (§10). The submit handler does it at once.
- Coming back from S8 with a field the server rejected, the field carries `data-focus-first`, so `useFocusOnStep` lands there rather than on the question.

- [ ] **Step 1: Write the failing tests**

`src/features/funnel/flow/contact.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { checkContact, readPhone } from "./contact";

// The shape of lane B's checks, faked so this test doesn't depend on their exact rules.
vi.mock("@/shared/lib/contact-checks", () => ({
  isValidName: (name: string) => /\p{L}/u.test(name) && name.length <= 80,
  isValidEmail: (email: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && !email.endsWith("@mailinator.com"),
  toE164: (raw: string, dialCode: string) => {
    const digits = raw.replace(/[\s()-]/g, "");
    const full = digits.startsWith("+") ? digits : `${dialCode}${digits.replace(/^0+/, "")}`;
    return /^\+[1-9]\d{7,14}$/.test(full) ? full : null;
  },
}));

const DRAFT = { name: " Ananya ", email: " ananya@example.com ", phone: "+91 ", consent: true };

describe("readPhone (§4.4)", () => {
  it("reads an empty box, or only the prefilled code, as blank", () => {
    expect(readPhone("", "+91")).toEqual({ kind: "blank" });
    expect(readPhone("+91 ", "+91")).toEqual({ kind: "blank" });
  });

  it("reads a number into E.164, and anything else as bad", () => {
    expect(readPhone("+91 98765 43210", "+91")).toEqual({ kind: "ok", e164: "+919876543210" });
    expect(readPhone("098765 43210", "+91")).toEqual({ kind: "ok", e164: "+919876543210" });
    expect(readPhone("+91 12", "+91")).toEqual({ kind: "bad" });
  });
});

describe("checkContact (§4.4, D19)", () => {
  it("passes a good contact, trimmed, with no phone key when the phone is blank", () => {
    expect(checkContact(DRAFT, "+91")).toEqual({ ok: true, contact: { name: "Ananya", email: "ananya@example.com" } });
  });

  it("adds a typed phone in E.164", () => {
    expect(checkContact({ ...DRAFT, phone: "+91 98765 43210" }, "+91")).toEqual({
      ok: true, contact: { name: "Ananya", email: "ananya@example.com", phone: "+919876543210" },
    });
  });

  it("names every field that fails, in the form's order", () => {
    expect(checkContact({ name: "  ", email: "a@mailinator.com", phone: "12", consent: false }, "+91")).toEqual({
      ok: false, fields: ["name", "email", "phone", "consent"],
    });
  });
});
```

`src/features/funnel/flow/screens/ContactForm.test.tsx`:

```tsx
// @vitest-environment jsdom
import { useReducer } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRERENDER_BOOT } from "../boot";
import { initialFlow, reduce, type FlowAction } from "../state";
import { button, click, mount, stubBrowser, typeInto, type Mounted } from "../test/dom";
import { ContactForm } from "./ContactForm";
import type { FlowEnv } from "./types";

vi.mock("@/features/funnel/data/light", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import("../test/fake-data")).FAKE_DATA,
}));
vi.mock("@/shared/lib/contact-checks", () => ({
  isValidName: (name: string) => /\p{L}/u.test(name),
  isValidEmail: (email: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email),
  toE164: (raw: string) => {
    const digits = raw.replace(/[\s()-]/g, "");
    return /^\+[1-9]\d{7,14}$/.test(digits) ? digits : null;
  },
}));

const STARTER = "Honestly, I'm struggling with ___ because ___.";
const TO_S7: FlowAction[] = [
  { type: "segment", value: "business" }, { type: "business", value: "interior" }, { type: "years", value: "5_10" },
  { type: "team", value: "6_20" }, { type: "revenue", value: "band_3", currency: "INR" }, { type: "problemDone", hasWords: true },
];
const AT_S7 = TO_S7.reduce(reduce, initialFlow(STARTER));

const send = vi.fn();
function Harness() {
  const [state, dispatch] = useReducer(reduce, AT_S7);
  const env: FlowEnv = { boot: PRERENDER_BOOT, introOffsetMs: null, country: null, timeZone: "Asia/Kolkata", starter: STARTER, send };
  return <ContactForm state={state} act={dispatch} edit={dispatch} env={env} />;
}

let view: Mounted;
const root = () => view.container;
const field = (id: string) => root().querySelector<HTMLInputElement>(`#${id}`);
const errorOf = (id: string) => root().querySelector(`#${id}-err`)?.textContent;

beforeEach(() => {
  stubBrowser();
  view = mount(<Harness />);
});
afterEach(() => {
  view.unmount();
  send.mockReset();
  vi.unstubAllGlobals();
});

describe("S7 (§4.3, §4.4, §11.6)", () => {
  it("labels its fields with autocomplete, leaves consent unticked and shows step 6 of 6", () => {
    const label = (id: string) => root().querySelector(`label[for="${id}"]`)?.textContent;
    expect([label("f-name"), label("f-email"), label("f-phone")]).toEqual(["Your name", "Email", "Phone (optional)"]);
    expect([field("f-name")?.autocomplete, field("f-email")?.autocomplete, field("f-phone")?.autocomplete]).toEqual(["name", "email", "tel"]);
    expect(root().querySelectorAll('input[type="checkbox"]')).toHaveLength(1);
    expect(field("f-consent")?.checked).toBe(false);
    expect(button(root(), "Show me my plan")?.type).toBe("submit");
    expect(root().querySelectorAll(".f-bar .is-on")).toHaveLength(6);
    expect(root().querySelector('a[href="/privacy"]')?.getAttribute("target")).toBe("_blank");
  });

  it("prefills the dial code for India's clock, and keeps it editable", () => {
    expect(field("f-phone")?.value).toBe("+91 ");
  });

  it("shows each failed field's line, focuses the first, and sends nothing", () => {
    click(button(root(), "Show me my plan"));
    expect(errorOf("f-name")).toBe("What should I call you?");
    expect(errorOf("f-email")).toBe("That email doesn't look right. Mind checking it?");
    expect(errorOf("f-consent")).toBe("Tick the box so I'm allowed to save this.");
    expect(errorOf("f-phone")).toBe("");
    expect(field("f-name")?.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement?.id).toBe("f-name");
    expect(send).not.toHaveBeenCalled();
  });

  it("clears a field's line when that field is edited, and keeps the others", () => {
    click(button(root(), "Show me my plan"));
    typeInto(field("f-name"), "Ananya");
    expect(errorOf("f-name")).toBe("");
    expect(errorOf("f-email")).toBe("That email doesn't look right. Mind checking it?");
  });

  it("sends the checked contact, with no phone when the box holds only the code", () => {
    typeInto(field("f-name"), "Ananya");
    typeInto(field("f-email"), "ananya@example.com");
    click(field("f-consent"));
    click(button(root(), "Show me my plan"));
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ waitForToken: expect.any(Function), reset: expect.any(Function) }), {
      name: "Ananya", email: "ananya@example.com",
    });
  });

  it("sends a typed phone in E.164, and flags one that doesn't look right", () => {
    typeInto(field("f-name"), "Ananya");
    typeInto(field("f-email"), "ananya@example.com");
    click(field("f-consent"));
    typeInto(field("f-phone"), "+91 12");
    click(button(root(), "Show me my plan"));
    expect(errorOf("f-phone")).toBe("That number doesn't look right. You can leave it blank.");
    typeInto(field("f-phone"), "+91 98765 43210");
    click(button(root(), "Show me my plan"));
    expect(send).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ phone: "+919876543210" }));
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run src/features/funnel/flow/contact.test.ts src/features/funnel/flow/screens/ContactForm.test.tsx`
Expected: FAIL with `Failed to resolve import "./contact"` and `Failed to resolve import "./ContactForm"`.

- [ ] **Step 3: Write `src/features/funnel/flow/contact.ts`**

```ts
/** (C) S7's checks (spec §4.4, D19): shape only, with the checks the server runs, imported from lane B's module. */
import { isValidEmail, isValidName, toE164 } from "@/shared/lib/contact-checks";
import type { CheckedContact } from "./screens/types";
import type { ContactDraft, ContactField } from "./state";

export type PhoneRead = { kind: "blank" } | { kind: "ok"; e164: string } | { kind: "bad" };

/** The phone box: blank (empty, or only the prefilled code), a number in E.164, or one that doesn't look right. */
export function readPhone(raw: string, dialCode: string): PhoneRead {
  const typed = raw.trim();
  if (typed === "" || typed === dialCode) return { kind: "blank" };
  const e164 = toE164(typed, dialCode);
  return e164 ? { kind: "ok", e164 } : { kind: "bad" };
}

export type ContactCheck = { ok: true; contact: CheckedContact } | { ok: false; fields: ContactField[] };

/** Every field at once, in the form's order, so focus can go to the first that failed (§10). */
export function checkContact(draft: ContactDraft, dialCode: string): ContactCheck {
  const name = draft.name.trim();
  const email = draft.email.trim();
  const phone = readPhone(draft.phone, dialCode);
  const fields: ContactField[] = [
    ...(isValidName(name) ? [] : (["name"] as const)),
    ...(isValidEmail(email) ? [] : (["email"] as const)),   // the disposable-address list included (§13.2)
    ...(phone.kind === "bad" ? (["phone"] as const) : []),
    ...(draft.consent ? [] : (["consent"] as const)),
  ];
  if (fields.length > 0) return { ok: false, fields };
  return { ok: true, contact: { name, email, ...(phone.kind === "ok" ? { phone: phone.e164 } : {}) } };
}
```

- [ ] **Step 4: Write `src/features/funnel/flow/screens/ContactForm.tsx`**

```tsx
/**
 * (C) S7 (spec §4.3, §4.4, §10, §11.6): where the plan goes. Name and email required; phone optional, with its code
 * prefilled; an unticked consent box; the spam check. One self-contained piece, so it can move onto the plan (D23).
 * It stays mounted, hidden, while S8 plays, so a failed send comes back with every field kept.
 */
import { useEffect, type FormEvent } from "react";
import { LIMITS, TURNSTILE_ACTION, copy } from "@/features/funnel/data/light";
import { useTurnstile } from "@/shared/hooks/useTurnstile";
import { TURNSTILE_SITE_KEY } from "@/shared/lib/turnstile";
import { checkContact } from "../contact";
import { dialCodeFor } from "../region";
import type { ContactField } from "../state";
import { PrivacyLink, Question, TopRow } from "../ui";
import type { ScreenProps } from "./types";

const ORDER: readonly ContactField[] = ["name", "email", "phone", "consent"];
const ID: Readonly<Record<ContactField, string>> = { name: "f-name", email: "f-email", phone: "f-phone", consent: "f-consent" };

export function ContactForm({ state, edit, env }: ScreenProps) {
  const widget = useTurnstile({
    siteKey: TURNSTILE_SITE_KEY, action: TURNSTILE_ACTION, appearance: "interaction-only", theme: env.boot.theme,
  });
  const dialCode = dialCodeFor(env.country, env.timeZone);
  const { contact, fieldErrors } = state;
  const firstError = ORDER.find((field) => fieldErrors.includes(field));
  const errorFor = (field: ContactField) => (fieldErrors.includes(field) ? copy(`s7.err.${field}`) : "");
  const focusFirst = (field: ContactField) => (firstError === field ? "" : undefined);
  const [privacy, adults] = copy("s7.links").split(" · ");

  useEffect(() => {
    // §4.4: the country code is prefilled from the visitor's country and stays editable.
    if (!contact.phone && dialCode) edit({ type: "contact", patch: { phone: `${dialCode} ` } });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- when a code becomes known
  }, [dialCode]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const check = checkContact(contact, dialCode);
    if (!check.ok) {
      edit({ type: "contactInvalid", fields: check.fields });
      document.getElementById(ID[check.fields[0]])?.focus();
      return;
    }
    env.send(widget, check.contact);
  };

  return (
    <form className="f-form" data-dir={state.dir} hidden={state.screen !== "s7"} noValidate onSubmit={onSubmit} aria-labelledby="f-s7-q">
      <TopRow screen="s7" />
      <Question id="f-s7-q">{copy("s7.q")}</Question>
      <p className="f-hint">{copy("s7.sub")}</p>

      <label className="f-label" htmlFor={ID.name}>{copy("s7.name")}</label>
      <input
        id={ID.name} className="f-field" type="text" autoComplete="name" maxLength={LIMITS.nameChars}
        placeholder={copy("s7.name.ph")} value={contact.name} aria-invalid={fieldErrors.includes("name")}
        aria-describedby="f-name-err" data-focus-first={focusFirst("name")}
        onChange={(event) => edit({ type: "contact", patch: { name: event.target.value } })}
      />
      <p id="f-name-err" className="f-err" aria-live="polite">{errorFor("name")}</p>

      <label className="f-label" htmlFor={ID.email}>{copy("s7.email")}</label>
      <input
        id={ID.email} className="f-field" type="email" inputMode="email" autoComplete="email" maxLength={LIMITS.emailChars}
        placeholder={copy("s7.email.ph")} value={contact.email} aria-invalid={fieldErrors.includes("email")}
        aria-describedby="f-email-err" data-focus-first={focusFirst("email")}
        onChange={(event) => edit({ type: "contact", patch: { email: event.target.value } })}
      />
      <p id="f-email-err" className="f-err" aria-live="polite">{errorFor("email")}</p>

      <label className="f-label" htmlFor={ID.phone}>{copy("s7.phone")}</label>
      <input
        id={ID.phone} className="f-field" type="tel" inputMode="tel" autoComplete="tel"
        value={contact.phone} aria-invalid={fieldErrors.includes("phone")}
        aria-describedby="f-phone-why f-phone-err" data-focus-first={focusFirst("phone")}
        onChange={(event) => edit({ type: "contact", patch: { phone: event.target.value } })}
      />
      <p id="f-phone-why" className="f-small">{copy("s7.phone.why")}</p>
      <p id="f-phone-err" className="f-err" aria-live="polite">{errorFor("phone")}</p>

      <div className="f-consent">
        <input
          id={ID.consent} type="checkbox" checked={contact.consent} aria-invalid={fieldErrors.includes("consent")}
          aria-describedby="f-consent-err" data-focus-first={focusFirst("consent")}
          onChange={(event) => edit({ type: "contact", patch: { consent: event.target.checked } })}
        />
        <label htmlFor={ID.consent} className="f-small">{copy("s7.consent")}</label>
      </div>
      <p id="f-consent-err" className="f-err" aria-live="polite">{errorFor("consent")}</p>

      <p className="f-small"><PrivacyLink label={privacy} /> · {adults}</p>
      <div ref={widget.hostRef} className="f-turnstile" />
      <p className="f-err" role="alert">{state.sendLine ? copy(state.sendLine) : ""}</p>
      <button type="submit" className="f-act">{copy("s7.btn")}</button>
    </form>
  );
}
```

Enter in any field submits the form (§4.3, "Enter submits"), because the button is the form's submit button.

- [ ] **Step 5: Register S7**

In `src/features/funnel/flow/screens/index.ts`, add `import { ContactForm } from "./ContactForm";` and the entry `s7: ContactForm,` after `s6`. FunnelRoot already mounts it for both `s7` and `s8` (Task 5).

- [ ] **Step 6: Run the flow tests and the type check**

```bash
npx vitest run src/features/funnel/flow
npm run typecheck
```

Expected: PASS. `typecheck` needs lane B's `contact-checks.ts` on the branch, due day 1. If its signatures differ from the three above, fix the calls in `contact.ts` and note it under Deviations.

- [ ] **Step 7: Commit**

```bash
git add src/features/funnel/flow/contact.ts src/features/funnel/flow/contact.test.ts src/features/funnel/flow/screens/ContactForm.tsx \
  src/features/funnel/flow/screens/ContactForm.test.tsx src/features/funnel/flow/screens/index.ts
git commit -m "feat(funnel): add S7, the contact form with its checks"
```

### Task 13: S8, the send, the plan at S9, and funnelSession

**Files:**
- Create: `src/features/funnel/flow/plan-chunk.ts`, `src/features/funnel/flow/useLeadSend.ts`, `src/features/funnel/flow/screens/Analysing.tsx`, `src/features/funnel/flow/screens/Plan.tsx`, `src/features/funnel/flow/send-flow.test.tsx`
- Modify: `src/features/funnel/flow/session.ts` and `session.test.ts` (Task 1's stub and its test), `src/features/funnel/flow/screens/index.ts`, `src/features/funnel/flow/FunnelRoot.tsx`, and the three tests that pass S5: `screens/YearsTeam.test.tsx`, `screens/Revenue.test.tsx`, `screens/Problem.test.tsx`

**Interfaces:**
- Consumes:
  - lane C's `PlanPage(props: PlanPageProps)` and `HeroPicturePrefetch()` (day 3), and `composePlan(input: PlanInput)` (day 3 morning), each through `import()`;
  - Task 11's `leadRequest`, `postLead`, `afterSend`, `s8Lines`, `s8LineAt`, `TOKEN_WAIT_MS`, `S8_MIN_MS`, `S8_LINE_AT_MS`, `startVisit`, `rotateVisit` and `markLeadSent`;
  - Task 10's `problemTextFrom`; Task 4's `funnelStageOf`;
  - `LEAD_TIMEOUT_MS`, from the light entry.
- Produces:

```ts
// session.ts (index §1.3): Task 1's stub, completed. Still type imports only (index §1.5, request 9)
export const funnelSession: FunnelSession;  // leadContact(), reportCta(from), stage(), subscribe(onChange)
export function setLeadContact(contact: { name: string; email: string } | null): void;
export function setStage(stage: FunnelStage): void;
export function setCtaReporter(report: ((from: CtaFrom) => void) | null): void;  // set while FunnelRoot is mounted
// plan-chunk.ts
export const loadPlanPage: () => Promise<typeof import("@/features/funnel/plan/PlanPage")>;
export const loadPlanData: () => Promise<typeof import("@/features/funnel/data")>;
export function prefetchPlan(): void;
export const LazyPlanPage: LazyExoticComponent<(props: PlanPageProps) => JSX.Element>;
export const LazyHeroPicturePrefetch: LazyExoticComponent<() => JSX.Element>;
// useLeadSend.ts
export function useLeadSend(state: FlowState, dispatch: Dispatch<FlowAction>, starter: string): FlowEnv["send"];
// screens
export function Analysing(props: ScreenProps): JSX.Element;    // SCREEN_UI.s8
export function PlanScreen(props: ScreenProps): JSX.Element;   // SCREEN_UI.plan
export function PlanPrefetch(): JSX.Element;                   // from S5: HeroPicturePrefetch, never an error
```

**The send, in order** (§4.3, §10, §13.2, index §1.3):
1. The tap puts S8 in S7's place at once. S7 stays mounted and hidden, with its fields and the widget.
2. `funnelSession` learns the contact. The visit is marked as having sent its lead, so a reload starts a new one.
3. `composePlan` runs on the device. `planReady` puts the plan in state, which Task 14 saves with step S8.
4. The send waits up to 3 s for Turnstile's token (Review Focus 4).
5. It posts `/lead` with what is left of the 8 s, counted from the tap.
6. It holds S8 for at least 2.1 s and until the plan chunk has loaded.
7. `afterSend` decides the next screen. A first failure resets the widget, so the second try carries a fresh token.

**New visits.**
- On landing, a visit that already sent its lead is replaced (`startVisit`).
- Leaving the plan raises `state.round`, which replaces the visit (`rotateVisit`). Sending again is then a new visit with a new lead (§4.1).

**The header** (index §1.3):
- FunnelRoot tells the session its stage: `"plan"` at S9, and `"questions"` everywhere else and when it unmounts. The header subscribes and shows its links at S9 only (D6, §6.2).
- While FunnelRoot is mounted, a header tap on "Book a call" becomes a `progress` action (`ctaFrom: "header"`, `ctaClicked: true`), which Task 14 saves on the visit like the plan's own taps. Off `/` nothing is mounted, so `reportCta` does nothing.

**From S5** (§6.6, §13.1, requests 11 and 18): S5 starts the `import()` of `PlanPage` and of the full data entry, and mounts `HeroPicturePrefetch` through `React.lazy` until the plan shows. A failed prefetch never reaches the visitor.

- [ ] **Step 1: Write the failing tests**

`src/features/funnel/flow/session.test.ts`, replacing Task 1's stub test:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { funnelSession, setCtaReporter, setLeadContact, setStage } from "./session";
import source from "./session.ts?raw";

beforeEach(() => {
  setLeadContact(null);
  setStage("questions");
  setCtaReporter(null);
});

describe("funnelSession (index §1.3, D6, D14)", () => {
  it("knows no contact until S7 has been sent, and keeps the same object until it changes", () => {
    expect(funnelSession.leadContact()).toBeNull();
    setLeadContact({ name: "Ananya", email: "ananya@example.com" });
    const first = funnelSession.leadContact();
    expect(first).toEqual({ name: "Ananya", email: "ananya@example.com" });
    setLeadContact({ name: "Ananya", email: "ananya@example.com" });
    expect(funnelSession.leadContact()).toBe(first);  // useSyncExternalStore needs a stable snapshot
  });

  it("tells subscribers when the stage or the contact changes, and only then", () => {
    const onChange = vi.fn();
    const unsubscribe = funnelSession.subscribe(onChange);
    setStage("questions");
    expect(onChange).not.toHaveBeenCalled();
    setStage("plan");
    expect(funnelSession.stage()).toBe("plan");
    setLeadContact({ name: "Ananya", email: "ananya@example.com" });
    expect(onChange).toHaveBeenCalledTimes(2);
    unsubscribe();
    setStage("questions");
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("does nothing on a call-button tap while no funnel is mounted", () => {
    expect(() => funnelSession.reportCta("header")).not.toThrow();
  });

  it("hands a call-button tap to the mounted funnel, which saves it on its visit", () => {
    const report = vi.fn();
    setCtaReporter(report);
    funnelSession.reportCta("header");
    expect(report).toHaveBeenCalledWith("header");
  });

  it("still has no runtime imports, so the header can load it on every page (index §1.5)", () => {
    const imports = source.split("\n").filter((line) => line.startsWith("import "));
    expect(imports.every((line) => line.startsWith("import type "))).toBe(true);
  });
});
```

`src/features/funnel/flow/send-flow.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { LeadRequest } from "@/features/funnel/data/light";
import { FunnelRoot } from "./FunnelRoot";
import { prefetchPlan } from "./plan-chunk";
import { funnelSession, setLeadContact } from "./session";
import { button, click, mount, stubBrowser, stubClock, tap, tapThrough, typeInto, type Mounted } from "./test/dom";

vi.mock("@/features/funnel/data/light", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import("./test/fake-data")).FAKE_DATA,
}));
vi.mock("@/features/funnel/data", async (importOriginal) => ({  // the full entry, for composePlan
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import("./test/fake-data")).FAKE_DATA,
}));
vi.mock("@/features/funnel/plan/PlanPage", async () => {
  const { createElement } = await import("react");
  return {
    PlanPage: (props: { visitor: { name: string }; saveNotice: string | null; onProgress(fields: object): void }) =>
      createElement("button", { className: "plan-stub", onClick: () => props.onProgress({ planDepth: 2 }) },
        `${props.visitor.name} · ${props.saveNotice ?? "none"}`),
  };
});
vi.mock("@/shared/lib/contact-checks", () => ({
  isValidName: (name: string) => /\p{L}/u.test(name),
  isValidEmail: (email: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email),
  toE164: () => null,
}));
vi.mock("./plan-chunk", async (importOriginal) => {
  const { createElement } = await import("react");
  return {
    ...(await importOriginal<typeof import("./plan-chunk")>()),
    prefetchPlan: vi.fn(),
    LazyHeroPicturePrefetch: () => createElement("i", { "data-hero-prefetch": "" }),
  };
});
vi.mock("./region", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./region")>()),
  localTimeZone: () => "Asia/Kolkata",
}));
/** The spam check, under the test's control: no token by default, as with no site key. */
const turnstile = vi.hoisted(() => ({ wait: (_ms: number) => Promise.resolve(""), reset: vi.fn() }));
vi.mock("@/shared/hooks/useTurnstile", () => ({
  useTurnstile: () => ({ hostRef: { current: null }, token: "", waitForToken: (ms: number) => turnstile.wait(ms), reset: turnstile.reset }),
}));

type Reply = (signal?: AbortSignal) => Promise<Response>;
const json = (status: number, body: unknown): Reply => async () => new Response(JSON.stringify(body), { status });
const noAnswer: Reply = (signal) =>
  new Promise((_resolve, reject) => signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))));

let replies: Reply[] = [];
let leads: LeadRequest[] = [];
let view: Mounted;
const root = () => view.container;
const screenNow = () => root().querySelector(".f-root")?.getAttribute("data-screen");
const s8Line = () => root().querySelector(".f-s8")?.textContent;
const planText = () => root().querySelector(".plan-stub")?.textContent;
const alertLine = () => root().querySelector('form [role="alert"]')?.textContent;
const run = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
const send = () => click(button(root(), "Show me my plan"));

beforeAll(async () => {
  // Load the plan's modules once, on real timers, so no send waits on a module load while the clock is fake.
  await import("@/features/funnel/data");
  await import("@/features/funnel/plan/PlanPage");
});

beforeEach(() => {
  stubBrowser();
  stubClock();   // the tap gate's clock
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });   // S8's clock
  replies = [];
  leads = [];
  turnstile.wait = () => Promise.resolve("");
  turnstile.reset.mockClear();
  setLeadContact(null);
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (url !== "/api/funnel/lead") return new Response(JSON.stringify({ success: true, country: "IN" }));
    leads.push(JSON.parse(String(init?.body)) as LeadRequest);
    return (replies.shift() ?? json(200, { success: true, planEmail: "sent" }))(init?.signal ?? undefined);
  }));
  view = mount(<MemoryRouter><FunnelRoot /></MemoryRouter>);
  tapThrough(root(), "I run a business", "Interior design / architecture", "5–10 years", "6–20", "₹1–5Cr");
  typeInto(root().querySelector("textarea"), "Enquiries come in, but by the time someone calls back they've gone cold.");
  tap(button(root(), "That's it"));
  typeInto(root().querySelector("#f-name"), "Ananya");
  typeInto(root().querySelector("#f-email"), "ananya@example.com");
  click(root().querySelector("#f-consent"));
});
afterEach(() => {
  view.unmount();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("sending S7 (§4.3, §10, §13.2)", () => {
  it("puts S8 in S7's place at once, keeping S7 and its fields hidden underneath", () => {
    const entries = window.history.length;
    send();
    expect(screenNow()).toBe("s8");
    expect(root().querySelector("form")?.hidden).toBe(true);
    expect(root().querySelector<HTMLInputElement>("#f-name")?.value).toBe("Ananya");
    expect(s8Line()).toBe("Reading what you wrote…");
    expect(window.history.state?.funnel).toBe("s8");
    expect(window.history.length).toBe(entries);
  });

  it("plays S8's three lines, then opens the plan in the same entry with the header open", async () => {
    send();
    expect(funnelSession.stage()).toBe("questions");
    await run(700);
    expect(s8Line()).toBe("Matching it against a map of 137 business jobs…");
    await run(700);
    expect(s8Line()).toBe("Sizing it for a team of 6–20…");
    await run(700);
    expect(screenNow()).toBe("plan");
    expect(planText()).toBe("Ananya · none");
    expect(window.history.state?.funnel).toBe("plan");
    expect(funnelSession.stage()).toBe("plan");
    expect(document.documentElement.dataset.funnel).toBe("plan");
  });

  it("sends the body the fixture expects: no retry, phone or token on a first try with no token", async () => {
    send();
    await run(0);
    expect(leads).toHaveLength(1);
    expect(Object.keys(leads[0]).sort()).toEqual(["answers", "consent", "email", "name", "plan", "visitId"]);
    expect(leads[0]).toMatchObject({
      name: "Ananya", email: "ananya@example.com", consent: { given: true, version: "2026-10-08" },
      answers: { problemText: "Enquiries come in, but by the time someone calls back they've gone cold.", chips: [], inputMode: "typed" },
    });
  });

  it("sends one lead for a double tap (index I-T2)", async () => {
    send();
    send();
    await run(2_100);
    expect(leads).toHaveLength(1);
  });

  it("waits for the spam check's token, up to 3 s, and sends it (Review Focus 4)", async () => {
    const asked: number[] = [];
    turnstile.wait = (ms) => {
      asked.push(ms);
      return new Promise((resolve) => setTimeout(() => resolve("tok"), 1_000));
    };
    send();
    await run(999);
    expect(leads).toHaveLength(0);
    await run(1);
    expect(asked).toEqual([3_000]);
    expect(leads[0]).toMatchObject({ turnstileToken: "tok" });
  });

  it("tells the nav pill who sent it (D14)", () => {
    send();
    expect(funnelSession.leadContact()).toEqual({ name: "Ananya", email: "ananya@example.com" });
  });

  it("goes back to S7 once with every field kept, then the second try says retry (§10, D18)", async () => {
    replies = [json(403, { success: false }), json(200, { success: true, planEmail: "held" })];
    send();
    await run(2_100);
    expect(screenNow()).toBe("s7");
    expect(alertLine()).toBe("The spam check didn't go through. Mind trying once more?");
    expect(root().querySelector<HTMLInputElement>("#f-name")?.value).toBe("Ananya");
    expect(root().querySelector<HTMLInputElement>("#f-consent")?.checked).toBe(true);
    expect(turnstile.reset).toHaveBeenCalledTimes(1);  // a token is single use: the retry gets a fresh one
    send();
    await run(2_100);
    expect(leads[1]).toMatchObject({ retry: true, visitId: leads[0].visitId });
    expect(planText()).toBe("Ananya · none");
  });

  it("opens the plan with sp.save.fail's notice after a server failure twice", async () => {
    replies = [json(502, { success: false }), json(502, { success: false })];
    send();
    await run(2_100);
    expect(alertLine()).toBe("Something went wrong on our end. Try that again?");
    send();
    await run(2_100);
    expect(planText()).toBe("Ananya · fail");
  });

  it("opens the plan with sp.save.unsure's notice after no answer twice", async () => {
    replies = [noAnswer, noAnswer];
    send();
    await run(8_000);
    expect(screenNow()).toBe("s7");
    expect(alertLine()).toBe("Something went wrong on our end. Try that again?");
    send();
    await run(8_000);
    expect(planText()).toBe("Ananya · unsure");
  });

  it("lands on S6 on Back from the plan, and the next send is a new visit (§4.1)", async () => {
    send();
    await run(2_100);
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: { funnel: "s6" } }));
    });
    expect(screenNow()).toBe("s6");
    expect(funnelSession.stage()).toBe("questions");
    tap(button(root(), "That's it"));
    send();
    await run(2_100);
    expect(leads).toHaveLength(2);
    expect(leads[1].visitId).not.toBe(leads[0].visitId);
    expect(leads[1]).not.toHaveProperty("retry");
  });

  it("starts the plan's code at S5, and keeps the hero still mounted out of sight until the plan (§6.6, §13.1)", async () => {
    expect(prefetchPlan).toHaveBeenCalled();
    expect(root().querySelector("[data-hero-prefetch]")).not.toBeNull();
    send();
    await run(2_100);
    expect(screenNow()).toBe("plan");
    expect(root().querySelector("[data-hero-prefetch]")).toBeNull();
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run src/features/funnel/flow/session.test.ts src/features/funnel/flow/send-flow.test.tsx`
Expected: FAIL. The session test fails with `setCtaReporter is not a function`, and the flow test with `Failed to resolve import "./plan-chunk"`.

- [ ] **Step 3: Write `src/features/funnel/flow/plan-chunk.ts`, and complete `src/features/funnel/flow/session.ts`**

`src/features/funnel/flow/plan-chunk.ts`:

```ts
/**
 * (C) The plan chunk (spec §6.6, §13.1, §13.10; index §1.5): lane C's PlanPage, its hero still and composePlan,
 * reached only through import(). S5 starts them, so they're ready when S8 ends, and the agents data, the jobs and
 * the phrase lists never enter the funnel chunk.
 */
import { lazy } from "react";

export const loadPlanPage = () => import("@/features/funnel/plan/PlanPage");
export const loadPlanData = () => import("@/features/funnel/data");

/** Starts both downloads. A failure here is tried again when they're needed. */
export function prefetchPlan(): void {
  loadPlanPage().catch(() => undefined);
  loadPlanData().catch(() => undefined);
}

export const LazyPlanPage = lazy(() => loadPlanPage().then((module) => ({ default: module.PlanPage })));

/** §6.6: the hero <picture>, mounted out of sight from S5, so the browser has the file S9 shows. */
export const LazyHeroPicturePrefetch = lazy(() =>
  import("@/features/funnel/plan/HeroPicture").then((module) => ({ default: module.HeroPicturePrefetch })),
);
```

`src/features/funnel/flow/session.ts`, replacing Task 1's stub:

```ts
/**
 * (C) funnelSession (00-index §1.3): what lane D's header and nav pill read from the funnel. stage() hides the
 * header's links until S9 (D6, §6.2); leadContact() prefills Calendly once S7 has been sent (D14).
 * Type imports only (00-index §1.5), so the header can load it on every page. FunnelRoot sets the rest.
 */
import type { CtaFrom, FunnelSession, FunnelStage } from "@/features/funnel/data/contract";

type Contact = Readonly<{ name: string; email: string }>;

let contact: Contact | null = null;
let stage: FunnelStage = "questions";
let ctaReporter: ((from: CtaFrom) => void) | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((onChange) => onChange());

/** Set at S7's send (useLeadSend). For this page view only; nothing typed is stored. */
export function setLeadContact(next: { name: string; email: string } | null): void {
  if (next?.name === contact?.name && next?.email === contact?.email) return;
  contact = next ? Object.freeze({ name: next.name, email: next.email }) : null;
  notify();
}

/** "plan" at S9; "questions" before it, after Back from it, and when the funnel unmounts. */
export function setStage(next: FunnelStage): void {
  if (next === stage) return;
  stage = next;
  notify();
}

/** FunnelRoot saves call-button taps on its visit while it is mounted. With no funnel there's nothing to save. */
export function setCtaReporter(report: ((from: CtaFrom) => void) | null): void {
  ctaReporter = report;
}

export const funnelSession: FunnelSession = {
  leadContact: () => contact,  // the same object until it changes, as useSyncExternalStore needs
  reportCta: (from) => ctaReporter?.(from),
  stage: () => stage,
  subscribe(onChange) {
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  },
};
```

- [ ] **Step 4: Write `src/features/funnel/flow/useLeadSend.ts`**

```ts
/**
 * (C) S7's send (spec §4.3, §10, §13.2; index §1.3). S8 shows at once, the plan is composed on the device, and the lead
 * goes to /lead with the spam check's token. After S8's lines the visitor sees the plan, or S7 once more (D18).
 * S8's clock is Date.now(), counted from the tap.
 */
import { useCallback, useRef, type Dispatch } from "react";
import { LEAD_TIMEOUT_MS } from "@/features/funnel/data/light";
import { loadPlanData, loadPlanPage } from "./plan-chunk";
import type { CheckedContact, FlowEnv, TokenSource } from "./screens/types";
import { S8_MIN_MS, TOKEN_WAIT_MS, afterSend, leadRequest, postLead } from "./send";
import { setLeadContact } from "./session";
import type { FlowAction, FlowState, SendResult } from "./state";
import { markLeadSent } from "./visit-id";
import { problemTextFrom } from "./words";

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, ms)));
const FAILED: SendResult = { to: "s7", error: "server", field: null, line: "g.error" };

export function useLeadSend(state: FlowState, dispatch: Dispatch<FlowAction>, starter: string): FlowEnv["send"] {
  const sending = useRef(false);

  return useCallback(
    async (widget: TokenSource, contact: CheckedContact) => {
      if (sending.current) return;  // a double tap sends one lead
      sending.current = true;
      const startedAt = Date.now();
      const elapsed = () => Date.now() - startedAt;
      const isRetry = state.attempt >= 1;
      const { answers } = state;
      const words = { problemText: problemTextFrom(answers.problemText, starter), chips: [...answers.chips] };
      const visitor = { name: contact.name, email: contact.email };
      dispatch({ type: "sendStarted", visitor });
      setLeadContact(visitor);
      const visit = markLeadSent();
      try {
        const { teamBand, revenueBand, revenueCurrency } = answers;
        if (!teamBand || !revenueBand || !revenueCurrency) throw new Error("S7 was reached without S4 and S5");
        const { composePlan } = await loadPlanData();
        const plan = composePlan({ teamBand, revenueBand, currency: revenueCurrency, chips: words.chips, problemText: words.problemText });
        dispatch({ type: "planReady", plan });
        const token = await widget.waitForToken(Math.min(TOKEN_WAIT_MS, LEAD_TIMEOUT_MS - elapsed()));
        const body = leadRequest({ visitId: visit.id, retry: isRetry, contact, token, answers, words, plan });
        const result = afterSend(await postLead(body, LEAD_TIMEOUT_MS - elapsed()), isRetry);
        await Promise.all([wait(S8_MIN_MS - elapsed()), result.to === "plan" ? loadPlanPage().catch(() => undefined) : undefined]);
        if (result.to === "s7") widget.reset();  // a token is single use: the second try needs a fresh one
        dispatch({ type: "sendFinished", result });
      } catch {
        // The plan couldn't be composed or its code didn't load: no lead went out, so S7 offers the send again.
        widget.reset();
        dispatch({ type: "sendFinished", result: FAILED });
      } finally {
        sending.current = false;
      }
    },
    [state, dispatch, starter],
  );
}
```

- [ ] **Step 5: Write S8 and the plan screen**

`src/features/funnel/flow/screens/Analysing.tsx`:

```tsx
/** (C) S8 (spec §4.3, §11.7): three short lines while the lead is saved. No fake percentage, and no limit on the visitor. */
import { useEffect, useState } from "react";
import { copy } from "@/features/funnel/data/light";
import { teamOptions } from "../options";
import { S8_LINE_AT_MS, s8LineAt, s8Lines } from "../send";
import { problemTextFrom } from "../words";
import type { ScreenProps } from "./types";

export function Analysing({ state, env }: ScreenProps) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const timers = S8_LINE_AT_MS.slice(1).map((at) => setTimeout(() => setShown(s8LineAt(at)), at));
    return () => timers.forEach(clearTimeout);
  }, []);

  const { answers } = state;
  const teamLabel = teamOptions().find((option) => option.id === answers.teamBand)?.label ?? "";
  const lines = s8Lines({ problemText: problemTextFrom(answers.problemText, env.starter), chips: answers.chips, teamBand: answers.teamBand, teamLabel });
  const line = lines[Math.min(shown, lines.length - 1)];

  return (
    <section className="f-screen f-s8" tabIndex={-1} data-question="" aria-live="polite">
      <p>
        <span key={shown}>{copy(line.id, line.vars)}</span>
      </p>
    </section>
  );
}
```

`src/features/funnel/flow/screens/Plan.tsx`:

```tsx
/** (C) S9 (spec §6; index §1.3): lane C's PlanPage at "/", with what the questions gathered; and S5's prefetch. */
import { Component, Suspense, useEffect, type ReactNode } from "react";
import { copy } from "@/features/funnel/data/light";
import { LazyHeroPicturePrefetch, LazyPlanPage } from "../plan-chunk";
import { problemTextFrom } from "../words";
import type { ScreenProps } from "./types";

/** If the plan's code can't load, g.error shows in its place (§10) instead of a blank page. */
class PlanBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Mounts together with PlanPage once its code has loaded: the plan has painted (§9's time to plan). */
function Painted({ onPaint }: { onPaint(): void }) {
  useEffect(() => {
    onPaint();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the plan paints
  }, []);
  return null;
}

export function PlanScreen({ state, edit, env }: ScreenProps) {
  if (!state.plan || !state.visitor) return null;
  const words = { problemText: problemTextFrom(state.answers.problemText, env.starter), chips: state.answers.chips };
  return (
    <div className="f-plan" tabIndex={-1} data-question="">
      <PlanBoundary fallback={<p className="f-err" role="alert">{copy("g.error")}</p>}>
        <Suspense fallback={null}>
          <LazyPlanPage
            plan={state.plan}
            visitor={state.visitor}
            words={words}
            saveNotice={state.saveNotice}
            onProgress={(fields) => edit({ type: "progress", fields })}
          />
          <Painted onPaint={() => edit({ type: "planShown", seconds: Math.round((performance.now() - env.boot.t0) / 1_000) })} />
        </Suspense>
      </PlanBoundary>
    </div>
  );
}

/** From S5 until the plan: the hero still, out of sight (§6.6). A prefetch that fails shows nothing. */
export function PlanPrefetch() {
  return (
    <PlanBoundary fallback={null}>
      <Suspense fallback={null}>
        <LazyHeroPicturePrefetch />
      </Suspense>
    </PlanBoundary>
  );
}
```

- [ ] **Step 6: Register both screens, and wire the send into FunnelRoot**

In `src/features/funnel/flow/screens/index.ts`, add the two imports and entries. The comment's task list is now done, so it becomes `/** (C) Which component shows each screen. */`:

```ts
import { Analysing } from "./Analysing";
import { PlanScreen } from "./Plan";
// …
  s7: ContactForm,
  s8: Analysing,
  plan: PlanScreen,
```

In `FunnelRoot.tsx`:
1. Add `useEffect` to the `react` import.
2. Add these imports:

   ```tsx
   import { prefetchPlan } from "./plan-chunk";
   import { PlanPrefetch } from "./screens/Plan";
   import { setCtaReporter, setStage } from "./session";
   import { useLeadSend } from "./useLeadSend";
   import { rotateVisit, startVisit } from "./visit-id";
   ```

3. Below `useFlowHistory(state.nav, state.screen, onPop);`, add:

   ```tsx
     const send = useLeadSend(state, dispatch, starter);
     const [warm, setWarm] = useState(false);
     useEffect(() => {
       startVisit();  // a reload after a send starts a new visit (§4.1)
       setCtaReporter((from) => dispatch({ type: "progress", fields: { ctaFrom: from, ctaClicked: true } }));
       return () => {
         setCtaReporter(null);
         setStage("questions");
       };
     }, []);
     const stage = funnelStageOf(state);
     useEffect(() => {
       setStage(stage);  // the header's links show at S9 only (D6, §6.2)
     }, [stage]);
     useEffect(() => {
       if (state.round > 0) rotateVisit();  // leaving the plan: sending again is a new visit (§4.1)
     }, [state.round]);
     useEffect(() => {
       if (state.screen !== "s5") return;
       prefetchPlan();  // the plan's code loads during S5 to S8 (§13.1)
       setWarm(true);   // and the hero still S9 shows (§6.6)
     }, [state.screen]);
   ```

4. In `env`, replace `send: () => undefined,` with `send,`.
5. In the returned `<div>`, add the prefetch after the note:

   ```tsx
         {NOTE_ON.has(state.screen) && <FlowNote />}
         {warm && state.screen !== "plan" && <PlanPrefetch />}
   ```

The three screen tests that pass S5 would now load lane C's real plan chunk. Add this mock to `screens/YearsTeam.test.tsx`, `screens/Revenue.test.tsx` and `screens/Problem.test.tsx`, under their data mock:

```ts
vi.mock("../plan-chunk", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../plan-chunk")>()),
  prefetchPlan: vi.fn(),
  LazyHeroPicturePrefetch: () => null,
}));
```

- [ ] **Step 7: Run the flow tests and the build**

```bash
npx vitest run src/features/funnel/flow
npm run typecheck
npm run build
ls dist/assets | grep -E "^(PlanPage|HeroPicture)-"
```

Expected: PASS. `typecheck` and the build exit 0, and `ls` lists a `PlanPage-*.js` chunk, which lane D's budget check measures (request 11). `HeroPicture` may share that chunk or have its own.

- [ ] **Step 8: Commit, and tell lane D**

```bash
git add src/features/funnel/flow/plan-chunk.ts src/features/funnel/flow/session.ts src/features/funnel/flow/session.test.ts \
  src/features/funnel/flow/useLeadSend.ts src/features/funnel/flow/send-flow.test.tsx src/features/funnel/flow/screens/Analysing.tsx \
  src/features/funnel/flow/screens/Plan.tsx src/features/funnel/flow/screens/index.ts src/features/funnel/flow/FunnelRoot.tsx \
  src/features/funnel/flow/screens/YearsTeam.test.tsx src/features/funnel/flow/screens/Revenue.test.tsx \
  src/features/funnel/flow/screens/Problem.test.tsx
git commit -m "feat(funnel): send S7 under the retry rule, play S8, open the plan and complete funnelSession"
```

Push, then tell the manager that `funnelSession` is complete on the branch for lane D's header and nav pill (index §2.2, day 4).

### Task 14: The background saves to `/visit`

**Files:**
- Modify: `src/features/funnel/flow/visit.ts` (add the fields each save carries), `src/features/funnel/flow/FunnelRoot.tsx`
- Create: `src/features/funnel/flow/useVisitSaves.ts`
- Test: `src/features/funnel/flow/visit-fields.test.ts`, `src/features/funnel/flow/visit-saves.test.tsx`

**Interfaces:**
- Consumes:
  - `NOTICE_VERSION`, `LIMITS`, `VISIT_FIELD_KEYS` and the types `VisitFields`, `StepId`, `DeviceClass`;
  - Task 2's `Boot`; Task 4's `FlowState`, `STEP_OF`; Task 8's `localTimeZone`; Task 10's `problemTextFrom`, `inputModeOf`;
  - Task 11's `postVisit`, `markStep`.
- Produces:

```ts
// visit.ts, added
export const S1_SHOWN_MS = 1_400;  // S1 has risen under the greeting (flow.css: 900 ms delay + 450 ms)
export interface LandingWindow {
  location: Pick<Location, "pathname" | "search" | "host">;
  document: Pick<Document, "referrer">;
  navigator: Pick<Navigator, "languages" | "language" | "webdriver">;
  innerWidth: number;
}
export function deviceClassFor(width: number): DeviceClass;
export function landingFields(win: LandingWindow, boot: Boot, timeZone: string | null): VisitFields;
export function stepOf(state: FlowState, introDone: boolean): StepId;
export function answerFields(state: FlowState, starter: string): Omit<VisitFields, "noticeVersion">;
// useVisitSaves.ts
export function useVisitSaves(state: FlowState, env: { boot: Boot; starter: string; timeZone: string | null; introOffsetMs: number }): { country: string | null };
```

**What a save carries, and when** (§9, §10; index §1.2):
- One save whenever the step or an answer changes. Each one carries the landing context and every answer so far, so a dropped save loses nothing. Typing never saves, because typed words are never in the fields (D13).
- The step:
  - `S0` from the first paint;
  - `S1` once it has risen under the greeting, 1.4 s after first paint, or at once when the page painted long before the code arrived;
  - `S4` once S3 + S4's team row is forward;
  - otherwise `STEP_OF`.
- The landing context:
  - `landingPath` (no query string);
  - `referrerHost`, only when it's another site;
  - `utm`, with only the keys present;
  - `timezone`, `locale` (`navigator.languages[0]`), `dayPart`, `theme`, `deviceClass`;
  - `webdriver`, only when it's true. Playwright's browsers set it, so e2e visits are flagged as bots, as they should be.
  - Every string is clipped to its `LIMITS`.
  - `entryIntent` is phase 3's search pages. `isReturning` is phase 2's return visit (§9), and its column defaults to false. Neither is sent.
- `chips` and `inputMode` go once S6's "That's it" is tapped. The plan's fields go from S8. `matchedPhrases` are derived from typed words, so they travel only in `/lead`.
- The first answer's `country` picks S5's currency and S7's dial code (§4.4, §5.3). Until then the clock decides.

- [ ] **Step 1: Write the failing tests**

`src/features/funnel/flow/visit-fields.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  AGENT_IDS, BUCKETS, CONTACT_ERRORS, DEPARTMENTS, LIMITS, VISIT_FIELD_KEYS, type VisitFields,
} from "@/features/funnel/data/light";
import { PRERENDER_BOOT } from "./boot";
import { initialFlow, reduce, type FlowAction } from "./state";
import { FAKE_PLAN } from "./test/fake-data";
import { answerFields, deviceClassFor, landingFields, stepOf, type LandingWindow } from "./visit";

const STARTER = "Honestly, I'm struggling with ___ because ___.";
const run = (...actions: FlowAction[]) => actions.reduce(reduce, initialFlow(STARTER));
const TYPED = ["Printing press", "Leads go cold after the site visit", "Ananya", "ananya@example.com", "+919876543210"];
const THROUGH_S7: FlowAction[] = [
  { type: "segment", value: "business" },
  { type: "business", value: "other" },
  { type: "businessOther", text: TYPED[0] },
  { type: "businessOtherDone" },
  { type: "years", value: "5_10" },
  { type: "team", value: "6_20" },
  { type: "revenue", value: "band_3", currency: "INR" },
  { type: "problemText", text: TYPED[1] },
  { type: "chip", value: "leads" },
  { type: "problemDone", hasWords: true },
  { type: "contact", patch: { name: TYPED[2], email: TYPED[3], phone: TYPED[4], consent: true } },
  { type: "contactInvalid", fields: ["phone"] },
];
const AT_PLAN: FlowAction[] = [
  ...THROUGH_S7,
  { type: "sendStarted", visitor: { name: TYPED[2], email: TYPED[3] } },
  { type: "planReady", plan: FAKE_PLAN },
  { type: "sendFinished", result: { to: "plan", notice: null, error: null } },
];

const fakeWindow = (over: { url?: string; referrer?: string; width?: number; webdriver?: boolean } = {}): LandingWindow => {
  const url = new URL(over.url ?? "https://ziiroai.com/");
  return {
    location: { pathname: url.pathname, search: url.search, host: url.host },
    document: { referrer: over.referrer ?? "" },
    navigator: { languages: ["en-IN", "en"], language: "en-IN", webdriver: over.webdriver ?? false },
    innerWidth: over.width ?? 390,
  };
};

describe("landingFields (§9, landing)", () => {
  it("says where the visitor came from, with only the keys that hold something", () => {
    const win = fakeWindow({ url: "https://ziiroai.com/?utm_source=ig&utm_campaign=launch&x=1", referrer: "https://www.instagram.com/p/1/" });
    expect(landingFields(win, PRERENDER_BOOT, "Asia/Kolkata")).toEqual({
      noticeVersion: "2026-10-08", landingPath: "/", referrerHost: "www.instagram.com",
      utm: { source: "ig", campaign: "launch" }, timezone: "Asia/Kolkata", locale: "en-IN",
      dayPart: "afternoon", theme: "light", deviceClass: "mobile",
    });
  });

  it("leaves out its own site as the referrer, and an unknown time zone", () => {
    const fields = landingFields(fakeWindow({ referrer: "https://ziiroai.com/products" }), PRERENDER_BOOT, null);
    expect(fields).not.toHaveProperty("referrerHost");
    expect(fields).not.toHaveProperty("timezone");
    expect(fields).not.toHaveProperty("utm");
  });

  it("clips every string to its limit, and flags an automated browser", () => {
    const long = "x".repeat(500);
    const win = fakeWindow({ url: `https://ziiroai.com/${long}?utm_source=${long}`, webdriver: true });
    const fields = landingFields(win, PRERENDER_BOOT, long);
    expect(fields.landingPath).toHaveLength(LIMITS.landingPathChars);
    expect(fields.utm?.source).toHaveLength(LIMITS.utmChars);
    expect(fields.timezone).toHaveLength(LIMITS.timezoneChars);
    expect(fields.webdriver).toBe(true);
  });

  it("sorts screens by width: phone, tablet, desktop", () => {
    expect([deviceClassFor(390), deviceClassFor(768), deviceClassFor(1023), deviceClassFor(1440)])
      .toEqual(["mobile", "tablet", "tablet", "desktop"]);
  });
});

describe("stepOf (§9, step reached)", () => {
  it("is S0 on the greeting, then S1 once S1 has risen", () => {
    expect(stepOf(run(), false)).toBe("S0");
    expect(stepOf(run(), true)).toBe("S1");
  });

  it("is S4 once the team row is forward, and S9 on the plan", () => {
    const s3 = run({ type: "segment", value: "business" }, { type: "business", value: "interior" });
    expect(stepOf(s3, true)).toBe("S3");
    expect(stepOf(reduce(s3, { type: "years", value: "1_3" }), true)).toBe("S4");
    expect(stepOf(run(...AT_PLAN), true)).toBe("S9");
  });

  it("is S1 again after Back to the first question", () => {
    const back = run({ type: "segment", value: "business" }, { type: "popTo", screen: "s1" });
    expect(stepOf(back, false)).toBe("S1");
  });
});

describe("answerFields (§9, D13)", () => {
  it("never carries a typed word: not the S2 box, the S6 box, the name, the email or the phone", () => {
    const text = JSON.stringify(answerFields(run(...AT_PLAN), STARTER));
    for (const typed of TYPED) expect(text).not.toContain(typed);
    expect(text).not.toContain("gone cold");  // matchedPhrases come from typed words
  });

  it("uses only keys /visit accepts", () => {
    const keys = Object.keys(answerFields(run(...AT_PLAN, { type: "progress", fields: { planDepth: 2, ctaFrom: "hero", ctaClicked: true } }), STARTER));
    expect(keys.every((key) => (VISIT_FIELD_KEYS as readonly string[]).includes(key))).toBe(true);
  });

  it("adds chips and the input mode only once S6's 'That's it' is tapped", () => {
    const before = run(...THROUGH_S7.slice(0, 9));
    expect(answerFields(before, STARTER)).not.toHaveProperty("chips");
    expect(answerFields(run(...THROUGH_S7), STARTER)).toMatchObject({ chips: ["leads"], inputMode: "mixed" });
  });

  it("carries the taps, the contact errors, then the plan and the progress", () => {
    const fields = answerFields(run(...AT_PLAN, { type: "planShown", seconds: 48 }), STARTER);
    expect(fields).toMatchObject({
      segment: "business", businessType: "other", yearsBand: "5_10", teamBand: "6_20", revenueBand: "band_3",
      revenueCurrency: "INR", contactErrors: ["phone"], template: "B", orderVariant: "B-convert", tier: "M",
      agentIds: FAKE_PLAN.agentIds, classifierVersion: "kw-1", agentsVersion: "2026-10-04", secondsToResult: 48,
    });
    expect(fields).not.toHaveProperty("jobIds");
  });
});

describe("the body", () => {
  it("stays under /visit's 4,096 bytes with every field at its longest", () => {
    const long = "x".repeat(500);
    const plan = {
      ...FAKE_PLAN,
      agentIds: AGENT_IDS.slice(0, LIMITS.agentIds),
      bucketScores: Object.fromEntries(BUCKETS.map((bucket) => [bucket, LIMITS.bucketScoreMax])),
    };
    const state = run(
      ...THROUGH_S7.slice(0, 10), ...Array.from({ length: 12 }, () => ({ type: "contactInvalid", fields: ["name", "email", "phone"] }) as FlowAction),
      { type: "sendStarted", visitor: { name: "A", email: "a@b.co" } }, { type: "planReady", plan },
      { type: "sendFinished", result: { to: "plan", notice: null, error: null } }, { type: "planShown", seconds: 86_400 },
      { type: "progress", fields: {
        planDepth: LIMITS.planDepthMax, filmPlayed: true, filmPct: 100, ctaFrom: "close", ctaClicked: true,
        planView: "still", stillReason: "slow_connection", discsOpened: DEPARTMENTS.slice(0, LIMITS.discsOpened),
      } },
    );
    const win = fakeWindow({ url: `https://ziiroai.com/${long}?${["source", "medium", "campaign", "term", "content"].map((k) => `utm_${k}=${long}`).join("&")}`, referrer: `https://${long}.com/`, webdriver: true });
    const fields: VisitFields = { ...landingFields(win, PRERENDER_BOOT, long), ...answerFields(state, STARTER) };
    const body = JSON.stringify({ id: "9f1c2a4e-1b2c-4d5e-8f90-123456789abc", step: "S9", fields });
    expect(new TextEncoder().encode(body).length).toBeLessThanOrEqual(LIMITS.visitBodyBytes);
    expect(fields.contactErrors).toHaveLength(LIMITS.contactErrors);
    expect(CONTACT_ERRORS).toContain(fields.contactErrors?.[0]);
  });
});
```

`src/features/funnel/flow/visit-saves.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { VisitRequest } from "@/features/funnel/data/light";
import { FunnelRoot } from "./FunnelRoot";
import { funnelSession } from "./session";
import { button, click, mount, stubBrowser, stubClock, tap, tapThrough, typeInto, type Mounted } from "./test/dom";

vi.mock("@/features/funnel/data/light", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import("./test/fake-data")).FAKE_DATA,
}));
vi.mock("@/features/funnel/data", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import("./test/fake-data")).FAKE_DATA,
}));
vi.mock("@/features/funnel/plan/PlanPage", async () => {
  const { createElement } = await import("react");
  return { PlanPage: () => createElement("p", { className: "plan-stub" }, "plan") };
});
vi.mock("@/shared/lib/contact-checks", () => ({
  isValidName: (name: string) => /\p{L}/u.test(name),
  isValidEmail: (email: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email),
  toE164: () => null,
}));
vi.mock("./plan-chunk", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./plan-chunk")>()),
  prefetchPlan: vi.fn(),
  LazyHeroPicturePrefetch: () => null,
}));
vi.mock("./region", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./region")>()),
  localTimeZone: () => "Asia/Kolkata",
}));

let country: string | null = "IN";
let failVisits = false;
let saves: VisitRequest[] = [];
let view: Mounted;
const root = () => view.container;
const run = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
const steps = () => saves.map((save) => save.step);
const last = () => saves[saves.length - 1];

function start() {
  view = mount(<MemoryRouter><FunnelRoot /></MemoryRouter>);
}

beforeAll(async () => {
  // As in send-flow.test.tsx: the plan's modules load once, on real timers.
  await import("@/features/funnel/data");
  await import("@/features/funnel/plan/PlanPage");
});

beforeEach(() => {
  stubBrowser();
  stubClock();
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  country = "IN";
  failVisits = false;
  saves = [];
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/funnel/lead") return new Response(JSON.stringify({ success: true, planEmail: "sent" }));
    saves.push(JSON.parse(String(init?.body)) as VisitRequest);
    if (failVisits) throw new TypeError("Failed to fetch");
    return new Response(JSON.stringify({ success: true, country }));
  }));
});
afterEach(() => {
  view.unmount();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("the background saves (§9, §10)", () => {
  it("saves S0 with the landing context at first paint, then S1 once it has risen", async () => {
    start();
    await run(0);
    expect(saves[0]).toMatchObject({ step: "S0", fields: { noticeVersion: "2026-10-08", landingPath: "/", timezone: "Asia/Kolkata" } });
    expect(typeof saves[0].id).toBe("string");
    await run(1_400);
    expect(steps()).toEqual(["S0", "S1"]);
    expect(new Set(saves.map((save) => save.id)).size).toBe(1);
  });

  it("saves each tap with every answer so far", async () => {
    start();
    tapThrough(root(), "I run a business", "Interior design / architecture", "5–10 years");
    await run(0);
    expect(steps()).toEqual(["S0", "S2", "S3", "S4"]);
    expect(last().fields).toMatchObject({ segment: "business", businessType: "interior", yearsBand: "5_10", landingPath: "/" });
  });

  it("never saves while they type, and never sends what they typed (D13)", async () => {
    start();
    tapThrough(root(), "I run a business", "Interior design / architecture", "5–10 years", "6–20", "₹1–5Cr");
    await run(0);
    const before = saves.length;
    typeInto(root().querySelector("textarea"), "Leads go cold after the site visit");
    await run(0);
    expect(saves.length).toBe(before);
    tap(button(root(), "That's it"));
    typeInto(root().querySelector("#f-name"), "Ananya");
    await run(0);
    expect(last()).toMatchObject({ step: "S7", fields: { chips: [], inputMode: "typed" } });
    expect(JSON.stringify(saves)).not.toMatch(/Leads go cold|Ananya/);
  });

  it("lets the first answer's country pick S5's currency and S7's dial code (§4.4, §5.3)", async () => {
    country = "US";
    start();
    await run(0);
    tapThrough(root(), "I run a business", "Interior design / architecture", "5–10 years", "6–20");
    expect(button(root(), "$1–5M")).not.toBeNull();
    tapThrough(root(), "$1–5M");
    typeInto(root().querySelector("textarea"), "Leads go cold");
    tap(button(root(), "That's it"));
    expect(root().querySelector<HTMLInputElement>("#f-phone")?.value).toBe("+1 ");
    expect(last().fields).toMatchObject({ revenueCurrency: "USD" });
  });

  it("keeps the flow moving when a save fails", async () => {
    failVisits = true;
    start();
    await run(0);
    tapThrough(root(), "I run a business");
    await run(0);
    expect(root().querySelector(".f-root")?.getAttribute("data-screen")).toBe("s2");
    expect(steps()).toEqual(["S0", "S2"]);
  });

  it("saves the plan at S8, the time to plan at S9, and a header tap there (§9, D14)", async () => {
    start();
    tapThrough(root(), "I run a business", "Interior design / architecture", "5–10 years", "6–20", "₹1–5Cr");
    typeInto(root().querySelector("textarea"), "Leads go cold");
    tap(button(root(), "That's it"));
    typeInto(root().querySelector("#f-name"), "Ananya");
    typeInto(root().querySelector("#f-email"), "ananya@example.com");
    click(root().querySelector("#f-consent"));
    click(button(root(), "Show me my plan"));
    await run(2_100);
    await run(0);  // the plan's lazy chunk resolves, then it paints
    expect(saves.find((save) => save.step === "S8" && save.fields.template)).toBeDefined();
    expect(last()).toMatchObject({ step: "S9", fields: { template: "B", tier: "M" } });
    expect(typeof last().fields.secondsToResult).toBe("number");
    act(() => funnelSession.reportCta("header"));
    await run(0);
    expect(last().fields).toMatchObject({ ctaFrom: "header", ctaClicked: true });
  });

  it("saves a new visit after Back from the plan (§4.1)", async () => {
    start();
    tapThrough(root(), "I run a business", "Interior design / architecture", "5–10 years", "6–20", "₹1–5Cr");
    typeInto(root().querySelector("textarea"), "Leads go cold");
    tap(button(root(), "That's it"));
    typeInto(root().querySelector("#f-name"), "Ananya");
    typeInto(root().querySelector("#f-email"), "ananya@example.com");
    click(root().querySelector("#f-consent"));
    click(button(root(), "Show me my plan"));
    await run(2_100);
    await run(0);
    const firstId = last().id;
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: { funnel: "s6" } }));
    });
    await run(0);
    expect(last()).toMatchObject({ step: "S6" });
    expect(last().id).not.toBe(firstId);
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run src/features/funnel/flow/visit-fields.test.ts src/features/funnel/flow/visit-saves.test.tsx`
Expected: FAIL. `visit-fields.test.ts` fails with `landingFields is not a function` (or the same for `answerFields`), and `visit-saves.test.tsx` because no save is ever sent (`expected [] to deep equal [ 'S0', 'S1' ]`).

- [ ] **Step 3: Add the save's fields to `src/features/funnel/flow/visit.ts`**

Replace its import line with these:

```ts
import {
  LIMITS, NOTICE_VERSION, type DeviceClass, type StepId, type Utm, type VisitFields, type VisitRequest, type VisitResponse,
} from "@/features/funnel/data/light";
import type { Boot } from "./boot";
import { STEP_OF, type FlowState } from "./state";
import { inputModeOf, problemTextFrom } from "./words";
```

Then add below `postVisit`:

```ts
/** S1 has risen under the greeting by now (flow.css: f-rise starts at 900 ms and lasts 450 ms). */
export const S1_SHOWN_MS = 1_400;
const UTM_KEYS = ["source", "medium", "campaign", "term", "content"] as const;

/** The parts of window a landing reads; a plain object in tests. */
export interface LandingWindow {
  location: Pick<Location, "pathname" | "search" | "host">;
  document: Pick<Document, "referrer">;
  navigator: Pick<Navigator, "languages" | "language" | "webdriver">;
  innerWidth: number;
}

const clip = (text: string, max: number) => text.slice(0, max);

/** The answers' keys that hold something: a null answer leaves its column alone. */
type Present<T> = { [K in keyof T]?: Exclude<T[K], null> };
function present<T extends object>(values: T): Present<T> {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== null)) as Present<T>;
}

export function deviceClassFor(width: number): DeviceClass {
  if (width < 768) return "mobile";
  return width < 1024 ? "tablet" : "desktop";
}

function referrerHostOf(referrer: string, ownHost: string): string | null {
  try {
    const { host } = new URL(referrer);
    return host && host !== ownHost ? host : null;
  } catch {
    return null;  // no referrer, or not a URL
  }
}

function utmOf(search: string): Utm | null {
  const params = new URLSearchParams(search);
  const entries = UTM_KEYS.flatMap((key) => {
    const value = params.get(`utm_${key}`);
    return value ? [[key, clip(value, LIMITS.utmChars)] as const] : [];
  });
  return entries.length ? Object.fromEntries(entries) : null;
}

/** Where the visitor came from (§9, landing). Every save carries it, from the first one on. */
export function landingFields(win: LandingWindow, boot: Boot, timeZone: string | null): VisitFields {
  const referrerHost = referrerHostOf(win.document.referrer, win.location.host);
  const utm = utmOf(win.location.search);
  const locale = win.navigator.languages?.[0] ?? win.navigator.language;
  return {
    noticeVersion: NOTICE_VERSION,
    landingPath: clip(win.location.pathname, LIMITS.landingPathChars),
    ...(referrerHost ? { referrerHost: clip(referrerHost, LIMITS.referrerHostChars) } : {}),
    ...(utm ? { utm } : {}),
    ...(timeZone ? { timezone: clip(timeZone, LIMITS.timezoneChars) } : {}),
    ...(locale ? { locale: clip(locale, LIMITS.localeChars) } : {}),
    dayPart: boot.dayPart,
    theme: boot.theme,
    deviceClass: deviceClassFor(win.innerWidth),
    ...(win.navigator.webdriver ? { webdriver: true } : {}),
  };
}

/** The step a save reports (§9): S0 on the greeting until S1 has risen, and S4 once the team row is forward. */
export function stepOf(state: FlowState, introDone: boolean): StepId {
  if (state.screen === "s1" && state.nav.seq === 0 && !introDone) return "S0";
  if (state.screen === "s34" && state.teamRowForward) return "S4";
  return STEP_OF[state.screen];
}

/** Every answer so far, as IDs and counts (§9). Never a typed word (D13), so typing never changes it. */
export function answerFields(state: FlowState, starter: string): Omit<VisitFields, "noticeVersion"> {
  const { answers, plan } = state;
  return {
    ...present({
      segment: answers.segment, nonOwnerReason: answers.nonOwnerReason, businessType: answers.businessType,
      yearsBand: answers.yearsBand, teamBand: answers.teamBand, revenueBand: answers.revenueBand,
      revenueCurrency: answers.revenueCurrency,
    }),
    ...(state.problemDone
      ? { chips: [...answers.chips], inputMode: inputModeOf(problemTextFrom(answers.problemText, starter), answers.chips) }
      : {}),
    ...(plan
      ? {
          bucketPrimary: plan.bucketPrimary, bucketSecondary: plan.bucketSecondary, bucketScores: plan.bucketScores,
          template: plan.template, orderVariant: plan.orderVariant, tier: plan.tier, agentIds: [...plan.agentIds],
          classifierVersion: plan.classifierVersion, agentsVersion: plan.agentsVersion,
        }
      : {}),
    ...(state.contactErrors.length ? { contactErrors: [...state.contactErrors] } : {}),
    ...(state.secondsToResult !== null ? { secondsToResult: state.secondsToResult } : {}),
    ...state.progress,
  };
}
```

`state.ts` imports nothing from `visit.ts`, so the new import makes no cycle.

- [ ] **Step 4: Write `src/features/funnel/flow/useVisitSaves.ts`**

```ts
/**
 * (C) The background saves (spec §9, §10): one /visit post whenever the step or an answer changes, never waited on.
 * Each carries the landing context and every answer so far, so a dropped save loses nothing (index §1.2).
 */
import { useEffect, useRef, useState } from "react";
import type { VisitFields } from "@/features/funnel/data/light";
import type { Boot } from "./boot";
import type { FlowState } from "./state";
import { S1_SHOWN_MS, answerFields, landingFields, postVisit, stepOf } from "./visit";
import { markStep } from "./visit-id";

interface SaveEnv {
  boot: Boot;
  starter: string;
  timeZone: string | null;
  introOffsetMs: number;  // minus the time since first paint (Task 2)
}

export function useVisitSaves(state: FlowState, env: SaveEnv): { country: string | null } {
  const [country, setCountry] = useState<string | null>(null);
  const [introDone, setIntroDone] = useState(false);
  const landing = useRef<VisitFields | null>(null);

  useEffect(() => {
    // S1 rises under the greeting. If the page painted long before this code ran, it already has.
    const timer = setTimeout(() => setIntroDone(true), Math.max(0, S1_SHOWN_MS + env.introOffsetMs));
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, timed from first paint
  }, []);

  const step = stepOf(state, introDone);
  const fields = answerFields(state, env.starter);
  const key = JSON.stringify([state.round, step, fields]);

  useEffect(() => {
    landing.current ??= landingFields(window, env.boot, env.timeZone);
    const visit = markStep(step);
    void postVisit({ id: visit.id, step, fields: { ...landing.current, ...fields } }).then((answer) => {
      if (answer?.success && answer.country) setCountry(answer.country);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the key holds the round, the step and the fields
  }, [key]);

  return { country };
}
```

- [ ] **Step 5: Wire the saves into `FunnelRoot.tsx`**

1. Add `import { useVisitSaves } from "./useVisitSaves";`.
2. Below the S5 effect Task 13 added, so the visit is started and rotated before a save reads it, add:

   ```tsx
     const { country } = useVisitSaves(state, { boot, starter, timeZone, introOffsetMs: introOffset });
   ```

3. In `env`, replace `country: null,` with `country,`.

- [ ] **Step 6: Run the tests, the type check and the build**

```bash
npx vitest run src/features/funnel/flow
npm run typecheck
npm run build
```

Expected: PASS, with Tasks 5–13's tests unchanged. `typecheck` and the build exit 0.

- [ ] **Step 7: Commit and push**

```bash
git add src/features/funnel/flow/visit.ts src/features/funnel/flow/useVisitSaves.ts src/features/funnel/flow/FunnelRoot.tsx \
  src/features/funnel/flow/visit-fields.test.ts src/features/funnel/flow/visit-saves.test.tsx
git commit -m "feat(funnel): save each step to /visit in the background"
git pull --rebase && npm test && git push
```

- [ ] **Step 8: Check the saves on the Preview**

Wait for the push's Vercel Preview, and open it with DevTools' Network panel. Tap to S6 and type a few words. Expected:
- a `/api/funnel/visit` post for S0, S1 (after about a second), S2, S3, S4, S5 and S6, each answered `200 {"success":true,"country":"IN"}` (or your country);
- no post while you type;
- no typed word in any request body.

### Task 15: The questions in a browser

**Files:**
- Create: `tests/e2e/support/questions.ts`, `tests/e2e/questions.spec.ts`

**Interfaces:**
- Consumes lane D's Task 1 (day 3):
  - `playwright.config.ts`: the `phone` (390 × 844) and `desktop` (1440 × 900) projects, `timezoneId: "Asia/Kolkata"`, `locale: "en-IN"`, and `vite preview` on the production build;
  - `tests/e2e/fixtures.ts`: `test`, `expect`, and the automatic `funnelApi` fixture (`visits`, `leads`, `answerLeadWith(answers)`), which mocks `/api/funnel/*` (`/visit` answers `country: "IN"`).
- Produces `tests/e2e/support/questions.ts`, for Tasks 16 and 17. I-T2 and lane D's specs can use it too (`requests.md`):

```ts
export const TAP_PACE_MS = 400;
export async function atHour(page: Page, hour: number): Promise<void>;          // before page.goto
export async function tapThrough(page: Page, ...names: string[]): Promise<void>;
export const ANANYA_WORDS: string;
export async function answerAsAnanya(page: Page): Promise<void>;                 // S1 to S7, as index I-T2
export async function fillContact(page: Page): Promise<void>;
export async function sendContact(page: Page): Promise<void>;
export async function expectPlan(page: Page): Promise<void>;
```

**A person's pace.** The questions ignore a tap for 350 ms after each step, which is the double-tap guard (Review Focus 2). Playwright clicks the next screen's button within about 300 ms, so `tapThrough` waits 400 ms before each tap, a quick person's pace. Every spec that taps through the questions has to do the same, and `requests.md` tells I-T2 and lane D.

**The spam check.** The build under test has no `VITE_TURNSTILE_SITE_KEY`, which is lane D's CI build, so the token is empty at once. If your `.env` has a key, build with `VITE_TURNSTILE_SITE_KEY= npm run build` first.

Every spec runs in both projects, so each test runs at both sizes (§12).

- [ ] **Step 1: Write the helpers, `tests/e2e/support/questions.ts`**

```ts
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

/** Lane C's plan is on screen at "/". S8 may hold up to LEAD_TIMEOUT_MS. */
export async function expectPlan(page: Page): Promise<void> {
  await expect(page.locator(".f-root")).toHaveAttribute("data-screen", "plan", { timeout: 12_000 });
}
```

- [ ] **Step 2: Write the spec, `tests/e2e/questions.spec.ts`**

```ts
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
```

- [ ] **Step 3: Build, then run it**

```bash
npm run build
npx playwright test tests/e2e/questions.spec.ts
```

Expected: 12 tests × 2 projects = 24 passed. If one fails, open its trace with `npx playwright show-trace test-results/<test>/trace.zip`. A failure in the theme, the greeting or the early tap points at Tasks 1–3. Back points at Task 6, and the double tap at Tasks 4 and 7.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/support/questions.ts tests/e2e/questions.spec.ts
git commit -m "test(funnel): drive the questions in a browser at both sizes"
```

### Task 16: S7's sends in a browser

**Files:**
- Create: `tests/e2e/questions-send.spec.ts`

**Interfaces:**
- Consumes: Task 15's helpers; lane D's `funnelApi.answerLeadWith(answers)`, where an answer is `{ status, body?, delayMs? }` or `"no-answer"` (held 12 s, past `LEAD_TIMEOUT_MS`, then dropped); the real `contact-checks.ts` (lane B); lane C's `PlanPage`, which shows `sp.save.fail` or `sp.save.unsure` at the top.
- Produces: nothing new. This is index §1.3's `/lead` table, row by row, in a real browser (§10, D18).

- [ ] **Step 1: Write the spec, `tests/e2e/questions-send.spec.ts`**

```ts
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
  await expect(page.locator(".f-root")).toHaveAttribute("data-screen", "s7", { timeout: 12_000 });
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

test("no answer twice: S8 holds 8 s, S7 with g.error, then the plan with sp.save.unsure", async ({ page, funnelApi }) => {
  test.setTimeout(40_000);
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
```

`expectPlan` and `expectBackAtS7` wait up to 12 s, which covers S8's 8 s hold.

- [ ] **Step 2: Run it**

```bash
npm run build
npx playwright test tests/e2e/questions-send.spec.ts
```

Expected: 8 tests × 2 projects = 16 passed, in about a minute. The two no-answer tests take about 17 s each. A wrong screen or line after a send points at Task 11's `afterSend` and Task 13's `useLeadSend`. A missing field after a failed send points at Task 5's S7 slot.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/questions-send.spec.ts
git commit -m "test(funnel): every S7 send outcome in a browser (§10, D18)"
```

### Task 17: Access, the real copy, and the last checks

**Files:**
- Create: `tests/e2e/questions-a11y.spec.ts`, `src/features/funnel/flow/copy-ids.test.ts`

**Interfaces:**
- Consumes: Task 15's helpers; `@axe-core/playwright`; the real light entry (`COPY_LINES`, `copy`) and the option ID lists; Task 4's option builders and `LINES`.
- Produces: nothing new. Some of §11 and §13.10 is already lane D's, so this task doesn't repeat it:
  - `ananya-plan.spec.ts` (lane D, Task 14) runs axe on Ananya's screens (S0 + S1, S3 + S4, S5, S6, S7, S8 and S9) in both themes.
  - `check:build` (lane D) holds the funnel chunk to 25 KB gz and checks `/` without JavaScript.
  - So this task runs axe on the screens that pass never reaches, checks the keyboard, and checks every copy ID against lane C's real copy.

- [ ] **Step 1: Write the access spec, `tests/e2e/questions-a11y.spec.ts`**

```ts
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { TAP_PACE_MS, atHour, fillContact, sendContact, tapThrough } from "./support/questions";

/** §11: WCAG 2.2 AA. Lane D's ananya-plan.spec.ts covers Ananya's own screens; these are the others. */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const TO_S6 = ["I run a business", "Clinic / healthcare", "3–5 years", "2–5", "₹1–5Cr"];

async function axe(page: Page, screen: string) {
  const { violations } = await new AxeBuilder({ page }).include(".f-root").withTags(TAGS).analyze();
  expect(violations.map((v) => `${screen}: ${v.id} at ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

for (const [theme, hour] of [["light", 10], ["dark", 22]] as const) {
  test.describe(`the screens off Ananya's path, ${theme} (§11)`, () => {
    test.beforeEach(async ({ page }) => {
      await atHour(page, hour);
      await page.emulateMedia({ reducedMotion: "reduce" });  // axe reads the settled colours, never a fade
      await page.goto("/");
    });

    test("S1b and its closing line", async ({ page }) => {
      await tapThrough(page, "Student, or just curious");
      await axe(page, "S1b");
      await tapThrough(page, "Saw a reel or a post");
      await axe(page, "S1b done");
    });

    test("S2, and S2 with its Other box open", async ({ page }) => {
      await tapThrough(page, "I run a business");
      await axe(page, "S2");
      await tapThrough(page, "Other");
      await expect(page.locator("#f-s2-other-text")).toBeVisible();
      await axe(page, "S2 Other");
    });

    test("S6 asking for something, and S6 at three chips", async ({ page }) => {
      await tapThrough(page, ...TO_S6, "That's it");
      await expect(page.getByText("Give me something to work with: a few words, a chip, anything.")).toBeVisible();
      await axe(page, "S6 empty");
      await tapThrough(page, "Not enough leads", "Ads burn money", "Team chaos", "Customer support");
      await expect(page.getByText("Three's plenty. Untap one to swap.")).toBeVisible();
      await axe(page, "S6 three chips");
    });

    test("S7 with every field's error, and S7 after a failed spam check", async ({ page, funnelApi }) => {
      funnelApi.answerLeadWith([{ status: 403, body: { success: false } }]);
      await tapThrough(page, ...TO_S6, "Payments get stuck", "That's it");
      await sendContact(page);
      await expect(page.getByText("What should I call you?")).toBeVisible();
      await axe(page, "S7 errors");
      await fillContact(page);
      await sendContact(page);
      await expect(page.getByText("The spam check didn't go through. Mind trying once more?")).toBeVisible({ timeout: 12_000 });
      await axe(page, "S7 bot");
    });
  });
}

test("answers with the keyboard alone, with focus on each new question (§11)", async ({ page }) => {
  const enter = async () => {
    await page.waitForTimeout(TAP_PACE_MS);
    await page.keyboard.press("Enter");
  };
  await page.goto("/");
  await page.getByRole("button", { name: "I run a business" }).focus();
  await enter();
  await expect(page.getByRole("heading", { name: "What kind of business?" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Interior design / architecture" })).toBeFocused();
  await enter();
  await expect(page.getByRole("heading", { name: "How long have you been at it?" })).toBeFocused();
  await page.keyboard.press("Tab");
  await enter();
  await expect(page.getByRole("heading", { name: "How big is the team?" })).toBeFocused();
  await page.keyboard.press("Tab");
  await enter();
  await expect(page.getByRole("heading", { name: "Roughly, what does it make in a year?" })).toBeFocused();
});
```

- [ ] **Step 2: Write the copy check, `src/features/funnel/flow/copy-ids.test.ts`**

```ts
/**
 * (C) Every copy ID the questions show is in lane C's copy, and the test lines match it word for word.
 * No mocks: this reads the real light entry (index §1.5).
 */
import { describe, expect, it } from "vitest";
import {
  BUSINESS_TYPES, CHIPS, COPY_LINES, NON_OWNER_REASONS, REVENUE_BANDS, SEGMENTS, TEAM_BANDS, YEARS_BANDS, copy,
} from "@/features/funnel/data/light";
import { businessOptions, chipOptions, nonOwnerOptions, revenueOptions, segmentOptions, teamOptions, yearsOptions } from "./options";
import { LINES } from "./test/fake-data";

const SOURCES = import.meta.glob<string>(["./**/*.{ts,tsx}", "!./**/*.test.{ts,tsx}", "!./test/**"], {
  query: "?raw",
  import: "default",
  eager: true,
});
const LITERAL_IDS = new Set(
  Object.values(SOURCES).flatMap((source) => [...source.matchAll(/copy\("([A-Za-z0-9.]+)"/g)].map((match) => match[1])),
);
/** IDs the code builds at run time, so no literal names them. */
const BUILT_IDS = [
  "s0.sub.early", "s0.sub.day", "s0.sub.late",
  ...[1, 2, 3, 4, 5].flatMap((i) => [`s1.o${i}`, `s1b.o${i}`]),
  "s2.o", "s3.o", "s4.o", "s5.o.IN", "s5.o.other", "s6.chips",
  "s7.err.name", "s7.err.email", "s7.err.phone", "s7.err.consent", "s7.err.bot",
  "s8.l1", "s8.l1.chips", "s8.l2", "s8.l3", "s8.l3.one",
];

describe("the questions' copy (index §1.3, §1.5)", () => {
  it("finds the copy() calls in the flow's code", () => {
    expect(LITERAL_IDS.size).toBeGreaterThan(30);
    expect([...LITERAL_IDS]).toEqual(expect.arrayContaining(["s1.q", "g.footer", "s6.text", "s7.btn"]));
  });

  it.each([...new Set([...LITERAL_IDS, ...BUILT_IDS])].sort())("%s is in lane C's copy", (id) => {
    expect(COPY_LINES).toHaveProperty([id]);
  });

  it.each(Object.entries(LINES))("the test line %s matches lane C's copy word for word", (id, line) => {
    expect(COPY_LINES[id]).toBe(line);
  });

  it("fills the placeholders the questions use", () => {
    expect(copy("g.progress", { n: 1, total: 6 })).toBe("Step 1 of 6");
    expect(copy("s8.l3", { team: "6–20" })).toBe("Sizing it for a team of 6–20…");
  });

  it("gives every option list one label per option", () => {
    expect(segmentOptions()).toHaveLength(SEGMENTS.length);
    expect(nonOwnerOptions()).toHaveLength(NON_OWNER_REASONS.length);
    expect(businessOptions()).toHaveLength(BUSINESS_TYPES.length);
    expect(yearsOptions()).toHaveLength(YEARS_BANDS.length);
    expect(teamOptions()).toHaveLength(TEAM_BANDS.length);
    expect(chipOptions()).toHaveLength(CHIPS.length);
    expect(revenueOptions("INR")).toHaveLength(REVENUE_BANDS.length);
    expect(revenueOptions("USD")).toHaveLength(REVENUE_BANDS.length);
  });
});
```

A line that differs from `LINES` is a real disagreement. `copy.md` decides which side is wrong: lane C's data, or this plan's `LINES`.

- [ ] **Step 3: Run both, and the coverage of the flow**

```bash
npx vitest run src/features/funnel/flow/copy-ids.test.ts
npm run build
npx playwright test tests/e2e/questions-a11y.spec.ts
npx vitest run --coverage --coverage.include="src/features/funnel/flow/**"
```

Expected:
- `copy-ids.test.ts` passes.
- 9 tests × 2 projects = 18 Playwright passes, with no axe violation listed.
- Coverage shows "All files" at 80 % lines or more (§12).

An axe failure names the screen and the element. Colour contrast goes back to Task 1's tokens, and a missing name to the screen's task.

- [ ] **Step 4: Run every gate the branch has**

```bash
npm test
npm run typecheck
npm run build
npm run check:build
npm run test:e2e
```

Expected: all five exit 0. `check:build` includes lane D's §13.10 budgets, among them the funnel chunk at 25 KB gz or less with no job name or phrase-list entry in it, and the prerendered `/` checks.

- [ ] **Step 5: Commit, push, and report**

```bash
git add tests/e2e/questions-a11y.spec.ts src/features/funnel/flow/copy-ids.test.ts
git commit -m "test(funnel): axe off Ananya's path, the keyboard, and every copy ID the questions use"
git pull --rebase && npm test && git push
```

Tell the manager that lane A is done on the branch and ready for I-T1 to I-T4 (index §2.1, day 6).

---

## Dependencies

**What lane A waits on**, and what each task does until it lands (index §2.2):

| Task | Needs | From | Lands | Until then |
|---|---|---|---|---|
| all | the branch, `contract.ts`, `light.ts` and `index.ts` as re-exports, the test tools | phase 0, P0-T4 | day 1 morning | nothing starts |
| 4–17 | `copy` and `COPY_LINES` in `light.ts` | lane C | day 2 morning | the light-entry mock with `FAKE_DATA`; commits stay local |
| 8 | `currencyFor` in `light.ts` | lane C | day 2 | the mock's `fakeCurrencyFor` |
| 12 | `contact-checks.ts` | lane B, Task 1 | day 1 | `vi.mock("@/shared/lib/contact-checks")` |
| 13 | `composePlan` in `index.ts` | lane C | day 3 morning | the full-entry mock |
| 13 | `PlanPage`; `HeroPicturePrefetch` | lane C; its Task 12 | day 3 | the `PlanPage` mock and the `plan-chunk` mock |
| 14 | `/api/funnel/visit` on the Preview | lane B | day 2 | fetch stubs. Step 8's check on the Preview needs it |
| 13 | `/api/funnel/lead` on the Preview | lane B | day 4 | fetch stubs |
| 15–17 | `playwright.config.ts`, `tests/e2e/fixtures.ts` and `check:build` | lane D, Tasks 1 and 13 | day 3 | write the specs, and run them once it lands |

**Who waits on lane A:**

| Who | What | Lands |
|---|---|---|
| lane C's plan page | the `--funnel-*` colours, with the two title colours | day 1, Task 1 |
| lane D's header | the `funnelSession` stub | day 1, Task 1 |
| lane D's Index swap | `FunnelRoot` | day 2 morning, Tasks 4 and 5, pushed with lane C's copy |
| lane D's nav pill | `funnelSession`, complete | day 4, Task 13 |
| I-T1 to I-T4 | the whole lane | end of day 5, Task 17 |

## Requests filed

Appended to `.team/ziiro-fleet/requests.md` with this plan:

```
worker-1 -> worker-4: I-T2's getByLabel("Email") also matches the S7 consent box (its label says "email me"); it needs getByLabel("Email", { exact: true }).
worker-1 -> worker-4: I-T2 clicks options back to back, but the questions ignore a tap for 350 ms after each step (lane A's double-tap guard, Review Focus 2); wait 400 ms before each option or "That's it" click, or use tapThrough from tests/e2e/support/questions.ts (lane A, Task 15).
worker-1 -> worker-2: the same 350 ms guard applies to lane D's specs that tap through the questions (ananya-plan, the nav pill, first-screen); wait 400 ms before each tap, or use tapThrough from tests/e2e/support/questions.ts (lane A, Task 15).
```

## Self-review

**Spec coverage.** Each part of the spec that lane A builds, and the tasks that build and test it:

| Spec | What | Tasks |
|---|---|---|
| §4.1 | One URL; Back and Forward; a tap moves on within 250 ms; real buttons; nothing waits on the network; reduced motion; the header shows only the logo; a reload starts again (D8: the state lives in memory) | 1, 4, 5, 6, 13, 15 |
| §4.2, D4, D9 | The greeting, the day-parts, the second line, the theme, the Hindi row | 2, 3, 15 |
| §4.3 | S0 + S1 (5); S1b (6); S2 and its box, S3 + S4 (7); S5 and "Rather not say" (8); S6's bridge, box, chips and checks (10); S7 and Enter (12, 16); S8's lines, variants and hold (11, 13); the plan at S9 (13) | 5–13, 16 |
| §4.4 | S7's checks shared with the server; the dial code from the country | 12, 14 |
| §4.5 | Copy IDs, and the lines the tests show | 4, 17 |
| §6.6, §13.1 | The plan's code and its hero still, started at S5 | 13 |
| §8.2 | The prerendered S0 + S1, and `g.noscript` | 3, 5 (lane D checks the built page) |
| §9, D13 | The background saves, the steps, no typed words | 14, 15 |
| §10, D18 | Every failed send, and saves that fail quietly | 11, 13, 14, 16 |
| §11 | Focus, buttons, live regions, 44 px targets, contrast, the keyboard, WCAG 2.2 AA | 1, 5, 10, 12, 13, 17 (and lane D's Task 14) |
| §12 | Unit tests, e2e at both sizes, axe, 80 % coverage | 1–17 |
| §13.2 | The `/visit` and `/lead` bodies | 11, 14 |
| §13.4 | One Turnstile loader; the action, `interaction-only`, and the 3 s token wait | 9, 12, 13 |
| §13.10 | The head script at 2 KB and the map at 3 KB; the split that keeps the agents data out of the funnel chunk | 3, 13 (lane D's `check:build` measures them) |
| D6, D14, D15 | The header's stage; the Calendly prefill; S1b to /products | 4, 6, 13 |

**Placeholder scan.** No "TBD", "TODO", "implement later" or "similar to Task N". Every code step shows its code, and every test step its test.

**Type consistency.** These names are the same in every task that uses them:
- `FunnelStage` from the light entry, and `funnelStageOf` (Tasks 2, 4, 5, 13);
- `setLeadContact`, `setStage` and `setCtaReporter` (13);
- `LazyPlanPage`, `LazyHeroPicturePrefetch` and `PlanPrefetch` (13, and the mocks in 13 and 14);
- `TokenSource.waitForToken` (9, 12, 13);
- `S8_MIN_MS` and `S8_LINE_AT_MS` (11, 13);
- `leadRequest` and its eight plan keys, `fallback` included (11);
- `landingFields`, `stepOf`, `answerFields` and `useVisitSaves` (14);
- `TAP_PACE_MS` and `tapThrough` (15–17).

**Review Focus.** Each line has its tests:
1. Task 10.
2. Tasks 4, 7 and 15.
3. Tasks 3, 5 and 15.
4. Tasks 9 and 13.
5. Tasks 5 and 15.

**Deviations.** Each is a default the manager or the owner can overrule:
1. The orange button. §11.4 asks for a label "about 7:1 on #FF7A00". The plan keeps the approved sketch's #EF4824 with a #0B0E14 label, at 5.17:1, over the 4.5 floor.
2. S2's "Other" box gets a button, because §4.3 gives it none. Lane C's copy has no `s2.other.btn`, so the button reuses `s6.btn` ("That's it").
3. S8 shows its lines at 0, 0.7 and 1.4 s, and holds at least 2.1 s. §4.3 allows 1.5 to 2.5 s.
4. `g.footer` shows on S1 to S7.
5. Reduced motion is handled in CSS alone, with no hook.
6. `src/pages/Contact.tsx` moves to the shared Turnstile loader in lane A (§13.4). Its form doesn't change.
7. `FunnelRoot` reaches lane D on day 2 morning with lane C's copy, not on day 1 (index §2.2).
8. S1b's closing line keeps the header to the logo. `FunnelStage` is `"plan"` from S9 only (index §1.2), and `s1b.btn` leads to /products.
9. `isReturning` and `entryIntent` aren't sent. Return visits are phase 2 and search pages phase 3 (§9), and their columns keep their defaults.
10. S1 is saved as reached 1.4 s after first paint, once it has risen under the greeting. Before that the visit is at S0.
11. The questions ignore a tap for 350 ms after each step. That guard means every browser test taps at a person's pace (Task 15, `requests.md`).
12. A header "Book a call" tap travels in the funnel's state, so it's saved with the next save, and only while the funnel is mounted.
13. Tests read CSS and source with `?raw` imports, not `node:fs`, so `tsconfig.app.json` type-checks them.
