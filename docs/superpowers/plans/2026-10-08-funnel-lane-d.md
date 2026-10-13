# Business Spine funnel, lane D: site and QA

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the funnel on `/` and keep it honest. That means the film with its one string changed, the old homepage and the Preloader gone, the hero stills in `public/spine/r17/`, the header from the burger branch with a pill that opens Calendly, and the checks that guard all of it: Vitest, Playwright, axe, the claims check, the prerender checks, the budgets, Lighthouse and CI.

**Architecture:** Lane D owns the site around the funnel, not the funnel itself. `src/pages/Index.tsx` renders lane A's `FunnelRoot`, and `main.tsx` loads that chunk before React mounts on `/`, so the prerendered greeting never blanks. The header reads lane A's `funnelSession`, and lane C's `copy` and `calendlyUrl` from the light entry, `src/features/funnel/data/light.ts`. The checks run in three places: unit tests (`npm test`), checks on the built `dist/` (`npm run check:build`), and Playwright against `vite preview` with `/api/funnel/*` mocked (`npm run test:e2e`). One GitHub Actions job runs all three.

**Tech Stack:** Vite 8 (rolldown) + React 18.3 + react-router 6.30; Vitest 4.1 and jsdom 29 (pinned so Node 25 stays supported), Playwright 1.63 and @axe-core/playwright 4.13, all installed by P0-T4; Lighthouse 13.5 through `npx`; GitHub Actions; ffmpeg, avifenc and cwebp; the film's own render tools on the bus.

**Spec:** `docs/superpowers/specs/2026-10-07-business-spine-funnel-design.md`, approved 8 Oct (D1–D34). Contracts and seams: `docs/superpowers/plans/2026-10-08-funnel-00-index.md` §1. Read §1.2 (`contract.ts`), §1.3 (seams) and §1.5 (the contract changes of 8 Oct) before Task 4. The manager's rulings D35 to D39 are in `.team/ziiro-fleet/funnel/wave9-requests.md`.

**Paths used below.** `REPO` is `/Users/rits/Div's Second Brain/03 Projects/ziiro` and `BUS` is `$REPO/.team/ziiro-fleet`. Both hold a space and an apostrophe, so always quote them.

## Global Constraints

The 00-index's Global Constraints apply in full. These are the ones lane D's tasks lean on, plus lane D's own.

- Branch `feat/business-spine-funnel`, cut from `ziiroai/dev`. Pull with `git pull --rebase`, push small commits, never force-push (00-index §2.3).
- Lane D owns the files in the file map below. A file another lane owns is a dependency on that lane's task (§13.7).
- That includes `src/index.css` (00-index §1.3, after worker-3's review of 8 Oct, finding 1). Lane A puts two `@import` lines at its top on day 1 (lane A, Task 1, Step 5). They stay the file's first two lines, above `@tailwind base;`, through Tasks 8 and 9, and lane A's `src/features/funnel/flow/tokens.test.ts` fails if they don't.
- No new package. P0-T4 installs `vitest@^4.1.11`, `@vitest/coverage-v8@^4.1.11` and `jsdom@^29.0.2`, because Vitest 5 and jsdom 30 leave out this Mac's Node 25 (00-index §1.5, request 5). Lighthouse runs as `npx --yes lighthouse@13.5.0`, by hand, with no `package.json` entry; it needs Node 22.19 or later. Lane D may change `package.json` scripts (00-index §2.3).
- The light entry (00-index §1.1, §1.5, request 14). The header, `BrandFilm` and `src/pages/Index.tsx` import `copy` and `calendlyUrl` from `@/features/funnel/data/light`, never from `@/features/funnel/data`, because the full entry carries the agents data, the jobs and the phrase lists. Lane D's tests may import either entry.
- Copy by ID. Visible words in lane D's code come from `copy(id)` (00-index Global Constraints, §4.5). Tests take their labels from `copy()` too, so a copy change can't leave a test behind.
- "Every 'Book a call' (`nav.btn`, `hx.btn1`, `cta.btn`) opens the same Calendly event, `https://calendly.com/ziiro-work/30min`, in a new tab, with their name and email filled in through Calendly's `name` and `email` link parameters. The link comes from `INTERIM_BOOKING_URL` in `src/features/pricing/entities/rates.ts`." (§6.3)
- Header: "the logo only, from S0 to S8 (D6, default, owner can veto)" (§4.1). At S9 and on every other page, the three links and the pill (§6.2 block 0, D14).
- First screen on `/` (§13.10): LCP 2.0 s or less; INP 100 ms or less; CLS 0.02 or less; JS before first paint 150 KB gz or less, "entry plus the funnel chunk, which is 25 KB gz at most"; "No WebGL, Spline, framer-motion or Preloader on `/`"; HTML 30 KB gz or less; Lighthouse mobile performance 90 or more.
- The plan (§13.10): plan chunk 60 KB gz at most, "data 12 KB gz at most, prefetched at S5"; everything prefetched before the plan 500 KB on a phone, 800 KB on desktop. "The copy lines sit in the light entry and count in first paint, not in the plan chunk" (00-index Global Constraints), so the 12 KB covers the agents, the jobs, the phrase lists and the disc map. No job name or phrase-list entry may ship in the entry chunk or the funnel chunk (00-index §1.5, what lane D owes).
- Film (§13.10): "never preloaded; poster 90 KB at most; video fetched only on tap".
- Hero files (§6.6): `public/spine/r17/{light,dark}/hero/hero-{1280,1920,2560}.{avif,webp}` and `phone-{828,1170}.{avif,webp}`. AVIF is `avifenc -s 6 -q 60 --yuv 444 -d 10`, WebP is `cwebp -q 85 -m 6 -sharp_yuv`. The phone band is rows 280 to 1636 of the 1290 × 2796 master. There is no 1290 file (D31). Limits: phone 120 KB AVIF and 180 KB WebP, desktop 220 KB AVIF and 320 KB WebP (§13.10).
- `/media/` and `/spine/` are cached for a year as immutable: "The files never change once rendered ... a new render goes into a new folder" (§6.6).
- HTML check (§12): "`/` without JavaScript contains `g.about`, S1's question and its five options, and the footer links. It keeps at least 40 words outside the header and footer ... The sitemap gains no URL in phase 1."
- Every Blender run, and the film render, goes through `python3 "$BUS/with-render-lock.py" <command>` (§6.6, §13.11 risk 6). Never edit the owner's GLBs.
- Manager rulings D35 to D39 (each a default the owner can veto). Two reach lane D's checks: D36, their words are quoted at the stop of the department their problem belongs to (Task 14 pins it for Ananya), and D39, `hx.call1` and `hx.call2` sit right of the spine, level with G05 and G03 (Task 7's look at the stills). D37's `sp.hero.scroll.one` and D38's `r.film.close` are new copy lines, which the claims check scans like every other line. D35 is lane C's alone.
- KB means 1,000 bytes. "gz" means Node's `zlib.gzipSync` at its default level.
- To delete a tracked file, `mv` it into a fresh `$(mktemp -d)` and stage the deletion with `git add`. The fleet's shells refuse command lines that contain `rm`, so `git rm` won't run there.

## Review Focus

These five can bite a visitor even though no line of the spec names them. Each test lives in the task that owns the code.

1. **The greeting blinks out at boot.** `main.tsx` uses `createRoot`, which throws the prerendered DOM away at its first commit (§13.9: `hydrateRoot` waits for phase 3). `/` is a lazy route, so the commit paints the Suspense fallback, an empty screen, until the page chunk arrives. Expected: the prerendered "Hello." stays on screen from the first paint. Test: Task 4, `tests/e2e/first-paint.spec.ts`. It delays the `Index` chunk by 400 ms and counts the frames without a visible H1.
2. **A light-mode `/` with a dark header.** `App.tsx`'s `ThemeProvider` forces `class="dark"` on every page, and the header's colours come from the site's dark tokens. On a light plan (D9) its links would be light grey on near-white. Expected: the header passes contrast in both themes on `/`. Test: Task 8's unit test (the bar on `/` takes the funnel's colours), and Task 14's axe pass at S9 in light mode (`color-contrast`).
3. **A tall desktop shows the footer on the first screen.** D6 keeps the footer below the fold, but `useFooterShown` shows the pinned footer at once when a page is shorter than the window, and S0 + S1 is short. Expected: no footer on the first screen at 1440 × 900 or 1920 × 1080. Test: Task 13, `tests/e2e/first-screen.spec.ts`.
4. **The pill after S7.** After Back from the plan to S6, the header must go back to the logo alone (§4.1). The Calendly link must carry a name like "Ananya & Co+ अनन्या" and an email like "a+b@x.com" through intact. Expected: the links hide again, and both values decode exactly. Test: Task 8, `src/shared/components/Navbar.test.tsx`.
5. **New bytes under an old name.** A re-render or re-encode copied over an existing file under `/media/` or `/spine/` keeps serving the old copy to everyone who has cached it, for a year. Expected: a changed file gets a new name or folder. Test: Task 7, `tests/media/immutable.test.ts`.

## File map

| Action | Path | Task |
|---|---|---|
| Create | `playwright.config.ts`, `vitest.build.config.ts`, `tsconfig.test.json` | 1 |
| Create | `tests/e2e/fixtures.ts`, `tests/e2e/smoke.spec.ts` | 1 |
| Create | `.github/workflows/ci.yml` | 2 |
| Create | `tests/helpers/image-size.ts`, `tests/media/film-files.test.ts`; 3 files in `public/media/` | 3 |
| Create | `src/app/home-route.tsx`, `tests/unit/routes.test.ts`, `tests/e2e/first-paint.spec.ts` | 4 |
| Create | `src/features/home/sections/BrandFilm.test.tsx` | 5 |
| Create | `tests/helpers/imports.ts`, `tests/unit/shell-imports.test.ts` | 6 |
| Create | 20 files in `public/spine/r17/{light,dark}/hero/`, `tests/media/hero-files.test.ts`, `scripts/hash-immutable.mjs`, `tests/media/immutable.json`, `tests/media/immutable.test.ts` | 7 |
| Create | `src/shared/components/Navbar.test.tsx`, `tests/e2e/nav.spec.ts` | 8 |
| Create | `tests/unit/old-home-css.test.ts` | 9 |
| Create | `tests/build/home-html.check.ts`, `tests/build/sitemap.check.ts` | 10 |
| Create | `tests/claims/patterns.ts`, `tests/claims/sources.ts`, `tests/claims/claims.test.ts`, `tests/build/claims-dist.check.ts` | 11 |
| Create | `tests/build/budgets.check.ts` | 12 |
| Create | `tests/e2e/helpers/flow.ts`, `tests/e2e/first-screen.spec.ts`, `tests/e2e/spine-files.spec.ts` | 13 |
| Create | `tests/e2e/ananya-plan.spec.ts` | 14 |
| Create | `scripts/lighthouse-home.mjs`, `tests/e2e/perf.spec.ts` | 15 |
| Create | `tests/e2e/preview-smoke.spec.ts` | 16 |
| Modify | `package.json` (scripts only), `.gitignore` | 1, 7, 15, 16 |
| Modify | `src/pages/Index.tsx`, `src/main.tsx`, `src/app/App.tsx`, `scripts/routes.mjs` | 4, 6 |
| Modify | `src/features/home/sections/BrandFilm.tsx`, `src/shared/ui/vsl-player.tsx`, `src/shared/ui/scroll-autoplay-video.tsx` | 3, 5 |
| Modify | `vite.config.ts` (one code-splitting group) | 6 |
| Modify | `src/shared/components/Navbar.tsx` and `src/index.css` (burger merge, then lane D's edits; lane A's two `@import` lines stay first) | 8, 9 |
| Modify | `public/llms.txt` (the `/` line) | 10 |
| Delete | `src/features/home/**` except `sections/BrandFilm.tsx`; `src/shared/components/{Preloader,ErrorBoundary}.tsx`; `src/shared/motion/ScrollScene.tsx`; `src/ogl/{DotArt3D.tsx,dotArtShaders.ts,formations.ts}` | 4 |
| Delete | `public/media/ziiro-business-brain-{master,phone}.mp4`, `-poster-1080.jpg` | 3 |
| Later | `tests/e2e/integration.spec.ts` is 00-index I-T2's, written by lane D's builder on day 5 or 6 | I-T2 |

## Order and calendar

| Day | Lane D | Waits on |
|---|---|---|
| 1, Fri 9 Oct, afternoon | Tasks 1 and 2. Task 3: start the render first, since it runs about 17 minutes in the background, under the lock. Task 4's Index swap, coded against 00-index §1.3 while the render runs, then parked until day 2 | P0-T4 |
| 2, Mon 12 Oct | Task 4 lands first, in the morning. Then Tasks 5 and 6; Task 7 (lane C needs the stills today); Task 8; Task 9 after Task 8's merge | Task 4 needs lane A's `FunnelRoot` (day 2, morning, pushed with lane C's copy) and lane C's `seo.home.*` lines in `light.ts` (day 2, morning). Task 8 needs the `funnelSession` stub (lane A, day 1) and `light.ts` with `copy` and `calendlyUrl` (lane C, day 2, morning); Task 5 needs `light.ts` too |
| 3, Tue 13 Oct, ends midday | Task 10; Task 11's copy-line, llms and built-`/` checks; Task 12 (first paint and data); Task 13's flow helper and first-screen spec; Task 15's script; Task 16's spec | lane A's S1–S5 screens for Task 13's helper |
| 4–5 | Help lane A. Land the parts that wait on others: Task 13's spine-files spec, Task 11 plans and emails (`PlanPage`, `buildPlanEmail`), Task 12's plan chunk, Task 14 (S7–S9), then I-T2 | `HeroPicturePrefetch` mounted at S5 (lane A's Task 13, day 4; 00-index §2.2); `buildPlanEmail` (lane B, day 3); `PlanPage` (lane C, day 3, finished day 4); the complete `funnelSession` (lane A, day 4); the S9 mount (lane A, day 5) |

**CI moves earlier** (default, owner can veto). The 00-index puts CI on day 3. It lands on day 1 here, so a red push from any lane shows within minutes.

---

### Task 0: D27, only if launch slips past Tue 20 Oct

Run this only if the owner approves the plans on Mon 12 Oct or later (00-index §2.1). Otherwise skip it: the 127/30 line leaves with the old homepage in Task 4.

**Files** (in a separate worktree, on `fix/remove-127-30-line` from `ziiroai/dev`):
- Modify: `src/features/home/hero/Hero.tsx:5, 54-66, 69-71, 212-218`
- Modify: `src/features/home/directory/SystemDirectory.tsx:181-192, 392`
- Modify: `src/features/home/directory/MobileCore.tsx:133`
- Modify: `src/features/home/directory/PipelinePanel.tsx:158-159`

**Interfaces:**
- Produces: a PR into `dev`, then the owner's `dev` → `main` PR, live before 21 Oct

- [ ] **Step 1: Make a worktree, so no lane's working tree changes branch**

```bash
cd "$REPO"
git fetch ziiroai
D27=$(mktemp -d)/ziiro-d27
git worktree add "$D27" -b fix/remove-127-30-line ziiroai/dev
cd "$D27" && npm ci
```

Expected: `Preparing worktree (new branch 'fix/remove-127-30-line')`, then npm finishes with no error.

- [ ] **Step 2: Write the check and watch it fail**

```bash
npm run build
node -e 'const t=require("fs").readFileSync("dist/index.html","utf8").replace(/<[^>]+>/g," ").replace(/\s+/g," "); const hits=t.match(/.{0,40}(\b127\b|\b30 agents\b|\bagents 30\b|jobs of work).{0,40}/gi)||[]; if(hits.length){console.error("still on /:",hits);process.exit(1)} console.log("no 127/30 line on /")'
git grep -n -E "DIRECTORY_STATS\.(jobs|agents)" -- src
```

Expected: the node line exits 1 and prints `still on /:` with the hero strip. The grep lists Hero.tsx, SystemDirectory.tsx, MobileCore.tsx and PipelinePanel.tsx.

- [ ] **Step 3: Take the line out**

In `src/features/home/hero/Hero.tsx`, delete line 5 (`import { DIRECTORY_STATS } from "@/features/home/directory/pipelines";`), lines 69–71 (the `STRIP_RIGHT` constant), the `<p data-hero="strip-right" …>…</p>` element at lines 212–218, and `function Separated` at lines 54–66, whose only use was that element.

In `src/features/home/directory/SystemDirectory.tsx`, delete lines 181–192 (the comment and the `<ScrollScene exitTo={1}>` holding "jobs of work, mapped across … agents in … departments.") and line 392 (`{ label: "Agents", value: DIRECTORY_STATS.agents },`).

In `src/features/home/directory/MobileCore.tsx:133`, the line becomes:

```tsx
              {PIPELINES.length} systems
```

In `src/features/home/directory/PipelinePanel.tsx`, lines 158–159 become one line:

```tsx
          {pad(DIRECTORY_STATS.departments)} systems · {pad(DIRECTORY_STATS.live)} active
```

- [ ] **Step 4: Run the check again, then lint and types**

```bash
npm run build
node -e '<the same check as step 2>'
git grep -n -E "DIRECTORY_STATS\.(jobs|agents)" -- src
npm run lint && npx tsc -p tsconfig.app.json --noEmit
```

Expected: `no 127/30 line on /`; the grep prints nothing; lint shows 0 errors; tsc exits 0.

- [ ] **Step 5: Look at it.** Run `npm run preview`, then open `/` at 1440 × 900 and at 390 × 844. The hero strip shows only `[ 08 departments ]`, and nothing on the page looks broken where the sentence used to be.

- [ ] **Step 6: Commit and open the PR**

```bash
git add src/features/home
git commit -m "fix: take the 127 jobs / 30 agents line off the homepage (D27)"
git push -u ziiroai fix/remove-127-30-line
gh pr create --repo ziiroAi/ziiro-website --base dev --head fix/remove-127-30-line \
  --title "Take the 127 jobs / 30 agents line off the homepage (D27)" \
  --body "Spec D27: the line can't be proved, and the VIT talk is on 21 Oct. The funnel branch deletes these files later."
```

Then tell the manager that Div merges it into `dev`, then opens and merges `dev` → `main`.

- [ ] **Step 7: Later, when the funnel branch meets this commit.** Merging `ziiroai/dev` into `feat/business-spine-funnel` gives modify/delete conflicts on those four files. Keep the deletion:

```bash
git merge ziiroai/dev
TRASH=$(mktemp -d)
for f in $(git diff --name-only --diff-filter=U); do mv "$f" "$TRASH/"; git add -A "$f"; done
git commit --no-edit
```

---

### Task 1: Playwright and the build-check runner

**Files:**
- Create: `playwright.config.ts`, `vitest.build.config.ts`, `tsconfig.test.json`, `tests/e2e/fixtures.ts`, `tests/e2e/smoke.spec.ts`
- Modify: `package.json` (scripts), `.gitignore`

**Interfaces:**
- Consumes: P0-T4's packages, `vitest.config.ts` and its `typecheck` script; `VisitRequest`, `VisitResponse`, `LeadRequest`, `LeadResponse` from `src/features/funnel/data/contract.ts`
- Produces: `npm run test:e2e`, `npm run test:perf`, `npm run test:preview`, `npm run check:build`. The fixture `test` from `tests/e2e/fixtures.ts` mocks `/api/funnel/*` for every spec, and gives tests a `funnelApi` with `visits: VisitRequest[]`, `leads: LeadRequest[]` and `answerLeadWith(answers: LeadAnswer[])`, where `LeadAnswer = { status: number; body?: LeadResponse; delayMs?: number } | "no-answer"`. Build checks are named `*.check.ts` under `tests/build/`, so P0-T4's `tests/**/*.test.ts` never runs them before a build exists.

- [ ] **Step 1: Write the first spec**

`tests/e2e/smoke.spec.ts`:

```ts
import { expect, test } from "./fixtures";

test("vite preview serves the production build", async ({ page }) => {
  await page.goto("/mission");
  await expect(page.locator("h1").first()).toBeVisible();
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run test:e2e`
Expected: FAIL with `npm error Missing script: "test:e2e"`.

- [ ] **Step 3: Add the scripts**

In `package.json` `"scripts"`, add these four, and append ` && tsc -p tsconfig.test.json` to P0-T4's `typecheck`:

```json
"test:e2e": "playwright test --grep-invert \"@perf|@preview\"",
"test:perf": "playwright test --grep @perf",
"test:preview": "playwright test --grep @preview --project phone",
"check:build": "vitest run --config vitest.build.config.ts --passWithNoTests",
```

- [ ] **Step 4: Write the Playwright config**

`playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

/**
 * (C) Lane D's Playwright setup (spec §12). Specs run against the production build served by
 * `vite preview`, with /api/funnel/* answered by route mocks (tests/e2e/fixtures.ts).
 * PLAYWRIGHT_BASE_URL points them at a deployed site instead (the preview smoke, Task 16).
 */
const external = process.env.PLAYWRIGHT_BASE_URL;
const PORT = 4173;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: external ?? `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    timezoneId: "Asia/Kolkata",
    locale: "en-IN",
  },
  projects: [
    // §12: the full flow at 390 × 844 and 1440 × 900.
    { name: "phone", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: external
    ? undefined
    : {
        command: `npm run preview -- --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
```

- [ ] **Step 5: Write the fixtures**

`tests/e2e/fixtures.ts`:

```ts
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
```

- [ ] **Step 6: Write the build-check runner and the test tsconfig**

`vitest.build.config.ts`:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** (C) Checks that read the built site in dist/ (spec §12, §13.10). Run after `npm run build`. */
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", include: ["tests/build/**/*.check.ts"] },
});
```

`tsconfig.test.json`:

```json
{
  "extends": "./tsconfig.app.json",
  "compilerOptions": {
    "resolveJsonModule": true,
    "noEmit": true
  },
  "include": ["tests/**/*.ts", "playwright.config.ts", "vitest.build.config.ts", "src/vite-env.d.ts"],
  "exclude": ["tests/api/**"]
}
```

`src/vite-env.d.ts` brings Vite's `import.meta.env` types into the source files the tests import. Node's types come from `@types/node`, already installed. `tsconfig.app.json` has `noImplicitAny` off, so importing `scripts/*.mjs` type-checks without declaration files. `tests/api/**` stays with lane B's `tsconfig.api.json`. Lane D's `src/**/*.test.tsx` files are already covered by `tsconfig.app.json`.

- [ ] **Step 7: Ignore test output**

Append to `.gitignore`:

```
# Test output
coverage/
playwright-report/
test-results/
blob-report/
```

- [ ] **Step 8: Run everything**

```bash
npx playwright install chromium
npm run build
npm run test:e2e
npm run check:build
npm run typecheck
```

Expected: `2 passed` (phone and desktop); `check:build` prints `No test files found, exiting with code 0`; `typecheck` exits 0.

- [ ] **Step 9: Commit**

```bash
git add package.json playwright.config.ts vitest.build.config.ts tsconfig.test.json .gitignore \
  tests/e2e/fixtures.ts tests/e2e/smoke.spec.ts
git commit -m "test: add Playwright on vite preview and the build-check runner"
git push
```

---

### Task 2: CI on every pull request

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: the scripts from P0-T4 and Task 1
- Produces: the `CI / check` job that I-T5 step 1 reads (D25, §12 "CI")

- [ ] **Step 1: Write the workflow**

`.github/workflows/ci.yml`:

```yaml
# (C) Spec §12 "CI" and D25: lint, types, unit, API and claims tests, the build, the build
# checks and Playwright, on every pull request into dev and main.
name: CI

on:
  pull_request:
    branches: [dev, main]
  push:
    branches: [dev, main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 25
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
      - run: npm run check:build
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - if: failure()
        uses: actions/upload-artifact@v7
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

- [ ] **Step 2: Commit, push and watch the run**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run lint, types, tests, build and Playwright on every PR"
git push
gh pr checks --repo ziiroAi/ziiro-website feat/business-spine-funnel --watch
```

Expected: `check` passes, and its log shows each step above in order. If an earlier lane commit is red, the run says which step failed. Tell the manager which lane's file it is, and don't fix it yourself (00-index §2.3).

---

### Task 3: The film: one string, a re-render, the files swapped

**Files:**
- Modify (bus, not in git): `$BUS/funnel/film-trim/spine/film.html:882`
- Create: `public/media/ziiro-business-spine-master.mp4`, `public/media/ziiro-business-spine-phone.mp4`, `public/media/ziiro-business-spine-poster-1080.jpg`
- Create: `tests/helpers/image-size.ts`, `tests/media/film-files.test.ts`
- Modify: `src/features/home/sections/BrandFilm.tsx:14-24, 43-58`
- Delete: `public/media/ziiro-business-brain-master.mp4`, `-phone.mp4`, `-poster-1080.jpg`

**Interfaces:**
- Produces: `export const SPINE_FILM_FILES: { src: "/media/ziiro-business-spine-master.mp4"; narrowSrc: "/media/ziiro-business-spine-phone.mp4"; poster: "/media/ziiro-business-spine-poster-1080.jpg" }` in `BrandFilm.tsx`; `jpegSize`, `avifSize` and `webpSize(buf: Buffer): { width: number; height: number }` in `tests/helpers/image-size.ts`

- [ ] **Step 1: Write the image-size helper**

`tests/helpers/image-size.ts`:

```ts
/** (C) Pixel sizes read from file headers, so tests need no image library. */
export interface Size { width: number; height: number }

export function jpegSize(buf: Buffer): Size {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) throw new Error("not a JPEG");
  for (let i = 2; i < buf.length; ) {
    if (buf[i] !== 0xff) { i += 1; continue; }
    const marker = buf[i + 1];
    const isFrameHeader = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isFrameHeader) return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  throw new Error("JPEG has no frame header");
}

/** The 'ispe' box: version and flags, then width and height as 32-bit integers. */
export function avifSize(buf: Buffer): Size {
  const at = buf.indexOf("ispe", 0, "latin1");
  if (at < 0) throw new Error("AVIF has no ispe box");
  return { width: buf.readUInt32BE(at + 8), height: buf.readUInt32BE(at + 12) };
}

export function webpSize(buf: Buffer): Size {
  if (buf.toString("latin1", 0, 4) !== "RIFF" || buf.toString("latin1", 8, 12) !== "WEBP") throw new Error("not a WebP");
  const chunk = buf.toString("latin1", 12, 16);
  if (chunk === "VP8X") return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
  if (chunk === "VP8 ") return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  if (chunk === "VP8L") {
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  throw new Error(`unknown WebP chunk ${chunk}`);
}
```

These were checked on 8 Oct against the real files: `hero-light-2560.avif` and `.webp` read 2560 × 1440, `hero-dark-1280.*` read 1280 × 720, and the spine poster reads 1920 × 1080.

- [ ] **Step 2: Write the failing test**

`tests/media/film-files.test.ts`:

```ts
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SPINE_FILM_FILES } from "../../src/features/home/sections/BrandFilm";
import { jpegSize } from "../helpers/image-size";

const POSTER_MAX_BYTES = 90_000; // §13.10
const onDisk = (url: string) => `public${url}`;

describe("the Business Spine film (§6.5)", () => {
  it("names its three files ziiro-business-spine-*", () => {
    expect(SPINE_FILM_FILES).toEqual({
      src: "/media/ziiro-business-spine-master.mp4",
      narrowSrc: "/media/ziiro-business-spine-phone.mp4",
      poster: "/media/ziiro-business-spine-poster-1080.jpg",
    });
  });

  it("ships them", () => {
    for (const url of Object.values(SPINE_FILM_FILES)) expect(existsSync(onDisk(url)), url).toBe(true);
  });

  it("keeps the poster at 1920 × 1080 and 90 KB or less (§13.10)", () => {
    const poster = readFileSync(onDisk(SPINE_FILM_FILES.poster));
    expect(jpegSize(poster)).toEqual({ width: 1920, height: 1080 });
    expect(poster.length).toBeLessThanOrEqual(POSTER_MAX_BYTES);
  });

  it("leaves no Business Brain film in public/media, and no \"Business Brain\" in src/ (§8.6)", () => {
    expect(readdirSync("public/media").filter((f) => f.startsWith("ziiro-business-brain"))).toEqual([]);
    const brain = readdirSync("src", { recursive: true, withFileTypes: true })
      .filter((d) => d.isFile() && readFileSync(`${d.parentPath}/${d.name}`, "utf8").includes("Business Brain"))
      .map((d) => `${d.parentPath}/${d.name}`);
    expect(brain).toEqual([]);
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npx vitest run tests/media/film-files.test.ts`
Expected: FAIL. The first test reports `expected undefined to deeply equal { src: '/media/ziiro-business-spine-master.mp4', … }`.

- [ ] **Step 4: Change the one string** (§6.5)

```bash
cd "$BUS/funnel/film-trim/spine"
sed -n '882p' film.html
sed -i '' '882s/Brain · 9 jobs live/Brain · live/' film.html
sed -n '882p' film.html
grep -c "jobs live" film.html
```

Expected: first `<span class="abs amono" style="left:36px;top:852px">Brain · 9 jobs live</span>`, then the same span reading `Brain · live`, then `0`.

- [ ] **Step 5: Keep the 4 Oct render, then start the new one in the background**

```bash
mkdir -p out-2026-10-04 && cp -p out/ziiro-business-spine-* out/verify.json out/web.log out-2026-10-04/
python3 "$BUS/with-render-lock.py" nice -n 15 env \
  PLAYWRIGHT=/Users/rits/.local/lib/node_modules/@playwright/cli/node_modules/playwright \
  CHROME="$HOME/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell" \
  node render/film.cjs 4 > render/out/render-2026-10-09.log 2>&1
```

Run the second command in the background. It takes about 17 minutes. Write Task 4's Steps 1 to 8 while it runs; Task 4 lands on day 2, morning.
Expected: the log's first line is `speed 1: 56.727 s, 3404 frames`, and the command exits 0.

- [ ] **Step 6: Check for single-frame pops**

Run: `uv run --no-project --python 3.12 --with numpy python render/check.py`
Expected: `3404 frames; …`, ending with `no single-frame pops`. On 4 Oct it read `median step 0.09; max step 77.17 at frame 915`, and frame 915 is a cut.

- [ ] **Step 7: Encode for the web, under the lock**

Run: `python3 "$BUS/with-render-lock.py" nice -n 15 uv run --no-project --python 3.12 python render/web.py`
Expected: `out/web.log` reports the master at about 35.3 MB with SSIM 0.999 or more, the phone file at about 22.8 MB, and the poster at about 84 kB.

- [ ] **Step 8: Verify against the live film.** Run this before Step 10: `verify.py` reads the Business Brain files in `public/media/` for the audio check.

```bash
uv run --no-project --python 3.12 --with numpy python tools/verify.py
python3 -c "import json; d=json.load(open('out/verify.json')); print(d['frames'], d['cues_equal'], d['outside_max'], d['changed_ranges']); print(d['audio_pcm_md5'])"
```

Expected: `[3404, 3404] True`, `outside_max` 2.5 or less, and the two md5 pairs equal (master `a7979670225872b34f22fc77ffc2719c`, phone `2042971af2705551ffa021504cb32a05`). `changed_ranges` holds the 4 Oct range `454–527` (the title) plus one new range, where the BRAIN panel is on screen.

- [ ] **Step 9: Look at it**

```bash
W=$(mktemp -d)
python3 -c "import json; r=[c for c in json.load(open('out/verify.json'))['changed_ranges'] if c['from'] != 454][0]; print(round((r['s0'] + r['s1']) / 2, 3))"
ffmpeg -v error -ss <the time printed above> -i out/ziiro-business-spine-master.mp4 -frames:v 1 -y "$W/brain-live.png"
open "$W/brain-live.png" out/ziiro-business-spine-poster-1080.jpg
```

Expected, by eye at full size: the panel reads `BRAIN · LIVE` in the same place and type as before, and nothing else in the frame moved. The poster shows the Business Spine lockup on white.

- [ ] **Step 10: Swap the files in the repo**

```bash
cd "$REPO"
cp -p "$BUS/funnel/film-trim/spine/out/ziiro-business-spine-master.mp4" \
  "$BUS/funnel/film-trim/spine/out/ziiro-business-spine-phone.mp4" \
  "$BUS/funnel/film-trim/spine/out/ziiro-business-spine-poster-1080.jpg" public/media/
TRASH=$(mktemp -d)
mv public/media/ziiro-business-brain-master.mp4 public/media/ziiro-business-brain-phone.mp4 \
  public/media/ziiro-business-brain-poster-1080.jpg "$TRASH/"
```

- [ ] **Step 11: Point `BrandFilm.tsx` at them**

The old homepage still renders this section until Task 4, so only the files change here. Task 5 turns it into the plan's player.

Replace the `BRAND_FILM` constant (lines 43–58) with:

```tsx
/** The film's files (§6.5): 56.7 s, 1920 × 1080 at 60 fps, re-rendered with "BRAIN · LIVE". */
export const SPINE_FILM_FILES = {
  src: "/media/ziiro-business-spine-master.mp4",
  narrowSrc: "/media/ziiro-business-spine-phone.mp4",
  poster: "/media/ziiro-business-spine-poster-1080.jpg",
} as const;

/** Runtime is 56.7s; both encodes are 1920x1080 at 60fps, H.264 with faststart. */
const BRAND_FILM: VslConfig = {
  source: { kind: "file", src: SPINE_FILM_FILES.src, narrowSrc: SPINE_FILM_FILES.narrowSrc },
  // The film's own opening lines, not a claim written for it.
  title: "Everyone's selling you AI to replace your team. We built the opposite.",
  // Only the watch-page schema reads this, and this section emits none. Task 5 fills it from r.film.cap.
  description: "",
  uploadDate: "2026-09-29",
  duration: "PT57S",
  poster: SPINE_FILM_FILES.poster,
  runtime: "57 sec",
};
```

In the doc comment, line 14 now says `The film is the Business Spine launch cut, 1080p at 60fps.`, and line 24 says `The poster is the film's reveal: the lockup and "Business Spine" on white.` Lines 16–19 take the sizes and SSIM that `out/web.log` printed in Step 7.

- [ ] **Step 12: Run the tests and the build**

```bash
npx vitest run tests/media/film-files.test.ts
npm run build
```

Expected: 4 passed; the build exits 0.

- [ ] **Step 13: Commit**

```bash
git add public/media src/features/home/sections/BrandFilm.tsx tests/helpers/image-size.ts tests/media/film-files.test.ts
git commit -m "feat(film): ship the Business Spine film with BRAIN · LIVE (§6.5)"
git push
```

`git add public/media` stages the three new files and the three deletions.

---

### Task 4: The funnel at `/`

**Files:**
- Create: `src/app/home-route.tsx`, `tests/unit/routes.test.ts`, `tests/e2e/first-paint.spec.ts`
- Modify: `src/pages/Index.tsx` (whole file), `src/main.tsx` (whole file), `src/app/App.tsx:10, 15-28, 206, 233`, `scripts/routes.mjs:11`
- Delete: `src/features/home/{hero,directory,narrative}/`, `src/features/home/sections/{DotArtSection,FinalCta,HowItWorks,WhyDifferent}.tsx`, `src/shared/components/Preloader.tsx`. Also the five modules that only the old homepage used: `src/shared/components/ErrorBoundary.tsx`, `src/shared/motion/ScrollScene.tsx`, `src/ogl/DotArt3D.tsx`, `src/ogl/dotArtShaders.ts`, `src/ogl/formations.ts` (found on 8 Oct by walking the import graph from `main.tsx` and `entry-server.tsx` with and without the old homepage)

**Interfaces:**
- Consumes: `export function FunnelRoot(): JSX.Element` from `src/features/funnel/flow/FunnelRoot.tsx` (lane A, day 2 morning); `copy("seo.home.title")` and `copy("seo.home.desc")` from the light entry, `src/features/funnel/data/light.ts` (lane C, day 2, morning). `/`'s page chunk must never import the full entry (00-index §1.1)
- Produces: `preloadHome(): Promise<void>` and `HomeRoute(): JSX.Element` in `src/app/home-route.tsx`. `entry-server.tsx` keeps importing `@/pages/Index` eagerly, unchanged.

**When it lands** (worker-3's review of 8 Oct, finding 2). Lane C pushes the copy, the `seo.home.*` lines included, on day 2 morning, and lane A pushes `FunnelRoot` right after it (lane A's Order note). Until both are on the branch, the typecheck and the build fail on the missing exports. So on day 1, write Steps 1 to 8 against the `FunnelRoot` signature in 00-index §1.3. Then park the work, so Task 3 still pushes from a clean tree:

```bash
git stash push --include-untracked -m "Task 4: the funnel at /"
```

On day 2 morning, once both pushes are on the branch:

```bash
git pull --rebase
git stash pop
```

Then run Steps 9 and 10.

- [ ] **Step 1: Write the failing tests**

`tests/e2e/first-paint.spec.ts`:

```ts
import { expect, test } from "./fixtures";

/** Review Focus 1: frames with no visible H1 after the page had shown one. */
declare global {
  interface Window { __h1Gaps: number; __h1Seen: boolean }
}

test("the prerendered greeting stays on screen while the page chunk loads (§4.2, §13.10)", async ({ page }) => {
  await page.route(/\/assets\/Index-[\w-]+\.js$/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    await route.continue();
  });
  await page.addInitScript(() => {
    window.__h1Gaps = 0;
    window.__h1Seen = false;
    const tick = () => {
      const h1 = document.querySelector("h1");
      const shown = !!h1 && (h1.textContent ?? "").trim() !== "" && h1.getClientRects().length > 0;
      if (shown) window.__h1Seen = true;
      else if (window.__h1Seen) window.__h1Gaps += 1;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  await page.goto("/");
  await page.waitForTimeout(1_500);

  expect(await page.evaluate(() => window.__h1Seen)).toBe(true);
  expect(await page.evaluate(() => window.__h1Gaps)).toBe(0);
});
```

`tests/unit/routes.test.ts`:

```ts
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { routes } from "../../scripts/routes.mjs";

describe("scripts/routes.mjs", () => {
  it("dates / by the funnel's files", () => {
    expect(routes.find((r) => r.path === "/")?.sources).toEqual(["src/pages/Index.tsx", "src/features/funnel"]);
  });

  it("names only sources that exist, or scripts/sitemap.mjs stops the build", () => {
    const missing = routes.flatMap((r) => r.sources.filter((s: string) => !existsSync(s)));
    expect(missing).toEqual([]);
  });

  it("keeps the 14 routes: the sitemap gains no URL in phase 1 (§12)", () => {
    expect(routes.map((r) => r.path)).toEqual([
      "/", "/products", "/who-we-are", "/watch/how-ziiro-works", "/mission", "/contact", "/pricing",
      "/docs", "/book-a-call", "/faq", "/careers", "/security", "/privacy", "/terms",
    ]);
  });
});
```

- [ ] **Step 2: Run them on today's homepage and watch them fail**

```bash
npm run build
npx playwright test tests/e2e/first-paint.spec.ts
npx vitest run tests/unit/routes.test.ts
```

Expected: the Playwright test FAILS on both projects, with `__h1Gaps` above 0: the old hero's H1 blanks while the Suspense fallback shows. The unit test FAILS on its first case (`src/features/home` instead of `src/features/funnel`). The other two cases pass.

- [ ] **Step 3: Write the home route**

`src/app/home-route.tsx`:

```tsx
import { lazy, type ComponentType } from "react";

/**
 * (C) `/` stays a lazy route, so no other page downloads the funnel. On `/`, main.tsx waits for
 * this chunk before React mounts (preloadHome). createRoot throws the prerendered DOM away at its
 * first commit (spec §13.9: hydrateRoot comes in phase 3), so a Suspense fallback there would
 * blank the prerendered greeting until the chunk arrived.
 */
const loadHome = () => import("@/pages/Index");
const LazyHome = lazy(loadHome);
let loadedHome: ComponentType | null = null;

export async function preloadHome(): Promise<void> {
  loadedHome = (await loadHome()).default;
}

export function HomeRoute() {
  const Home = loadedHome ?? LazyHome;
  return <Home />;
}
```

- [ ] **Step 4: Replace `src/pages/Index.tsx`**

```tsx
import SEO from "@/shared/components/SEO";
import { copy } from "@/features/funnel/data/light";
import { FunnelRoot } from "@/features/funnel/flow/FunnelRoot";

/** `/`: the Business Spine funnel, S0 to S9 (spec §4, §8.2). The plan never reaches the HTML. */
export default function Home() {
  return (
    <>
      <SEO title={copy("seo.home.title")} description={copy("seo.home.desc")} canonical="/" />
      <FunnelRoot />
    </>
  );
}
```

- [ ] **Step 5: Replace `src/main.tsx`**

```tsx
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./app/App";
import { preloadHome } from "./app/home-route";
import "./index.css";

const mount = () =>
  createRoot(document.getElementById("root")!).render(
    <HelmetProvider>
      <App />
    </HelmetProvider>,
  );

// On `/` the funnel's chunk loads before the first commit, so the prerendered greeting never
// blanks (src/app/home-route.tsx). If it fails to load, mount anyway: the route retries it lazily.
if (window.location.pathname === "/") preloadHome().then(mount, mount);
else mount();
```

- [ ] **Step 6: Edit `src/app/App.tsx`**

- Delete line 10: `import Preloader from "@/shared/components/Preloader";`
- Delete line 28 (`const Index = lazy(() => import("@/pages/Index"));`), and add `import { HomeRoute } from "@/app/home-route";` after line 13.
- At the end of the comment above the lazy routes (lines 15–27), add: ` * \`/\` loads through src/app/home-route.tsx, which main.tsx preloads before it mounts on \`/\`.`
- Line 206 becomes `<Route path="/" element={<HomeRoute />} />`.
- Delete line 233: `<Preloader />` (§13.9: "Preloader skipped on `/`". It only ever showed on `/`, so skipping it there removes it).

- [ ] **Step 7: Point `scripts/routes.mjs` at the funnel**

Line 11 becomes:

```js
    sources: ["src/pages/Index.tsx", "src/features/funnel"],
```

- [ ] **Step 8: Delete the old homepage** (D26)

First check that nothing else still imports these files:

```bash
git grep -n -E "features/home/(hero|directory|narrative)|sections/(DotArtSection|FinalCta|HowItWorks|WhyDifferent)|ogl/(DotArt3D|dotArtShaders|formations)|components/(ErrorBoundary|Preloader)|motion/ScrollScene" -- src scripts
```

Expected: hits only inside the files being deleted, plus the path comments in `src/features/pricing/entities/rates.ts:118-120` and `src/shared/lib/spline-brain.ts:6`, which stay. Then:

```bash
TRASH=$(mktemp -d) && mkdir -p "$TRASH/home/sections" "$TRASH/ogl" "$TRASH/shared"
mv src/features/home/hero src/features/home/directory src/features/home/narrative "$TRASH/home/"
mv src/features/home/sections/DotArtSection.tsx src/features/home/sections/FinalCta.tsx \
  src/features/home/sections/HowItWorks.tsx src/features/home/sections/WhyDifferent.tsx "$TRASH/home/sections/"
mv src/ogl/DotArt3D.tsx src/ogl/dotArtShaders.ts src/ogl/formations.ts "$TRASH/ogl/"
mv src/shared/components/ErrorBoundary.tsx src/shared/components/Preloader.tsx src/shared/motion/ScrollScene.tsx "$TRASH/shared/"
ls -R src/features/home
```

Expected: `sections`, holding `BrandFilm.tsx` only (the film seam, 00-index §1.3). On day 1, stop here and park the work (see "When it lands" above).

- [ ] **Step 9: Run the tests, lint, types and the build**

```bash
npx vitest run tests/unit/routes.test.ts
npm run lint && npm run typecheck
npm run build
npx playwright test tests/e2e/first-paint.spec.ts tests/e2e/smoke.spec.ts
```

Expected: 3 passed; lint 0 errors; typecheck 0; the build exits 0, with `node scripts/llms-full.mjs` accepting `/` (40 words or more); Playwright 4 passed. If the first-paint test still counts gaps, look at `FunnelRoot`'s first render: it must render the H1 on its first pass. That fix belongs to lane A.

- [ ] **Step 10: Commit**

```bash
git add src/pages/Index.tsx src/main.tsx src/app/App.tsx src/app/home-route.tsx scripts/routes.mjs \
  src/features/home src/ogl src/shared/components src/shared/motion \
  tests/unit/routes.test.ts tests/e2e/first-paint.spec.ts
git commit -m "feat(home): serve the funnel at / and delete the old homepage (D26)"
git push
```

The 127/30 line leaves with `Hero.tsx` and `SystemDirectory.tsx` here (§8.6). Task 11's dist check fails the build if it ever comes back.

---

### Task 5: The film player for the plan

**Files:**
- Modify: `src/features/home/sections/BrandFilm.tsx` (whole file)
- Modify: `src/shared/ui/vsl-player.tsx:13-20` (the `narrowSrc` note) and `:337-347` (the `<video>` in the click-to-play branch)
- Modify: `src/shared/ui/scroll-autoplay-video.tsx:60` (export `NARROW`)
- Create: `src/features/home/sections/BrandFilm.test.tsx`

**Interfaces:**
- Consumes: `copy("r.film.title")` and `copy("r.film.cap")` from the light entry, `src/features/funnel/data/light.ts` (lane C, day 2, morning); `SPINE_FILM_FILES` (Task 3)
- Produces: `export default function BrandFilm(): JSX.Element`, with no props: a 16:9 click-to-play player that fills its container's width, labelled `r.film.title` (00-index §1.3, decided in §1.5, request 13). The film's `VslConfig` (00-index calls it `BRAND_FILM`) stays private: the file exports only the default and `SPINE_FILM_FILES`, for lane D's own tests. Lane C's lightbox renders `<BrandFilm />` unchanged and never imports `VslPlayer` or a `VslConfig`. It names its dialog with `aria-label={copy("r.film.title")}` instead of a heading, so the title shows once. It keeps `r.film.cap` under the film, and its close button says `r.film.close` (D38). Closing the lightbox unmounts `BrandFilm`, which stops the film.

- [ ] **Step 1: Write the failing test**

`src/features/home/sections/BrandFilm.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { copy } from "@/features/funnel/data/light";
import BrandFilm, { SPINE_FILM_FILES } from "./BrandFilm";

let host: HTMLDivElement;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(() => host.remove());

function mount() {
  host = document.createElement("div");
  document.body.append(host);
  act(() => createRoot(host).render(<BrandFilm />));
}

describe("BrandFilm, the plan's film (§6.5)", () => {
  it("shows the poster and loads no video until a tap (§13.10)", () => {
    mount();
    expect(host.querySelector("video")).toBeNull();
    expect(host.querySelector("img")?.getAttribute("src")).toBe(SPINE_FILM_FILES.poster);
    expect(host.textContent).toContain(copy("r.film.title"));
  });

  it("plays with sound and controls after the tap, and offers the phone file to narrow screens", () => {
    mount();
    const play = host.querySelector("button")!;
    expect(play.getAttribute("aria-label")).toContain(copy("r.film.title"));
    act(() => play.click());
    const video = host.querySelector("video")!;
    expect(video.controls).toBe(true);
    expect(video.muted).toBe(false);
    expect([...video.querySelectorAll("source")].map((s) => [s.getAttribute("media"), s.getAttribute("src")])).toEqual([
      ["(max-width: 767px)", SPINE_FILM_FILES.narrowSrc],
      [null, SPINE_FILM_FILES.src],
    ]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/features/home/sections/BrandFilm.test.tsx`
Expected: FAIL. The first case finds a `<video>` (today's autoplay mode), and `r.film.title` is missing from the text.

- [ ] **Step 3: Replace `BrandFilm.tsx`**

```tsx
import { useMemo } from "react";
import { copy } from "@/features/funnel/data/light";
import VslPlayer, { type VslConfig } from "@/shared/ui/vsl-player";

/**
 * (C) The Business Spine launch film, which the plan opens from "See how it works" (spec §6.5).
 *
 * Lane C's lightbox renders it unchanged (00-index §1.3). It is the click-to-play player: the
 * poster and a play button, and no part of the video loads until the visitor taps play, which
 * then plays it with sound and controls (§13.10: "never preloaded; poster 90 KB at most; video
 * fetched only on tap"). Narrow screens get the phone encode through the player's <source media>.
 *
 * The files are the renamed film, re-rendered with "BRAIN · LIVE" (§6.5, D5): 56.7 s, 1920 × 1080
 * at 60 fps, H.264 with faststart. A new encode gets a new file name, because /media is served
 * immutable for a year (tests/media/immutable.test.ts).
 *
 * No VideoObject schema here: the plan isn't a watch page (src/features/watch/videos.ts says why).
 */
export const SPINE_FILM_FILES = {
  src: "/media/ziiro-business-spine-master.mp4",
  narrowSrc: "/media/ziiro-business-spine-phone.mp4",
  poster: "/media/ziiro-business-spine-poster-1080.jpg",
} as const;

export default function BrandFilm() {
  const film = useMemo<VslConfig>(
    () => ({
      source: { kind: "file", src: SPINE_FILM_FILES.src, narrowSrc: SPINE_FILM_FILES.narrowSrc },
      title: copy("r.film.title"),
      description: copy("r.film.cap"),
      uploadDate: "2026-10-09",
      duration: "PT57S",
      poster: SPINE_FILM_FILES.poster,
    }),
    [],
  );
  return <VslPlayer vsl={film} label={copy("r.film.title")} mode="facade" flush />;
}
```

`runtime` is left out, so the frame shows no "[ 57 SEC ]" written in code.

- [ ] **Step 4: Let the click-to-play player offer the phone file**

In `src/shared/ui/scroll-autoplay-video.tsx:60`, make the breakpoint shared:

```tsx
export const NARROW = "(max-width: 767px)";
```

In `src/shared/ui/vsl-player.tsx`, change the import to `import ScrollAutoplayVideo, { NARROW } from "@/shared/ui/scroll-autoplay-video";`. Replace the `narrowSrc` note (lines 13–20) with:

```ts
      /**
       * Lighter encode for narrow viewports, offered as a <source media> in every mode: the
       * browser picks it on approach in "autoplay" and on the press in "facade". A phone pays
       * for the bytes on a metered plan, so the 1080p master is a tax with nothing bought.
       */
```

Replace the file branch's `<video … src={vslSource.src} …/>` (lines 337–347) with:

```tsx
          <video
            className="absolute inset-0 h-full w-full"
            poster={poster}
            controls
            autoPlay={playing}
            preload={mode === "embed" ? "metadata" : undefined}
            playsInline
          >
            {vslSource.narrowSrc && <source media={NARROW} src={vslSource.narrowSrc} type="video/mp4" />}
            <source src={vslSource.src} type="video/mp4" />
          </video>
```

- [ ] **Step 5: Run the tests, lint, types and the build**

```bash
npx vitest run src/features/home/sections/BrandFilm.test.tsx tests/media/film-files.test.ts
npm run lint && npm run typecheck && npm run build
```

Expected: 6 passed; lint 0 errors; typecheck 0; the build exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/features/home/sections/BrandFilm.tsx src/features/home/sections/BrandFilm.test.tsx \
  src/shared/ui/vsl-player.tsx src/shared/ui/scroll-autoplay-video.tsx
git commit -m "feat(film): make BrandFilm the plan's click-to-play film (§6.5)"
git push
```

---

### Task 6: Trim the app shell

The shell is everything a page loads before it paints, and on the 29 Sep build it weighs 134,151 bytes gz on its own. That leaves 16 KB of §13.10's 150 KB for a funnel chunk allowed 25 KB. Four providers mounted in `App.tsx` are used by no page: `QueryClientProvider` (no `useQuery` anywhere), `TooltipProvider` (no `<Tooltip>`), and the two toasters (nothing calls `toast`). Measured with Vite's build API on 8 Oct, they bundle to 52,090 bytes gz together. 7,633 bytes of that is `cn()` with `tailwind-merge`, which other shell code keeps, so taking the providers out saves about 44 KB.

**Files:**
- Create: `tests/helpers/imports.ts`, `tests/unit/shell-imports.test.ts`
- Modify: `src/app/App.tsx` (the four imports, `queryClient`, `Providers`, and `<Toaster />` and `<Sonner />` in `App`), `vite.config.ts` (the `toast` group)

**Interfaces:**
- Produces: `reachable(entries: string[], followDynamicUnder?: string[]): { files: Set<string>; packages: Set<string> }` and `packageOf(spec: string): string` in `tests/helpers/imports.ts`. `Providers` keeps its name and props, so `entry-server.tsx` is unchanged.

- [ ] **Step 1: Write the import walker**

`tests/helpers/imports.ts`:

```ts
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * (C) A small import walker for spec §13.10's rules. It reads source, not the bundle: static
 * imports always, `import()` only inside the given folders. `import type` is skipped, because
 * TypeScript erases it.
 */
const STATIC_IMPORT = /^\s*(?:import|export)\s+(?!type\s)(?:[^"';]*?\sfrom\s+)?["']([^"']+)["']/gm;
const DYNAMIC_IMPORT = /\bimport\(\s*["']([^"']+)["']\s*\)/g;
const CODE = /\.(?:ts|tsx|js|jsx|mjs)$/;
const CANDIDATES = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", "/index.ts", "/index.tsx"];

/** "react-dom/client" is "react-dom"; "@radix-ui/react-tooltip/x" is "@radix-ui/react-tooltip". */
export const packageOf = (spec: string) => spec.split("/").slice(0, spec.startsWith("@") ? 2 : 1).join("/");

function resolveLocal(from: string, spec: string): string {
  const bare = spec.split("?")[0];
  const base = bare.startsWith("@/") ? path.join("src", bare.slice(2)) : path.join(path.dirname(from), bare);
  const file = CANDIDATES.map((ext) => base + ext).find((f) => existsSync(f) && statSync(f).isFile());
  if (!file) throw new Error(`${from}: can't resolve "${spec}"`);
  return file;
}

export interface Reach { files: Set<string>; packages: Set<string> }

export function reachable(entries: string[], followDynamicUnder: string[] = []): Reach {
  const reach: Reach = { files: new Set(), packages: new Set() };
  const queue = [...entries];
  while (queue.length) {
    const file = queue.pop()!;
    if (reach.files.has(file)) continue;
    reach.files.add(file);
    if (!CODE.test(file)) continue;
    const source = readFileSync(file, "utf8");
    const specs = [...source.matchAll(STATIC_IMPORT)].map((m) => m[1]);
    if (followDynamicUnder.some((dir) => file.startsWith(dir))) {
      specs.push(...[...source.matchAll(DYNAMIC_IMPORT)].map((m) => m[1]));
    }
    for (const spec of specs) {
      if (spec.startsWith(".") || spec.startsWith("@/")) queue.push(resolveLocal(file, spec));
      else reach.packages.add(packageOf(spec));
    }
  }
  return reach;
}
```

- [ ] **Step 2: Write the failing test**

`tests/unit/shell-imports.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { reachable } from "../helpers/imports";

/** Mounted in App.tsx and used by no page: about 44 KB gz on every first load (measured 8 Oct). */
const UNUSED_PROVIDERS = ["@tanstack/react-query", "@radix-ui/react-tooltip", "@radix-ui/react-toast", "sonner"];
/** §13.10: "No WebGL, Spline, framer-motion or Preloader on `/`". */
const NEVER_ON_HOME = ["ogl", "@splinetool/runtime", "framer-motion"];

describe("the app shell, which every page loads before it paints", () => {
  const shell = reachable(["src/main.tsx"]);
  it.each(UNUSED_PROVIDERS)("leaves out %s", (pkg) => {
    expect([...shell.packages]).not.toContain(pkg);
  });
});

describe("everything / can load, the plan included (§13.10)", () => {
  const home = reachable(
    ["src/main.tsx", "src/pages/Index.tsx"],
    ["src/pages/Index.tsx", "src/features/funnel/", "src/features/home/sections/"],
  );
  it.each(NEVER_ON_HOME)("never reaches %s", (pkg) => {
    expect([...home.packages]).not.toContain(pkg);
  });
  it("never reaches the Preloader", () => {
    expect([...home.files].filter((f) => f.includes("Preloader"))).toEqual([]);
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npx vitest run tests/unit/shell-imports.test.ts`
Expected: FAIL on all four providers. The `/` cases pass, because Task 4 has already removed the old hero's WebGL and the Preloader.

- [ ] **Step 4: Take the four providers out of `src/app/App.tsx`**

Delete the first four imports (`Toaster`, `Sonner`, `TooltipProvider`, `QueryClient, QueryClientProvider`) and `const queryClient = new QueryClient();`. `Providers` becomes:

```tsx
/** App-wide providers, shared by the client entry and the SSG server entry. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      {children}
    </ThemeProvider>
  );
}
```

In `App`, delete `<Toaster />` and `<Sonner />`. The unused files in `src/shared/ui/` and their packages stay where they are; this task changes only what loads.

- [ ] **Step 5: Keep react-dom in its own long-lived chunk**

With `sonner` gone, `vite.config.ts`'s `toast` group matches nothing. It only ever held react-dom by accident (its NAMING CAVEAT says so), and react-dom would fall into the entry chunk, which changes on every deploy. Replace the group, and replace the NAMING CAVEAT paragraph with one line:

```ts
            { name: "react", test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
```

```ts
        // The "react" group holds react, react-dom and the scheduler, so a deploy leaves them cached.
```

- [ ] **Step 6: Run the tests, lint, types and the build; check by eye**

```bash
npx vitest run tests/unit/shell-imports.test.ts
npm run lint && npm run typecheck && npm run build
ls dist/assets | grep -E "^(react|toast)-"
npm run test:e2e
```

Expected: 8 passed; lint 0 errors; typecheck 0; the build exits 0; one `react-….js` chunk and no `toast-` chunk; Playwright green. Then open `/contact` in `npm run preview` and send nothing. The page renders as before, because it never used a toast.

- [ ] **Step 7: Commit**

```bash
git add src/app/App.tsx vite.config.ts tests/helpers/imports.ts tests/unit/shell-imports.test.ts
git commit -m "perf: drop four unused providers from the app shell (§13.10)"
git push
```

---

### Task 7: The hero stills, the phone band and the immutable guard

**Files:**
- Create: `public/spine/r17/{light,dark}/hero/hero-{1280,1920,2560}.{avif,webp}` and `phone-{828,1170}.{avif,webp}` (20 files)
- Create: `tests/media/hero-files.test.ts`, `scripts/hash-immutable.mjs`, `tests/media/immutable.json`, `tests/media/immutable.test.ts`
- Modify: `package.json` (script `hash:immutable`)

**Interfaces:**
- Consumes: the landscape stills in `$BUS/funnel/proto/look/web/hero/` and the phone masters in `$BUS/funnel/proto/look/web/hero/masters/phone-{light,dark}.png` (1290 × 2796); `avifSize` and `webpSize` (Task 3); lane B's year-long immutable `/spine/` rule in `vercel.json` (lane B, day 1)
- Produces: the hero-stills seam for lane C's `<picture>` (00-index §1.3, needed day 2). `scripts/hash-immutable.mjs` exports `IMMUTABLE_DIRS`, `MANIFEST`, `filesUnder(dir)`, `sha256(file)` and `readManifest()`.

- [ ] **Step 1: Write the failing tests**

`tests/media/hero-files.test.ts`:

```ts
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { avifSize, webpSize } from "../helpers/image-size";

const THEMES = ["light", "dark"] as const;
const FORMATS = ["avif", "webp"] as const;
const LANDSCAPE = [1280, 1920, 2560];                          // 16:9 (§6.6)
const PHONE: Record<number, number> = { 828: 870, 1170: 1230 }; // the band (D34); no 1290 (D31)
const LIMITS = {                                                // §13.10, bytes
  desktop: { avif: 220_000, webp: 320_000 },
  phone: { avif: 120_000, webp: 180_000 },
};
const sizeOf = { avif: avifSize, webp: webpSize };
const cases = (widths: number[]) => widths.flatMap((w) => FORMATS.map((f) => [w, f] as const));

describe.each(THEMES)("public/spine/r17/%s/hero (§6.6)", (theme) => {
  const dir = `public/spine/r17/${theme}/hero`;

  it("holds exactly the ten phase 1 files", () => {
    const expected = [
      ...cases(LANDSCAPE).map(([w, f]) => `hero-${w}.${f}`),
      ...cases(Object.keys(PHONE).map(Number)).map(([w, f]) => `phone-${w}.${f}`),
    ].sort();
    expect(readdirSync(dir).filter((f) => !f.startsWith(".")).sort()).toEqual(expected);
  });

  it.each(cases(LANDSCAPE))("hero-%i.%s is 16:9 and within the desktop limit", (w, f) => {
    const buf = readFileSync(`${dir}/hero-${w}.${f}`);
    expect(sizeOf[f](buf)).toEqual({ width: w, height: (w * 9) / 16 });
    expect(buf.length).toBeLessThanOrEqual(LIMITS.desktop[f]);
  });

  it.each(cases(Object.keys(PHONE).map(Number)))("phone-%i.%s is the band, within the phone limit", (w, f) => {
    const buf = readFileSync(`${dir}/phone-${w}.${f}`);
    expect(sizeOf[f](buf)).toEqual({ width: w, height: PHONE[w] });
    expect(buf.length).toBeLessThanOrEqual(LIMITS.phone[f]);
  });
});
```

`tests/media/immutable.test.ts`:

```ts
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { IMMUTABLE_DIRS, filesUnder, readManifest, sha256 } from "../../scripts/hash-immutable.mjs";

const manifest: Record<string, string> = readManifest();

describe("files served immutable for a year (/media, /spine)", () => {
  it("records every file: run `npm run hash:immutable` after adding one", () => {
    expect(IMMUTABLE_DIRS.flatMap(filesUnder).filter((f: string) => !manifest[f])).toEqual([]);
  });

  it("never changes a recorded file: new bytes need a new name or folder (§6.6)", () => {
    const changed = Object.entries(manifest).filter(([f, hash]) => existsSync(f) && sha256(f) !== hash);
    expect(changed.map(([f]) => f)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run tests/media/hero-files.test.ts tests/media/immutable.test.ts`
Expected: FAIL with `ENOENT … public/spine/r17/light/hero` and `Failed to load url ../../scripts/hash-immutable.mjs`.

- [ ] **Step 3: Copy the landscape stills.** These are the approved r17 frame, cropped to 16:9 and resized, with nothing re-rendered (§6.6).

```bash
cd "$REPO"
SRC="$BUS/funnel/proto/look/web/hero"
for t in light dark; do
  mkdir -p "public/spine/r17/$t/hero"
  for w in 1280 1920 2560; do for e in avif webp; do
    cp "$SRC/hero-$t-$w.$e" "public/spine/r17/$t/hero/hero-$w.$e"
  done; done
done
```

Don't copy `$SRC/phone-*`. Those are full-height test stills, not the band.

- [ ] **Step 4: Cut and encode the phone band** (§6.6, D34)

```bash
M="$BUS/funnel/proto/look/web/hero/masters"
W=$(mktemp -d)
for t in light dark; do
  for size in 1170:1230 828:870; do
    w=${size%%:*}; h=${size##*:}
    ffmpeg -v error -y -i "$M/phone-$t.png" -vf "crop=1290:1356:0:280,scale=$w:$h:flags=lanczos" -pix_fmt rgb24 "$W/phone-$t-$w.png"
    avifenc -s 6 -q 60 --yuv 444 -d 10 "$W/phone-$t-$w.png" "public/spine/r17/$t/hero/phone-$w.avif"
    cwebp -quiet -q 85 -m 6 -sharp_yuv "$W/phone-$t-$w.png" -o "public/spine/r17/$t/hero/phone-$w.webp"
  done
done
ls -l public/spine/r17/*/hero/phone-*
```

Expected, each within 2 % of §6.6's table: light 1170 is 59.2 KB AVIF and 85.0 KB WebP, light 828 is 37.4 and 55.9 KB; dark 1170 is 42.7 and 59.7 KB, dark 828 is 28.5 and 40.1 KB. A larger gap means the crop or the settings are off, so recheck Step 4 before you go on.

- [ ] **Step 5: Look at the band and the landscape stills.** Run `open public/spine/r17/light/hero/phone-1170.webp public/spine/r17/dark/hero/phone-1170.webp public/spine/r17/light/hero/hero-1920.webp public/spine/r17/dark/hero/hero-1920.webp`. Expected, by eye at full size:
  - The band: four discs whole, G06 down to G03, and both cut edges falling in gaps between discs. No veil, no fade, square edges (§6.6).
  - The landscape stills: right of the spine, level with G05 and G03, the frame is plain enough for `hx.call1` and `hx.call2` to sit there and read (D39). If a bright edge or a disc fills that space, tell the manager and lane C. Where the callouts sit is lane C's call, and the stills are the approved r17 frame, so lane D re-renders nothing.

- [ ] **Step 6: Write the manifest script**

`scripts/hash-immutable.mjs`:

```js
// (C) Records the sha256 of every file served immutable for a year (/media and /spine in
// vercel.json), so a changed file can't ship under a name visitors already cache (spec §6.6).
// Append-only: it adds new files and never rewrites a recorded hash. Run after adding files:
//   npm run hash:immutable
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const IMMUTABLE_DIRS = ["public/media", "public/spine"];
export const MANIFEST = "tests/media/immutable.json";

export function filesUnder(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile() && !d.name.startsWith("."))
    .map((d) => path.join(d.parentPath, d.name))
    .sort();
}

export const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

export const readManifest = () => (existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {});

function main() {
  const manifest = readManifest();
  let added = 0;
  for (const file of IMMUTABLE_DIRS.flatMap(filesUnder)) {
    if (manifest[file]) continue;
    manifest[file] = sha256(file);
    added += 1;
  }
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(MANIFEST, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`${added} added, ${Object.keys(sorted).length} recorded`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
```

Add the script to `package.json`: `"hash:immutable": "node scripts/hash-immutable.mjs",`

- [ ] **Step 7: Record the files and run the tests**

```bash
npm run hash:immutable
npx vitest run tests/media/hero-files.test.ts tests/media/immutable.test.ts
```

Expected: `N added, N recorded`, one per file under `public/media` and `public/spine` (the three spine film files, the 20 stills and the older media files); then all pass.

- [ ] **Step 8: Show that the guard bites, then put the file back**

```bash
KEEP=$(mktemp -d)
cp public/spine/r17/light/hero/hero-1280.avif "$KEEP/"
cp public/spine/r17/dark/hero/hero-1280.avif public/spine/r17/light/hero/hero-1280.avif
npx vitest run tests/media/immutable.test.ts
cp "$KEEP/hero-1280.avif" public/spine/r17/light/hero/hero-1280.avif
npx vitest run tests/media/immutable.test.ts
```

Expected: the first run FAILS and names `public/spine/r17/light/hero/hero-1280.avif`; the second passes.

- [ ] **Step 9: Commit, and tell lane C the stills are in**

```bash
git add public/spine package.json scripts/hash-immutable.mjs tests/media/immutable.json \
  tests/media/hero-files.test.ts tests/media/immutable.test.ts
git commit -m "feat(spine): add the r17 hero stills and the phone band (§6.6, D34)"
git push
```

---

### Task 8: The header

**Files:**
- Merge: `ziiroai/feat/mobile-burger-nav` (`f6bf9ec`: `src/shared/components/Navbar.tsx` and `src/index.css` only)
- Modify: `src/shared/components/Navbar.tsx` (after the merge: imports, `LINKS` at lines 62–71, the component's state, the `<nav>`, the logo at line 528, the menu at lines 644–700, the call to action at lines 733–769, the burger at line 778)
- Create: `src/shared/components/Navbar.test.tsx`, `tests/e2e/nav.spec.ts`

**Interfaces:**
- Consumes: `funnelSession: FunnelSession` from `src/features/funnel/flow/session.ts` (lane A), with `leadContact()`, `reportCta(from)`, `stage(): FunnelStage` and `subscribe(onChange: () => void): () => void` (00-index §1.2, decided in §1.5, request 1). `subscribe` fires when `stage()` or `leadContact()` changes. The stub is on the branch from day 1 and the complete session from day 4 (00-index §2.2); the unit test mocks it, so nothing waits. Also `copy` and `calendlyUrl(name, email)` from the light entry, `src/features/funnel/data/light.ts` (lane C, day 2, morning), `INTERIM_BOOKING_URL` from `src/features/pricing/entities/rates.ts`, and the funnel colour properties `--funnel-bg`, `--funnel-fg`, `--funnel-muted` and `--funnel-line` (lane A, 00-index §1.3).
- Produces: the header on every page. On `/` it shows only the logo while `stage()` is `"questions"` (D6). Both "Book a call" links open Calendly in a new tab and report `ctaFrom: "header"`.

The `funnelSession` stub lands on day 1 (00-index §1.3), so this task can land on day 2 against it. `light.ts` re-exports `contract.ts`, so the header takes `FunnelStage` from the same import as `copy`.

- [ ] **Step 1: Merge the burger branch**

```bash
git fetch ziiroai
git merge --no-ff ziiroai/feat/mobile-burger-nav -m "Merge the phone burger menu (feat/mobile-burger-nav)"
```

Expected: no conflict. It changes `Navbar.tsx` and `src/index.css`, and checked on 8 Oct, dev hasn't touched either since the branch was cut. In `src/index.css` the burger's edits start at line 451, far below lane A's two `@import` lines at the top (day 1). Lane D owns the file (00-index §1.3), so a conflict there is lane D's to settle: keep lane A's two `@import` lines as the first two lines, above `@tailwind base;`, and keep both sides' blocks below them.

- [ ] **Step 2: Write the failing unit test**

`src/shared/components/Navbar.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { copy, type FunnelStage } from "@/features/funnel/data/light";
import { INTERIM_BOOKING_URL } from "@/features/pricing/entities/rates";

type Stage = FunnelStage;
type Lead = { name: string; email: string } | null;

const session = vi.hoisted(() => {
  let stage: Stage = "questions";
  let lead: Lead = null;
  const listeners = new Set<() => void>();
  return {
    reportCta: vi.fn(),
    leadContact: () => lead,
    stage: () => stage,
    subscribe: (onChange: () => void) => {
      listeners.add(onChange);
      return () => void listeners.delete(onChange);
    },
    set(next: Stage, contact: Lead) {
      stage = next;
      lead = contact;
      listeners.forEach((onChange) => onChange());
    },
  };
});
vi.mock("@/features/funnel/flow/session", () => ({ funnelSession: session }));
vi.mock("@/shared/motion/SmoothScroll", () => ({ scrollTo: vi.fn() }));

import Navbar from "./Navbar";

const ANANYA = { name: "Ananya & Co+ अनन्या", email: "a+b@x.com" };
let host: HTMLDivElement;
let root: Root;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = (query: string) =>
    ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {},
       addListener() {}, removeListener() {}, dispatchEvent: () => false }) as MediaQueryList;
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
  // jsdom can't navigate: stop the anchor's default action after React's handler has run.
  document.addEventListener("click", (e) => e.preventDefault());
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  session.set("questions", null);
  session.reportCta.mockClear();
});

function show(path: string) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<MemoryRouter initialEntries={[path]}><Navbar /></MemoryRouter>));
}

const links = () => [...host.querySelectorAll<HTMLAnchorElement>("a")];
const named = (id: string) => links().filter((a) => a.textContent?.trim() === copy(id));
const click = (el: HTMLElement) => act(() => void el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));

describe("the header (§6.2 block 0)", () => {
  it("shows only the logo on / while the questions run (D6)", () => {
    show("/");
    expect(links()).toHaveLength(1);
    expect(links()[0].getAttribute("aria-label")).toBe(copy("nav.home.aria"));
    expect(host.querySelector("button")).toBeNull();
  });

  it("brings the links and the pill once the plan is on screen, and hides them again on Back (§4.1)", () => {
    show("/");
    act(() => session.set("plan", ANANYA));
    for (const id of ["nav.mission", "nav.who", "nav.products"]) expect(named(id)).toHaveLength(1);
    expect(named("nav.btn")).toHaveLength(2);
    act(() => session.set("questions", ANANYA));
    expect(links()).toHaveLength(1);
  });

  it("shows the links on every other page, with the burger labelled ph.nav.menu (D14)", () => {
    show("/mission");
    expect(named("nav.mission")).toHaveLength(1);
    expect(host.querySelector("button[aria-controls='site-menu']")?.getAttribute("aria-label")).toBe(copy("ph.nav.menu"));
  });

  it("opens Calendly in a new tab with the name and email from S7, intact (§6.3)", () => {
    show("/");
    act(() => session.set("plan", ANANYA));
    for (const pill of named("nav.btn")) {
      click(pill);
      const url = new URL(pill.href);
      expect(`${url.origin}${url.pathname}`).toBe(INTERIM_BOOKING_URL);
      expect(url.searchParams.get("name")).toBe(ANANYA.name);
      expect(url.searchParams.get("email")).toBe(ANANYA.email);
      expect(pill.target).toBe("_blank");
      expect(pill.rel).toContain("noopener");
    }
    expect(session.reportCta).toHaveBeenCalledWith("header");
  });

  it("opens the plain Calendly event before anyone has sent S7 (D14)", () => {
    show("/mission");
    const [pill] = named("nav.btn");
    click(pill);
    expect(pill.href).toBe(INTERIM_BOOKING_URL);
  });

  it("takes the funnel's colours on /, so it follows the visitor's theme (D9)", () => {
    show("/");
    expect(host.querySelector("nav")?.getAttribute("style")).toContain("--background: var(--funnel-bg)");
  });

  it("keeps the site's colours on every other page", () => {
    show("/mission");
    const nav = host.querySelector("nav");
    expect(nav).not.toBeNull();
    expect(nav!.getAttribute("style") ?? "").not.toContain("--funnel-bg");
  });
});
```

`tests/e2e/nav.spec.ts`:

```ts
import { expect, test } from "./fixtures";
import { copy } from "../../src/features/funnel/data/light";

test.describe("the header on a phone (§6.2, D14)", () => {
  test.skip(({ isMobile }) => !isMobile, "the burger is phone-only");

  test("opens the menu with three links and the pill, and closes on Escape", async ({ page }) => {
    await page.goto("/mission");
    const menu = page.getByRole("button", { name: copy("ph.nav.menu") });
    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    const sheet = page.locator("#site-menu");
    for (const id of ["nav.mission", "nav.who", "nav.products", "nav.btn"]) {
      await expect(sheet.getByRole("link", { name: copy(id), exact: true })).toBeVisible();
    }
    await page.keyboard.press("Escape");
    await expect(menu).toHaveAttribute("aria-expanded", "false");
  });
});
```

- [ ] **Step 3: Run them and watch them fail**

Run: `npx vitest run src/shared/components/Navbar.test.tsx`
Expected: FAIL. On `/`, `links()` holds the logo and the three links (4, not 1), and the logo reads `Ziiro home`.

- [ ] **Step 4: Change the imports and the links**

At the top of `Navbar.tsx`:

```tsx
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type MouseEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { calendlyUrl, copy, type FunnelStage } from "@/features/funnel/data/light";
import { funnelSession } from "@/features/funnel/flow/session";
import { INTERIM_BOOKING_URL } from "@/features/pricing/entities/rates";
import ZiiroMark from "@/shared/ui/ziiro-mark";
import { CSS_EASE, DURATION, STAGGER, TRAVEL } from "@/shared/motion/tokens";
import { scrollTo } from "@/shared/motion/SmoothScroll";
```

`LINKS` (lines 62–71) takes copy IDs. Keep the comment about Contact:

```tsx
const LINKS = [
  { copyId: "nav.mission", to: "/mission" },
  { copyId: "nav.who", to: "/who-we-are" },
  { copyId: "nav.products", to: "/products" },
] as const;
```

Under `LINKS`, add:

```tsx
/** The funnel's stage (D6): on `/` the bar shows only the logo until the plan is on screen. */
const subscribeStage = (onChange: () => void) => funnelSession.subscribe(onChange);
const readStage = (): FunnelStage => funnelSession.stage();
const serverStage = (): FunnelStage => "questions";

/** Calendly with the visitor's name and email once S7 has gone, else the plain event (§6.3, D14). */
function bookingHref(): string {
  const lead = funnelSession.leadContact();
  return lead ? calendlyUrl(lead.name, lead.email) : INTERIM_BOOKING_URL;
}

/**
 * On `/` the bar takes the funnel's colours (00-index §1.3), so it follows the visitor's theme
 * (D9) instead of the site's forced dark (App.tsx Providers). Default, owner can veto.
 */
const FUNNEL_BAR_COLOURS = {
  "--background": "var(--funnel-bg)",
  "--text-primary": "var(--funnel-fg)",
  "--text-secondary": "var(--funnel-muted)",
  "--text-muted": "var(--funnel-muted)",
  "--border": "var(--funnel-line)",
  "--border-strong": "var(--funnel-muted)",
} as CSSProperties;
```

- [ ] **Step 5: Add the stage and the booking handler to the component**

After `const [open, setOpen] = useState(false);`:

```tsx
  const stage = useSyncExternalStore(subscribeStage, readStage, serverStage);
  const logoOnly = pathname === "/" && stage === "questions";
  useEffect(() => {
    if (logoOnly) setOpen(false);
  }, [logoOnly]);
  const onBook = (e: MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.href = bookingHref();
    funnelSession.reportCta("header");
    setOpen(false);
  };
```

- [ ] **Step 6: Change the markup**

- `<nav ref={navRef} …>` gets `style={pathname === "/" ? FUNNEL_BAR_COLOURS : undefined}`.
- The logo (line 528): `aria-label={copy("nav.home.aria")}`.
- Wrap the whole `<div id="site-menu" …>…</div>` (lines 644–700) in `{!logoOnly && (…)}`. Inside it, the link label `{link.label}` becomes `{copy(link.copyId)}`.
- The phone menu's foot (lines 679–698) becomes an anchor; the SVG inside stays as it is:

```tsx
            <a
              href={INTERIM_BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onBook}
              className="site-menu-cta"
            >
              {copy("nav.btn")}
              {/* the arrow <svg> stays as it is */}
            </a>
```

- Wrap the right-hand group, `<div className="flex items-center gap-2.5">…</div>` (lines 733–809), in `{!logoOnly && (…)}`. Its pill (lines 750–768) becomes an anchor with the same attributes, classes and style:

```tsx
            <a
              href={INTERIM_BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onBook}
              data-reveal
              tabIndex={ctaIdle ? -1 : undefined}
              aria-hidden={ctaIdle || undefined}
              className="flex min-h-[44px] items-center rounded-full bg-[var(--text-primary)] px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--background)] hover:opacity-90 max-sm:border max-sm:border-[var(--border)] max-sm:bg-[var(--background)] max-sm:text-[var(--text-primary)] max-[359px]:px-3.5"
              style={micro("opacity")}
            >
              {copy("nav.btn")}
            </a>
```

- The burger (line 778): `aria-label={copy("ph.nav.menu")}`. `aria-expanded` already carries its state.

- [ ] **Step 7: Run the tests, lint, types and the build**

```bash
npx vitest run src/shared/components/Navbar.test.tsx
npx vitest run src/features/funnel/flow/tokens.test.ts
npm run lint && npm run typecheck && npm run build
npx playwright test tests/e2e/nav.spec.ts tests/e2e/smoke.spec.ts
```

Expected: 7 passed; lane A's tokens test passes, so the merge kept its two `@import` lines first; lint 0 errors; typecheck 0; the build exits 0; Playwright 3 passed (`nav.spec.ts` skips on desktop). Then look by eye in `npm run preview` at 390 and 1440 wide: on `/mission`, the menu, the pill and the burger look as on the burger branch; on `/`, only the logo shows.

- [ ] **Step 8: Commit**

```bash
git add src/shared/components/Navbar.tsx src/shared/components/Navbar.test.tsx tests/e2e/nav.spec.ts
git commit -m "feat(nav): header pill opens Calendly; logo only while the questions run (D6, D14)"
git push
```

---

### Task 9: The old homepage's CSS

The old homepage's rules stay in `src/index.css` after Task 4 deleted the components. Checked on 8 Oct, these selectors are used nowhere else:
- 46 classes, covered by the prefixes `cb-`, `zo-`, `glass-brain`, `directory-`, plus `hero-scroll-dot`, `map-focus` and `neo-inset`;
- the attributes `data-live`, `data-dragging`, `data-map-node`, `data-map-reveal`, `data-dir-dark`, `data-hero-reveal` and `data-hero-stage-fade`;
- the keyframes `cb-reveal-failsafe`, the seven `directory-*` and `hero-scroll-dot`.

Keep `hero-drift-a` and `hero-drift-b`: `PageAtmosphere` uses them.

**Files:**
- Modify: `src/index.css`
- Create: `tests/unit/old-home-css.test.ts`

**Interfaces:**
- Consumes: Task 8's merge (the burger's `.site-menu` rules sit in the same file, so this task comes after it); lane A's two `@import` lines at the top of the file (lane A, Task 1, Step 5), which stay first

- [ ] **Step 1: Write the failing test**

`tests/unit/old-home-css.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/index.css", "utf8");
const OLD_HOME: RegExp[] = [
  /\.cb-[a-z]/, /\.zo-[a-z]/, /\.glass-brain/, /\.directory-[a-z]/, /\.hero-scroll-dot/, /\.map-focus/, /\.neo-inset/,
  /\[data-(?:live|dragging|map-node|map-reveal|dir-dark|hero-reveal|hero-stage-fade)\b/,
  /@keyframes\s+(?:cb-reveal-failsafe|directory-[a-z-]+|hero-scroll-dot)\b/,
];

describe("src/index.css after the old homepage (D26)", () => {
  it.each(OLD_HOME.map((re) => [re.source, re] as const))("has no rule for %s", (_name, re) => {
    expect(css).not.toMatch(re);
  });

  it("keeps hero-drift-a and hero-drift-b, which PageAtmosphere uses", () => {
    expect(css).toMatch(/@keyframes\s+hero-drift-a\b/);
    expect(css).toMatch(/@keyframes\s+hero-drift-b\b/);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/unit/old-home-css.test.ts`
Expected: FAIL on all nine patterns. The `hero-drift` case passes.

- [ ] **Step 3: Take screenshots of every other page before you edit**

`tests/e2e/css-unchanged.spec.ts` is a one-off spec. It is never committed.

```ts
import { expect, test } from "./fixtures";
import { routePaths } from "../../scripts/routes.mjs";

test.use({ reducedMotion: "reduce" });
for (const path of routePaths.filter((p: string) => p !== "/")) {
  test(`looks the same: ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot({ fullPage: true, animations: "disabled", maxDiffPixelRatio: 0.01 });
  });
}
```

```bash
npm run build
npx playwright test tests/e2e/css-unchanged.spec.ts --update-snapshots
```

Expected: 26 snapshots written (13 pages, two projects).

- [ ] **Step 4: Delete the rules**

Find them with `grep -n -E "\.(cb-|zo-|glass-brain|directory-|hero-scroll-dot|map-focus|neo-inset)|\[data-(live|dragging|map-node|map-reveal|dir-dark|hero-reveal|hero-stage-fade)|@keyframes (cb-reveal-failsafe|directory-|hero-scroll-dot)" src/index.css`.

- Delete every rule whose selectors are all old ones.
- Where a rule's selector list mixes old and live selectors, delete only the old ones from the list.
- Delete the listed `@keyframes` blocks, any `@media` or `@supports` block left empty, and comments that only describe deleted rules.
- Leave the first two lines, lane A's `@import`s, as they are.

- [ ] **Step 5: Run the tests and compare the screenshots**

```bash
npx vitest run tests/unit/old-home-css.test.ts
npx vitest run src/features/funnel/flow/tokens.test.ts
npm run build
npx playwright test tests/e2e/css-unchanged.spec.ts
```

Expected: 10 passed; lane A's tokens test passes; the build exits 0; 26 screenshots match. A diff means a live rule went too, so put it back.

- [ ] **Step 6: Drop the one-off spec, then commit**

```bash
TRASH=$(mktemp -d)
mv tests/e2e/css-unchanged.spec.ts tests/e2e/css-unchanged.spec.ts-snapshots "$TRASH/"
git add src/index.css tests/unit/old-home-css.test.ts
git commit -m "refactor(css): delete the old homepage's rules (D26)"
git push
```

---

### Task 10: Prerender checks, and the `/` line in llms.txt

**Files:**
- Create: `tests/build/home-html.check.ts`, `tests/build/sitemap.check.ts`
- Modify: `public/llms.txt:21`

**Interfaces:**
- Consumes: `dist/` from `npm run build`. Lane A's prerendered S0 + S1 provides "Hello.", `s0.sub.day`, `s0.promise`, the H2 `s1.q`, five buttons, `g.about` and `g.noscript` inside `<noscript>` (§8.2). Also `routePaths` from `scripts/routes.mjs`, and the footer's links (`Footer.tsx` links all 13 other pages, checked 8 Oct).

- [ ] **Step 1: Write the failing checks**

`tests/build/home-html.check.ts`:

```ts
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { copy } from "../../src/features/funnel/data/light";
import { INTERIM_BOOKING_URL } from "../../src/features/pricing/entities/rates";
import { routePaths } from "../../scripts/routes.mjs";

const HTML_GZ_MAX = 30_000; // §13.10
const read = (file: string) => readFileSync(file, "utf8");
const page = (file: string) => new JSDOM(read(file)).window.document; // scripting off: <noscript> parses as markup
const text = (el: Element | null | undefined) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

describe("dist/index.html, the prerendered / (§8.2, §12)", () => {
  const html = read("dist/index.html");
  const doc = page("dist/index.html");

  it("has one H1, the static greeting (§4.2)", () => {
    const h1s = [...doc.querySelectorAll("h1")];
    expect(h1s.map(text)).toEqual(["Hello."]);
  });

  it("holds s0.sub.day, s0.promise and g.about as text", () => {
    for (const id of ["s0.sub.day", "s0.promise", "g.about"]) expect(text(doc.body)).toContain(copy(id));
  });

  it("asks S1 as an H2 with its five options as real buttons", () => {
    expect([...doc.querySelectorAll("h2")].map(text)).toContain(copy("s1.q"));
    const buttons = [...doc.querySelectorAll("button")].map(text);
    for (const i of [1, 2, 3, 4, 5]) expect(buttons).toContain(copy(`s1.o${i}`));
  });

  it("tells a visitor without JavaScript how to book a call (g.noscript)", () => {
    const noscript = [...doc.querySelectorAll("noscript")].find((n) => text(n).includes(copy("g.noscript")));
    expect(noscript).toBeDefined();
    expect(noscript!.querySelector(`a[href^="${INTERIM_BOOKING_URL}"]`)).not.toBeNull();
  });

  it("links every other page from the footer (§8.2)", () => {
    const hrefs = [...doc.querySelectorAll("footer a[href]")].map((a) => a.getAttribute("href"));
    for (const path of routePaths.filter((p: string) => p !== "/")) expect(hrefs).toContain(path);
  });

  it("shows only the logo in the header on /, and the links elsewhere (D6, D14)", () => {
    expect(doc.querySelector("#site-menu")).toBeNull();
    expect(page("dist/mission/index.html").querySelectorAll("#site-menu a")).toHaveLength(4);
  });

  it("weighs 30 KB gz or less (§13.10)", () => {
    expect(gzipSync(html).length).toBeLessThanOrEqual(HTML_GZ_MAX);
  });
});

describe("llms files describe / from its own words (§8.3)", () => {
  it("dist/llms-full.txt's / section holds g.about and S1's question", () => {
    const full = read("dist/llms-full.txt");
    const start = full.indexOf("URL: https://ziiroai.com/\n");
    const section = full.slice(start, full.indexOf("\n---\n", start));
    expect(start).toBeGreaterThan(0);
    expect(section).toContain(copy("g.about"));
    expect(section).toContain(copy("s1.q"));
  });

  it("dist/llms.txt's / line uses g.about and S1's question", () => {
    const line = read("dist/llms.txt").split("\n").find((l) => l.startsWith("- [Ziiro AI](https://ziiroai.com)"));
    expect(line).toContain(copy("g.about"));
    expect(line).toContain(copy("s1.q"));
  });
});
```

`#site-menu a` counts 4 on `/mission`: three links and the phone foot's pill, which lives inside the menu.

`tests/build/sitemap.check.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { routePaths } from "../../scripts/routes.mjs";

describe("dist/sitemap.xml (§12: no new URL in phase 1)", () => {
  it("lists exactly the 14 routes, in route-table order", () => {
    const locs = [...readFileSync("dist/sitemap.xml", "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toEqual(routePaths.map((p: string) => `https://ziiroai.com${p}`));
  });
});
```

- [ ] **Step 2: Build and watch them fail**

```bash
npm run build && npm run check:build
```

Expected: FAIL only on the llms.txt line, which still reads "AI that has to pay for itself …". If any other case fails, the prerendered S0 + S1 isn't complete yet. That's lane A's task, so record it and land these checks once it is.

- [ ] **Step 3: Rewrite the `/` line in `public/llms.txt`**

Line 21 becomes (default, owner can veto):

```
- [Ziiro AI](https://ziiroai.com): The home page. It says hello, asks "What do you do?" and a few more questions, then puts together a plan for the visitor's business in about a minute. ziiro AI is an AI consultancy based in India, working with teams worldwide.
```

It drops "AI that has to pay for itself" (Appendix A, Value) and "an hourly consultation", which the funnel no longer offers on `/`.

- [ ] **Step 4: Build and run the checks**

```bash
npm run build && npm run check:build
```

Expected: all pass (9 in `home-html.check.ts`, 1 in `sitemap.check.ts`).

- [ ] **Step 5: Commit**

```bash
git add tests/build/home-html.check.ts tests/build/sitemap.check.ts public/llms.txt
git commit -m "test(build): check the prerendered /, the sitemap and llms (§8.2, §12)"
git push
```

---

### Task 11: The claims check

**Files:**
- Create: `tests/claims/patterns.ts`, `tests/claims/sources.ts`, `tests/claims/claims.test.ts`, `tests/build/claims-dist.check.ts`

**Interfaces:**
- Consumes:
  - `COPY_LINES: Readonly<Record<string, string>>` and `copy` from the light entry, `src/features/funnel/data/light.ts` (00-index §1.5, request 2; lane C, day 2, morning). `composePlan` from the full entry, plus `CHIPS`, `TEAM_BANDS`, `REVENUE_BANDS` and `CURRENCIES` from `contract.ts`.
  - `PlanPage(props: PlanPageProps)` from `src/features/funnel/plan/PlanPage.tsx` (lane C, day 3, finished day 4).
  - `buildPlanEmail(input: PlanEmailInput): Email` and both types from `api/funnel/_email.ts` (lane B, Task 8, day 3; 00-index §1.5, request 3), where `PlanEmailInput = { name: string; email: string; problemText?: string; chips: ChipId[]; plan: LeadPlan }` and `Email = { subject: string; text: string }`. `LeadPlan` now carries `fallback` (request 16), which the email reads to pick `em.need.fallback`.
- Produces: `npx vitest run tests/claims` (00-index I-T3, whose step 1 also runs `npm run build && npm run check:build`). It fails on the funnel's copy lines, every reachable plan page, every plan email and `public/llms.txt`. `tests/build/claims-dist.check.ts` fails on the prerendered `/` and its llms-full section, and writes `test-results/claims-report.md` for every other page without failing (§12).

- [ ] **Step 1: Write the patterns**

`tests/claims/patterns.ts`:

```ts
/**
 * (C) The claims check's patterns (spec §12, Appendix A). Each rule runs on one sentence at a time.
 * Lines that may put 33 next to "today" are named by ID, and their filled-in sentences are allowed
 * wherever they appear (the plan, the email, the meta description).
 */
export interface ClaimRule { id: string; why: string; test(sentence: string): boolean }

const has = (re: RegExp) => (s: string) => re.test(s);
const both = (a: RegExp, b: RegExp) => (s: string) => a.test(s) && b.test(s);

export const RULES: ClaimRule[] = [
  { id: "free", why: "\"free audit\"; any free session (Appendix A, Price)", test: has(/\bfree\s+(?:business\s+)?(?:audit|consult\w*|session|call|analysis|strategy)/i) },
  { id: "price", why: "a price figure outside S5's bands (§12)", test: has(/[₹$€£]\s?\d|\b(?:rs\.?|inr|usd)\s?\d|\d\s?(?:rupees|dollars|inr|usd)\b|\bsave\s+[₹$]/i) },
  { id: "old-counts", why: "\"127 jobs\", \"30 agents\", \"107\", \"11 run\" (§12)", test: has(/\b127\b|\b30\s+agents\b|\b107\b|\b11\s+run/i) },
  { id: "runs", why: "\"run end-to-end\", \"jobs live\", \"all demoable\" (§12)", test: has(/\brun\s+end[- ]to[- ]end\b|\bjobs\s+live\b|\ball\s+demoable\b/i) },
  { id: "33-today", why: "33 in a sentence with running, live, built, ready or today (§12)", test: both(/\b33\b/, /\b(?:running|live|built|ready|today)\b/i) },
  { id: "our-33", why: "\"our 33 agents\", \"33 AI employees\" (§12)", test: has(/\bour\s+33\b|\b33\s+AI\s+employees\b/i) },
  { id: "spine-live", why: "\"Spine\" in a sentence with \"live\" (§12)", test: both(/\bSpine\b/, /\blive\b/i) },
  { id: "proof", why: "\"case stud\" or \"testimonial\" on a funnel page (§12)", test: has(/case\s+stud|testimonial/i) },
  { id: "value", why: "\"AI that pays for itself\"; \"cheaper than hiring\" (Appendix A)", test: has(/pays?\s+for\s+itself|cheaper\s+than\s+hiring/i) },
  { id: "users", why: "\"used by clients\", \"trusted by businesses\" (Appendix A)", test: has(/used\s+by\s+clients|trusted\s+by\s+businesses/i) },
  { id: "agent-state", why: "\"ready agent\", \"live agent\" (Appendix A)", test: has(/\b(?:ready|live)\s+agents?\b/i) },
  { id: "calls", why: "\"an AI calls every lead inside 60 s\" (Appendix A)", test: has(/calls?\s+every\s+lead/i) },
];

/** Appendix A: "The only lines that may put 33 in the same sentence as 'today'". */
export const ALLOWED_33_TODAY = ["sp.hero.h", "ph.hero.h", "em.need", "em.need.fallback", "seo.home.desc"];
/** S5's revenue bands are the only figures with a currency sign (§12). */
export const ALLOWED_PRICE = ["s5.o.IN", "s5.o.other"];

export const sentences = (text: string) =>
  text.split(/(?<=[.!?…])\s+|\n+/).map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);

/** Elements that start a new line when a browser draws them. */
const BLOCKS = "address,article,aside,blockquote,br,button,dd,div,dl,dt,figcaption,figure,footer,form,h1,h2,h3,h4,h5,h6,header,hr,label,li,main,nav,ol,p,pre,section,summary,table,td,th,tr,ul";

/**
 * An element's words with a line break around every block. textContent runs neighbouring blocks
 * together ("…you need only 6 today.Here they are"), which would merge two sentences into one.
 * It adds text nodes to the element, so pass a freshly parsed copy.
 */
export function readableText(root: Element): string {
  for (const el of root.querySelectorAll(BLOCKS)) {
    el.before("\n");
    el.after("\n");
  }
  return root.textContent ?? "";
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A raw line's sentences as patterns, each {placeholder} matching any text. */
export const templatePatterns = (line: string) =>
  sentences(line).map((s) => new RegExp(`^${escape(s).replace(/\\\{[^}]*\\\}/g, ".+?")}$`, "i"));

/** The filled-in forms of the lines Appendix A lets put 33 next to "today". Pass COPY_LINES. */
export const allowedSentences = (lines: Readonly<Record<string, string>>) =>
  ALLOWED_33_TODAY.flatMap((id) => templatePatterns(lines[id] ?? ""));

export interface ScanOptions { id?: string; allowedSentences?: RegExp[] }

/** Every rule a text breaks, as `rule: "sentence"`. */
export function findClaims(text: string, { id, allowedSentences = [] }: ScanOptions = {}): string[] {
  return sentences(text).flatMap((sentence) =>
    RULES.filter((rule) => {
      if (!rule.test(sentence)) return false;
      if (rule.id === "33-today" && id && ALLOWED_33_TODAY.includes(id)) return false;
      if (rule.id === "33-today" && allowedSentences.some((re) => re.test(sentence))) return false;
      if (rule.id === "price" && id && ALLOWED_PRICE.includes(id)) return false;
      return true;
    }).map((rule) => `${rule.id}: "${sentence}"`),
  );
}
```

- [ ] **Step 2: Write the sources**

`tests/claims/sources.ts`:

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { buildPlanEmail, type PlanEmailInput } from "../../api/funnel/_email";
import {
  CHIPS, CURRENCIES, REVENUE_BANDS, TEAM_BANDS, type ChipId, type PlanDescriptor,
} from "../../src/features/funnel/data/contract";
import { composePlan } from "../../src/features/funnel/data";
import { PlanPage } from "../../src/features/funnel/plan/PlanPage";

export const VISITOR = { name: "Ananya", email: "ananya@example.com" };

export interface Reached { plan: PlanDescriptor; chips: ChipId[]; problemText: string }

/**
 * The words that reach each plan: each chip alone, an unclassified sentence, and the hiring lane. No chip leads to
 * hiring, and text under 4 words with no chip is unclassified (§5.2 rule 6), so the hiring words are a sentence:
 * the one lane C's plans test uses for its hiring route.
 */
const WORDS: { chips: ChipId[]; problemText: string }[] = [
  ...CHIPS.map((chip) => ({ chips: [chip], problemText: "" })),
  { chips: [], problemText: "We sell furniture." },
  { chips: [], problemText: "we just can't find good people for the studio" },
];

/** Every distinct plan the composer can produce, at every size and in both currencies. */
export function reachablePlans(): Reached[] {
  const seen = new Map<string, Reached>();
  for (const words of WORDS) for (const teamBand of TEAM_BANDS) for (const revenueBand of REVENUE_BANDS) for (const currency of CURRENCIES) {
    const plan = composePlan({ ...words, teamBand, revenueBand, currency });
    const key = [plan.orderVariant, plan.lane, plan.tier, plan.fallback, plan.currency].join("|");
    if (!seen.has(key)) seen.set(key, { plan, ...words });
  }
  return [...seen.values()];
}

export const planName = ({ plan }: Reached) =>
  `${plan.orderVariant}${plan.lane ? `+${plan.lane}` : ""} ${plan.tier}${plan.fallback ? " fallback" : ""} ${plan.currency}`;

export function planHtml({ plan, chips, problemText }: Reached): string {
  return renderToStaticMarkup(
    createElement(HelmetProvider, null,
      createElement(MemoryRouter, null,
        createElement(PlanPage, { plan, visitor: VISITOR, words: { problemText, chips }, saveNotice: null, onProgress: () => {} }))),
  );
}

/**
 * The plan email's subject and text for this plan (lane B, Task 8). PlanEmailInput needs no visit ID,
 * consent or token, so the check can write an email for every plan (00-index §1.5, request 3). The plan
 * carries fallback (request 16), so a support L plan and an unclassified L plan get different emails.
 */
export function emailText({ plan, chips, problemText }: Reached): string {
  const input: PlanEmailInput = {
    name: VISITOR.name,
    email: VISITOR.email,
    ...(problemText ? { problemText } : {}),
    chips,
    plan: {
      template: plan.template, orderVariant: plan.orderVariant, tier: plan.tier, agentIds: plan.agentIds,
      matchedPhrases: plan.matchedPhrases, classifierVersion: plan.classifierVersion, agentsVersion: plan.agentsVersion,
      fallback: plan.fallback,
    },
  };
  const email = buildPlanEmail(input);
  return `${email.subject}\n${email.text}`;
}
```

- [ ] **Step 3: Write the failing test**

`tests/claims/claims.test.ts`:

```ts
// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COPY_LINES, copy } from "../../src/features/funnel/data/light";
import { allowedSentences, findClaims, readableText } from "./patterns";
import { emailText, planHtml, planName, reachablePlans } from "./sources";

const plans = reachablePlans();
const allowed = allowedSentences(COPY_LINES);
const doc = (html: string) => new DOMParser().parseFromString(html, "text/html");
const textOf = (html: string) => readableText(doc(html).body);

/** The words of every link and button after cta.h, the close's heading (§6.2 block 4). */
function ctasAfterClose(html: string): string[] {
  const d = doc(html);
  const heading = [...d.body.querySelectorAll("*")].find((el) => el.children.length === 0 && el.textContent?.trim() === copy("cta.h"));
  if (!heading) throw new Error("the plan has no cta.h");
  return [...d.body.querySelectorAll("a, button")]
    .filter((el) => heading.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)
    .map((el) => (el.textContent ?? "").replace(/\s+/g, " ").trim());
}

describe("the claims check (spec §12, Appendix A)", () => {
  it("passes on every copy line", () => {
    const hits = Object.entries(COPY_LINES).flatMap(([id, line]) => findClaims(line, { id }).map((h) => `${id} ${h}`));
    expect(hits).toEqual([]);
  });

  it("reaches all 27 plans", () => {
    expect(new Set(plans.map(({ plan }) => `${plan.orderVariant}|${plan.lane}|${plan.tier}`)).size).toBe(27);
  });

  it.each(plans.map((p) => [planName(p), p] as const))("passes on the plan page: %s", (_name, reached) => {
    const html = planHtml(reached);
    expect(findClaims(textOf(html), { allowedSentences: allowed })).toEqual([]);
    expect(ctasAfterClose(html)).toEqual([copy("cta.btn")]);
    if (reached.plan.pilot) expect(textOf(html)).toContain(copy("sp.pilot"));
  });

  it.each(plans.map((p) => [planName(p), p] as const))("passes on the plan email: %s", (_name, reached) => {
    expect(findClaims(emailText(reached), { allowedSentences: allowed })).toEqual([]);
  });

  it("passes on public/llms.txt", () => {
    expect(findClaims(readFileSync("public/llms.txt", "utf8"), { allowedSentences: allowed })).toEqual([]);
  });
});
```

- [ ] **Step 4: Run it and watch it fail on the parts that exist**

Run: `npx vitest run tests/claims`

Expected on day 3: the copy-lines and llms cases run, and every case that needs `PlanPage` or `buildPlanEmail` fails to import. To see the check bite, put the old llms line from Task 10 back by hand: the llms case then FAILS with `value: "AI that has to pay for itself."`. Undo it.

Until `PlanPage` (lane C, day 3, finished day 4) and `buildPlanEmail` (lane B, day 3) are on the branch, keep `sources.ts` and the plan and email cases local (00-index §2.2). Commit `patterns.ts` with a smaller `claims.test.ts` that holds only the copy-lines and llms cases; neither needs `sources.ts`.

- [ ] **Step 5: Write the dist check**

`tests/build/claims-dist.check.ts`:

```ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { routePaths } from "../../scripts/routes.mjs";
import { COPY_LINES } from "../../src/features/funnel/data/light";
import { allowedSentences, findClaims, readableText } from "../claims/patterns";

const allowed = allowedSentences(COPY_LINES);
const file = (path: string) => (path === "/" ? "dist/index.html" : `dist${path}/index.html`);

/** What a reader (or a bot) gets from a prerendered page: its text, title, description and alt text. */
function pageText(path: string): string {
  const d = new JSDOM(readFileSync(file(path), "utf8")).window.document;
  d.querySelectorAll("script, style, template").forEach((el) => el.remove());
  const meta = d.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
  const alts = [...d.querySelectorAll("img[alt]")].map((img) => img.getAttribute("alt"));
  return [d.title, meta, readableText(d.body), ...alts].join("\n");
}

describe("the claims check on the built site (§12)", () => {
  it("passes on the prerendered /", () => {
    expect(findClaims(pageText("/"), { allowedSentences: allowed })).toEqual([]);
  });

  it("passes on llms-full.txt's / section", () => {
    const full = readFileSync("dist/llms-full.txt", "utf8");
    const start = full.indexOf("URL: https://ziiroai.com/\n");
    expect(findClaims(full.slice(start, full.indexOf("\n---\n", start)), { allowedSentences: allowed })).toEqual([]);
  });

  it("reports, and doesn't fail on, every other page", () => {
    const report = routePaths.filter((p: string) => p !== "/").flatMap((p: string) =>
      findClaims(pageText(p), { allowedSentences: allowed }).map((hit) => `- ${p} ${hit}`));
    mkdirSync("test-results", { recursive: true });
    writeFileSync("test-results/claims-report.md", `# Claims report, other pages (§12: notes only)\n\n${report.join("\n")}\n`);
    console.info(`claims report: ${report.length} notes in test-results/claims-report.md`);
    expect(Array.isArray(report)).toBe(true);
  });
});
```

This file needs only `patterns.ts` and the data module, so it lands on day 3 with them: run `npm run build && npm run check:build`, then commit it with `patterns.ts`.

Checked on 8 Oct: these rules, run over all 262 lines of `funnel/copy.md` with the spec's line changes applied, hit only the three lines the spec retires (§4: `r.legend.centre`, `sp.hero.h.one`, `em.need.one`). They catch every banned form in Appendix A's table, and they pass the five allowed lines once filled in. New lines need nothing here: D37's `sp.hero.scroll.one` and D38's `r.film.close` reach the check through `COPY_LINES` like every other line.

- [ ] **Step 6: Run everything once lanes B and C have landed, then commit**

```bash
npx vitest run tests/claims
npm run build && npm run check:build
cat test-results/claims-report.md
```

Expected: every case passes. `reaches all 27 plans` proves the walk covers §6.7's 27 plans. A one-word hiring text would stop it at 24: with no chip, it's unclassified and composes the same plans as "We sell furniture." The report lists notes such as the rates on /pricing and /book-a-call, which are the owner's call (§12). If a funnel line fails, the claims check names the line ID or the plan. Copy goes to lane C, the email to lane B, a screen to lane A.

```bash
git add tests/claims tests/build/claims-dist.check.ts
git commit -m "test(claims): check copy, plans, emails, llms and / against Appendix A (§12)"
git push
```

---

### Task 12: Build budgets

**Files:**
- Create: `tests/build/budgets.check.ts`

**Interfaces:**
- Consumes:
  - `dist/index.html` and `dist/assets/`; the page chunk `Index-*.js`; the plan chunk `PlanPage-*.js`, which lane A loads with `import()` at S5 (§13.10: "prefetched at S5").
  - The light entry `src/features/funnel/data/light.ts` and the full entry `index.ts` (00-index §1.1). From the full entry: `agents` (each `Job` has a `name`) and `COPY_LINES`.
  - `PHRASES: Readonly<Record<Problem, readonly string[]>>` from `src/features/funnel/data/classifier/phrases.ts`, lane C's Task 5 file (day 2). It isn't in the contract, so this check depends on that file's path and export.
  - `reachable` from `tests/helpers/imports.ts` (Task 6).
- Produces: the §13.10 gates in `npm run check:build`, as 00-index §1.5 (request 14) changed them. The copy lines count in first paint. The 12 KB data cap covers what the full entry adds to the light one. No job name or phrase-list entry ships in the entry chunk or the funnel chunk.

- [ ] **Step 1: Write the check**

`tests/build/budgets.check.ts`:

```ts
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { build } from "vite";
import { describe, expect, it } from "vitest";
import { COPY_LINES, agents } from "../../src/features/funnel/data";
import { PHRASES } from "../../src/features/funnel/data/classifier/phrases";
import { reachable } from "../helpers/imports";

/** §13.10, in bytes gz. */
const LIMITS = { firstPaint: 150_000, funnel: 25_000, plan: 60_000, data: 12_000 };
const ASSETS = "dist/assets";
const LIGHT_ENTRY = "src/features/funnel/data/light.ts";
const STATIC_IMPORT = /(?:^|[;\s}])import\s*(?:[\w*{}\s,$]+from\s*)?["'](\.\/[^"']+\.js)["']/g;

const gz = (file: string) => gzipSync(readFileSync(`${ASSETS}/${file}`)).length;
const total = (files: Set<string>) => [...files].reduce((sum, f) => sum + gz(f), 0);
const chunk = (re: RegExp) => readdirSync(ASSETS).find((f) => re.test(f));

/** A chunk and every chunk it imports statically, which the browser fetches before running it. */
function closure(starts: string[]): Set<string> {
  const seen = new Set<string>();
  const queue = [...starts];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const m of readFileSync(`${ASSETS}/${file}`, "utf8").matchAll(STATIC_IMPORT)) queue.push(m[1].slice(2));
  }
  return seen;
}

/**
 * True for the light entry and every file it imports, whether rolldown asks with a raw id ("./copy",
 * "@/…") or a resolved one. These ship in first paint, so the plan data's measure leaves them out.
 */
function inLightEntry(): (id: string, importer?: string) => boolean {
  const files = new Set([...reachable([LIGHT_ENTRY]).files].map((f) => path.resolve(f)));
  return (id, importer) => {
    const bare = id.split("?")[0];
    const abs = bare.startsWith("@/") ? path.resolve("src", bare.slice(2))
      : bare.startsWith(".") && importer ? path.resolve(path.dirname(importer), bare)
      : path.resolve(bare);
    return ["", ".ts", ".tsx", "/index.ts"].some((ext) => files.has(abs + ext));
  };
}

/**
 * Job names and phrase-list entries, which only the plan chunk may carry (00-index §1.5, request 14).
 * Single words ("profit", "margin") would match ordinary code, and the few that are also copy lines
 * ship in first paint by design, so both are left out.
 */
function planOnlyWords(): string[] {
  const copyText = Object.values(COPY_LINES).join("\n").toLowerCase();
  const words = [...agents.flatMap((a) => a.jobs.map((j) => j.name)), ...Object.values(PHRASES).flat()];
  return [...new Set(words)].filter((w) => w.includes(" ") && !copyText.includes(w.toLowerCase()));
}

const html = readFileSync("dist/index.html", "utf8");
const entry = html.match(/<script type="module"[^>]*src="\/assets\/([^"]+\.js)"/)![1];
const preloads = [...html.matchAll(/rel="modulepreload"[^>]*href="\/assets\/([^"]+\.js)"/g)].map((m) => m[1]);
const shell = closure([entry, ...preloads]);
const firstPaint = closure([...shell, chunk(/^Index-[\w-]+\.js$/)!]);

describe("budgets (§13.10)", () => {
  it("first paint on / (entry plus the funnel chunk) is 150 KB gz or less", () => {
    console.info("first paint", total(firstPaint), "shell", total(shell));
    expect(total(firstPaint)).toBeLessThanOrEqual(LIMITS.firstPaint);
  });

  it("the funnel's share of it is 25 KB gz or less", () => {
    expect(total(firstPaint) - total(shell)).toBeLessThanOrEqual(LIMITS.funnel);
  });

  it("ships no job name or phrase-list entry in the entry chunk or the funnel chunk (00-index §1.5)", () => {
    const words = planOnlyWords();
    expect(words.length, "the agents data and the phrase lists loaded").toBeGreaterThan(100);
    const leaked = [...firstPaint].flatMap((file) => {
      const code = readFileSync(`${ASSETS}/${file}`, "utf8").toLowerCase();
      return words.filter((w) => code.includes(w.toLowerCase())).map((w) => `${file}: "${w}"`);
    });
    expect(leaked).toEqual([]);
  });

  it("the plan chunk's data is 12 KB gz or less: the agents, the jobs, the phrase lists and the disc map", async () => {
    const result = await build({
      configFile: false,
      logLevel: "silent",
      resolve: { alias: { "@": path.resolve("src") } },
      build: {
        write: false,
        minify: true,
        lib: { entry: "src/features/funnel/data/index.ts", formats: ["es"], fileName: "data" },
        // The copy lines ship with the light entry in first paint (00-index §1.5), so they don't count here.
        rollupOptions: { external: inLightEntry() },
      },
    });
    const outputs = (Array.isArray(result) ? result : [result]).flatMap((r) => ("output" in r ? r.output : []));
    const code = outputs.filter((o) => o.type === "chunk").map((o) => ("code" in o ? o.code : "")).join("\n");
    console.info("plan data", gzipSync(code).length);
    expect(gzipSync(code).length).toBeLessThanOrEqual(LIMITS.data);
  });

  it("the plan chunk, beyond what first paint already loaded, is 60 KB gz or less", () => {
    const plan = chunk(/^PlanPage-[\w-]+\.js$/);
    expect(plan, "lane A loads src/features/funnel/plan/PlanPage.tsx with import() at S5").toBeDefined();
    const extra = new Set([...closure([plan!])].filter((f) => !firstPaint.has(f)));
    console.info("plan chunk", total(extra));
    expect(total(extra)).toBeLessThanOrEqual(LIMITS.plan);
  });
});
```

What was tried on 8 Oct:
- The closure walk ran on the 29 Sep build. That build's shell came to 134,151 bytes gz, which Task 6 trims.
- The light-entry split ran on a stand-in data module whose `compose.ts` imports the copy file directly, as a plan module might. The agents text stayed in the measure and the copy text left it.
- The word check ran on the 29 Sep build: 282 words, and none in the shell. The old homepage's `Index` chunk held "Image Generation" and "follow up", and Task 4 deletes that chunk.

- [ ] **Step 2: Run it**

```bash
npm run build && npx vitest run --config vitest.build.config.ts tests/build/budgets.check.ts
```

Expected on day 3: the first four pass and print their numbers. The plan case FAILS with `lane A loads src/features/funnel/plan/PlanPage.tsx with import() at S5` until lane A's S9 mount lands on day 5.

The shell should come to about 96 KB gz. That is 134 KB, less about 44 KB of providers (Task 6) and 2 KB of Preloader (Task 4), plus about 6 KB of copy lines: the header loads the light entry on every page, and `copy.md`'s 243 lines come to 5.7 KB gz.

When a case fails:
- **First paint or the funnel's share:** a real overrun, not a test bug. Report the numbers to the manager. The likely fix is in the funnel's imports (lanes A and C), not in the limits. If first paint is over 150 KB gz because of the copy lines, tell worker-4: splitting the copy by surface is a contract change (00-index §1.5, request 14).
- **The word check:** it names the chunk and the word. Something in first paint imports the full entry, `compose.ts`, the classifier or the agents data, when it should import `light.ts`. That fix belongs to whichever lane owns the importing file.

- [ ] **Step 3: Commit the first four cases now, and the plan case once it passes.** Until day 5, drop the plan case from the committed file, then add it back.

```bash
git add tests/build/budgets.check.ts
git commit -m "test(build): gate first paint, the funnel chunk and the plan data (§13.10)"
git push
```

---

### Task 13: The first screen and the spine's files, in Playwright

**Files:**
- Create: `tests/e2e/helpers/flow.ts`, `tests/e2e/first-screen.spec.ts`, `tests/e2e/spine-files.spec.ts`

**Interfaces:**
- Consumes: lane A's screens S0–S7, with their copy labels; lane A's double-tap guard, which ignores a tap within `TAP_LOCK_MS` (350 ms) of a step change (lane A, Task 4); `data-theme` on `<html>` (00-index §1.3); lane C's `HeroPicturePrefetch`, which lane A mounts out of sight from S5 in its Task 13, on day 4 (§6.6, 00-index §2.2); `copy`
- Produces, from `tests/e2e/helpers/flow.ts`:
  - `ANANYA` (her answers, §5.8) and `option(id: string, i: number): string`;
  - one step at a time, each starting where the last one stopped: `toTeamQuestion(page)` (S1 to the team row), `answerTeam(page)` (to S5), `answerRevenue(page)` (to S6), `answerProblem(page)` (to S7) and `sendContact(page, email?)` (to S8);
  - from a fresh `/`: `toRevenueQuestion(page)` (to S5) and `toContactStep(page)` (to S7);
  - `at(time: string): Date`, a fixed India time on Mon 12 Oct.

  Tasks 14, 15 and 16 and I-T2 use them.

**Two days** (worker-1's review of 8 Oct, finding 4). Every spine-files case reaches S5 and waits for a request under `/spine/`, and only `HeroPicturePrefetch` makes one. Lane A mounts it in its Task 13, on day 4. So the flow helper and the first-screen spec land on day 3 (Steps 1 to 3), and the spine-files spec on day 4, once lane A's Task 13 is on the branch (Steps 4 to 6). Committed any earlier, its five cases would time out and keep CI red.

**A person's pace** (wave9-requests item 22). The questions ignore a tap for 350 ms after each step, so every tap in `flow.ts` waits 400 ms first. Every question tap in lane D's specs goes through it, in `spine-files`, `ananya-plan`, `perf` and `preview-smoke`. `first-screen.spec.ts` and `nav.spec.ts` tap no question. Lane A's `tapThrough` (`tests/e2e/support/questions.ts`) does the same, but it lands with lane A's Task 15 on day 5, and this file lands on day 3. So lane D keeps its own `tap`, and the two paces stay equal. A full run to the plan takes about 3 s longer: seven taps at 400 ms.

- [ ] **Step 1: Write the flow helper**

`tests/e2e/helpers/flow.ts`:

```ts
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
```

- [ ] **Step 2: Write the first-screen spec**

`tests/e2e/first-screen.spec.ts`:

```ts
import { expect, test } from "./fixtures";
import { copy } from "../../src/features/funnel/data/light";
import { INTERIM_BOOKING_URL } from "../../src/features/pricing/entities/rates";

test("the first screen holds the greeting, S1 and g.about, with only the logo above them (§4.1, D6)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: copy("s1.q") })).toBeVisible();
  for (const i of [1, 2, 3, 4, 5]) await expect(page.getByRole("button", { name: copy(`s1.o${i}`), exact: true })).toBeVisible();
  await expect(page.getByText(copy("g.about"))).toBeVisible();
  await expect(page.getByRole("link", { name: copy("nav.home.aria") })).toBeVisible();
  await expect(page.locator("#site-menu")).toHaveCount(0);
});

for (const size of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
  test(`keeps the footer below the fold at ${size.width} × ${size.height} (D6)`, async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop sizes");
    await page.setViewportSize(size);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 2, name: copy("s1.q") })).toBeVisible();
    // Let useFooterShown run first: it sets data-shown="" once it has measured the page.
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const footer = page.locator("footer.site-footer");
    await expect(footer).toHaveCount(1);
    await expect(footer).not.toHaveAttribute("data-shown");
  });
}

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("shows g.noscript with a plain link to Calendly (§4.5)", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toContainText(copy("g.noscript"));
    await expect(page.locator(`a[href^="${INTERIM_BOOKING_URL}"]`)).toHaveCount(1);
  });
});
```

- [ ] **Step 3: Run the first-screen spec, and commit it with the helper (day 3)**

```bash
npm run build && npx playwright test tests/e2e/first-screen.spec.ts
```

Expected once lane A's S0 and S1 are in: all pass, with the two footer cases skipped on the phone project. A footer case that fails points at lane A's `.f-root` sheet, which is at least `100svh` tall (lane A, Task 1, request 12).

```bash
git add tests/e2e/helpers/flow.ts tests/e2e/first-screen.spec.ts
git commit -m "test(e2e): first screen and no-JS (§4.1, §4.5), plus the flow helper"
git push
```

- [ ] **Step 4: Write the spine-files spec (day 4, after lane A's Task 13)**

`tests/e2e/spine-files.spec.ts`:

```ts
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { answerTeam, at, toTeamQuestion } from "./helpers/flow";

function spineRequests(page: Page): string[] {
  const paths: string[] = [];
  page.on("request", (r) => {
    const { pathname } = new URL(r.url());
    if (pathname.startsWith("/spine/")) paths.push(pathname);
  });
  return paths;
}

async function reachS5(page: Page, time: string) {
  await page.clock.setFixedTime(at(time));
  const paths = spineRequests(page);
  await page.goto("/");
  await toTeamQuestion(page);
  expect(paths, "nothing under /spine/ before S5 (§12)").toEqual([]);
  await answerTeam(page);
  await expect.poll(() => paths.length).toBeGreaterThan(0);
  return paths;
}

test("a light visit (10:00) fetches only light files, from S5 on (§6.6, §12)", async ({ page }) => {
  const paths = await reachS5(page, "10:00");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(paths.every((p) => p.startsWith("/spine/r17/light/hero/"))).toBe(true);
});

test("a dark visit (22:00) fetches only dark files", async ({ page }) => {
  const paths = await reachS5(page, "22:00");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(paths.every((p) => p.startsWith("/spine/r17/dark/hero/"))).toBe(true);
});

test.describe("a device set to dark", () => {
  test.use({ colorScheme: "dark" });
  test("is dark at 10:00 and fetches only dark files (D9)", async ({ page }) => {
    const paths = await reachS5(page, "10:00");
    expect(paths.every((p) => p.startsWith("/spine/r17/dark/hero/"))).toBe(true);
  });
});

test("a 390 × 844 phone at 3× picks phone-1170.avif (§12)", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone");
  expect(await reachS5(page, "10:00")).toContain("/spine/r17/light/hero/phone-1170.avif");
});

test.describe("a 1200-wide window at 2×", () => {
  test.use({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 2 });
  test("picks hero-2560.avif (§12)", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop");
    expect(await reachS5(page, "10:00")).toContain("/spine/r17/light/hero/hero-2560.avif");
  });
});
```

- [ ] **Step 5: Run it**

Run: `npm run build && npx playwright test tests/e2e/spine-files.spec.ts`

Expected once lane A's Task 13 is in, with lane C's `HeroPicturePrefetch` mounted from S5: all pass (the size-specific cases skip on the other project). Each failure points at its owner:
- a case that times out waiting for a `/spine/` request: the S5 mount (lane A, Task 13);
- the theme cases: lane A's head script;
- the picks: lane C's `srcset` and `sizes`;
- a click that lands while the screen stays put: the pace. `TAP_PACE_MS` (400) must stay above lane A's `TAP_LOCK_MS` (350).

- [ ] **Step 6: Commit it**

```bash
git add tests/e2e/spine-files.spec.ts
git commit -m "test(e2e): theme isolation and hero picks from S5 (§6.6, §12)"
git push
```

---

### Task 14: Ananya's plan in both themes, with axe

**Files:**
- Create: `tests/e2e/ananya-plan.spec.ts`

**Interfaces:**
- Consumes: the helpers from Task 13; `funnelApi` (Task 1); `copy` and `departments` from the full entry; lane A's S6–S9 and lane C's `PlanPage` (days 3 to 5); D36, which quotes her words at Deals

- [ ] **Step 1: Write the spec**

`tests/e2e/ananya-plan.spec.ts`:

```ts
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

async function axe(page: Page, screen: string) {
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
  const part = (i: number) => text.indexOf(copy("sp.part.count", { i, d: STOPS.length }));
  const quoted = text.indexOf(SAID);
  expect(quoted > part(1) && quoted < part(2), "quoted at stop 1, Deals (D36)").toBe(true);
  let from = 0;
  for (const [i, name] of STOPS.entries()) {
    from = text.indexOf(copy("sp.part.count", { i: i + 1, d: STOPS.length }), from);
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
```

The department names "Deals", "Sales", "Marketing" and "Back Office" are also the `dp.*` headings (copy.md), and no tagline or why-line before them uses one, so the first name after each "Part i of 4" is that stop's.

`vite preview` serves files uncompressed, so the byte count runs high. A pass here passes on Vercel too. A narrow fail here needs a second look on the `dev` Preview before anyone trims.

- [ ] **Step 2: Run it**

Run: `npm run build && npx playwright test tests/e2e/ananya-plan.spec.ts`

Expected once lanes A and C have landed S6–S9 and the plan (day 5): 6 passed (3 cases × 2 projects).
- An axe failure names the screen and the rule. On S9 in light mode, `color-contrast` on the header points at Task 8's colour mapping.
- A stop-order, agent or quote failure belongs to lane C. The quote check follows D36: lane C's `wordsDepartmentFor` puts her words at Deals.
- A byte overrun lists everything fetched from S5 on, in the trace.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/ananya-plan.spec.ts
git commit -m "test(e2e): Ananya's plan in both themes, axe on every screen (§5.8, §11)"
git push
```

---

### Task 15: Speed: Lighthouse and INP

These run before each deploy (§12, "Speed"; L-T1 step 3), not on every push. A throttled CPU on a shared CI runner gives numbers too noisy to gate a branch on (default, owner can veto).

**Files:**
- Create: `scripts/lighthouse-home.mjs`, `tests/e2e/perf.spec.ts`
- Modify: `package.json` (script `perf:home`)

**Interfaces:**
- Consumes: a running site: `npm run preview` locally, or the `dev` Preview at L-T1; `toRevenueQuestion` and `answerRevenue` (Task 13)
- Produces: `npm run perf:home -- <url>`, which exits 1 when a §13.10 gate fails, and `npm run test:perf`

- [ ] **Step 1: Write the INP check**

`tests/e2e/perf.spec.ts`:

```ts
import { expect, test } from "./fixtures";
import { answerRevenue, toRevenueQuestion } from "./helpers/flow";

declare global {
  interface Window { __inp: number }
}

test("taps answer within 100 ms with the CPU slowed 4× (INP, §13.10)", { tag: "@perf" }, async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.addInitScript(() => {
    window.__inp = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as PerformanceEventTiming[]) {
        if (e.interactionId) window.__inp = Math.max(window.__inp, e.duration);
      }
    }).observe({ type: "event", buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
  });

  await page.goto("/");
  await toRevenueQuestion(page);
  await answerRevenue(page);
  await page.waitForTimeout(500);

  expect(await page.evaluate(() => window.__inp)).toBeLessThanOrEqual(100);
});
```

- [ ] **Step 2: Write the Lighthouse script**

`scripts/lighthouse-home.mjs`:

```js
// (C) Lighthouse mobile on `/`, three runs, gated on the median (spec §13.10). L-T1 step 3.
//   npm run perf:home -- https://<the dev Preview host>/
// A Preview behind Vercel's login needs VERCEL_AUTOMATION_BYPASS_SECRET for this one command. Div sends it
// privately (00-index §1.5, request 7); it never goes into a file or GitHub.
import { execFileSync } from "node:child_process";

const RUNS = 3;
const GATES = { lcpMs: 2_000, cls: 0.02, performance: 0.9 };
const url = process.argv[2] ?? "http://localhost:4173/";
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

/**
 * The LCP element's opening tag. Lighthouse 13 dropped the largest-contentful-paint-element audit;
 * the element is now the node item in lcp-breakdown-insight's list.
 */
function lcpElement(lhr) {
  const insight = lhr.audits["lcp-breakdown-insight"];
  if (!insight) {
    console.error(`Lighthouse ${lhr.lighthouseVersion} has no lcp-breakdown-insight audit, so the gate can't tell which element is the LCP (§13.10)`);
    process.exit(1);
  }
  const node = (insight.details?.items ?? []).find((item) => item.type === "node");
  return node?.snippet ?? "(no element reported)";
}

function run() {
  const args = ["--yes", "lighthouse@13.5.0", url, "--output=json", "--output-path=stdout", "--quiet",
    "--only-categories=performance", "--chrome-flags=--headless=new"];
  if (bypass) args.push(`--extra-headers=${JSON.stringify({ "x-vercel-protection-bypass": bypass })}`);
  const lhr = JSON.parse(execFileSync("npx", args, { maxBuffer: 64 * 1024 * 1024 }).toString());
  const lcp = lcpElement(lhr);
  return {
    lcpMs: lhr.audits["largest-contentful-paint"].numericValue,
    cls: lhr.audits["cumulative-layout-shift"].numericValue,
    tbtMs: lhr.audits["total-blocking-time"].numericValue,
    performance: lhr.categories.performance.score,
    lcpElement: lcp,
    lcpIsH1: lcp.startsWith("<h1"),
  };
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const runs = Array.from({ length: RUNS }, run);
const result = Object.fromEntries(["lcpMs", "cls", "tbtMs", "performance"].map((k) => [k, median(runs.map((r) => r[k]))]));
console.log(JSON.stringify({ url, median: result, runs }, null, 2));

const failures = [
  result.lcpMs > GATES.lcpMs && `LCP ${Math.round(result.lcpMs)} ms is over ${GATES.lcpMs} ms`,
  result.cls > GATES.cls && `CLS ${result.cls.toFixed(3)} is over ${GATES.cls}`,
  result.performance < GATES.performance && `performance ${result.performance} is under ${GATES.performance}`,
  !runs.every((r) => r.lcpIsH1) && `the LCP element isn't the greeting's <h1> in every run (§13.10): ${runs.map((r) => r.lcpElement).join(", ")}`,
].filter(Boolean);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Lighthouse gates pass (§13.10)");
```

Add the script to `package.json`: `"perf:home": "node scripts/lighthouse-home.mjs",`

- [ ] **Step 3: Run both against a local build**

```bash
npm run build
npm run test:perf
npm run preview -- --port 4173 --strictPort
npm run perf:home -- http://localhost:4173/
```

Run `preview` in the background for the last command, and stop it after.

Expected: `test:perf` passes on both projects. `perf:home` prints three runs and a median, and each run's `lcpElement` is the greeting's opening tag, `<h1 …>`. `vite preview` serves without compression, so local numbers run worse than Vercel's. The gate that counts is the run on the `dev` Preview at L-T1 step 3: performance 0.9 or more, LCP 2.0 s or less, CLS 0.02 or less, and the LCP element the `<h1>`.

- [ ] **Step 4: Commit**

```bash
git add scripts/lighthouse-home.mjs tests/e2e/perf.spec.ts package.json
git commit -m "test(perf): Lighthouse gate and INP check for / (§13.10)"
git push
```

---

### Task 16: The Preview smoke test

§12 asks for one run to the plan on the PR's Preview. It runs by hand, `npm run test:preview` against the Preview URL, at I-T1, after merges into `dev`, and whenever a lane wants it (default, owner can veto). Two reasons it isn't run automatically on every Preview:
- each run sends a plan email and a team alert through the same Resend account as production, whose free cap is 100 a day (§13.3), and the shared branch makes dozens of Previews a day;
- GitHub's manual trigger only runs a workflow that is already on `main`.

**Files:**
- Create: `tests/e2e/preview-smoke.spec.ts`

**Interfaces:**
- Consumes: a Vercel Preview with Cloudflare's test keys and the Neon preview branch (P0-T1); `SMOKE_EMAIL` (the tester's inbox) and `VERCEL_AUTOMATION_BYPASS_SECRET`, which Div sends privately to the lane D builder if Previews ask for a login (P0-T1 item 5; 00-index §1.5, request 7). Set it for one command at a time. It never goes into a file, a commit or GitHub, because nothing in Actions reads it; lane B's `/spine/` cache rule; `toContactStep` and `sendContact` (Task 13)

- [ ] **Step 1: Write the spec**

`tests/e2e/preview-smoke.spec.ts`:

```ts
import { expect, test } from "./fixtures";
import { copy } from "../../src/features/funnel/data/light";
import { sendContact, toContactStep } from "./helpers/flow";

const SMOKE_EMAIL = process.env.SMOKE_EMAIL;
const BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

test("one real run to the plan on the Preview (§12)", { tag: "@preview" }, async ({ page }) => {
  test.skip(!SMOKE_EMAIL, "set SMOKE_EMAIL to the tester's inbox");
  // The query sets Vercel's bypass cookie for this origin only; a header would also reach Calendly and Cloudflare.
  await page.goto(BYPASS ? `/?x-vercel-protection-bypass=${BYPASS}&x-vercel-set-bypass-cookie=true` : "/");
  await toContactStep(page);
  await sendContact(page, SMOKE_EMAIL);
  await expect(page.getByText(copy("sp.pilot"), { exact: true }).first()).toBeVisible({ timeout: 15_000 });

  const hero = await page.evaluate(() =>
    performance.getEntriesByType("resource").map((e) => e.name).find((name) => name.includes("/spine/r17/")));
  expect(hero, "the hero still loaded").toBeTruthy();
  const res = await page.request.get(hero!);
  expect(res.headers()["cache-control"]).toBe("public, max-age=31536000, immutable");
});
```

- [ ] **Step 2: Run it against the PR's Preview**

```bash
PLAYWRIGHT_BASE_URL=https://<the PR's preview host> SMOKE_EMAIL=<the tester's inbox> \
  VERCEL_AUTOMATION_BYPASS_SECRET=<from Div, privately> npm run test:preview
```

Expected: `1 passed`. Then I-T1 step 2 reads the visit, contact and plan-email rows on the Neon preview branch, and step 3 checks the tester's inbox. A screen that shows the plan proves only the screen (00-index Review Focus 2).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/preview-smoke.spec.ts
git commit -m "test(e2e): preview smoke run to the plan, by hand (§12)"
git push
```

---

## Phase 1b (named and ordered)

The scroll, the lit discs and the still version land about 3 working days after launch (§13.7). Lane D's share, in order:

1. **Render night** (worker-2, during phase 1, off the critical path).
   - The camera moves: 12 push-ins × 2 themes through `with-render-lock.py`, about 3.7 h of renders plus about 1 h of layers and packing (§6.6).
   - Before the batch: each end frame checked by eye, with `disc_boxes.py` for each disc's position.
   - After it: `layers.py --check "1,4,5,6"`, `disc_boxes.py`, and `readability.py` on every right-side end frame.
   - The files go into new folders under `public/spine/r17/{light,dark}/{beat1,push}/`, never over an existing file, then `npm run hash:immutable`.
   - The close-up model stays the fallback (owner, 8 Oct). It comes back only if a push-in fails its check by eye.
2. **The weight check.** `tests/build/spine-weight.check.ts` reads every `manifest.json` and adds up each of the 27 plans' tours in both themes. It fails over 3 MB on desktop or 1.5 MB on a phone, or when a lit-disc state passes the hero limits (§12, §13.10).
3. **Compositor parity.** Copy `web/test.js` into `tests/fixtures/spine/`. Playwright draws Ananya's beat 1 and one frame on the way with both, and the pixels must match (§12).
4. **The still-version cases.** Reduced motion, Save-Data, no AVIF, and a push-in file that fails to load. Each ends on the still version, fetches no frame on the way, and sends `planView` and `stillReason` (§6.6, §12).
5. **The smoothness trace.** A Chrome trace scrolls Ananya's tour at 390 × 844 with the CPU slowed 4×: 50 fps or more, and no main-thread task over 50 ms (§13.10).
6. **Run the gates again.**
   - The budgets: prefetch about 147 KB on a phone and 151 KB on desktop, with beat 1.
   - Lighthouse.
   - The claims check, now with `sp.disc.call`, `sp.disc.aria`, `sp.legend.*` and `sp.hint.hover`.
   - Axe on the disc buttons: keyboard order in spine order, labels from `sp.disc.aria`.

## Spec coverage

| Spec | Where |
|---|---|
| §4.1 header logo only (D6); §6.2 block 0; D14 | Task 8; checked in Tasks 10 and 13 |
| §4.2 static "Hello." | Task 4 (first paint), Task 10 |
| §6.3 every "Book a call" to Calendly with name and email | Task 8 (header). `hx.btn1` and `cta.btn` are lane C's; the close's wording is checked in Task 11 |
| §6.5 film string, re-render, files, lightbox player | Tasks 3 and 5 |
| §6.6 hero stills, phone band, immutable files | Task 7; picks and theme isolation in Task 13 |
| §8.2, §8.3, §8.6 the `/` HTML, llms, "Business Brain" gone, 127/30 gone | Tasks 3, 4, 10 and 11 |
| §11 axe in both themes and at both sizes | Task 14 |
| §12 unit, claims, e2e, HTML, speed, spine files, preview smoke, CI | Tasks 1, 2, 10–16 |
| §13.9 Preloader, the old homepage, the nav branch | Tasks 4, 6, 8 and 9 |
| §13.10 budgets | Tasks 6, 12, 14 and 15 |
| D26 old components deleted; D27 contingency | Tasks 4 and 9; Task 0 |

## 00-index §1.5, rulings D35 to D39, batch 3 and the 8 Oct reviews: where lane D follows them

| Decision | What lane D does | Where |
|---|---|---|
| 1. `stage()` and `subscribe()` on `funnelSession` | The header reads `stage()` through `useSyncExternalStore`, typed `FunnelStage`; the stub is there from day 1 | Task 8 |
| 2. `COPY_LINES` | The claims check reads it from `light.ts` | Task 11 |
| 3. `buildPlanEmail(input: PlanEmailInput): Email` | `emailText` builds a `PlanEmailInput`, with no visit ID, consent or token | Task 11 |
| 5. Vitest 4.1, jsdom 29, Lighthouse through `npx` | No Vitest 5 API is used; Lighthouse runs by hand | Global Constraints; Tasks 1 and 15 |
| 6. I-T3 runs `check:build` | `claims-dist.check.ts` is in `check:build` | Task 11 |
| 7. The bypass secret | Set for one command, never stored or put in GitHub | Tasks 15 and 16 |
| 4 and 13. The film seam | `BrandFilm` is the click-to-play player, labelled `r.film.title`, exporting only `SPINE_FILM_FILES` besides; the lightbox names its dialog and closes with `r.film.close` | Task 5 |
| 14. The light entry | The header, `BrandFilm` and `Index.tsx` import `light.ts`. Copy counts in first paint; the 12 KB data cap leaves `light.ts` out; job names and phrases stay out of first paint | Tasks 4, 5, 8 and 12 |
| 15. Three helpers declined | Lane D uses none of them | None |
| 16. `fallback` in `LeadPlan` | `emailText` passes `plan.fallback` | Task 11 |
| D35 negation | Lane C's alone | None |
| D36 their words at their department's stop | Ananya's words are quoted once, at Deals | Task 14 |
| D37 `sp.hero.scroll.one`, D38 `r.film.close` | New lines go through the claims check like every line | Task 11 |
| D39 hero callouts right of the spine | The landscape stills leave room at G05 and G03, checked by eye | Task 7 |
| Batch 3, item 22: the questions ignore a tap for 350 ms after each step | Every question tap goes through `flow.ts`'s `tap`, which waits 400 ms first | Task 13 |
| Batch 3, item 20 (to I-T2): a loose "Email" label also matches the consent box | `sendContact` finds the email field with `exact: true` | Task 13 |
| worker-3's review, finding 1: `src/index.css` had no owner | Lane D owns it (00-index §1.3). Lane A's two `@import` lines stay first, and Tasks 8 and 9 run lane A's `tokens.test.ts` to prove it | Global Constraints; Tasks 8 and 9 |
| worker-3's review, finding 2 (worker-1's finding 5): `FunnelRoot` comes on day 2 morning, not day 1 | Task 4 consumes it on day 2 morning: the Index swap is written against §1.3 on day 1, parked, and lands on day 2 morning | Task 4; the calendar |
| worker-1's review, finding 2: one-word "hiring" is unclassified, so the walk found 24 plans | The hiring words are the sentence lane C's plans test pins, "we just can't find good people for the studio" | Task 11 |
| worker-1's review, finding 3: Lighthouse 13.5.0 has no `largest-contentful-paint-element` audit | The gate reads the LCP element from `lcp-breakdown-insight`'s node item, and exits 1 if that audit is missing | Task 15 |
| worker-1's review, finding 4: the S5 prefetch lands on day 4 | `spine-files.spec.ts` is committed on day 4, after lane A's Task 13; the flow helper and the first-screen spec stay on day 3 | Task 13; the calendar |
