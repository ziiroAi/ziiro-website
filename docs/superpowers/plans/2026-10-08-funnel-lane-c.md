# Business Spine funnel, lane C: the data module, the classifier and the plan page

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `src/features/funnel/data/` until `import * as light from "./light"` satisfies `FunnelLight` and `import * as data from "./index"` satisfies `FunnelData`, then build the first-release plan page, `PlanPage`, which lane A renders at S9.

**Architecture:** The data module is pure TypeScript with relative imports only, so the browser and `api/funnel/*` run the same code. The agents, jobs and copy lines are generated from `.team/ziiro-fleet/funnel/copy.md` and `agents-33.json` into committed `.ts` files, because `.team/` is git-ignored. The module has two entries (00-index §1.5). `light.ts` holds the copy, `calendlyUrl` and `currencyFor` for the header on every page, the questions and the film. `index.ts` re-exports it and adds the agents, the jobs, the classifier and `composePlan`, which only the plan chunk and the server load. The plan page is plain React, Tailwind and the `--funnel-*` colour tokens. A pure view model (`planView.ts`) turns a `PlanDescriptor` into lines and small components draw them, so most of the page's logic is tested without a DOM.

**Tech Stack:** TypeScript (strict inside `data/`), React 18.3.1 (`act` from `react`, `createRoot` from `react-dom/client`), react-helmet-async 3, Tailwind 3.4, Vitest with jsdom. No new packages.

**Spec:** `docs/superpowers/specs/2026-10-07-business-spine-funnel-design.md`, approved on 8 Oct. The contracts are in `docs/superpowers/plans/2026-10-08-funnel-00-index.md` §1: `contract.ts` in §1.2 and the seams in §1.3. The brief is `.team/ziiro-fleet/funnel/wave9.md`. Every § below is a section of the spec, and "00-index §x" is a section of the index plan. Builder: worker-3, 3 days (00-index §2.1).

## Global Constraints

- **Branch:** `feat/business-spine-funnel`, which phase 0 cuts from `ziiroai/dev` after main has been merged into dev. Pull with `git pull --rebase` before every push, and never force-push (00-index §2.3).
- **Before every push:** run `npm test`, `npm run typecheck` and `npm run build`. All three must be green (00-index §2.3).
- **Commit only lane C's files** (see "File structure" below). `contract.ts` belongs to worker-4. To change it, append one line to `.team/ziiro-fleet/requests.md`: `worker-3 -> worker-4: contract: <change>` (00-index §1.4).
- **No new packages.** Tests use Vitest, jsdom, `createRoot` and `act`. There is no Testing Library (00-index Global Constraints).
- **Rules for everything under `src/features/funnel/data/`:**
  - Relative imports only.
  - No DOM, no `window` and no `import.meta`.
  - Strict TypeScript (`tsconfig.api.json`).
  - The one import from outside is `../../pricing/entities/rates`, for `INTERIM_BOOKING_URL` (§13.6). Import it; never copy it.
- **Every visible line** comes from a copy ID through `copy()`, or from the agent and job names in the generated data. Visitor-facing words are never written in code (00-index Global Constraints).
- **Placeholder keys** are the text inside the braces, for example `copy("hx.p", { name })`, `copy("dp.deals.words", { words })` and `copy("em.said", { "their words": text })` (00-index §1.3).
- **Appendix A claims are binding** on the plan:
  - No price, no calculator, no FAQ, no film block, no testimonials and no logos (§6.3).
  - Every "Book a call" opens `INTERIM_BOOKING_URL` in a new tab, with `name` and `email` filled in.
  - `cta.btn` is the only wording at the close (§6.3).
- **Colours:** lane C adds no colour values of its own. Use `var(--funnel-bg)`, `--funnel-fg`, `--funnel-muted`, `--funnel-line`, `--funnel-card`, `--funnel-accent` and `--funnel-on-accent`, which lane A sets under `[data-theme]` on `<html>` (00-index §1.3).
- **The film:** `src/features/home/sections/BrandFilm.tsx` belongs to lane D. Render it; never edit it (00-index §1.3).
- **Budgets (§13.10, as 00-index §1.5 changes it):**
  - The plan chunk, code and data together: 60 KB gz at most.
  - Its data, which is the agents, the jobs, the phrase lists and the disc map: 12 KB gz at most.
  - The copy lines sit in the light entry and count in "JS before first paint" (150 KB gz), because the header, S0 to S8 and the film need them first.
  - Nothing for the plan loads with the first screen, and there is no hero preload.
- **Accessibility:** WCAG 2.2 AA in both themes, at 390 px and 1440 px. Targets are at least 44 × 44 px (§11).
- **Coverage:** at least 80 % of lines in `src/features/funnel/**` (`vitest.config.ts`, from P0-T4).
- **Comments and commit messages:** plain words, no em dashes, straight quotes.

## Review Focus

1. **A long answer with many matches.** If someone repeats "follow up" or "staff" thirty times, the classifier finds thirty matches. `/lead` refuses more than `LIMITS.matchedPhrases` (20), and a refused second try loses the lead (§10). `classify` must keep all matches in the scores but return at most 20 phrases, the first 20 in text order. Task 6 pins it.
2. **The untouched S6 starter arriving as their words.** If lane A passes "Honestly, I'm struggling with ___ because ___." as `problemText`, the plan must not quote it at a stop. Task 8 and Task 10 pin it.
3. **Words that point at a department the plan doesn't have.** A chip decides the plan, but the words alone may point elsewhere, for example the "Payments get stuck" chip with words about Facebook ads. Then no stop quotes them, and every stop uses `.why` (§6.3). D36's first-stop rule is only for words that point at no department. Task 10 pins both.
4. **One-part plans.** B-convert S has only Deals, and hiring S has only Back Office. "Part 1 of 1" reads fine, but `sp.hero.scroll` would say "the 1 parts". So a one-part plan shows `sp.hero.scroll.one`, its singular line (D37). Task 10 pins it.
5. **A theme switch while the plan is on screen.** The colour tokens flip at once, so the hero still must follow, or a dark spine sits on a light page. Task 12 pins it.

---

## How lane C meets the other lanes

The seams from 00-index §1.3 that bind lane C:

| Seam | Direction | Exact name | Task |
|---|---|---|---|
| Copy, booking link and currency: the light entry | C to A (S0 to S8), D (the header on every page, the film, the claims check) | `src/features/funnel/data/light.ts`, which satisfies `FunnelLight`. It reaches only `contract.ts`, the copy files, `calendly.ts`, `currency.ts` and the pricing entity, never the agents data, the jobs, the classifier or `compose.ts` (00-index §1.5, request 14; wave9-requests item 8) | 3, 4 |
| Data, copy and the plan: the full entry | C to A (through `import()` only), B, C's plan modules, D's tests | `src/features/funnel/data/index.ts`, which satisfies `FunnelData` and re-exports `light.ts` | 1 to 9 |
| The plan at S9 | C to A | `export function PlanPage(props: PlanPageProps): JSX.Element` in `src/features/funnel/plan/PlanPage.tsx`, a named export | 16 |
| Copy placeholders | C to A, B | `copy(id, vars)`. A key is the placeholder's text without its braces. `em.said.chips` is stored as `You picked: {chips}.` | 3 |
| Funnel colours | A to C | `--funnel-*` under `[data-theme="light"]` and `[data-theme="dark"]` on `<html>` | 11 to 16 |
| Hero stills | D to C | `public/spine/r17/{light,dark}/hero/hero-{1280,1920,2560}.{avif,webp}` and `phone-{828,1170}.{avif,webp}` | 12 |
| The film | D to C | `BrandFilm`, the default export of `src/features/home/sections/BrandFilm.tsx`: the click-to-play player, poster first, labelled `r.film.title` in its own frame. Lane C renders `<BrandFilm />` unedited and prints no second title (00-index §1.5, request 13) | 13 |
| Claims check | C to D | `COPY_LINES` from `data/light.ts`, every copy ID with its line, which `tests/claims/claims.test.ts` reads | 3 |
| The header's lines | C to D | `nav.home.aria`, `nav.mission`, `nav.who`, `nav.products`, `nav.btn`, `ph.nav.menu`, `r.film.title` and `r.film.cap`, through `copy` from `light.ts` (wave9-requests item 8) | 3 |

What `data/light.ts` exports besides `contract.ts`. The four rows are `FunnelLight`:

| Export | Type | Task | Used by |
|---|---|---|---|
| `COPY_LINES` | `Readonly<Record<string, string>>`, every copy line by ID, placeholders unfilled | 3 | D (claims check) |
| `copy(id, vars?)` | `string`. Throws on an unknown ID or an unfilled placeholder | 3 | A, B, C, D |
| `calendlyUrl(name, email)` | `string` | 4 | B, C, D |
| `currencyFor(country, timeZone)` | `Currency` (§5.3) | 4 | A, B |

What `data/index.ts` adds to `light.ts`. The first twelve rows complete `FunnelData`. The last three are lane C's own exports, outside the contract (00-index §1.5, request 15):

| Export | Type | Task | Used by |
|---|---|---|---|
| `AGENTS_VERSION` | `string`, "2026-10-04" | 1 | A, B |
| `agents` | `readonly Agent[]`: 33, by number | 1 | B, C |
| `departments` | `readonly Department[]`: 7, in spine order | 1 | B, C |
| `agentById(id)` | `Agent \| undefined` | 1 | B |
| `jobIdsFor(agentIds)` | `JobId[]`, agent by agent, each in agents-33.json order | 2 | B (`/visit` job_ids) |
| `stopsFor(agentIds)` | `PlanStop[]`: departments in order of first appearance | 2 | B (email), C |
| `tierFor(team, revenue)` | `Tier` (§5.3) | 4 | A |
| `CLASSIFIER_VERSION` | `string`, "kw-1" | 6 | A, B |
| `classify(problemText, chips)` | `Classification` (§5.2) | 6 | C, inside `composePlan`. Lane B's email no longer calls it (00-index §1.5, request 16) |
| `priority` | `Record<OrderVariant, readonly AgentId[]>`, §5.4's lists | 7 | B |
| `laneAgent` | `Record<Lane, AgentId>` | 7 | B |
| `composePlan(input)` | `PlanDescriptor` (§5.2 to §5.5) | 7 | A (S8, through `import()`), B (golden email test), D (claims check) |
| `wordsDepartmentFor(problemText)` | `DepartmentId \| null` (§6.3, D36): content, support and hiring words point at their lane agent's department | 7 | C only |
| `quoteWords(text, max)` | `string`: on one line, trailing punctuation off, cut with "…" at `max` characters (§6.3: 120) | 8 | C only. The email quotes their words with lane B's `cleanEcho` |
| `cleanProblemText(text)` | `string`: "" for the untouched S6 starter, and unfilled blanks removed | 8 | C only, as a second guard. Lane A cleans S6's text itself |

What lane C exports from `src/features/funnel/plan/`, besides `PlanPage`:

| Export | File | Task | Used by |
|---|---|---|---|
| `HeroPicturePrefetch`, no props | `HeroPicture.tsx`, which imports only `light.ts` and `contract.ts`, so mounting it at S5 brings no plan data along | 12 | A: mounts it at S5, out of sight (§6.6) |

What lane C needs, and from whom (00-index §2.2):

| Needed for | Deliverable | From | Ready by | If it's late |
|---|---|---|---|---|
| Every task | the branch, `contract.ts`, the test tools | phase 0 | day 1, before noon | nothing can start |
| Tasks 11 to 16 | the `--funnel-*` tokens | A | day 1 | tests don't need them; check by eye once they land |
| Task 12 | the stills in `public/spine/r17/` | D | day 2 | tests only check the URLs; check by eye on the Preview |
| Task 13 | `BrandFilm` as the click-to-play player, with the new film paths (00-index §1.5, request 13) | D | day 1 | the tests mock `BrandFilm`; `FILM_READY` hides `hx.btn2` (Task 14) |

## File structure

```
src/features/funnel/data/                lane C's, except contract.ts and contract.test.ts (P0-T4)
  light.ts                 the light entry. P0-T4 creates it as `export * from "./contract";`. Tasks 3, 4 append
  index.ts                 the full entry. P0-T4 creates it as `export * from "./light";`. Tasks 1, 2, 4, 6, 7, 8 append
  tools/parse-copy.mjs     reads copy.md's tables                                   Task 1
  tools/gen-data.mjs       writes the generated files                               Tasks 1, 3
  tools/copy-surfaces.mjs  which copy IDs go to which file, and spec §4.5's lines    Task 3
  agents.generated.ts      33 agents, 137 jobs, department names       generated, Task 1
  agents.ts                agents, departments, agentById, jobIdsFor, stopsFor, marksFor   Tasks 1, 2
  copy/flow.ts site.ts plan.ts email.ts seo.ts   copy lines by surface  generated, Task 3
  copy.ts                  COPY_LINES and copy()                                    Task 3
  calendly.ts              calendlyUrl                                              Task 4
  currency.ts              currencyFor                                              Task 4
  tier.ts                  tierFor                                                  Task 4
  classifier/normalise.ts  normalise and tokens                                     Task 5
  classifier/phrases.ts    PHRASES, NEGATORS and the clause breaks                  Task 5
  classifier/classify.ts   classify and CLASSIFIER_VERSION                          Task 6
  compose.ts               priority, laneAgent, composePlan, wordsDepartmentFor     Task 7
  words.ts                 quoteWords and cleanProblemText                          Task 8
  *.test.ts                next to the file they test; plans.test.ts and index.test.ts in Task 9
src/features/funnel/plan/                lane C's
  planView.ts              PlanDescriptor to every plan-dependent line              Task 10
  test-utils.tsx           render() with createRoot and act, for the tests only     Task 11
  Swap.tsx                 the desktop line or the phone line, switched by CSS at 600 px   Task 11
  BookCallLink.tsx         every "Book a call" on the plan                          Task 11
  SaveBanner.tsx           sp.save.fail and sp.save.unsure                          Task 11
  useHtmlTheme.ts          the theme on <html>, followed live                       Task 12
  HeroPicture.tsx          the §6.6 <picture>, and HeroPicturePrefetch              Task 12
  FilmLightbox.tsx         hx.btn2's lightbox around BrandFilm                      Task 13
  Hero.tsx                 block 1                                                  Task 14
  NeedBlock.tsx            block 2                                                  Task 15
  PartStop.tsx             block 3, one per stop                                    Task 15
  Close.tsx                block 4                                                  Task 15
  usePlanDepth.ts          plan_depth from an IntersectionObserver                  Task 16
  PlanPage.tsx             the page                                                 Task 16
```

§6.2's block 0, the header, and block 5, the footer, are the site's own `Navbar` and footer (lane D). `PlanPage` renders blocks 1 to 4.

The generator runs from the repo root. In a second worktree, point it at the main checkout's `.team/ziiro-fleet/funnel`, because `.team/` is never in git.

---

## Day 1: what lane B needs

### Task 1: The agents and departments

**Files:**
- Create: `src/features/funnel/data/tools/parse-copy.mjs`, `src/features/funnel/data/tools/gen-data.mjs`, `src/features/funnel/data/agents.ts`
- Create (generated): `src/features/funnel/data/agents.generated.ts`
- Modify: `src/features/funnel/data/index.ts` (append one export line)
- Test: `src/features/funnel/data/agents.test.ts`

**Interfaces:**
- Consumes: `AGENT_IDS`, `DEPARTMENTS`, `DEPARTMENT_DISC` and the types `Agent`, `Department` and `DepartmentId` from `./contract`.
- Produces:
  - `AGENTS_VERSION: string`
  - `agents: readonly Agent[]`
  - `departments: readonly Department[]`
  - `agentById(id: string): Agent | undefined`
  - generated: `AGENT_ROWS: readonly Agent[]` and `DEPARTMENT_NAMES: Readonly<Record<DepartmentId, string>>`

- [ ] **Step 1: Write the failing test**

`src/features/funnel/data/agents.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { agentById, agents, AGENTS_VERSION, departments } from "./agents";
import { AGENT_IDS, DEPARTMENTS } from "./contract";

const jobNames = (status: string) =>
  agents.flatMap((a) => a.jobs).filter((j) => j.status === status).map((j) => j.name).sort();

describe("agents", () => {
  it("lists the 33 agents by number, with the contract's IDs", () => {
    expect(agents.map((a) => a.number)).toEqual(Array.from({ length: 33 }, (_, i) => i + 1));
    expect(agents.map((a) => a.id)).toEqual([...AGENT_IDS]);
  });

  it("names each agent and its line from copy.md's agent table", () => {
    expect(agentById("deals-inbound")).toMatchObject({ number: 16, department: "deals", name: "Enquiry responder" });
    expect(agents.filter((a) => a.name === "" || a.line === "" || a.line.includes("●"))).toEqual([]);
  });

  it("carries 137 jobs with unique IDs", () => {
    const ids = agents.flatMap((a) => a.jobs.map((j) => j.id));
    expect(ids).toHaveLength(137);
    expect(new Set(ids).size).toBe(137);
  });

  it("marks exactly the jobs §5.6 names", () => {
    expect(jobNames("runs_on_our_company_today")).toEqual([
      "Company Deep-Dive", "Hook Writing", "List Building", "Meeting Booking", "Post-Call Debrief", "Reply Classification",
    ]);
    expect(jobNames("we_build_it_for_you")).toEqual([
      "Call Capture", "Collections", "Document Extraction", "Follow-Up Drafting", "Lead Qualification",
      "Payment Tracking", "Revenue Reporting", "Speed-to-Lead", "Status Updates",
    ]);
    expect(jobNames("mapped")).toHaveLength(122);
  });

  it("records the agents file's version", () => {
    expect(AGENTS_VERSION).toBe("2026-10-04");
  });

  it("returns undefined for an ID that isn't an agent", () => {
    expect(agentById("deals-closer")).toBeUndefined();
    expect(agentById("constructor")).toBeUndefined();
  });
});

describe("departments", () => {
  it("are the 7 in spine order, with §6.7's discs and agent numbers", () => {
    expect(departments.map((d) => d.id)).toEqual([...DEPARTMENTS]);
    expect(departments.map((d) => `${d.id} ${d.disc} ${d.numbers.join("-")}`)).toEqual([
      "intelligence G07 1-5", "marketing G06 6-10", "sales G05 11-15", "deals G04 16-20",
      "customer G03 21-23", "operations G02 24-28", "back-office G01 29-33",
    ]);
  });

  it("gives Back Office its name, its dp.* key and its five agents", () => {
    expect(departments[6]).toMatchObject({ name: "Back Office", copyKey: "backoffice" });
    expect(departments[6].agentIds).toEqual([
      "back-office-money-in", "back-office-finance-reporting", "back-office-records", "back-office-office", "back-office-talent",
    ]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/features/funnel/data/agents.test.ts`
Expected: FAIL, with `Failed to resolve import "./agents"`.

- [ ] **Step 3: Write the copy.md reader**

`src/features/funnel/data/tools/parse-copy.mjs`:

```js
// Reads the tables in .team/ziiro-fleet/funnel/copy.md into a Map from copy ID to text.
// A plain row gives its "Line" cell. A department row gives <id>.heading, .tag, .why and .words.
// An agent row gives <id>.name, <id>.line (without its trailing "●") and <id>.json, the agents-33.json id.
const cells = (row) => row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
const unTick = (s) => s.replace(/^`|`$/g, "");
const COPY_ID = /^[a-z][a-z0-9-]*(\.[A-Za-z0-9_-]+)+$/;

export function parseCopy(md) {
  const lines = md.split("\n");
  const out = new Map();
  for (let i = 0; i + 1 < lines.length; i++) {
    if (!lines[i].startsWith("|") || !/^\|\s*-/.test(lines[i + 1])) continue;
    const head = cells(lines[i]).map((h) => h.toLowerCase());
    const col = (name) => head.indexOf(name);
    const idCol = col("id");
    if (idCol < 0) continue;
    const whyCol = head.findIndex((h) => h.startsWith("why you need this"));
    const wordsCol = head.findIndex((h) => h.startsWith("with their words"));
    const isAgent = head.includes("plain name");
    const lineCol = col("line");
    for (let r = i + 2; r < lines.length && lines[r].startsWith("|"); r++) {
      const c = cells(lines[r]);
      const id = unTick(c[idCol] ?? "");
      if (!COPY_ID.test(id)) continue;
      if (whyCol >= 0) {
        out.set(`${id}.heading`, c[col("heading")]);
        out.set(`${id}.tag`, c[col("tag")]);
        out.set(`${id}.why`, c[whyCol]);
        out.set(`${id}.words`, c[wordsCol]);
      } else if (isAgent) {
        out.set(`${id}.name`, c[col("plain name")]);
        out.set(`${id}.line`, c[lineCol].replace(/\s*●\s*$/, ""));
        out.set(`${id}.json`, c[col("json id")]);
      } else if (lineCol >= 0) {
        out.set(id, c[lineCol]);
      }
    }
  }
  return out;
}
```

- [ ] **Step 4: Write the generator**

`src/features/funnel/data/tools/gen-data.mjs`:

```js
// Writes lane C's generated data from .team/ziiro-fleet/funnel. That folder is git-ignored, so the output is
// committed and CI never runs this. Run it from the repo root whenever copy.md or agents-33.json changes:
//   node src/features/funnel/data/tools/gen-data.mjs <path to .team/ziiro-fleet/funnel>
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseCopy } from "./parse-copy.mjs";

const DATA_DIR = "src/features/funnel/data";
const HEADER = "// Generated by tools/gen-data.mjs from .team/ziiro-fleet/funnel. Do not edit by hand.\n";
const DEPARTMENT_IDS = {
  Intelligence: "intelligence", Marketing: "marketing", Sales: "sales", Deals: "deals",
  Customer: "customer", Operations: "operations", "Back Office": "back-office",
};

const funnelDir = process.argv[2];
if (!funnelDir || !existsSync(join(DATA_DIR, "contract.ts"))) {
  console.error("Usage, from the repo root: node src/features/funnel/data/tools/gen-data.mjs <path to .team/ziiro-fleet/funnel>");
  process.exit(1);
}
const parsed = parseCopy(readFileSync(join(funnelDir, "copy.md"), "utf8"));
const agentsJson = JSON.parse(readFileSync(join(funnelDir, "agents-33.json"), "utf8"));

function agentRows() {
  const rowByJsonId = new Map(
    [...parsed.keys()].filter((k) => /^ag\.[a-z-]+\.json$/.test(k)).map((k) => [parsed.get(k), k.slice(0, -".json".length)]),
  );
  return agentsJson.agents.map((a) => {
    const row = rowByJsonId.get(a.id);
    const department = DEPARTMENT_IDS[a.department];
    if (!row || !department) throw new Error(`agent ${a.id}: no row in copy.md, or an unknown department "${a.department}"`);
    return {
      id: a.id,
      number: a.vertebra,
      department,
      name: parsed.get(`${row}.name`),
      line: parsed.get(`${row}.line`),
      jobs: a.jobs.map((j) => ({ id: j.id, name: j.name, status: j.status })),
    };
  });
}

const agents = agentRows();
const departmentNames = Object.fromEntries(Object.entries(DEPARTMENT_IDS).map(([name, id]) => [id, name]));
const files = {
  "agents.generated.ts": [
    HEADER,
    'import type { Agent, DepartmentId } from "./contract";\n',
    `export const AGENTS_VERSION = ${JSON.stringify(agentsJson.version)};\n`,
    `export const DEPARTMENT_NAMES: Readonly<Record<DepartmentId, string>> = ${JSON.stringify(departmentNames, null, 2)};\n`,
    `export const AGENT_ROWS: readonly Agent[] = ${JSON.stringify(agents, null, 2)};\n`,
  ].join("\n"),
};

for (const [name, body] of Object.entries(files)) {
  mkdirSync(dirname(join(DATA_DIR, name)), { recursive: true });
  writeFileSync(join(DATA_DIR, name), body);
}
const jobCount = agents.reduce((n, a) => n + a.jobs.length, 0);
console.log(`gen-data: wrote ${Object.keys(files).length} files, ${agents.length} agents, ${jobCount} jobs`);
```

Run: `node src/features/funnel/data/tools/gen-data.mjs .team/ziiro-fleet/funnel`
Expected: `gen-data: wrote 1 files, 33 agents, 137 jobs`, and a new `src/features/funnel/data/agents.generated.ts`.

- [ ] **Step 5: Write `agents.ts` and export it**

`src/features/funnel/data/agents.ts`:

```ts
// The 33 agents and the 7 departments (§5.1, §6.7), read from the generated rows.
import { AGENT_ROWS, AGENTS_VERSION, DEPARTMENT_NAMES } from "./agents.generated";
import { DEPARTMENT_DISC, DEPARTMENTS } from "./contract";
import type { Agent, Department, DepartmentId } from "./contract";

export { AGENTS_VERSION };

export const agents: readonly Agent[] = AGENT_ROWS;

const BY_ID: ReadonlyMap<string, Agent> = new Map(agents.map((a) => [a.id, a]));

export const agentById = (id: string): Agent | undefined => BY_ID.get(id);

function departmentFor(id: DepartmentId): Department {
  const members = agents.filter((a) => a.department === id);
  return {
    id,
    name: DEPARTMENT_NAMES[id],
    copyKey: id.replace("-", ""),
    disc: DEPARTMENT_DISC[id],
    numbers: [members[0].number, members[members.length - 1].number],
    agentIds: members.map((a) => a.id),
  };
}

export const departments: readonly Department[] = DEPARTMENTS.map(departmentFor);
```

Append to `src/features/funnel/data/index.ts`:

```ts
export { AGENTS_VERSION, agentById, agents, departments } from "./agents";
```

- [ ] **Step 6: Run the test and the type check**

Run: `npx vitest run src/features/funnel/data/agents.test.ts && npm run typecheck`
Expected: 8 tests pass, and `typecheck` exits 0.

- [ ] **Step 7: Commit and push**

```bash
npm test && npm run typecheck && npm run build
git add src/features/funnel/data/tools/parse-copy.mjs src/features/funnel/data/tools/gen-data.mjs \
  src/features/funnel/data/agents.generated.ts src/features/funnel/data/agents.ts \
  src/features/funnel/data/agents.test.ts src/features/funnel/data/index.ts
git commit -m "feat(funnel): add lane C's agents and departments data"
git pull --rebase && git push
```

### Task 2: `jobIdsFor` and `stopsFor`

**Files:**
- Modify: `src/features/funnel/data/agents.ts` (append), `src/features/funnel/data/index.ts` (widen the export line)
- Test: `src/features/funnel/data/agents.test.ts` (append)

**Interfaces:**
- Consumes: `agents`, `BY_ID` and `departments` from Task 1. `PlanStop`, `MarkCounts`, `JobStatus`, `AgentId` and `JobId` from `./contract`.
- Produces:
  - `jobIdsFor(agentIds: readonly AgentId[]): JobId[]`
  - `marksFor(agentIds: readonly AgentId[]): MarkCounts`
  - `stopsFor(agentIds: readonly AgentId[]): PlanStop[]`
  - All three throw `Unknown agent: <id>` on an ID that isn't an agent.

- [ ] **Step 1: Write the failing test**

Append to `src/features/funnel/data/agents.test.ts`. Merge the imports into the file's import lines at the top:

```ts
import { jobIdsFor, marksFor, stopsFor } from "./agents";
import type { AgentId } from "./contract";

/** Ananya's six agents in scroll order (§5.8). */
const ANANYA: AgentId[] = [
  "deals-inbound", "deals-reply-handling", "deals-call-cycle", "sales-sequencing-send", "marketing-insights", "back-office-finance-reporting",
];

describe("jobIdsFor", () => {
  it("lists the jobs agent by agent, each agent's in agents-33.json order", () => {
    const first = agentById("deals-inbound")?.jobs.map((j) => j.id) ?? [];
    expect(jobIdsFor(ANANYA)).toHaveLength(26);
    expect(jobIdsFor(ANANYA).slice(0, first.length)).toEqual(first);
  });

  it("is empty for no agents, and throws on an ID that isn't an agent", () => {
    expect(jobIdsFor([])).toEqual([]);
    expect(() => jobIdsFor(["deals-closer" as AgentId])).toThrow("Unknown agent: deals-closer");
  });
});

describe("marksFor", () => {
  it("counts Ananya's 26 jobs as ● 3 · ◐ 5 · ○ 18 (§5.8)", () => {
    expect(marksFor(ANANYA)).toEqual({ runs: 3, build: 5, mapped: 18 });
  });
});

describe("stopsFor", () => {
  it("gives Ananya's four stops, as §5.8's table has them", () => {
    const stops = stopsFor(ANANYA);
    expect(stops.map((s) => [s.department, s.disc, s.agentIds.length, s.jobIds.length, s.departmentAgents])).toEqual([
      ["deals", "G04", 3, 14, 5], ["sales", "G05", 1, 4, 5], ["marketing", "G06", 1, 4, 5], ["back-office", "G01", 1, 4, 5],
    ]);
    expect(stops.map((s) => s.marks)).toEqual([
      { runs: 3, build: 4, mapped: 7 }, { runs: 0, build: 0, mapped: 4 },
      { runs: 0, build: 0, mapped: 4 }, { runs: 0, build: 1, mapped: 3 },
    ]);
  });

  it("orders departments by first appearance and keeps the agents' order inside each", () => {
    const stops = stopsFor(["operations-client-comms", "back-office-office", "operations-knowledge"]);
    expect(stops.map((s) => `${s.department}: ${s.agentIds.join(", ")}`)).toEqual([
      "operations: operations-client-comms, operations-knowledge",
      "back-office: back-office-office",
    ]);
  });

  it("counts all the department's agents, for {m} in sp.disc.call", () => {
    expect(stopsFor(["customer-support"])[0].departmentAgents).toBe(3);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/features/funnel/data/agents.test.ts`
Expected: FAIL, because `jobIdsFor` is not a function (it isn't exported yet).

- [ ] **Step 3: Write the functions**

In `src/features/funnel/data/agents.ts`, replace the `import type` line with:

```ts
import type { Agent, AgentId, Department, DepartmentId, JobId, JobStatus, MarkCounts, PlanStop } from "./contract";
```

Then append to `src/features/funnel/data/agents.ts`:

```ts
function agentOrThrow(id: string): Agent {
  const agent = BY_ID.get(id);
  if (!agent) throw new Error(`Unknown agent: ${id}`);
  return agent;
}

/** §9 job_ids: the agents' jobs, agent by agent, each agent's jobs in agents-33.json order. */
export const jobIdsFor = (agentIds: readonly AgentId[]): JobId[] =>
  agentIds.flatMap((id) => agentOrThrow(id).jobs.map((j) => j.id));

const MARK_KEY: Readonly<Record<JobStatus, keyof MarkCounts>> = {
  runs_on_our_company_today: "runs",
  we_build_it_for_you: "build",
  mapped: "mapped",
};

/** ● ◐ ○ over the agents' jobs (§5.6). */
export const marksFor = (agentIds: readonly AgentId[]): MarkCounts =>
  agentIds
    .flatMap((id) => agentOrThrow(id).jobs)
    .reduce<MarkCounts>((m, job) => ({ ...m, [MARK_KEY[job.status]]: m[MARK_KEY[job.status]] + 1 }), { runs: 0, build: 0, mapped: 0 });

/** §5.5: one stop per department, in order of its first agent in the list, the agents in list order inside it. */
export function stopsFor(agentIds: readonly AgentId[]): PlanStop[] {
  const order = [...new Set(agentIds.map((id) => agentOrThrow(id).department))];
  return order.map((department) => {
    const inStop = agentIds.filter((id) => agentOrThrow(id).department === department);
    return {
      department,
      disc: DEPARTMENT_DISC[department],
      agentIds: inStop,
      jobIds: jobIdsFor(inStop),
      marks: marksFor(inStop),
      departmentAgents: agents.filter((a) => a.department === department).length,
    };
  });
}
```

In `src/features/funnel/data/index.ts`, widen Task 1's line to:

```ts
export { AGENTS_VERSION, agentById, agents, departments, jobIdsFor, stopsFor } from "./agents";
```

- [ ] **Step 4: Run the test and the type check**

Run: `npx vitest run src/features/funnel/data/agents.test.ts && npm run typecheck`
Expected: 14 tests pass, and `typecheck` exits 0.

- [ ] **Step 5: Commit, push and tell lane B**

```bash
npm test && npm run typecheck && npm run build
git add src/features/funnel/data/agents.ts src/features/funnel/data/agents.test.ts src/features/funnel/data/index.ts
git commit -m "feat(funnel): add jobIdsFor and stopsFor for lane B"
git pull --rebase && git push
```

Write one line in `.team/ziiro-fleet/worker-3.md`: "jobIdsFor, stopsFor and agentById are on the branch", so lane B's `/visit` can derive `job_ids` (00-index §2.2, day 1).

---

## Day 2: the copy, the small rules and the classifier

### Task 3: The copy lines and `copy()`

Lane A needs these by the morning of day 2 (00-index §2.2).

**Files:**
- Create: `src/features/funnel/data/tools/copy-surfaces.mjs`, `src/features/funnel/data/copy.ts`
- Create (generated): `src/features/funnel/data/copy/flow.ts`, `copy/site.ts`, `copy/plan.ts`, `copy/email.ts`, `copy/seo.ts`
- Modify: `src/features/funnel/data/tools/gen-data.mjs` (one import and one entry in `files`), `src/features/funnel/data/light.ts`
- Test: `src/features/funnel/data/copy.test.ts`

The copy goes in the light entry, `light.ts`, which `index.ts` re-exports (00-index §1.5). The header on every page, S0 to S8 and the film import it from there.

**Interfaces:**
- Consumes: `parseCopy` (Task 1); `departments` (Task 1); `CopyVars` and the option lists from `./contract`.
- Produces:
  - `COPY_LINES: Readonly<Record<string, string>>`
  - `copy(id: string, vars?: CopyVars): string`
  - generated: `FLOW_COPY`, `SITE_COPY`, `PLAN_COPY`, `EMAIL_COPY` and `SEO_COPY`, each an `as const` record of copy ID to line
  - lines with placeholders, keyed as written: `hx.p` and `ph.hx.p` `{name}`; `sp.hero.h`, `ph.hero.h`, their `.fallback` lines, `ph.later`, `sp.cta.lead` and `ph.cta.lead` `{n}`; `sp.hero.sub` `{n}` `{j}`; `sp.hero.scroll` `{d}` (its one-part twin `sp.hero.scroll.one`, D37, has no placeholder, and `copy()` ignores the `{d}` it's passed); `sp.part.count` `{i}` `{d}`; `ph.part` `{i}` `{d}` `{department}`; `ph.vert.jobs` `{j}`; `dp.*.words` `{words}`; the email's `{name}`, `{n}`, `{their words}`, `{chips}`, `{Department}`, `{dp.*.why}`, `{agent name}`, `{agent line}` and `{Calendly link}`; `g.progress` `{n}` `{total}`; `s8.l3` `{team}`

- [ ] **Step 1: Write the failing test**

`src/features/funnel/data/copy.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { departments } from "./agents";
import { BUSINESS_TYPES, CHIPS, NON_OWNER_REASONS, REVENUE_BANDS, SEGMENTS, TEAM_BANDS, YEARS_BANDS } from "./contract";
import { copy, COPY_LINES } from "./copy";

describe("copy", () => {
  it("returns a line with no placeholders as it is", () => {
    expect(copy("hx.btn1")).toBe("Book a call");
    expect(copy("seo.plan.title")).toBe("Your plan");
  });

  it("fills placeholders by the text inside the braces (00-index §1.3)", () => {
    expect(copy("sp.part.count", { i: 1, d: 4 })).toBe("Part 1 of 4");
    expect(copy("em.said", { "their words": "Leads go cold" })).toBe('You said: "Leads go cold"');
    expect(copy("em.dept", { Department: "Deals", "dp.*.why": "Replies go out fast." })).toBe("Deals. Replies go out fast.");
    expect(copy("em.said.chips", { chips: "Team chaos, Ads burn money" })).toBe("You picked: Team chaos, Ads burn money.");
  });

  it("puts a value in as plain text, never as a pattern or a new placeholder", () => {
    expect(copy("hx.p", { name: "$& {n}" }).startsWith("$& {n}, this is a full Business Spine")).toBe(true);
  });

  it("throws on an unknown ID, Object.prototype's keys included", () => {
    expect(() => copy("hx.nope")).toThrow('copy: unknown ID "hx.nope"');
    expect(() => copy("constructor")).toThrow("unknown ID");
    expect(() => copy("toString")).toThrow("unknown ID");
  });

  it("throws on a placeholder left unfilled", () => {
    expect(() => copy("sp.hero.h")).toThrow('copy: "sp.hero.h" needs {n}');
    expect(() => copy("sp.hero.sub", { n: 6 })).toThrow("needs {j}");
  });
});

describe("the generated lines", () => {
  it("take spec §4.5's lines over copy.md", () => {
    expect(copy("sp.pilot.note")).toBe(
      "This plan is a pilot. Parts of it are still being built. The part that answers questions about your business is live today, and we can show you one in 30 seconds.",
    );
    expect(copy("sp.later.sub")).toBe("Your business will change. When it does, add an agent.");
    expect(copy("hx.alt.dark")).toBe("A tall spine of dark chrome vertebrae, every disc glowing a cool blue-white.");
    expect(copy("s1b.o5")).toBe("Something else");
    expect(copy("g.footer")).toBe("Your answers are saved to shape your plan. · Privacy");
    expect(copy("r.film.close")).toBe("Close");
    expect(copy("sp.hero.scroll.one")).toBe("Scroll through the one part you need.");
  });

  it("store em.said.chips with one {chips} placeholder (00-index §1.3)", () => {
    expect(COPY_LINES["em.said.chips"]).toBe("You picked: {chips}.");
  });

  it("carry the header's lines, the film's and the one-part scroll line (wave9-requests item 8, D37, D38)", () => {
    const needed = [
      "nav.home.aria", "nav.mission", "nav.who", "nav.products", "nav.btn", "ph.nav.menu",
      "r.film.title", "r.film.cap", "r.film.close", "sp.hero.scroll.one",
    ];
    expect(needed.filter((id) => !COPY_LINES[id])).toEqual([]);
  });

  it("keep no editor's note or old wording", () => {
    const noted = Object.entries(COPY_LINES).filter(([, line]) => /\[|⚑|⚖|\*\*|owner to confirm|vertebra\b|Business Brain/i.test(line));
    expect(noted).toEqual([]);
  });

  it("leave the retired lines out (§4.5)", () => {
    const retired = [
      "sp.email.fail", "hx.p.open", "ph.hint", "sp.hero.h.one", "sp.hero.sub.one", "ph.hero.h.one",
      "em.need.one", "em.subject.one", "r.legend.centre",
    ];
    expect(retired.filter((id) => id in COPY_LINES)).toEqual([]);
  });

  it("split each option line into one label per contract ID (§4.3)", () => {
    const count = (id: string) => copy(id).split(" · ").length;
    expect(["s2.o", "s3.o", "s4.o", "s5.o.IN", "s5.o.other", "s6.chips"].map(count)).toEqual([
      BUSINESS_TYPES.length, YEARS_BANDS.length, TEAM_BANDS.length,
      REVENUE_BANDS.length - 1, REVENUE_BANDS.length - 1, CHIPS.length,
    ]);
    expect(SEGMENTS.filter((_, i) => !COPY_LINES[`s1.o${i + 1}`])).toEqual([]);
    expect(NON_OWNER_REASONS.filter((_, i) => !COPY_LINES[`s1b.o${i + 1}`])).toEqual([]);
  });

  it("have a heading, tag, why and words line for each department", () => {
    const missing = departments.flatMap((d) =>
      ["heading", "tag", "why", "words"].map((f) => `dp.${d.copyKey}.${f}`).filter((id) => !COPY_LINES[id]),
    );
    expect(missing).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/features/funnel/data/copy.test.ts`
Expected: FAIL, with `Failed to resolve import "./copy"`.

- [ ] **Step 3: List the lines each surface needs**

`src/features/funnel/data/tools/copy-surfaces.mjs`:

```js
// Which copy IDs lane C generates, by surface, and the lines spec §4.5 adds or changes, D37's sp.hero.scroll.one
// among them (plus §8.4's seo.* lines, 00-index §1.3's em.said.chips and D38's r.film.close). These win over
// copy.md until copy.md takes them. A missing line stops the generator.
const OVERLAY = {
  "g.footer": "Your answers are saved to shape your plan. · Privacy",
  "g.noscript": "This page needs JavaScript to build your plan. Rather talk? Book a call.",
  "s7.err.bot": "The spam check didn't go through. Mind trying once more?",
  "sp.save.fail": "I couldn't save your details just now, so no email went out. Your plan is below, and you can still book a call.",
  "sp.save.unsure": "I couldn't confirm your details were saved. Your plan is below, and you can still book a call.",
  "sp.disc.call": "{Department} · {k} of {m}",
  "sp.disc.aria": "{Department}: you need {k} of its {m} agents today.",
  "sp.disc.aria.none": "{Department}: nothing here is needed today.",
  "sp.pilot.note": "This plan is a pilot. Parts of it are still being built. The part that answers questions about your business is live today, and we can show you one in 30 seconds.",
  "em.pilot": "One thing to know: this plan is a pilot. Parts of it are still being built. The part that answers questions about your business is live today, and we can show you one in 30 seconds.",
  "em.said.chips": "You picked: {chips}.",
  "hx.alt.light": "A tall spine of glossy black vertebrae, every disc between them glowing orange.",
  "hx.alt.dark": "A tall spine of dark chrome vertebrae, every disc glowing a cool blue-white.",
  "sp.hero.alt": "A spine of dark metal vertebrae. The discs for the parts of your business that need agents today are lit, and the others are dark.",
  "sp.legend.today": "Lit: this part has agents you need today",
  "sp.legend.later": "Quiet: this part can come later",
  "sp.hint.hover": "Hover a disc to see that part's agents.",
  "sp.later.sub": "Your business will change. When it does, add an agent.",
  "s1b.o5": "Something else",
  "s5.o.other": "Under $250k · $250k–1M · $1–5M · $5–25M · $25M+",
  "s8.l1.chips": "Looking at what you picked…",
  "s8.l3.one": "Sizing it for a team of one…",
  "sp.hero.scroll.one": "Scroll through the one part you need.",
  "r.film.close": "Close",
  "seo.home.title": "Your Business Spine: an AI plan in a minute",
  "seo.home.desc": "Answer a few questions and see which of the 33 agents in a full Business Spine your business needs today. ziiro AI is an AI consultancy based in India.",
  "seo.plan.title": "Your plan",
};

const range = (prefix, from, to) => Array.from({ length: to - from + 1 }, (_, i) => `${prefix}${i + from}`);
const DEPARTMENT_KEYS = ["intelligence", "marketing", "sales", "deals", "customer", "operations", "backoffice"];

const SURFACES = {
  "copy/flow.ts": ["FLOW_COPY", [
    "g.about", "g.back", "g.progress", "g.footer", "g.error", "g.noscript",
    "s0.sub.early", "s0.sub.day", "s0.sub.late", "s0.promise",
    "s1.q", ...range("s1.o", 1, 5),
    "s1b.q", ...range("s1b.o", 1, 5), "s1b.done", "s1b.btn",
    "s2.q", "s2.hint", "s2.o", "s2.other",
    "s3.q", "s3.why", "s3.o", "s4.q", "s4.why", "s4.o",
    "s5.q", "s5.why", "s5.o.IN", "s5.o.other", "s5.skip",
    "s6.bridge", "s6.q", "s6.hint", "s6.text", "s6.chips.lead", "s6.chips", "s6.chips.max", "s6.btn", "s6.empty",
    "s7.q", "s7.sub", "s7.name", "s7.name.ph", "s7.email", "s7.email.ph", "s7.phone", "s7.phone.why", "s7.consent", "s7.links", "s7.btn",
    "s7.err.name", "s7.err.email", "s7.err.phone", "s7.err.consent", "s7.err.bot",
    "s8.l1", "s8.l1.chips", "s8.l2", "s8.l3", "s8.l3.one",
  ]],
  "copy/site.ts": ["SITE_COPY", ["nav.home.aria", "nav.mission", "nav.who", "nav.products", "nav.btn", "ph.nav.menu"]],
  "copy/plan.ts": ["PLAN_COPY", [
    "hx.eyebrow", "hx.h1", "hx.h2", "hx.p", "hx.btn1", "hx.btn2",
    "hx.stat1.n", "hx.stat1.l", "hx.stat2.n", "hx.stat2.l", "hx.stat3.n", "hx.stat3.l",
    "hx.call1.n", "hx.call1.l", "hx.call2.n", "hx.call2.l", "hx.scroll", "hx.alt.light", "hx.alt.dark",
    "ph.hx.h", "ph.hx.p", "ph.hx.stat2.l", "ph.hx.scroll",
    "sp.save.fail", "sp.save.unsure",
    "sp.hero.eyebrow", "sp.pilot", "sp.brain.label", "sp.brain.tip", "sp.brain.live",
    "sp.hero.h", "sp.hero.h.fallback", "sp.hero.sub", "sp.hero.honest", "sp.pilot.note",
    "sp.legend.jobs", "r.legend.live", "r.legend.build", "r.legend.mapped", "sp.hero.scroll", "sp.hero.scroll.one",
    "ph.hero.h", "ph.hero.h.fallback", "ph.hero.sub", "ph.hero.honest", "ph.hero.scroll", "ph.brain.label",
    "sp.part.count", "sp.part.agents", "sp.part.jobs", "sp.part.rest", "ph.part",
    "sp.vert.title", "sp.vert.line", "sp.vert.jobs", "sp.vert.live", "ph.vert.jobs",
    ...DEPARTMENT_KEYS.flatMap((d) => ["heading", "tag", "why", "words"].map((f) => `dp.${d}.${f}`)),
    "sp.later", "sp.later.sub", "ph.later", "cta.h", "sp.cta.lead", "ph.cta.lead", "cta.btn", "cta.sub",
    "r.film.title", "r.film.cap", "r.film.close",
    // Phase 1b's lines, generated now so the data module is complete.
    "sp.legend.today", "sp.legend.later", "sp.hero.alt", "sp.hint.hover", "sp.disc.call", "sp.disc.aria", "sp.disc.aria.none",
    "sp.vert.dept", "sp.vert.today", "sp.vert.later",
  ]],
  "copy/email.ts": ["EMAIL_COPY", [
    "em.from", "em.subject", "em.subject.fallback", "em.preview", "em.hi", "em.open", "em.said", "em.said.chips",
    "em.need", "em.need.fallback", "em.pilot", "em.dept", "em.agent", "em.close", "em.cta", "em.link", "em.cta.sub",
    "em.sign", "em.sign2", "em.foot",
  ]],
  "copy/seo.ts": ["SEO_COPY", ["seo.home.title", "seo.home.desc", "seo.plan.title"]],
};

/** One generated file per surface: { "copy/flow.ts": "<source>", … }. */
export function copyFiles(parsed, header) {
  const text = (id) => OVERLAY[id] ?? parsed.get(id);
  return Object.fromEntries(
    Object.entries(SURFACES).map(([file, [constName, ids]]) => {
      const missing = ids.filter((id) => !text(id));
      if (missing.length > 0) throw new Error(`${constName}: no line for ${missing.join(", ")}`);
      const body = ids.map((id) => `  ${JSON.stringify(id)}: ${JSON.stringify(text(id))},`).join("\n");
      return [file, `${header}export const ${constName} = {\n${body}\n} as const;\n`];
    }),
  );
}
```

In `src/features/funnel/data/tools/gen-data.mjs`, add this line under the `parse-copy.mjs` import:

```js
import { copyFiles } from "./copy-surfaces.mjs";
```

and add the copy files as the last entry of `files`, after the `"agents.generated.ts"` entry:

```js
  ...copyFiles(parsed, HEADER),
```

Run: `node src/features/funnel/data/tools/gen-data.mjs .team/ziiro-fleet/funnel`
Expected: `gen-data: wrote 6 files, 33 agents, 137 jobs`, and five new files under `src/features/funnel/data/copy/`. If it prints `no line for …`, copy.md lost a line: fix copy.md (ask the owner first) or add the spec's line to `OVERLAY`, never an invented one.

- [ ] **Step 4: Write `copy.ts` and export it**

`src/features/funnel/data/copy.ts`:

```ts
// Every copy line by its ID (§4.5, copy.md), and copy(), which fills a line's placeholders (00-index §1.3).
import type { CopyVars } from "./contract";
import { EMAIL_COPY } from "./copy/email";
import { FLOW_COPY } from "./copy/flow";
import { PLAN_COPY } from "./copy/plan";
import { SEO_COPY } from "./copy/seo";
import { SITE_COPY } from "./copy/site";

export const COPY_LINES: Readonly<Record<string, string>> = {
  ...FLOW_COPY, ...SITE_COPY, ...PLAN_COPY, ...EMAIL_COPY, ...SEO_COPY,
};

const PLACEHOLDER = /\{([^{}]+)\}/g;
const has = (record: object, key: string): boolean => Object.prototype.hasOwnProperty.call(record, key);

/** The line with every {placeholder} filled. An unknown ID or a placeholder with no value is a bug, so it throws. */
export function copy(id: string, vars: CopyVars = {}): string {
  if (!has(COPY_LINES, id)) throw new Error(`copy: unknown ID "${id}"`);
  return COPY_LINES[id].replace(PLACEHOLDER, (_, key: string) => {
    if (!has(vars, key)) throw new Error(`copy: "${id}" needs {${key}}`);
    return String(vars[key]);
  });
}
```

Append to `src/features/funnel/data/light.ts`:

```ts
export { copy, COPY_LINES } from "./copy";
```

- [ ] **Step 5: Run the test and the type check**

Run: `npx vitest run src/features/funnel/data/copy.test.ts && npm run typecheck`
Expected: 12 tests pass, and `typecheck` exits 0.

- [ ] **Step 6: Commit, push and tell lane A**

```bash
npm test && npm run typecheck && npm run build
git add src/features/funnel/data/tools/copy-surfaces.mjs src/features/funnel/data/tools/gen-data.mjs \
  src/features/funnel/data/copy src/features/funnel/data/copy.ts src/features/funnel/data/copy.test.ts \
  src/features/funnel/data/light.ts
git commit -m "feat(funnel): add the copy lines and copy()"
git pull --rebase && git push
```

Write one line in `.team/ziiro-fleet/worker-3.md`: "copy() and COPY_LINES are on the branch, in data/light.ts". An option's label is item i of its line split on `" · "` (contract.ts, §4.3).

### Task 4: `calendlyUrl`, `tierFor` and `currencyFor`

**Files:**
- Create: `src/features/funnel/data/calendly.ts`, `src/features/funnel/data/currency.ts`, `src/features/funnel/data/tier.ts`
- Modify: `src/features/funnel/data/light.ts`, `src/features/funnel/data/index.ts`
- Test: `src/features/funnel/data/calendly.test.ts`, `src/features/funnel/data/currency.test.ts`, `src/features/funnel/data/tier.test.ts`, `src/features/funnel/data/light.test.ts`

`calendlyUrl` and `currencyFor` join the copy in `light.ts`, and `tierFor` goes in `index.ts` (00-index §1.5). After this task `light.ts` is whole, so `light.test.ts` checks two things: it satisfies `FunnelLight`, and its imports never reach the agents data, the jobs, the classifier or `compose.ts`. The header loads it on every page (wave9-requests item 8).

**Interfaces:**
- Consumes: `INTERIM_BOOKING_URL` from `src/features/pricing/entities/rates.ts`, imported as `../../pricing/entities/rates`. `TeamBand`, `RevenueBand`, `Tier`, `Currency` and `FunnelLight` from `./contract`. `copy` and `COPY_LINES` in `light.ts` (Task 3).
- Produces:
  - `calendlyUrl(name: string, email: string): string`
  - `currencyFor(country: string | null, timeZone: string | null): Currency`
  - `tierFor(team: TeamBand, revenue: RevenueBand): Tier`
  - `light.ts`, which satisfies `FunnelLight`

- [ ] **Step 1: Write the failing tests**

`src/features/funnel/data/calendly.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { INTERIM_BOOKING_URL } from "../../pricing/entities/rates";
import { calendlyUrl } from "./calendly";

describe("calendlyUrl (§6.3)", () => {
  it("starts from the interim booking link", () => {
    expect(INTERIM_BOOKING_URL).toBe("https://calendly.com/ziiro-work/30min");
  });

  it("adds name and email as Calendly's link parameters", () => {
    expect(calendlyUrl("Ananya Rao", "ananya@studio.in")).toBe(`${INTERIM_BOOKING_URL}?name=Ananya%20Rao&email=ananya%40studio.in`);
  });

  it("encodes spaces and symbols, so the link can't break", () => {
    expect(calendlyUrl("A&B Studio #1", "a+b@x.co")).toBe(`${INTERIM_BOOKING_URL}?name=A%26B%20Studio%20%231&email=a%2Bb%40x.co`);
    expect(calendlyUrl("José", "")).toBe(`${INTERIM_BOOKING_URL}?name=Jos%C3%A9`);
    expect(calendlyUrl("अनु", "")).toBe(`${INTERIM_BOOKING_URL}?name=%E0%A4%85%E0%A4%A8%E0%A5%81`);
  });

  it("leaves out whatever is blank", () => {
    expect(calendlyUrl("", "a@b.co")).toBe(`${INTERIM_BOOKING_URL}?email=a%40b.co`);
    expect(calendlyUrl("   ", "")).toBe(INTERIM_BOOKING_URL);
  });
});
```

`src/features/funnel/data/tier.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { REVENUE_BANDS, TEAM_BANDS } from "./contract";
import type { Tier } from "./contract";
import { tierFor } from "./tier";

// Rows follow TEAM_BANDS. Columns follow REVENUE_BANDS: band_1 (the lowest) to band_5, then undisclosed.
const TABLE: readonly (readonly Tier[])[] = [
  ["S", "S", "S", "M", "M", "S"], // solo
  ["S", "S", "S", "M", "M", "S"], // 2_5
  ["S", "M", "M", "L", "L", "M"], // 6_20
  ["M", "L", "L", "L", "L", "L"], // 21_50
  ["M", "L", "L", "L", "L", "L"], // 50_plus
];

describe("tierFor (§5.3)", () => {
  it("covers every team and revenue answer", () => {
    expect(TEAM_BANDS.map((team) => REVENUE_BANDS.map((band) => tierFor(team, band)))).toEqual(TABLE);
  });
});
```

`src/features/funnel/data/currency.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { currencyFor } from "./currency";

describe("currencyFor (§5.3, D10)", () => {
  it("uses the country when there is one", () => {
    expect(currencyFor("IN", "Europe/London")).toBe("INR");
    expect(currencyFor("in", null)).toBe("INR");
    expect(currencyFor("GB", "Asia/Kolkata")).toBe("USD");
    expect(currencyFor("US", null)).toBe("USD");
  });

  it("falls back to the time zone when the country is unknown", () => {
    expect(currencyFor(null, "Asia/Kolkata")).toBe("INR");
    expect(currencyFor("", "Asia/Calcutta")).toBe("INR");
    expect(currencyFor(null, "Asia/Dubai")).toBe("USD");
    expect(currencyFor(null, null)).toBe("USD");
  });
});
```

`src/features/funnel/data/light.test.ts`:

```ts
// 00-index §1.5 (request 14) and wave9-requests item 8: light.ts is the light entry. The header on every page,
// S0 to S8 and the film import it, so its imports must never reach the agents data, the jobs, the classifier
// or compose.ts. reach() walks the relative imports that survive the build.
import { readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { FunnelLight } from "./contract";
import * as light from "./light";

/** `npm run typecheck` fails on this line if light.ts falls short of FunnelLight. */
const funnelLight: FunnelLight = light;

const DATA = resolve(process.cwd(), "src/features/funnel/data");
/** `import … from` and `export … from`. `import type` is left out, because the build drops it. */
const RUNTIME_IMPORT = /^(?:import|export)(?!\s+type\b)[^'"]*?from\s+["']([^"']+)["']/gm;

/** Every file `entry` reaches at run time, as paths from data/, sorted. */
function reach(entry: string): string[] {
  const seen = new Set<string>();
  const visit = (file: string): void => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const [, spec] of readFileSync(file, "utf8").matchAll(RUNTIME_IMPORT)) {
      if (spec.startsWith(".")) visit(`${resolve(dirname(file), spec)}.ts`);
    }
  };
  visit(resolve(DATA, entry));
  return [...seen].map((file) => relative(DATA, file)).sort();
}

describe("light.ts, the light entry (00-index §1.5)", () => {
  it("has every member of FunnelLight", () => {
    const members = ["COPY_LINES", "copy", "calendlyUrl", "currencyFor"] as const;
    expect(members.filter((m) => funnelLight[m] === undefined)).toEqual([]);
  });

  it("reaches only the contract, the copy, the booking link and the currency rule", () => {
    expect(reach("light.ts")).toEqual([
      "../../pricing/entities/rates.ts", "calendly.ts", "contract.ts", "copy.ts", "copy/email.ts",
      "copy/flow.ts", "copy/plan.ts", "copy/seo.ts", "copy/site.ts", "currency.ts", "light.ts",
    ]);
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run src/features/funnel/data/calendly.test.ts src/features/funnel/data/currency.test.ts src/features/funnel/data/tier.test.ts src/features/funnel/data/light.test.ts`
Expected: FAIL, with `Failed to resolve import "./calendly"`, `"./currency"` and `"./tier"`. In `light.test.ts` both tests fail, because `light.ts` has no `calendlyUrl` or `currencyFor` yet.

- [ ] **Step 3: Write the three files and export them**

`src/features/funnel/data/calendly.ts`:

```ts
// §6.3: every "Book a call" opens the same Calendly event, with their name and email filled in.
import { INTERIM_BOOKING_URL } from "../../pricing/entities/rates";

export function calendlyUrl(name: string, email: string): string {
  const params = [["name", name.trim()], ["email", email.trim()]]
    .filter(([, value]) => value !== "")
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`);
  return params.length === 0 ? INTERIM_BOOKING_URL : `${INTERIM_BOOKING_URL}?${params.join("&")}`;
}
```

`src/features/funnel/data/currency.ts`:

```ts
// §5.3 and D10: rupees or dollars. It sits in the light entry, because S5 needs it before the plan loads.
import type { Currency } from "./contract";

const INDIA_TIME_ZONES: ReadonlySet<string> = new Set(["Asia/Kolkata", "Asia/Calcutta"]);

/** Rupees when the country is India. With no country, the device's time zone decides. */
export function currencyFor(country: string | null, timeZone: string | null): Currency {
  const code = (country ?? "").trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(code)) return code === "IN" ? "INR" : "USD";
  return timeZone !== null && INDIA_TIME_ZONES.has(timeZone) ? "INR" : "USD";
}
```

`src/features/funnel/data/tier.ts`:

```ts
// §5.3: the size of the plan.
import type { RevenueBand, TeamBand, Tier } from "./contract";

const BY_TEAM: Readonly<Record<TeamBand, Tier>> = { solo: "S", "2_5": "S", "6_20": "M", "21_50": "L", "50_plus": "L" };
const ONE_DOWN: Readonly<Record<Tier, Tier>> = { S: "S", M: "S", L: "M" };
const ONE_UP: Readonly<Record<Tier, Tier>> = { S: "M", M: "L", L: "L" };

/** The team sets the tier. The lowest revenue band moves it down one, and the top two move it up one. */
export function tierFor(team: TeamBand, revenue: RevenueBand): Tier {
  const base = BY_TEAM[team];
  if (revenue === "band_1") return ONE_DOWN[base];
  if (revenue === "band_4" || revenue === "band_5") return ONE_UP[base];
  return base;
}
```

Append to `src/features/funnel/data/light.ts`:

```ts
export { calendlyUrl } from "./calendly";
export { currencyFor } from "./currency";
```

Append to `src/features/funnel/data/index.ts`:

```ts
export { tierFor } from "./tier";
```

- [ ] **Step 4: Run the tests and the type check**

Run: `npx vitest run src/features/funnel/data/calendly.test.ts src/features/funnel/data/currency.test.ts src/features/funnel/data/tier.test.ts src/features/funnel/data/light.test.ts && npm run typecheck`
Expected: 9 tests pass, and `typecheck` exits 0. A strict-mode error in `rates.ts` would mean the pricing entity can't be bundled into `api/`. That's a blocker for lane B's email: file it in requests.md, and don't edit `rates.ts`.

- [ ] **Step 5: Commit, push and tell lanes A, B and D**

```bash
npm test && npm run typecheck && npm run build
git add src/features/funnel/data/calendly.ts src/features/funnel/data/calendly.test.ts \
  src/features/funnel/data/currency.ts src/features/funnel/data/currency.test.ts \
  src/features/funnel/data/tier.ts src/features/funnel/data/tier.test.ts src/features/funnel/data/light.test.ts \
  src/features/funnel/data/light.ts src/features/funnel/data/index.ts
git commit -m "feat(funnel): add calendlyUrl, tierFor and currencyFor, and finish the light entry"
git pull --rebase && git push
```

Write one line in `.team/ziiro-fleet/worker-3.md`: "data/light.ts satisfies FunnelLight (copy, COPY_LINES, calendlyUrl, currencyFor); tierFor is in data/index.ts".

### Task 5: Cleaning their words, and the phrase lists

**Files:**
- Create: `src/features/funnel/data/classifier/normalise.ts`, `src/features/funnel/data/classifier/phrases.ts`
- Test: `src/features/funnel/data/classifier/normalise.test.ts`

**Interfaces:**
- Consumes: `Bucket` from `../contract`.
- Produces:
  - `normalise(text: string): string`
  - `tokens(text: string): string[]`
  - `type Problem = Exclude<Bucket, "unclassified">`
  - `PHRASES: Readonly<Record<Problem, readonly string[]>>`
  - `NEGATORS: readonly string[]`
  - `CLAUSE_BREAK: RegExp`
  - `CLAUSE_CONJUNCTIONS: ReadonlySet<string>`

- [ ] **Step 1: Write the failing test**

`src/features/funnel/data/classifier/normalise.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalise, tokens } from "./normalise";
import { NEGATORS, PHRASES } from "./phrases";

describe("normalise (§5.2 rule 1)", () => {
  it("lower-cases and drops punctuation, emoji and apostrophes", () => {
    expect(normalise("We can’t follow-up!! 😭❤️")).toBe("we cant follow up");
  });

  it("squeezes a letter repeated three or more times", () => {
    expect(normalise("Sooo slowww, need more")).toBe("so slow need more");
  });

  it("joins spelling variants", () => {
    expect(normalise("nahin nai nhi paise inquiry followup watsapp leads clients")).toBe(
      "nahi nahi nahi paisa enquiry follow up whatsapp lead client",
    );
  });

  it("leaves words that are Object.prototype keys alone", () => {
    expect(normalise("Constructor toString, payments stuck")).toBe("constructor tostring payments stuck");
  });

  it("keeps Devanagari words whole", () => {
    expect(tokens("पेमेंट अटका है।")).toEqual(["पेमेंट", "अटका", "है"]);
  });

  it("gives no tokens for empty or punctuation-only text", () => {
    expect(tokens("")).toEqual([]);
    expect(tokens(" ...!! ")).toEqual([]);
  });
});

describe("the phrase lists (templates.md §1)", () => {
  it("hold 209 phrases, none empty once cleaned and none listed twice", () => {
    const all = Object.values(PHRASES).flat().map((p) => tokens(p).join(" "));
    expect(all).toHaveLength(209);
    expect(all.filter((p) => p === "")).toEqual([]);
    expect(new Set(all).size).toBe(all.length);
  });

  it("keep every negator matchable", () => {
    expect(NEGATORS.filter((n) => tokens(n).length === 0)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/features/funnel/data/classifier/normalise.test.ts`
Expected: FAIL, with `Failed to resolve import "./normalise"`.

- [ ] **Step 3: Write `normalise.ts`**

`src/features/funnel/data/classifier/normalise.ts`:

```ts
// templates.md §1 and §5.2 rule 1: their words, cleaned before matching.

/** Spelling variants, joined before matching. A Map, so a typed word like "constructor" can't reach Object.prototype. */
const TOKEN_VARIANTS: ReadonlyMap<string, string> = new Map([
  ["nahin", "nahi"], ["nai", "nahi"], ["nhi", "nahi"],
  ["paise", "paisa"], ["pese", "paisa"],
  ["inquiry", "enquiry"], ["enquery", "enquiry"],
  ["followup", "follow up"],
  ["watsapp", "whatsapp"], ["wa", "whatsapp"],
  ["leads", "lead"], ["clients", "client"],
  ["horaha", "ho raha"], ["rha", "raha"],
  ["thik", "theek"],
]);
const VARIATION_SELECTORS_AND_JOINERS = /[\uFE00-\uFE0F\u200C\u200D]/g;
const APOSTROPHES = /['\u2018\u2019`]/g;
const NOT_A_WORD = /[^\p{L}\p{M}\p{N}\s]/gu;
const STRETCHED = /([a-z])\1{2,}/g;

/** Lower case; no punctuation, emoji or apostrophes; a letter typed 3 or more times in a row kept once; variants joined. */
export function normalise(text: string): string {
  const cleaned = text
    .normalize("NFC")
    .toLowerCase()
    .replace(VARIATION_SELECTORS_AND_JOINERS, "")
    .replace(APOSTROPHES, "")
    .replace(NOT_A_WORD, " ")
    .replace(STRETCHED, "$1");
  return cleaned
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word))
    .map((word) => TOKEN_VARIANTS.get(word) ?? word)
    .join(" ");
}

export function tokens(text: string): string[] {
  const clean = normalise(text);
  return clean === "" ? [] : clean.split(" ");
}
```

- [ ] **Step 4: Write `phrases.ts`**

`src/features/funnel/data/classifier/phrases.ts`. Every list is templates.md §1's, with its "facebook/instagram/meta/google ads" and "register/diary mein likhte" written out one phrase each:

```ts
// templates.md §1: the phrase lists (English, Hinglish and Devanagari), the negators and the clause breaks.
import type { Bucket } from "../contract";

export type Problem = Exclude<Bucket, "unclassified">;

export const PHRASES: Readonly<Record<Problem, readonly string[]>> = {
  lead_gen: [
    "not enough leads", "no enquiries", "few enquiries", "need more clients", "no new customers", "phone doesn't ring",
    "footfall down", "walk-ins down", "business is slow", "get more customers",
    "lead nahi aa rahe", "enquiry nahi aati", "enquiry kam hai", "client nahi mil rahe", "naye client chahiye",
    "customer nahi aa rahe", "footfall kam", "call nahi aate", "kaam nahi mil raha", "business slow hai", "order kam hai",
    "लीड नहीं", "इंक्वायरी कम", "क्लाइंट नहीं मिल", "ग्राहक नहीं आते", "धंधा मंदा",
  ],
  sales: [
    "don't convert", "not converting", "can't close", "they ghost", "no reply after quote", "only ask the price",
    "price shoppers", "time-pass enquiries", "follow up", "forget to follow up", "slow to reply", "call back", "calls back",
    "gone cold", "go cold", "missed calls", "lose them to competitors",
    "convert nahi hote", "close nahi hota", "deal haath se nikal gayi", "reply nahi karte", "ghost kar dete",
    "sirf rate puchte", "rate sun ke bhaag jaate", "time pass log", "follow up nahi hota", "follow up bhool jaate",
    "call back nahi kiya", "thande pad gaye", "thanda pad gaya", "quotation ke baad gayab", "competitor le gaya",
    "कन्वर्ट नहीं", "डील नहीं होती", "फॉलो अप", "जवाब नहीं देते", "रेट पूछते",
  ],
  ads: [
    "ads burn money", "ads not working", "wasted on ads", "facebook ads", "instagram ads", "meta ads", "google ads",
    "boosted post", "cost per lead", "roas", "ad agency", "marketing budget",
    "ads mein paisa doob gaya", "ads ka paisa barbaad", "ads kaam nahi kar rahe", "boost kiya kuch nahi hua",
    "marketing pe kharcha", "agency ko paisa diya", "lead mehngi padti",
    "विज्ञापन", "ऐड में पैसा", "मार्केटिंग का खर्चा",
  ],
  numbers: [
    "don't know my numbers", "profit", "margin", "cash flow", "where the money goes", "reports", "mis", "p&l",
    "accounts", "gst", "tally", "excel mess",
    "hisaab kitaab", "hisaab nahi pata", "profit pata nahi", "kitna kamaya pata nahi", "paisa kahan ja raha",
    "kharcha", "accounts ka jhanjhat", "gst ka jhanjhat",
    "हिसाब", "मुनाफा", "खर्चा", "पैसा कहाँ जा रहा",
  ],
  payments: [
    "payments stuck", "pending payment", "client hasn't paid", "overdue", "outstanding", "collections", "receivables",
    "invoices", "billing", "dues", "payment follow up", "advance not received",
    "payment atka hai", "paisa fasa hai", "payment pending", "client paisa nahi de raha", "udhaar", "baaki paisa",
    "vasooli", "bill nahi bana", "advance nahi mila", "contractor ka hisaab",
    "पेमेंट अटका", "पैसा फंसा", "उधार", "बकाया", "वसूली",
  ],
  team_ops: [
    "team chaos", "staff", "nothing on time", "delays", "deadlines", "i have to do everything", "depends on me",
    "miscommunication", "track projects", "site updates", "too many whatsapp groups", "paperwork", "manual work",
    "team sambhal nahi", "staff kaam nahi karta", "sab mujhe dekhna padta", "har cheez mere upar",
    "kaam time pe nahi hota", "site pe kya chal raha pata nahi", "gadbad", "coordination nahi",
    "group mein sab bikhra", "register mein likhte", "diary mein likhte",
    "स्टाफ", "टीम", "सब मुझे देखना", "गड़बड़", "देरी",
  ],
  content: [
    "no time for content", "posting", "reels", "videos", "social media", "consistency", "editing", "content ideas",
    "content ka time nahi", "post nahi hota", "reels nahi banti", "video banane ka time nahi",
    "social media sambhal nahi", "roz post",
    "रील", "वीडियो", "सोशल मीडिया", "पोस्ट",
  ],
  support: [
    "customer support", "complaints", "same questions again", "replying all day", "after-sales", "service requests",
    "bad reviews",
    "customer ke sawaal", "complaint aati", "ek hi sawaal baar baar", "reply karte karte thak gaye",
    "after sales service", "bura review",
    "शिकायत", "ग्राहक के सवाल",
  ],
  hiring: [
    "can't find good people", "hiring", "staff leaves", "attrition", "training new staff",
    "achhe log nahi milte", "staff nahi milta", "log chhod ke chale jaate", "naya banda sikhana",
    "स्टाफ नहीं मिलता", "लोग छोड़ देते",
  ],
};

/** Rule 3: a negator cancels a phrase up to 4 words away. A plain "nahi" never does. */
export const NEGATORS: readonly string[] = ["is fine", "no problem", "theek hai", "sahi chal raha", "koi dikkat nahi", "sorted"];

/** Negation never reaches past punctuation or a "but" (see the plan's "Decisions" section). The danda counts as a full stop. */
export const CLAUSE_BREAK = /[.!?;:,\n\u0964]+/u;
/** "par" is left out on purpose: in Hindi it also means "on". */
export const CLAUSE_CONJUNCTIONS: ReadonlySet<string> = new Set(["but", "however", "lekin", "magar", "लेकिन", "मगर"]);
```

- [ ] **Step 5: Run the test**

Run: `npx vitest run src/features/funnel/data/classifier/normalise.test.ts && npm run typecheck`
Expected: 8 tests pass, and `typecheck` exits 0.

- [ ] **Step 6: Commit and push**

```bash
npm test && npm run typecheck && npm run build
git add src/features/funnel/data/classifier/normalise.ts src/features/funnel/data/classifier/phrases.ts \
  src/features/funnel/data/classifier/normalise.test.ts
git commit -m "feat(funnel): add the classifier's word cleaning and phrase lists"
git pull --rebase && git push
```

### Task 6: `classify`

**Files:**
- Create: `src/features/funnel/data/classifier/classify.ts`
- Modify: `src/features/funnel/data/index.ts`
- Test: `src/features/funnel/data/classifier/classify.test.ts`

**Interfaces:**
- Consumes: `tokens` (Task 5); `PHRASES`, `NEGATORS`, `CLAUSE_BREAK`, `CLAUSE_CONJUNCTIONS` and `Problem` (Task 5); `CHIP_BUCKET`, `LIMITS`, `Bucket`, `ChipId` and `Classification` from `../contract`.
- Produces:
  - `CLASSIFIER_VERSION = "kw-1"`
  - `classify(problemText: string, chips: readonly ChipId[]): Classification`
  - `clauseTokens(text: string): { word: string; clause: number }[]`
- Rules for other lanes:
  - `bucketScores` holds only the problems that scored above 0. It can be `{}` for an unclassified answer.
  - `matchedPhrases` holds at most `LIMITS.matchedPhrases` (20) entries, the first in text order. The scores still count every match.

- [ ] **Step 1: Write the failing test**

`src/features/funnel/data/classifier/classify.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { classify, CLASSIFIER_VERSION, clauseTokens } from "./classify";

const words = (text: string) => classify(text, []);

describe("classify: their words alone (§5.2)", () => {
  it("puts Ananya under sales (§5.8)", () => {
    const r = words("Enquiries come in, but by the time someone calls back they've gone cold.");
    expect(r).toEqual({ bucketPrimary: "sales", bucketSecondary: null, bucketScores: { sales: 4 }, matchedPhrases: ["calls back", "gone cold"] });
  });

  it("lets the longest phrase use up its words (rule 2)", () => {
    expect(words("the payment follow up with clients takes forever every month").bucketPrimary).toBe("payments");
    expect(words("client paisa nahi de raha hai teen mahine se").bucketPrimary).toBe("payments");
  });

  it("caps a phrase's weight at 3", () => {
    expect(words("staff kaam nahi karta yaar sach mein").bucketScores.team_ops).toBe(3);
  });

  it("doesn't treat a plain 'nahi' as negation", () => {
    expect(words("lead nahi aa rahe yaar kya karu").bucketPrimary).toBe("lead_gen");
  });

  it("cancels a phrase with a negator up to 4 words away, not 5 (rule 3)", () => {
    expect(words("staff one two three four theek hai").matchedPhrases).toEqual([]);
    expect(words("staff one two three four five theek hai").matchedPhrases).toEqual(["staff"]);
  });

  it("keeps negation inside its clause (D35)", () => {
    const r = words("Billing is sorted, but our reels need work every week");
    expect([r.bucketPrimary, r.matchedPhrases]).toEqual(["content", ["reels"]]);
    expect(words("staff theek hai, payment atka hai bas").bucketPrimary).toBe("payments");
  });

  it("breaks a tie by the problem mentioned first, and keeps the other as second", () => {
    const r = words("our profit is unclear and the staff keep fighting daily");
    expect([r.bucketPrimary, r.bucketSecondary]).toEqual(["numbers", "team_ops"]);
  });

  it("is unclassified with fewer than 4 words, or with no match (rule 6)", () => {
    expect(words("payments stuck").bucketPrimary).toBe("unclassified");
    expect(words("honestly I am just tired of everything here")).toEqual({
      bucketPrimary: "unclassified", bucketSecondary: null, bucketScores: {}, matchedPhrases: [],
    });
  });

  it("reads curly apostrophes, Devanagari and stretched letters", () => {
    expect(words("we can’t close deals after the first meeting").bucketPrimary).toBe("sales");
    expect(words("मेरा पेमेंट अटका है और उधार बहुत है").bucketPrimary).toBe("payments");
    expect(words("nahiii yaar, slowww month, lead nahiii aa raheee").bucketPrimary).toBe("lead_gen");
  });

  it("doesn't find 'mis' inside 'miss'", () => {
    expect(words("we miss calls all the time at the front desk").bucketScores.numbers).toBeUndefined();
  });

  it("classifies text that holds an Object.prototype key", () => {
    expect(words("Constructor here, payments stuck for months now").bucketPrimary).toBe("payments");
  });

  it("returns at most 20 phrases but scores every match (Review Focus 1)", () => {
    const r = words(Array.from({ length: 30 }, () => "follow up").join(" "));
    expect(r.matchedPhrases).toHaveLength(20);
    expect(r.bucketScores.sales).toBe(60);
  });
});

describe("classify: chips (§5.2)", () => {
  it("lets the first chip decide, whatever the words say", () => {
    const r = classify("we never follow up and leads go cold and they ghost us", ["payments"]);
    expect([r.bucketPrimary, r.bucketSecondary]).toEqual(["payments", "sales"]);
  });

  it("scores the deciding chip 6 and the others 5", () => {
    const r = classify("", ["leads", "team"]);
    expect(r).toMatchObject({ bucketPrimary: "lead_gen", bucketSecondary: "team_ops", bucketScores: { lead_gen: 6, team_ops: 5 } });
  });

  it("drops a second problem under half the first one's score", () => {
    const r = classify("also the reels are a mess honestly", ["team"]);
    expect(r.bucketScores).toEqual({ team_ops: 6, content: 1 });
    expect(r.bucketSecondary).toBeNull();
  });

  it("is never unclassified once a chip is tapped", () => {
    expect(classify("hi", ["support"]).bucketPrimary).toBe("support");
  });
});

describe("clauseTokens", () => {
  it("starts a new clause at punctuation and at 'but'", () => {
    expect(clauseTokens("Billing is sorted, but our reels").map((t) => `${t.word}/${t.clause}`)).toEqual([
      "billing/0", "is/0", "sorted/0", "but/2", "our/2", "reels/2",
    ]);
  });
});

it("is version kw-1", () => {
  expect(CLASSIFIER_VERSION).toBe("kw-1");
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/features/funnel/data/classifier/classify.test.ts`
Expected: FAIL, with `Failed to resolve import "./classify"`.

- [ ] **Step 3: Write `classify.ts` and export it**

`src/features/funnel/data/classifier/classify.ts`:

```ts
// §5.2: their words and chips become the problem, the second problem and the phrases that matched.
import { CHIP_BUCKET, LIMITS } from "../contract";
import type { Bucket, ChipId, Classification } from "../contract";
import { tokens } from "./normalise";
import { CLAUSE_BREAK, CLAUSE_CONJUNCTIONS, NEGATORS, PHRASES } from "./phrases";
import type { Problem } from "./phrases";

/** Saved with every plan (§9 classifier_version). Bump it whenever a phrase or a rule in this folder changes. */
export const CLASSIFIER_VERSION = "kw-1";

const MAX_PHRASE_WEIGHT = 3; // rule 2
const NEGATION_WINDOW = 4; // rule 3
const DECIDING_CHIP_SCORE = 6; // rule 4
const OTHER_CHIP_SCORE = 5;
const MIN_WORDS = 4; // rule 6

interface Token {
  word: string;
  clause: number;
}

interface Match {
  bucket: Problem;
  phrase: string;
  start: number;
  end: number;
  weight: number;
}

const PROBLEMS = Object.keys(PHRASES) as Problem[];
const PATTERNS = PROBLEMS.flatMap((bucket) => PHRASES[bucket].map((phrase) => ({ bucket, phrase, words: tokens(phrase) })));
const NEGATOR_WORDS = NEGATORS.map(tokens);

/** Their words as tokens, each tagged with its clause. Punctuation and "but" start a new clause. */
export function clauseTokens(text: string): Token[] {
  const start = { out: [] as Token[], clause: 0 };
  return text.split(CLAUSE_BREAK).reduce((acc, part) => {
    const inPart = tokens(part).reduce((inner, word) => {
      const clause = CLAUSE_CONJUNCTIONS.has(word) ? inner.clause + 1 : inner.clause;
      return { out: [...inner.out, { word, clause }], clause };
    }, acc);
    return { out: inPart.out, clause: inPart.clause + 1 };
  }, start).out;
}

const startsAt = (words: readonly string[], pattern: readonly string[], i: number): boolean =>
  i + pattern.length <= words.length && pattern.every((w, k) => words[i + k] === w);

const occurrences = (words: readonly string[], pattern: readonly string[]): number[] =>
  words.flatMap((_, i) => (startsAt(words, pattern, i) ? [i] : []));

const overlaps = (a: Match, b: Match): boolean => a.start < b.end && b.start < a.end;

/** Rule 2: every phrase found, the longest first, each one using up its words. Returned in text order. */
function findMatches(words: readonly string[]): Match[] {
  const candidates = PATTERNS.flatMap((p) =>
    occurrences(words, p.words).map((start) => ({
      bucket: p.bucket,
      phrase: p.phrase,
      start,
      end: start + p.words.length,
      weight: Math.min(MAX_PHRASE_WEIGHT, p.words.length),
    })),
  );
  const longestFirst = [...candidates].sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start);
  return longestFirst
    .reduce<Match[]>((kept, c) => (kept.some((k) => overlaps(k, c)) ? kept : [...kept, c]), [])
    .sort((a, b) => a.start - b.start);
}

/** Rule 3, kept inside one clause (D35). */
function isNegated(match: Match, toks: readonly Token[]): boolean {
  const words = toks.map((t) => t.word);
  return NEGATOR_WORDS.some((negator) =>
    occurrences(words, negator).some((s) => {
      const gap = Math.max(s - match.end, match.start - (s + negator.length));
      return gap <= NEGATION_WINDOW && toks[s].clause === toks[match.start].clause;
    }),
  );
}

export function classify(problemText: string, chips: readonly ChipId[]): Classification {
  const toks = clauseTokens(problemText);
  const words = toks.map((t) => t.word);
  const matches = findMatches(words).filter((m) => !isNegated(m, toks));
  const scoreOf = (b: Bucket): number =>
    matches.filter((m) => m.bucket === b).reduce((sum, m) => sum + m.weight, 0) +
    chips.reduce((sum, chip, i) => sum + (CHIP_BUCKET[chip] === b ? (i === 0 ? DECIDING_CHIP_SCORE : OTHER_CHIP_SCORE) : 0), 0);
  const scored: Bucket[] = PROBLEMS.filter((b) => scoreOf(b) > 0);
  const bucketScores = Object.fromEntries(scored.map((b) => [b, scoreOf(b)])) as Partial<Record<Bucket, number>>;
  const matchedPhrases = matches.slice(0, LIMITS.matchedPhrases).map((m) => m.phrase);

  if (chips.length === 0 && (words.length < MIN_WORDS || matches.length === 0)) {
    return { bucketPrimary: "unclassified", bucketSecondary: null, bucketScores, matchedPhrases };
  }

  const firstMention = (b: Bucket): number => {
    const inText = matches.find((m) => m.bucket === b);
    if (inText) return inText.start;
    const chipIndex = chips.findIndex((c) => CHIP_BUCKET[c] === b);
    return chipIndex < 0 ? Number.POSITIVE_INFINITY : words.length + chipIndex;
  };
  const ranked = (candidates: readonly Bucket[]): Bucket[] =>
    [...candidates].sort((a, b) => scoreOf(b) - scoreOf(a) || firstMention(a) - firstMention(b));
  const bucketPrimary: Bucket = chips.length > 0 ? CHIP_BUCKET[chips[0]] : ranked(scored)[0];
  const runnerUp: Bucket | undefined = ranked(scored.filter((b) => b !== bucketPrimary))[0];
  const bucketSecondary = runnerUp !== undefined && scoreOf(runnerUp) * 2 >= scoreOf(bucketPrimary) ? runnerUp : null;
  return { bucketPrimary, bucketSecondary, bucketScores, matchedPhrases };
}
```

Append to `src/features/funnel/data/index.ts`:

```ts
export { classify, CLASSIFIER_VERSION } from "./classifier/classify";
```

- [ ] **Step 4: Run the test and the type check**

Run: `npx vitest run src/features/funnel/data/classifier/classify.test.ts && npm run typecheck`
Expected: 18 tests pass, and `typecheck` exits 0.

- [ ] **Step 5: Commit, push and tell lanes A and B**

```bash
npm test && npm run typecheck && npm run build
git add src/features/funnel/data/classifier/classify.ts src/features/funnel/data/classifier/classify.test.ts \
  src/features/funnel/data/index.ts
git commit -m "feat(funnel): add the keyword classifier, kw-1"
git pull --rebase && git push
```

Write one line in `.team/ziiro-fleet/worker-3.md`: "classify and CLASSIFIER_VERSION (kw-1) are on the branch; matchedPhrases is capped at 20".

---

## Day 3, morning: the plan descriptor

### Task 7: `composePlan`, the priority lists and `wordsDepartmentFor`

**Files:**
- Create: `src/features/funnel/data/compose.ts`
- Modify: `src/features/funnel/data/index.ts`
- Test: `src/features/funnel/data/compose.test.ts`

**Interfaces:**
- Consumes: `agentById`, `jobIdsFor`, `marksFor`, `stopsFor` and `AGENTS_VERSION` (Tasks 1, 2); `classify` and `CLASSIFIER_VERSION` (Task 6); `tierFor` (Task 4); `AGENT_IDS`, `TIER_SIZE` and the types from `./contract`.
- Produces:
  - `priority: Readonly<Record<OrderVariant, readonly AgentId[]>>`
  - `laneAgent: Readonly<Record<Lane, AgentId>>`
  - `ROUTES: Readonly<Record<Bucket, Route>>`, where `interface Route { template: Template; orderVariant: OrderVariant; lane: Lane | null }`
  - `agentsFor(route: Route, tier: Tier): AgentId[]`, in priority order
  - `composePlan(input: PlanInput): PlanDescriptor`
  - `wordsDepartmentFor(problemText: string): DepartmentId | null`

- [ ] **Step 1: Write the failing test**

`src/features/funnel/data/compose.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { agentById, jobIdsFor } from "./agents";
import { agentsFor, composePlan, laneAgent, priority, ROUTES, wordsDepartmentFor } from "./compose";
import { TIERS } from "./contract";
import type { OrderVariant, PlanInput } from "./contract";

const ANANYA_WORDS = "Enquiries come in, but by the time someone calls back they've gone cold.";
const numbers = (ids: readonly string[]) => ids.map((id) => agentById(id)?.number);
const names = (ids: readonly string[]) => ids.map((id) => agentById(id)?.name);
const input = (over: Partial<PlanInput>): PlanInput => ({
  teamBand: "6_20", revenueBand: "band_3", currency: "INR", chips: [], problemText: "", ...over,
});

describe("the priority lists (§5.4)", () => {
  it("name §5.4's agents in §5.4's order", () => {
    expect(names(priority["A-default"])).toEqual([
      "Collections agent", "Numbers agent", "Client updater", "Data mover", "Records keeper",
      "Office assistant", "Memory keeper", "Kickoff agent", "Support desk",
    ]);
    expect(priority["A-payments"]).toEqual(priority["A-default"]);
    expect(names(priority["A-numbers"]).slice(0, 2)).toEqual(["Numbers agent", "Collections agent"]);
    expect(names(priority["A-team"])).toEqual([
      "Client updater", "Memory keeper", "Office assistant", "Collections agent", "Numbers agent",
      "Data mover", "Records keeper", "Kickoff agent", "Support desk",
    ]);
    expect(names(priority["B-convert"])).toEqual([
      "Enquiry responder", "Reply sorter", "Call companion", "Campaign runner", "Marketing analyst",
      "Numbers agent", "Pipeline keeper", "Proposal maker", "Collections agent",
    ]);
    expect(names(priority["B-volume"])).toEqual([
      "Marketing analyst", "Content maker", "Enquiry responder", "Reply sorter", "List builder",
      "Numbers agent", "Publisher", "Ideal-client finder", "Call companion",
    ]);
  });

  it("give each lane its agent: content 7, support 21, hiring 33", () => {
    expect(numbers([laneAgent.content, laneAgent.support, laneAgent.hiring])).toEqual([7, 21, 33]);
  });

  it("route every problem as §5.2's table says", () => {
    expect(ROUTES.lead_gen).toEqual({ template: "B", orderVariant: "B-volume", lane: null });
    expect(ROUTES.sales).toEqual({ template: "B", orderVariant: "B-convert", lane: null });
    expect(ROUTES.ads).toEqual({ template: "B", orderVariant: "B-volume", lane: null });
    expect([ROUTES.numbers.orderVariant, ROUTES.payments.orderVariant, ROUTES.team_ops.orderVariant]).toEqual(["A-numbers", "A-payments", "A-team"]);
    expect(ROUTES.content).toEqual({ template: "A", orderVariant: "A-default", lane: "content" });
    expect([ROUTES.support.lane, ROUTES.hiring.lane]).toEqual(["support", "hiring"]);
    expect(ROUTES.unclassified).toEqual({ template: "A", orderVariant: "A-default", lane: null });
  });

  it("match every job count in §5.4", () => {
    const expected: readonly [OrderVariant, number[]][] = [
      ["A-default", [10, 23, 34]], ["A-payments", [10, 23, 34]], ["A-numbers", [10, 23, 34]],
      ["A-team", [9, 22, 34]], ["B-convert", [14, 26, 39]], ["B-volume", [18, 31, 44]],
    ];
    const got = expected.map(([orderVariant]) =>
      TIERS.map((tier) => jobIdsFor(agentsFor({ template: "A", orderVariant, lane: null }, tier)).length));
    expect(got).toEqual(expected.map(([, counts]) => counts));
  });

  it("put a lane's agent in the last place unless it's already in", () => {
    expect(numbers(agentsFor(ROUTES.content, "S"))).toEqual([29, 30, 7]);
    expect(numbers(agentsFor(ROUTES.hiring, "L"))).toEqual([29, 30, 26, 25, 31, 32, 27, 24, 33]);
    expect(numbers(agentsFor(ROUTES.support, "L"))).toEqual([29, 30, 26, 25, 31, 32, 27, 24, 21]);
  });
});

describe("composePlan", () => {
  it("builds Ananya's plan (§5.8)", () => {
    const plan = composePlan(input({ problemText: ANANYA_WORDS }));
    expect(plan).toMatchObject({
      template: "B", orderVariant: "B-convert", lane: null, tier: "M", pilot: true, fallback: false, currency: "INR",
      bucketPrimary: "sales", matchedPhrases: ["calls back", "gone cold"], classifierVersion: "kw-1", agentsVersion: "2026-10-04",
      marks: { runs: 3, build: 5, mapped: 18 }, litDiscs: ["G01", "G04", "G05", "G06"],
    });
    expect(numbers(plan.agentIds)).toEqual([16, 17, 18, 15, 6, 30]);
    expect(plan.stops.map((s) => s.department)).toEqual(["deals", "sales", "marketing", "back-office"]);
    expect(plan.jobIds).toEqual(jobIdsFor(plan.agentIds));
    expect(plan.jobIds).toHaveLength(26);
  });

  it("gives B at tier S no Back Office agent (D11)", () => {
    const plan = composePlan(input({ chips: ["convert"], teamBand: "solo" }));
    expect([plan.stops.map((s) => s.department), plan.litDiscs]).toEqual([["deals"], ["G04"]]);
  });

  it("falls back to A-default, with no lane, when unclassified", () => {
    const plan = composePlan(input({ problemText: "payments stuck", teamBand: "solo", revenueBand: "band_1" }));
    expect(plan).toMatchObject({ bucketPrimary: "unclassified", orderVariant: "A-default", lane: null, tier: "S", fallback: true, pilot: false });
    expect(numbers(plan.agentIds)).toEqual([29, 30, 26]);
  });

  it("puts agentIds in scroll order: departments by their first agent, list order inside (§5.5)", () => {
    expect(numbers(composePlan(input({ chips: ["team"] })).agentIds)).toEqual([26, 27, 25, 32, 29, 30]);
  });

  it("carries the currency it's given", () => {
    expect(composePlan(input({ currency: "USD", chips: ["ads"] })).currency).toBe("USD");
  });
});

describe("wordsDepartmentFor (§6.3, D36)", () => {
  it("is the department of the first agent in the order the words alone pick, for a problem with no lane", () => {
    expect(wordsDepartmentFor("our facebook ads burn money every single month")).toBe("marketing");
    expect(wordsDepartmentFor("payment atka hai client ka teen mahine se")).toBe("back-office");
  });

  it("is null for no words, or words that don't classify", () => {
    expect(wordsDepartmentFor("")).toBeNull();
    expect(wordsDepartmentFor("help")).toBeNull();
  });

  it("points content, support and hiring words at their lane agent's department: 7, 21 and 33 (D36)", () => {
    expect(wordsDepartmentFor("no time for reels and posting every week")).toBe("marketing");
    expect(wordsDepartmentFor("We answer the same questions again on WhatsApp all day.")).toBe("customer");
    expect(wordsDepartmentFor("We can't find good people, and the good ones leave.")).toBe("back-office");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/features/funnel/data/compose.test.ts`
Expected: FAIL, with `Failed to resolve import "./compose"`.

- [ ] **Step 3: Write `compose.ts` and export it**

`src/features/funnel/data/compose.ts`:

```ts
// §5.2 to §5.5 and §6.3: which agents a plan needs, in which order, and where their words point.
import { agentById, AGENTS_VERSION, jobIdsFor, marksFor, stopsFor } from "./agents";
import { classify, CLASSIFIER_VERSION } from "./classifier/classify";
import { AGENT_IDS, TIER_SIZE } from "./contract";
import type { AgentId, Bucket, DepartmentId, Lane, OrderVariant, PlanDescriptor, PlanInput, Template, Tier } from "./contract";
import { tierFor } from "./tier";

const byNumber = (numbers: readonly number[]): AgentId[] => numbers.map((n) => AGENT_IDS[n - 1]);

/** §5.4: each order's priority list, written as agent numbers. */
export const priority: Readonly<Record<OrderVariant, readonly AgentId[]>> = {
  "A-default": byNumber([29, 30, 26, 25, 31, 32, 27, 24, 21]),
  "A-payments": byNumber([29, 30, 26, 25, 31, 32, 27, 24, 21]),
  "A-numbers": byNumber([30, 29, 26, 25, 31, 32, 27, 24, 21]),
  "A-team": byNumber([26, 27, 32, 29, 30, 25, 31, 24, 21]),
  "B-convert": byNumber([16, 17, 18, 15, 6, 30, 20, 19, 29]),
  "B-volume": byNumber([6, 7, 16, 17, 12, 30, 9, 11, 18]),
};

/** §5.4: content, support and hiring plans add their lane's agent. */
export const laneAgent: Readonly<Record<Lane, AgentId>> = {
  content: "marketing-creation",
  support: "customer-support",
  hiring: "back-office-talent",
};

export interface Route {
  template: Template;
  orderVariant: OrderVariant;
  lane: Lane | null;
}

/** §5.2: the problem picks the template, the order and the lane. */
export const ROUTES: Readonly<Record<Bucket, Route>> = {
  lead_gen: { template: "B", orderVariant: "B-volume", lane: null },
  sales: { template: "B", orderVariant: "B-convert", lane: null },
  ads: { template: "B", orderVariant: "B-volume", lane: null },
  numbers: { template: "A", orderVariant: "A-numbers", lane: null },
  payments: { template: "A", orderVariant: "A-payments", lane: null },
  team_ops: { template: "A", orderVariant: "A-team", lane: null },
  content: { template: "A", orderVariant: "A-default", lane: "content" },
  support: { template: "A", orderVariant: "A-default", lane: "support" },
  hiring: { template: "A", orderVariant: "A-default", lane: "hiring" },
  unclassified: { template: "A", orderVariant: "A-default", lane: null },
};

/** §5.4: the order's first 3, 6 or 9 agents. A lane's agent takes the last place unless it's already in. */
export function agentsFor(route: Route, tier: Tier): AgentId[] {
  const picked = priority[route.orderVariant].slice(0, TIER_SIZE[tier]);
  if (route.lane === null || picked.includes(laneAgent[route.lane])) return picked;
  return [...picked.slice(0, -1), laneAgent[route.lane]];
}

export function composePlan(input: PlanInput): PlanDescriptor {
  const classification = classify(input.problemText, input.chips);
  const route = ROUTES[classification.bucketPrimary];
  const tier = tierFor(input.teamBand, input.revenueBand);
  const stops = stopsFor(agentsFor(route, tier));
  const agentIds = stops.flatMap((s) => s.agentIds);
  return {
    ...classification,
    template: route.template,
    orderVariant: route.orderVariant,
    lane: route.lane,
    tier,
    agentIds,
    jobIds: jobIdsFor(agentIds),
    stops,
    marks: marksFor(agentIds),
    litDiscs: stops.map((s) => s.disc).sort(),
    pilot: route.template === "B",
    fallback: classification.bucketPrimary === "unclassified",
    currency: input.currency,
    classifierVersion: CLASSIFIER_VERSION,
    agentsVersion: AGENTS_VERSION,
  };
}

/** §6.3 and D36: their words, classified alone without the chips, point at a department. A content, support or
 *  hiring problem points at its lane agent's department; any other problem, at its order's first agent's. */
export function wordsDepartmentFor(problemText: string): DepartmentId | null {
  const alone = classify(problemText, []);
  if (alone.bucketPrimary === "unclassified") return null;
  const route = ROUTES[alone.bucketPrimary];
  const agentId = route.lane === null ? priority[route.orderVariant][0] : laneAgent[route.lane];
  return agentById(agentId)?.department ?? null;
}
```

Append to `src/features/funnel/data/index.ts`:

```ts
export { composePlan, laneAgent, priority, wordsDepartmentFor } from "./compose";
```

- [ ] **Step 4: Run the test and the type check**

Run: `npx vitest run src/features/funnel/data/compose.test.ts && npm run typecheck`
Expected: 13 tests pass, and `typecheck` exits 0.

- [ ] **Step 5: Commit, push and tell lane A**

```bash
npm test && npm run typecheck && npm run build
git add src/features/funnel/data/compose.ts src/features/funnel/data/compose.test.ts src/features/funnel/data/index.ts
git commit -m "feat(funnel): add composePlan, the priority lists and wordsDepartmentFor"
git pull --rebase && git push
```

Write one line in `.team/ziiro-fleet/worker-3.md`: "composePlan is on the branch" (lane A's S8 needs it on the morning of day 3).

### Task 8: Their words: `quoteWords` and `cleanProblemText`

**Files:**
- Create: `src/features/funnel/data/words.ts`
- Modify: `src/features/funnel/data/index.ts`
- Test: `src/features/funnel/data/words.test.ts`

**Interfaces:**
- Consumes: `copy` (Task 3), for `s6.text`.
- Produces:
  - `quoteWords(text: string, max: number): string`. The page uses `max` 120 (§6.3). The email doesn't call it: it quotes their words with lane B's `cleanEcho` (00-index §1.5, request 15).
  - `cleanProblemText(text: string): string`

- [ ] **Step 1: Write the failing test**

`src/features/funnel/data/words.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { copy } from "./copy";
import { cleanProblemText, quoteWords } from "./words";

describe("quoteWords (§6.3)", () => {
  it("strips trailing punctuation, the danda included", () => {
    expect(quoteWords("they've gone cold.", 120)).toBe("they've gone cold");
    expect(quoteWords("why do leads go cold?!  ", 120)).toBe("why do leads go cold");
    expect(quoteWords("पेमेंट अटका है।", 120)).toBe("पेमेंट अटका है");
  });

  it("puts their words on one line", () => {
    expect(quoteWords("first line\n\nsecond line", 120)).toBe("first line second line");
  });

  it("cuts at 120 characters with '…'", () => {
    const quoted = quoteWords("a".repeat(130), 120);
    expect([...quoted]).toHaveLength(120);
    expect(quoted.endsWith("a…")).toBe(true);
    expect(quoteWords("b".repeat(120), 120)).toBe("b".repeat(120));
  });

  it("cuts at any length without splitting an emoji", () => {
    const quoted = quoteWords(`${"x".repeat(138)}😀😀😀`, 140);
    expect([...quoted]).toHaveLength(140);
    expect(quoted.endsWith("😀…")).toBe(true);
  });

  it("leaves no comma before the '…'", () => {
    expect(quoteWords(`${"c".repeat(118)}, and more words`, 120)).toBe(`${"c".repeat(118)}…`);
  });
});

describe("cleanProblemText (S6)", () => {
  const starter = copy("s6.text");

  it("treats the untouched starter as empty (Review Focus 2)", () => {
    expect(cleanProblemText(starter)).toBe("");
    expect(cleanProblemText(`  ${starter} `)).toBe("");
  });

  it("removes the blanks they didn't fill", () => {
    expect(cleanProblemText(starter.replace("___", "payments"))).toBe("Honestly, I'm struggling with payments because .");
  });

  it("keeps their own words as they are", () => {
    expect(cleanProblemText("Leads go cold.")).toBe("Leads go cold.");
  });

  it("is empty for nothing typed", () => {
    expect(cleanProblemText("   ")).toBe("");
  });
});
```

`starter.replace("___", "payments")` fills the first blank only, so the test also pins the starter's text: "Honestly, I'm struggling with ___ because ___.".

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/features/funnel/data/words.test.ts`
Expected: FAIL, with `Failed to resolve import "./words"`.

- [ ] **Step 3: Write `words.ts` and export it**

`src/features/funnel/data/words.ts`:

```ts
// §6.3: their words, quoted on the plan. And S6's starter line, which isn't their words.
import { copy } from "./copy";

/** Spaces, full stops, commas, colons, ? ! … the danda and double danda, and dashes. */
const TRAILING = /[\s.,;:!?\u2026\u0964\u0965\-\u2013\u2014]+$/u;
const BLANKS = /_{2,}/g;

const stripTrailing = (text: string): string => text.replace(TRAILING, "");

/** Their words on one line, trailing punctuation off, cut to `max` characters (code points) ending in "…". */
export function quoteWords(text: string, max: number): string {
  const oneLine = stripTrailing(text.trim().replace(/\s+/g, " "));
  const chars = [...oneLine];
  if (chars.length <= max) return oneLine;
  return `${stripTrailing(chars.slice(0, max - 1).join(""))}…`;
}

/** S6: the untouched starter line (s6.text) counts as nothing typed, and blanks left unfilled go. */
export function cleanProblemText(text: string): string {
  const trimmed = text.trim();
  if (trimmed === copy("s6.text").trim()) return "";
  return trimmed.replace(BLANKS, " ").replace(/[ \t]{2,}/g, " ").trim();
}
```

Append to `src/features/funnel/data/index.ts`:

```ts
export { cleanProblemText, quoteWords } from "./words";
```

- [ ] **Step 4: Run the test and the type check**

Run: `npx vitest run src/features/funnel/data/words.test.ts && npm run typecheck`
Expected: 9 tests pass, and `typecheck` exits 0.

- [ ] **Step 5: Commit, push and tell lanes A and B**

```bash
npm test && npm run typecheck && npm run build
git add src/features/funnel/data/words.ts src/features/funnel/data/words.test.ts src/features/funnel/data/index.ts
git commit -m "feat(funnel): add quoteWords and cleanProblemText"
git pull --rebase && git push
```

Write one line in `.team/ziiro-fleet/worker-3.md`: "quoteWords and cleanProblemText are on the branch, for lane C's page only (00-index §1.5, request 15)".

### Task 9: The 27 plans, and `index.ts` against `FunnelData`

**Files:**
- Test: `src/features/funnel/data/plans.test.ts`, `src/features/funnel/data/index.test.ts`
- Modify: nothing, unless a test finds a gap. Then fix it in the file that owns it, from Tasks 1 to 8.

**Interfaces:**
- Consumes: everything `index.ts` and `light.ts` export, and `FunnelData` from `./contract`.
- Produces: the proof that `import * as data from "./index"` satisfies `FunnelData` and carries all of `light.ts` (00-index §1.1), that the data stays bundle-safe for `api/funnel/*` (§13.1), and that the plan chunk's data fits in 12 KB gz (§13.10, as 00-index §1.5 changes it).

- [ ] **Step 1: Write the tests**

`src/features/funnel/data/plans.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { jobIdsFor, stopsFor } from "./agents";
import { composePlan } from "./compose";
import { LIMITS, TIER_SIZE, TIERS } from "./contract";
import type { ChipId, PlanDescriptor, TeamBand, Tier } from "./contract";

const TEAM_FOR_TIER: Readonly<Record<Tier, TeamBand>> = { S: "solo", M: "6_20", L: "21_50" };

/** One way into each of the 9 routes in §6.7: 6 orders and 3 lanes. */
const ROUTE_INPUTS: readonly { name: string; chips: ChipId[]; problemText: string }[] = [
  { name: "A-default", chips: [], problemText: "help" },
  { name: "A-payments", chips: ["payments"], problemText: "" },
  { name: "A-numbers", chips: ["numbers"], problemText: "" },
  { name: "A-team", chips: ["team"], problemText: "" },
  { name: "B-convert", chips: ["convert"], problemText: "" },
  { name: "B-volume", chips: ["leads"], problemText: "" },
  { name: "content lane", chips: ["content"], problemText: "" },
  { name: "support lane", chips: ["support"], problemText: "" },
  { name: "hiring lane", chips: [], problemText: "we just can't find good people for the studio" },
];

const ALL: readonly { name: string; plan: PlanDescriptor }[] = ROUTE_INPUTS.flatMap((route) =>
  TIERS.map((tier) => ({
    name: `${route.name} ${tier}`,
    plan: composePlan({
      teamBand: TEAM_FOR_TIER[tier], revenueBand: "undisclosed", currency: "INR",
      chips: route.chips, problemText: route.problemText,
    }),
  })),
);

describe("the 27 plans (§6.7)", () => {
  it("light exactly §6.7's 9 sets of discs", () => {
    const sets = ALL.reduce<Record<string, string[]>>((acc, { name, plan }) => {
      const key = plan.litDiscs.join("+");
      return { ...acc, [key]: [...(acc[key] ?? []), name] };
    }, {});
    expect(sets).toEqual({
      "G01+G02": [
        "A-default S", "A-default M", "A-payments S", "A-payments M", "A-numbers S", "A-numbers M",
        "A-team S", "A-team M", "hiring lane M", "hiring lane L",
      ],
      "G01+G02+G03": ["A-default L", "A-payments L", "A-numbers L", "A-team L", "support lane M", "support lane L"],
      G04: ["B-convert S"],
      "G01+G04+G05+G06": ["B-convert M", "B-convert L", "B-volume M", "B-volume L"],
      "G04+G06": ["B-volume S"],
      "G01+G06": ["content lane S"],
      "G01+G02+G06": ["content lane M", "content lane L"],
      "G01+G03": ["support lane S"],
      G01: ["hiring lane S"],
    });
  });

  it("are each 3, 6 or 9 agents, as the tier says, with no repeats", () => {
    const wrong = ALL.filter(({ plan }) =>
      plan.agentIds.length !== TIER_SIZE[plan.tier] || new Set(plan.agentIds).size !== plan.agentIds.length);
    expect(wrong.map(({ name }) => name)).toEqual([]);
  });

  it("agree with themselves: jobs, stops, marks and discs", () => {
    const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
    const broken = ALL.filter(({ plan }) =>
      !same(plan.jobIds, jobIdsFor(plan.agentIds)) ||
      !same(plan.stops, stopsFor(plan.agentIds)) ||
      plan.marks.runs + plan.marks.build + plan.marks.mapped !== plan.jobIds.length ||
      !same(plan.litDiscs, plan.stops.map((s) => s.disc).sort()));
    expect(broken.map(({ name }) => name)).toEqual([]);
  });

  it("stay inside /lead's limits", () => {
    const over = ALL.filter(({ plan }) =>
      plan.agentIds.length > LIMITS.agentIds || plan.matchedPhrases.length > LIMITS.matchedPhrases);
    expect(over.map(({ name }) => name)).toEqual([]);
  });

  it("carry the Pilot tag on lead-gen plans only (§5.7)", () => {
    expect(ALL.filter(({ plan }) => plan.pilot).map(({ name }) => name)).toEqual([
      "B-convert S", "B-convert M", "B-convert L", "B-volume S", "B-volume M", "B-volume L",
    ]);
  });
});
```

`src/features/funnel/data/index.test.ts`:

```ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import type { FunnelData } from "./contract";
import * as data from "./index";
import * as light from "./light";

/** `npm run typecheck` fails on this line if index.ts falls short of FunnelData. */
const funnelData: FunnelData = data;

const MEMBERS = [
  "AGENTS_VERSION", "CLASSIFIER_VERSION", "agents", "departments", "priority", "laneAgent", "copy", "agentById",
  "jobIdsFor", "stopsFor", "currencyFor", "tierFor", "classify", "composePlan", "calendlyUrl", "COPY_LINES",
] as const;

// Vitest runs from the repo root. No import.meta here, as everywhere under data/.
const DATA = resolve(process.cwd(), "src/features/funnel/data");
const RUNTIME_IMPORT = /^(?:import|export)(?!\s+type\b)[^'"]*?from\s+["']([^"']+)["']/gm;
const PRICING = join("..", "..", "pricing", "entities", "rates");

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "tools" ? [] : sourceFiles(path);
    return path.endsWith(".ts") && !path.endsWith(".test.ts") ? [path] : [];
  });
const runtimeImports = (file: string): string[] =>
  [...readFileSync(file, "utf8").matchAll(RUNTIME_IMPORT)].map((m) => m[1]);
const isGenerated = (file: string): boolean =>
  file.endsWith(".generated.ts") || relative(DATA, file).startsWith("copy/");

describe("data/index.ts", () => {
  it("exports every member of FunnelData, and everything light.ts exports", () => {
    expect(MEMBERS.filter((m) => funnelData[m] === undefined)).toEqual([]);
    expect(Object.keys(light).filter((key) => !(key in data))).toEqual([]);
    expect(data.CLASSIFIER_VERSION).toBe("kw-1");
  });

  it("imports only its own files and the pricing entity, so api/funnel can bundle it (§13.1)", () => {
    const imports = sourceFiles(DATA).flatMap((file) =>
      runtimeImports(file).map((spec) => ({ file: relative(DATA, file), spec, path: relative(DATA, resolve(dirname(file), spec)) })));
    expect(imports.filter((i) => !i.spec.startsWith("."))).toEqual([]);
    expect(imports.filter((i) => i.path.startsWith("..") && i.path !== PRICING)).toEqual([]);
  });

  it("never touches import.meta, window or document", () => {
    const touching = sourceFiles(DATA)
      .filter((f) => !isGenerated(f))
      .filter((f) => /import\.meta\.|\bwindow\.|\bdocument\./.test(readFileSync(f, "utf8")));
    expect(touching.map((f) => relative(DATA, f))).toEqual([]);
  });

  it("keeps the plan chunk's data, its agents, jobs and phrase lists, under 12 KB gzipped (§13.10)", () => {
    const files = ["agents.generated.ts", "classifier/phrases.ts"].map((f) => readFileSync(join(DATA, f)));
    expect(gzipSync(Buffer.concat(files)).length).toBeLessThanOrEqual(12 * 1024);
  });
});
```

The size check reads the source, which is larger than the minified build, so passing it means the built data fits too. The copy lines aren't in it: they sit in the light entry and count in "JS before first paint" (00-index §1.5). The disc map is in `contract.ts`, which both entries carry. On 8 Oct the plan chunk's data measured 7,242 bytes gzipped, and the copy files 4,979.

- [ ] **Step 2: Run them**

Run: `npx vitest run src/features/funnel/data/plans.test.ts src/features/funnel/data/index.test.ts && npm run typecheck`
Expected: 9 tests pass, and `typecheck` exits 0. A red here means an earlier task's file is wrong. Fix it there, and rerun that task's own test as well.

- [ ] **Step 3: Check the whole data module's coverage**

Run: `npx vitest run --coverage src/features/funnel/data`
Expected: lines at least 80 % for every file under `src/features/funnel/data/` except the generated ones, which are all data.

- [ ] **Step 4: Commit, push and tell lanes A, B and D**

```bash
npm test && npm run typecheck && npm run build
git add src/features/funnel/data/plans.test.ts src/features/funnel/data/index.test.ts
git commit -m "test(funnel): check the 27 plans and index.ts against FunnelData"
git pull --rebase && git push
```

Write one line in `.team/ziiro-fleet/worker-3.md`: "data/index.ts satisfies FunnelData and re-exports data/light.ts; lane C's own extras, outside the contract, are wordsDepartmentFor, quoteWords and cleanProblemText".

---

## Days 3 and 4: the plan page

The page renders blocks 1 to 4 of §6.2 in the first release's form:
- the r17 still in the hero;
- the plan as text;
- no lit discs and no scroll motion (those come in phase 1b, at the end of this plan).

A phone gets the same components with its `ph.*` lines. Every component reads its words through `copy()` or the view model, and its colours through the `--funnel-*` tokens.

Component tests run in jsdom. They opt in with `// @vitest-environment jsdom` as their first line (P0-T4).

### Task 10: The view model

**Files:**
- Create: `src/features/funnel/plan/planView.ts`
- Test: `src/features/funnel/plan/planView.test.ts`

**Interfaces:**
- Consumes, from `../data`: `copy`, `departments`, `agentById`, `cleanProblemText`, `quoteWords`, `wordsDepartmentFor`, and `composePlan` (in the test). From `../data/contract`: `PlanDescriptor`, `PlanStop`, `Department`, `DepartmentId`, `Agent`, `Job` and `JobStatus`.
- Produces:
  - `WORDS_MAX = 120`
  - `interface Lines { desktop: string; phone: string }`
  - `interface AgentView { id; name; line; jobs: readonly Job[]; jobsToggle: string }`
  - `interface StopView { depth; department; count: Lines; heading; tag; body; quotesWords; agents: readonly AgentView[]; rest: readonly string[] }`
  - `interface PlanViewModel { heroText; headline; sub; scroll; pilot; stops; later; ctaLead; closeDepth }`, where every line field is `Lines`
  - `buildPlanView(input: { plan: PlanDescriptor; name: string; problemText: string }): PlanViewModel`
  - `markOf(status: JobStatus): { glyph: string; label: string }`
  - `heroTitle(): readonly [Lines, Lines]`

- [ ] **Step 1: Write the failing test**

`src/features/funnel/plan/planView.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { composePlan, copy, quoteWords } from "../data";
import type { PlanInput } from "../data/contract";
import { buildPlanView, heroTitle, markOf, WORDS_MAX } from "./planView";

const ANANYA_WORDS = "Enquiries come in, but by the time someone calls back they've gone cold.";
const view = (over: Partial<PlanInput>, name = "Ananya") =>
  buildPlanView({
    plan: composePlan({ teamBand: "6_20", revenueBand: "band_3", currency: "INR", chips: [], problemText: "", ...over }),
    name,
    problemText: over.problemText ?? "",
  });

describe("buildPlanView: Ananya (§5.8)", () => {
  const v = view({ problemText: ANANYA_WORDS });

  it("counts her 6 agents and 26 jobs", () => {
    expect(v.headline).toEqual({
      desktop: "Out of 137 jobs across 33 agents, you need only 6 today.",
      phone: "137 jobs. 33 agents. You need 6 today.",
    });
    expect(v.sub.desktop).toContain("You need 6 of them today, carrying 26 jobs between them.");
    expect(v.scroll).toEqual({ desktop: "Scroll through the 4 parts you need.", phone: "Scroll" });
    expect(v.pilot).toBe(true);
  });

  it("numbers her four stops and quotes her words once, at Deals", () => {
    expect(v.stops.map((s) => [s.depth, s.count.desktop, s.count.phone, s.quotesWords])).toEqual([
      [1, "Part 1 of 4", "1/4 · Deals", true],
      [2, "Part 2 of 4", "2/4 · Sales", false],
      [3, "Part 3 of 4", "3/4 · Marketing", false],
      [4, "Part 4 of 4", "4/4 · Back Office", false],
    ]);
    expect(v.stops[0].body).toBe(
      copy("dp.deals.words", { words: "Enquiries come in, but by the time someone calls back they've gone cold" }),
    );
    expect(v.stops[3].body).toBe(copy("dp.backoffice.why"));
    expect(v.closeDepth).toBe(5);
  });

  it("lists the stop's agents with their lines, and the department's other agents by name", () => {
    expect(v.stops[0].agents.map((a) => a.name)).toEqual(["Enquiry responder", "Reply sorter", "Call companion"]);
    expect(v.stops[0].agents[0].jobsToggle).toMatch(/^\d+ jobs · tap to open$/);
    expect(v.stops[0].rest).toEqual(["Proposal maker", "Pipeline keeper"]);
  });

  it("fills the hero and the close with her name and her count", () => {
    expect(v.heroText.desktop.startsWith("Ananya, this is a full Business Spine")).toBe(true);
    expect(v.heroText.phone.startsWith("Ananya, this is the full spine.")).toBe(true);
    expect(v.later).toEqual({ desktop: copy("sp.later"), phone: "Pay for today's 6. Add the rest later." });
    expect(v.ctaLead.phone).toBe("Start with the 6 you need.");
  });
});

describe("buildPlanView: their words (§6.3)", () => {
  it("uses .why at every stop when only chips were tapped", () => {
    expect(view({ chips: ["convert"] }).stops.filter((s) => s.quotesWords)).toEqual([]);
  });

  it("doesn't quote the untouched S6 starter (Review Focus 2)", () => {
    expect(view({ chips: ["convert"], problemText: copy("s6.text") }).stops.filter((s) => s.quotesWords)).toEqual([]);
  });

  it("quotes nowhere when the words point at a department the plan lacks (Review Focus 3)", () => {
    const v = view({ chips: ["payments"], problemText: "our facebook ads burn money every single month" });
    expect(v.stops.map((s) => s.department)).not.toContain("marketing");
    expect(v.stops.filter((s) => s.quotesWords)).toEqual([]);
  });

  it("quotes content words at Marketing, the Content maker's department (D36)", () => {
    const v = view({ chips: ["convert"], problemText: "no time for reels and posting every week" });
    expect(v.stops.filter((s) => s.quotesWords).map((s) => s.department)).toEqual(["marketing"]);
  });

  it("quotes words that point at no department at the plan's first stop (D36)", () => {
    const chipPlan = view({ chips: ["convert"], problemText: "We are a family business." });
    expect(chipPlan.stops.map((s) => s.quotesWords)).toEqual([true, false, false, false]);
    expect(chipPlan.stops[0].body).toBe(copy("dp.deals.words", { words: "We are a family business" }));
    expect(view({ problemText: "help" }).stops.map((s) => s.quotesWords)).toEqual([true, false]);
  });

  it("cuts long words at 120 characters", () => {
    const long = `${ANANYA_WORDS} ${"Again and again, every week. ".repeat(6)}`;
    const quote = quoteWords(long, WORDS_MAX);
    expect([...quote].length).toBeLessThanOrEqual(WORDS_MAX);
    expect(quote.endsWith("…")).toBe(true);
    expect(view({ problemText: long }).stops[0].body).toBe(copy("dp.deals.words", { words: quote }));
  });
});

describe("buildPlanView: the edges", () => {
  it("uses the fallback headlines for an unclassified plan", () => {
    const v = view({ problemText: "help" });
    expect(v.headline).toEqual({ desktop: copy("sp.hero.h.fallback", { n: 6 }), phone: copy("ph.hero.h.fallback", { n: 6 }) });
    expect(v.pilot).toBe(false);
  });

  it("uses the singular scroll line on a one-part plan, never 'the 1 parts' (Review Focus 4, D37)", () => {
    const v = view({ chips: ["convert"], teamBand: "solo" });
    expect(v.stops[0].count).toEqual({ desktop: "Part 1 of 1", phone: "1/1 · Deals" });
    expect(v.scroll).toEqual({ desktop: copy("sp.hero.scroll.one", { d: 1 }), phone: copy("ph.hero.scroll") });
    expect(v.scroll.desktop).not.toMatch(/\b1 parts\b/);
    expect(v.closeDepth).toBe(2);
  });

  it("shows a name as typed, symbols and all", () => {
    expect(view({ chips: ["team"] }, "A&B <Studio> $1").heroText.desktop.startsWith("A&B <Studio> $1, this is")).toBe(true);
  });
});

describe("markOf and heroTitle", () => {
  it("cut each mark from its legend line", () => {
    expect(markOf("runs_on_our_company_today")).toEqual({ glyph: "●", label: "Runs on our own company today" });
    expect(markOf("we_build_it_for_you")).toEqual({ glyph: "◐", label: "We build it for you" });
    expect(markOf("mapped")).toEqual({ glyph: "○", label: "Mapped, not built yet" });
  });

  it("split ph.hx.h into the hero's two lines", () => {
    expect(heroTitle()).toEqual([
      { desktop: "137 Jobs.", phone: "137 Jobs." },
      { desktop: "33 AI Agents.", phone: "33 AI Agents." },
    ]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/features/funnel/plan/planView.test.ts`
Expected: FAIL, with `Failed to resolve import "./planView"`.

- [ ] **Step 3: Write `planView.ts`**

`src/features/funnel/plan/planView.ts`:

```ts
// The plan page's words (§6.2 to §6.4): every line that depends on the plan, worked out once, with no DOM.
import { agentById, cleanProblemText, copy, departments, quoteWords, wordsDepartmentFor } from "../data";
import type { Agent, Department, DepartmentId, Job, JobStatus, PlanDescriptor, PlanStop } from "../data/contract";

/** §6.3: their words are cut at 120 characters on the plan. */
export const WORDS_MAX = 120;

/** The line from 600 px wide, and the line under it (§6.4). Often the same. */
export interface Lines {
  desktop: string;
  phone: string;
}

export interface AgentView {
  id: string;
  name: string;
  line: string;
  jobs: readonly Job[];
  /** ph.vert.jobs, "{j} jobs · tap to open": a phone's job list starts closed (§6.4). */
  jobsToggle: string;
}

export interface StopView {
  /** This stop's plan_depth: 1 for the first stop (Appendix C). */
  depth: number;
  department: DepartmentId;
  /** sp.part.count, or ph.part on a phone. */
  count: Lines;
  heading: string;
  /** dp.*.tag, shown from 600 px only (§6.2). */
  tag: string;
  /** dp.*.words with their words, or dp.*.why (§6.3). */
  body: string;
  quotesWords: boolean;
  agents: readonly AgentView[];
  /** The department's other agents, by name, for sp.part.rest. */
  rest: readonly string[];
}

export interface PlanViewModel {
  heroText: Lines;
  headline: Lines;
  sub: Lines;
  scroll: Lines;
  pilot: boolean;
  stops: readonly StopView[];
  later: Lines;
  ctaLead: Lines;
  /** plan_depth of the close: the number of stops plus one. */
  closeDepth: number;
}

export interface PlanViewInput {
  plan: PlanDescriptor;
  name: string;
  problemText: string;
}

function departmentOf(id: DepartmentId): Department {
  const department = departments.find((d) => d.id === id);
  if (!department) throw new Error(`Unknown department: ${id}`);
  return department;
}

function agentOf(id: string): Agent {
  const agent = agentById(id);
  if (!agent) throw new Error(`Unknown agent: ${id}`);
  return agent;
}

function stopView(stop: PlanStop, index: number, total: number, quote: string | null): StopView {
  const department = departmentOf(stop.department);
  const key = `dp.${department.copyKey}`;
  return {
    depth: index + 1,
    department: stop.department,
    count: {
      desktop: copy("sp.part.count", { i: index + 1, d: total }),
      phone: copy("ph.part", { i: index + 1, d: total, department: department.name }),
    },
    heading: copy(`${key}.heading`),
    tag: copy(`${key}.tag`),
    body: quote === null ? copy(`${key}.why`) : copy(`${key}.words`, { words: quote }),
    quotesWords: quote !== null,
    agents: stop.agentIds.map(agentOf).map((a) => ({
      id: a.id,
      name: a.name,
      line: a.line,
      jobs: a.jobs,
      jobsToggle: copy("ph.vert.jobs", { j: a.jobs.length }),
    })),
    rest: department.agentIds.filter((id) => !stop.agentIds.includes(id)).map((id) => agentOf(id).name),
  };
}

export function buildPlanView({ plan, name, problemText }: PlanViewInput): PlanViewModel {
  const n = plan.agentIds.length;
  const parts = plan.stops.length;
  const words = cleanProblemText(problemText);
  // §6.3 and D36: their words are quoted once, at the stop of the department they point at. Words that point at no
  // department go to the first stop. Words that point at a department the plan lacks aren't quoted (Review Focus 3).
  const quoteDepartment = words === "" ? null : (wordsDepartmentFor(words) ?? plan.stops[0]?.department ?? null);
  const quoteAt = (stop: PlanStop): string | null =>
    stop.department === quoteDepartment ? quoteWords(words, WORDS_MAX) : null;
  const fallback = plan.fallback ? ".fallback" : "";
  return {
    heroText: { desktop: copy("hx.p", { name }), phone: copy("ph.hx.p", { name }) },
    headline: { desktop: copy(`sp.hero.h${fallback}`, { n }), phone: copy(`ph.hero.h${fallback}`, { n }) },
    sub: { desktop: copy("sp.hero.sub", { n, j: plan.jobIds.length }), phone: copy("ph.hero.sub") },
    // D37: a one-part plan gets the singular line, so it never reads "the 1 parts".
    scroll: {
      desktop: copy(parts === 1 ? "sp.hero.scroll.one" : "sp.hero.scroll", { d: parts }),
      phone: copy("ph.hero.scroll"),
    },
    pilot: plan.pilot,
    stops: plan.stops.map((stop, i) => stopView(stop, i, parts, quoteAt(stop))),
    later: { desktop: copy("sp.later"), phone: copy("ph.later", { n }) },
    ctaLead: { desktop: copy("sp.cta.lead", { n }), phone: copy("ph.cta.lead", { n }) },
    closeDepth: parts + 1,
  };
}

const MARK_LINE: Readonly<Record<JobStatus, string>> = {
  runs_on_our_company_today: "r.legend.live",
  we_build_it_for_you: "r.legend.build",
  mapped: "r.legend.mapped",
};

/** A job's mark (● ◐ ○) and its words, both cut from the legend line, "● Runs on our own company today". */
export function markOf(status: JobStatus): { glyph: string; label: string } {
  const line = copy(MARK_LINE[status]);
  const space = line.indexOf(" ");
  return { glyph: line.slice(0, space), label: line.slice(space + 1) };
}

/** The hero's two title lines. On a phone, ph.hx.h holds both, split at " / ". */
export function heroTitle(): readonly [Lines, Lines] {
  const [phoneFirst = "", phoneSecond = ""] = copy("ph.hx.h").split(" / ");
  return [
    { desktop: copy("hx.h1"), phone: phoneFirst },
    { desktop: copy("hx.h2"), phone: phoneSecond },
  ];
}
```

- [ ] **Step 4: Run the test and the type check**

Run: `npx vitest run src/features/funnel/plan/planView.test.ts && npm run typecheck`
Expected: 15 tests pass, and `typecheck` exits 0.

- [ ] **Step 5: Commit and push**

```bash
npm test && npm run typecheck && npm run build
git add src/features/funnel/plan/planView.ts src/features/funnel/plan/planView.test.ts
git commit -m "feat(funnel): add the plan page's view model"
git pull --rebase && git push
```

### Task 11: The test helper, `Swap`, `BookCallLink` and `SaveBanner`

**Files:**
- Create: `src/features/funnel/plan/test-utils.tsx`, `src/features/funnel/plan/Swap.tsx`, `src/features/funnel/plan/BookCallLink.tsx`, `src/features/funnel/plan/SaveBanner.tsx`
- Test: `src/features/funnel/plan/parts.test.tsx`

**Interfaces:**
- Consumes: `Lines` (Task 10); `calendlyUrl` and `copy` from `../data`; `CtaFrom` from `../data/contract`.
- Produces:
  - `render(ui: ReactElement): Rendered`, where `Rendered = { container: HTMLElement; rerender(ui: ReactElement): void; unmount(): void }`
  - `click(el: Element | null): void`
  - `stopNavigation(): () => void`, which returns its own undo
  - `textOf(el: Element | null): string`
  - `PHONE_ONLY = "min-[600px]:hidden"` and `DESKTOP_ONLY = "max-[600px]:hidden"`
  - `Swap(props: { lines: Lines; as?: ElementType; className?: string }): JSX.Element`
  - `BookCallLink(props: { name: string; email: string; from: CtaFrom; onBook(from: CtaFrom): void; className?: string; children: ReactNode }): JSX.Element`
  - `SaveBanner(props: { notice: "fail" | "unsure" | null }): JSX.Element | null`

- [ ] **Step 1: Write the test helper**

`src/features/funnel/plan/test-utils.tsx`. It's used by tests only, and it lets them render without Testing Library, which isn't installed (00-index Global Constraints):

```tsx
// Test helpers for the plan page: React 18's createRoot and act.
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

export interface Rendered {
  container: HTMLElement;
  rerender(ui: ReactElement): void;
  unmount(): void;
}

export function render(ui: ReactElement): Rendered {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(ui));
  return {
    container,
    rerender: (next) => act(() => root.render(next)),
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

export function click(el: Element | null): void {
  if (!el) throw new Error("click: no element");
  act(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

/** jsdom can't follow links. Call this before clicking one, and call what it returns afterwards. */
export function stopNavigation(): () => void {
  const stop = (e: Event) => e.preventDefault();
  document.addEventListener("click", stop);
  return () => document.removeEventListener("click", stop);
}

export const textOf = (el: Element | null): string => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
```

- [ ] **Step 2: Write the failing test**

`src/features/funnel/plan/parts.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calendlyUrl, copy } from "../data";
import { BookCallLink } from "./BookCallLink";
import { SaveBanner } from "./SaveBanner";
import { DESKTOP_ONLY, PHONE_ONLY, Swap } from "./Swap";
import { click, render, stopNavigation, textOf, type Rendered } from "./test-utils";

let screen: Rendered | null = null;
let allowNavigation: () => void = () => undefined;
beforeEach(() => {
  allowNavigation = stopNavigation();
});
afterEach(() => {
  screen?.unmount();
  screen = null;
  allowNavigation();
});

describe("Swap (§6.4)", () => {
  it("renders one element when both lines are the same", () => {
    screen = render(<Swap lines={{ desktop: "Scroll", phone: "Scroll" }} />);
    expect(screen.container.querySelectorAll("span")).toHaveLength(1);
  });

  it("renders both lines, each hidden by CSS on the other side of 600 px", () => {
    screen = render(<Swap lines={{ desktop: "Part 1 of 4", phone: "1/4 · Deals" }} />);
    const [desktop, phone] = Array.from(screen.container.querySelectorAll("span"));
    expect([desktop.textContent, desktop.className]).toEqual(["Part 1 of 4", DESKTOP_ONLY]);
    expect([phone.textContent, phone.className]).toEqual(["1/4 · Deals", PHONE_ONLY]);
  });

  it("renders the element it's asked for, with its class", () => {
    screen = render(<Swap as="h2" className="text-xl" lines={{ desktop: "a", phone: "b" }} />);
    expect(Array.from(screen.container.querySelectorAll("h2")).map((h) => h.className)).toEqual([
      `text-xl ${DESKTOP_ONLY}`, `text-xl ${PHONE_ONLY}`,
    ]);
  });
});

describe("BookCallLink (§6.3)", () => {
  it("opens Calendly in a new tab, with their name and email", () => {
    screen = render(<BookCallLink name="Ananya Rao" email="ananya@studio.in" from="hero" onBook={() => undefined}>{copy("hx.btn1")}</BookCallLink>);
    const link = screen.container.querySelector("a");
    expect([link?.getAttribute("href"), link?.target, link?.rel, textOf(link)]).toEqual([
      calendlyUrl("Ananya Rao", "ananya@studio.in"), "_blank", "noopener noreferrer", "Book a call",
    ]);
  });

  it("reports where the tap came from", () => {
    const onBook = vi.fn();
    screen = render(<BookCallLink name="A" email="a@b.co" from="close" onBook={onBook}>{copy("cta.btn")}</BookCallLink>);
    click(screen.container.querySelector("a"));
    expect(onBook).toHaveBeenCalledTimes(1);
    expect(onBook).toHaveBeenCalledWith("close");
  });
});

describe("SaveBanner (§10)", () => {
  it("shows nothing when the save went through", () => {
    screen = render(<SaveBanner notice={null} />);
    expect(screen.container.innerHTML).toBe("");
  });

  it("shows sp.save.fail or sp.save.unsure as an alert", () => {
    screen = render(<SaveBanner notice="fail" />);
    expect(textOf(screen.container.querySelector('[role="alert"]'))).toBe(copy("sp.save.fail"));
    screen.rerender(<SaveBanner notice="unsure" />);
    expect(textOf(screen.container.querySelector('[role="alert"]'))).toBe(copy("sp.save.unsure"));
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npx vitest run src/features/funnel/plan/parts.test.tsx`
Expected: FAIL, with `Failed to resolve import "./BookCallLink"`.

- [ ] **Step 4: Write the three components**

`src/features/funnel/plan/Swap.tsx`:

```tsx
// §6.4: the desktop line from 600 px, the phone line under it. Both are in the page and CSS shows one,
// so nothing jumps and no line waits for JavaScript to measure the screen.
import type { ElementType } from "react";
import type { Lines } from "./planView";

/** Shown under 600 px only. */
export const PHONE_ONLY = "min-[600px]:hidden";
/** Shown from 600 px only. */
export const DESKTOP_ONLY = "max-[600px]:hidden";

export interface SwapProps {
  lines: Lines;
  as?: ElementType;
  className?: string;
}

export function Swap({ lines, as: Tag = "span", className = "" }: SwapProps): JSX.Element {
  if (lines.desktop === lines.phone) return <Tag className={className || undefined}>{lines.desktop}</Tag>;
  return (
    <>
      <Tag className={`${className} ${DESKTOP_ONLY}`.trim()}>{lines.desktop}</Tag>
      <Tag className={`${className} ${PHONE_ONLY}`.trim()}>{lines.phone}</Tag>
    </>
  );
}
```

`src/features/funnel/plan/BookCallLink.tsx`:

```tsx
// §6.3: every "Book a call" on the plan opens the same Calendly event in a new tab, their name and email filled in.
import type { ReactNode } from "react";
import { calendlyUrl } from "../data";
import type { CtaFrom } from "../data/contract";

export interface BookCallLinkProps {
  name: string;
  email: string;
  from: CtaFrom;
  onBook(from: CtaFrom): void;
  className?: string;
  children: ReactNode;
}

export function BookCallLink({ name, email, from, onBook, className, children }: BookCallLinkProps): JSX.Element {
  return (
    <a href={calendlyUrl(name, email)} target="_blank" rel="noopener noreferrer" className={className} onClick={() => onBook(from)}>
      {children}
    </a>
  );
}
```

`src/features/funnel/plan/SaveBanner.tsx`:

```tsx
// §10: at the top of the plan when /lead didn't save (sp.save.fail) or didn't answer in time (sp.save.unsure).
import { copy } from "../data";

export function SaveBanner({ notice }: { notice: "fail" | "unsure" | null }): JSX.Element | null {
  if (notice === null) return null;
  return (
    <p
      role="alert"
      className="mx-4 mt-4 rounded-xl border border-[color:var(--funnel-line)] bg-[color:var(--funnel-card)] px-4 py-3 text-sm text-[color:var(--funnel-fg)] sm:mx-6 lg:mx-10"
    >
      {copy(notice === "fail" ? "sp.save.fail" : "sp.save.unsure")}
    </p>
  );
}
```

- [ ] **Step 5: Run the test and the type check**

Run: `npx vitest run src/features/funnel/plan/parts.test.tsx && npm run typecheck`
Expected: 7 tests pass, and `typecheck` exits 0.

- [ ] **Step 6: Commit and push**

```bash
npm test && npm run typecheck && npm run build
git add src/features/funnel/plan/test-utils.tsx src/features/funnel/plan/Swap.tsx src/features/funnel/plan/BookCallLink.tsx \
  src/features/funnel/plan/SaveBanner.tsx src/features/funnel/plan/parts.test.tsx
git commit -m "feat(funnel): add the plan's line swap, booking link and save banner"
git pull --rebase && git push
```

### Task 12: The theme, and the hero's `<picture>`

**Files:**
- Create: `src/features/funnel/plan/useHtmlTheme.ts`, `src/features/funnel/plan/HeroPicture.tsx`
- Test: `src/features/funnel/plan/hero-picture.test.tsx`

**Interfaces:**
- Consumes: `copy` from `../data/light`, the light entry, so that lane A's mount at S5 brings no plan data along (00-index §1.5); `Theme` from `../data/contract`; the stills from lane D at `public/spine/r17/{light,dark}/hero/` (00-index §1.3); `data-theme` on `<html>`, set by lane A's head script.
- Produces:
  - `useHtmlTheme(): Theme`, which re-renders when `data-theme` changes
  - `HeroPicture(props: { className?: string }): JSX.Element`
  - `HeroPicturePrefetch(): JSX.Element`, no props. Lane A mounts it at S5, out of sight, so the browser caches the same file S9 shows (§6.6).

- [ ] **Step 1: Write the failing test**

`src/features/funnel/plan/hero-picture.test.tsx`:

```tsx
// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { copy } from "../data";
import { HeroPicture, HeroPicturePrefetch } from "./HeroPicture";
import { render, type Rendered } from "./test-utils";

let screen: Rendered | null = null;
beforeEach(() => {
  document.documentElement.dataset.theme = "light";
});
afterEach(() => {
  screen?.unmount();
  screen = null;
  delete document.documentElement.dataset.theme;
});

const sources = () =>
  Array.from(screen?.container.querySelectorAll("source") ?? []).map((s) => ({
    type: s.getAttribute("type"),
    media: s.getAttribute("media"),
    sizes: s.getAttribute("sizes"),
    width: s.getAttribute("width"),
    height: s.getAttribute("height"),
    srcset: s.getAttribute("srcset"),
  }));

const phone = (ext: string) => `/spine/r17/light/hero/phone-828.${ext} 828w, /spine/r17/light/hero/phone-1170.${ext} 1170w`;
const wide = (ext: string) =>
  [1280, 1920, 2560].map((w) => `/spine/r17/light/hero/hero-${w}.${ext} ${w}w`).join(", ");

describe("HeroPicture (§6.6)", () => {
  it("offers AVIF before WebP: the phone band under 600 px, the landscape still from 600 px", () => {
    screen = render(<HeroPicture />);
    const band = { media: "(max-width: 599px)", sizes: "100vw", width: "1170", height: "1230" };
    const still = { media: "(min-width: 600px)", sizes: "100vw", width: "2560", height: "1440" };
    expect(sources()).toEqual([
      { type: "image/avif", ...band, srcset: phone("avif") },
      { type: "image/avif", ...still, srcset: wide("avif") },
      { type: "image/webp", ...band, srcset: phone("webp") },
      { type: "image/webp", ...still, srcset: wide("webp") },
    ]);
  });

  it("gives the <img> its size, async decoding and the theme's alt text, at normal priority", () => {
    screen = render(<HeroPicture />);
    const img = screen.container.querySelector("img");
    expect([img?.getAttribute("src"), img?.getAttribute("width"), img?.getAttribute("height"), img?.getAttribute("decoding"), img?.alt]).toEqual([
      "/spine/r17/light/hero/hero-1920.webp", "2560", "1440", "async", copy("hx.alt.light"),
    ]);
    expect(img?.hasAttribute("fetchpriority")).toBe(false);
    expect(img?.hasAttribute("loading")).toBe(false);
  });

  it("follows a theme switch while it's on screen (Review Focus 5)", async () => {
    screen = render(<HeroPicture />);
    await act(async () => {
      document.documentElement.dataset.theme = "dark";
    });
    expect(screen.container.querySelector("img")?.alt).toBe(copy("hx.alt.dark"));
    expect(sources().every((s) => s.srcset?.includes("/spine/r17/dark/hero/"))).toBe(true);
  });

  it("can be mounted early, out of sight and out of the accessibility tree", () => {
    screen = render(<HeroPicturePrefetch />);
    const box = screen.container.firstElementChild;
    expect(box?.getAttribute("aria-hidden")).toBe("true");
    expect(box?.querySelector("picture img")).not.toBeNull();
  });

  it("takes only the light entry from the data module, so the S5 mount brings no plan data (00-index §1.5)", () => {
    const source = readFileSync(resolve(process.cwd(), "src/features/funnel/plan/HeroPicture.tsx"), "utf8");
    const runtime = [...source.matchAll(/^import(?!\s+type\b)[^'"]*?from\s+["']([^"']+)["']/gm)].map((m) => m[1]);
    expect(runtime.filter((spec) => spec.startsWith("../data"))).toEqual(["../data/light"]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/features/funnel/plan/hero-picture.test.tsx`
Expected: FAIL, with `Failed to resolve import "./HeroPicture"`.

- [ ] **Step 3: Write the hook and the picture**

`src/features/funnel/plan/useHtmlTheme.ts`:

```ts
// The theme lane A's head script sets on <html data-theme> (00-index §1.3), followed live,
// so the hero still changes with the colours if the theme changes while the plan is open.
import { useSyncExternalStore } from "react";
import type { Theme } from "../data/contract";

const read = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

export const useHtmlTheme = (): Theme => useSyncExternalStore(subscribe, read, () => "light");
```

`src/features/funnel/plan/HeroPicture.tsx`:

```tsx
// §6.6: one <picture> for the hero still. AVIF first, then WebP. The phone band under 600 px, the landscape still
// from 600 px. Only the visitor's theme loads. No preload and no high priority: the plan is never the first screen.
// Lane A mounts HeroPicturePrefetch at S5, so this file takes copy from the light entry, never from ../data.
import { copy } from "../data/light";
import type { Theme } from "../data/contract";
import { useHtmlTheme } from "./useHtmlTheme";

const STILL_WIDTHS = [1280, 1920, 2560] as const;
const BAND_WIDTHS = [828, 1170] as const;
const STILL_SIZE = { width: 2560, height: 1440 } as const;
const BAND_SIZE = { width: 1170, height: 1230 } as const;
const BAND_MEDIA = "(max-width: 599px)";
const STILL_MEDIA = "(min-width: 600px)";
const FORMATS = ["avif", "webp"] as const;

const folder = (theme: Theme): string => `/spine/r17/${theme}/hero`;
const srcSet = (theme: Theme, name: "hero" | "phone", widths: readonly number[], ext: string): string =>
  widths.map((w) => `${folder(theme)}/${name}-${w}.${ext} ${w}w`).join(", ");

export function HeroPicture({ className }: { className?: string }): JSX.Element {
  const theme = useHtmlTheme();
  return (
    <picture>
      {FORMATS.flatMap((ext) => [
        <source key={`${ext}-band`} type={`image/${ext}`} media={BAND_MEDIA} sizes="100vw"
          srcSet={srcSet(theme, "phone", BAND_WIDTHS, ext)} {...BAND_SIZE} />,
        <source key={`${ext}-still`} type={`image/${ext}`} media={STILL_MEDIA} sizes="100vw"
          srcSet={srcSet(theme, "hero", STILL_WIDTHS, ext)} {...STILL_SIZE} />,
      ])}
      <img src={`${folder(theme)}/hero-1920.webp`} {...STILL_SIZE} decoding="async"
        alt={copy(theme === "dark" ? "hx.alt.dark" : "hx.alt.light")} className={className} />
    </picture>
  );
}

/** §6.6, "at S5 the funnel mounts the hero <picture> out of sight": the browser fetches and caches the file S9 shows. */
export function HeroPicturePrefetch(): JSX.Element {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed left-0 top-0 h-px w-px overflow-hidden opacity-0">
      <HeroPicture />
    </div>
  );
}
```

`sizes="100vw"` on a 1 px box still picks the file for the full screen width, which is why the early copy fetches what S9 shows.

- [ ] **Step 4: Run the test and the type check**

Run: `npx vitest run src/features/funnel/plan/hero-picture.test.tsx && npm run typecheck`
Expected: 5 tests pass, and `typecheck` exits 0.

- [ ] **Step 5: Commit, push and tell lane A**

```bash
npm test && npm run typecheck && npm run build
git add src/features/funnel/plan/useHtmlTheme.ts src/features/funnel/plan/HeroPicture.tsx src/features/funnel/plan/hero-picture.test.tsx
git commit -m "feat(funnel): add the hero picture and its early mount"
git pull --rebase && git push
```

Write one line in `.team/ziiro-fleet/worker-3.md`: "HeroPicturePrefetch (no props) is in src/features/funnel/plan/HeroPicture.tsx, which imports only data/light.ts; mount it at S5 (§6.6)".

### Task 13: The film lightbox

**Files:**
- Create: `src/features/funnel/plan/FilmLightbox.tsx`
- Test: `src/features/funnel/plan/film-lightbox.test.tsx`

**Interfaces:**
- Consumes: `BrandFilm`, the default export of `src/features/home/sections/BrandFilm.tsx` (lane D; never edited here). It's the click-to-play player: the poster first, nothing of the video fetched until a tap, then sound and controls, with `r.film.title` on its own frame (00-index §1.5, request 13). Also `copy` from `../data`; `FILM_PCTS`, `FilmPct` and `PlanProgress` from `../data/contract`.
- Produces:
  - `filmPctFor(currentTime: number, duration: number): FilmPct`
  - `FilmLightbox(props: { open: boolean; onClose(): void; onProgress(fields: PlanProgress): void }): JSX.Element | null`
  - It reports `{ filmPlayed: true }` once per page, and `{ filmPct }` once for each new quarter reached (§9).

The dialog is named by `aria-label={copy("r.film.title")}` and prints no title of its own, because `BrandFilm`'s frame already shows it, so the title appears once. `r.film.cap` sits under the film. The close button's words are `r.film.close` ("Close", D38), which the generator's `OVERLAY` carries until copy.md takes it (Task 3). Closing unmounts `BrandFilm`, which stops the film.

- [ ] **Step 1: Write the failing test**

`src/features/funnel/plan/film-lightbox.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { copy } from "../data";
import { FilmLightbox, filmPctFor } from "./FilmLightbox";
import { click, render, textOf, type Rendered } from "./test-utils";

vi.mock("../../home/sections/BrandFilm", async () => {
  const { createElement } = await import("react");
  return { default: () => createElement("video", { "data-testid": "film" }) };
});

let screen: Rendered | null = null;
afterEach(() => {
  screen?.unmount();
  screen = null;
});

/** Media events don't bubble. The lightbox hears them in the capture phase, as it would a real <video>'s. */
function fire(type: string, at?: { currentTime: number; duration: number }): void {
  const video = screen?.container.querySelector("video");
  if (!video) throw new Error("no video");
  if (at) {
    Object.defineProperty(video, "currentTime", { value: at.currentTime, configurable: true });
    Object.defineProperty(video, "duration", { value: at.duration, configurable: true });
  }
  act(() => {
    video.dispatchEvent(new Event(type));
  });
}

const noop = () => undefined;

describe("filmPctFor", () => {
  it("is the last quarter of the film reached", () => {
    expect([filmPctFor(0, Number.NaN), filmPctFor(10, 56.73), filmPctFor(14.2, 56.73), filmPctFor(42.6, 56.73), filmPctFor(56.73, 56.73)])
      .toEqual([0, 0, 25, 75, 100]);
  });
});

describe("FilmLightbox (§6.5)", () => {
  it("renders nothing while it's closed", () => {
    screen = render(<FilmLightbox open={false} onClose={noop} onProgress={noop} />);
    expect(screen.container.innerHTML).toBe("");
  });

  it("opens as a modal dialog named r.film.title without printing it, with the film, the caption and the close button focused", () => {
    screen = render(<FilmLightbox open onClose={noop} onProgress={noop} />);
    const dialog = screen.container.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect(dialog?.getAttribute("aria-label")).toBe(copy("r.film.title"));
    expect(textOf(dialog)).not.toContain(copy("r.film.title"));
    expect(textOf(dialog)).toContain(copy("r.film.cap"));
    expect(textOf(document.activeElement)).toBe(copy("r.film.close"));
    expect(dialog?.querySelector("video")).not.toBeNull();
  });

  it("closes on Escape and on its button", () => {
    const onClose = vi.fn();
    screen = render(<FilmLightbox open onClose={onClose} onProgress={noop} />);
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    click(screen.container.querySelector("button"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("reports film_played once, and each new quarter once (§9)", () => {
    const onProgress = vi.fn();
    screen = render(<FilmLightbox open onClose={noop} onProgress={onProgress} />);
    fire("play");
    fire("play");
    fire("timeupdate", { currentTime: 17, duration: 56.73 });
    fire("timeupdate", { currentTime: 30, duration: 56.73 });
    fire("timeupdate", { currentTime: 15, duration: 56.73 });
    fire("ended");
    expect(onProgress.mock.calls.map(([fields]) => fields)).toEqual([
      { filmPlayed: true }, { filmPct: 25 }, { filmPct: 50 }, { filmPct: 100 },
    ]);
  });

  it("gives focus back to what had it when it closes", () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    screen = render(<FilmLightbox open onClose={noop} onProgress={noop} />);
    screen.rerender(<FilmLightbox open={false} onClose={noop} onProgress={noop} />);
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/features/funnel/plan/film-lightbox.test.tsx`
Expected: FAIL, with `Failed to resolve import "./FilmLightbox"`.

- [ ] **Step 3: Write `FilmLightbox.tsx`**

`src/features/funnel/plan/FilmLightbox.tsx`:

```tsx
// §6.5: hx.btn2 opens the launch film in a lightbox named r.film.title. The film is lane D's BrandFilm, the
// click-to-play player, rendered as it is. Its frame already shows r.film.title, so the dialog only takes it as its
// aria-label (00-index §1.5, request 13). Media events don't bubble, so the dialog listens in the capture phase to
// report film_played and film_pct (§9) without reaching into BrandFilm.
import { useEffect, useRef } from "react";
import BrandFilm from "../../home/sections/BrandFilm";
import { copy } from "../data";
import { FILM_PCTS } from "../data/contract";
import type { FilmPct, PlanProgress } from "../data/contract";

export interface FilmLightboxProps {
  open: boolean;
  onClose(): void;
  onProgress(fields: PlanProgress): void;
}

/** The last quarter of the film reached: 0, 25, 50, 75 or 100. */
export function filmPctFor(currentTime: number, duration: number): FilmPct {
  if (!(duration > 0)) return 0;
  const pct = (currentTime / duration) * 100;
  return [...FILM_PCTS].reverse().find((p) => pct >= p) ?? 0;
}

const FOCUSABLE = 'a[href], button:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])';

/** Keeps Tab and Shift+Tab inside the dialog. */
function trapTab(e: KeyboardEvent, dialog: HTMLElement): void {
  const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!first || !last) return;
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

export function FilmLightbox({ open, onClose, onProgress }: FilmLightboxProps): JSX.Element | null {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const latest = useRef({ onClose, onProgress });
  const reported = useRef<{ played: boolean; pct: FilmPct }>({ played: false, pct: 0 });

  useEffect(() => {
    latest.current = { onClose, onProgress };
  }, [onClose, onProgress]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return undefined;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const reportPct = (pct: FilmPct) => {
      if (pct <= reported.current.pct) return;
      reported.current = { ...reported.current, pct };
      latest.current.onProgress({ filmPct: pct });
    };
    const onPlay = () => {
      if (reported.current.played) return;
      reported.current = { ...reported.current, played: true };
      latest.current.onProgress({ filmPlayed: true });
    };
    const onTime = (e: Event) => {
      const video = e.target as HTMLVideoElement;
      reportPct(filmPctFor(video.currentTime, video.duration));
    };
    const onEnded = () => reportPct(100);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") latest.current.onClose();
      if (e.key === "Tab") trapTab(e, dialog);
    };

    dialog.addEventListener("play", onPlay, true);
    dialog.addEventListener("timeupdate", onTime, true);
    dialog.addEventListener("ended", onEnded, true);
    document.addEventListener("keydown", onKey);
    return () => {
      dialog.removeEventListener("play", onPlay, true);
      dialog.removeEventListener("timeupdate", onTime, true);
      dialog.removeEventListener("ended", onEnded, true);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={copy("r.film.title")}
      className="fixed inset-0 z-50 overflow-y-auto bg-[color:var(--funnel-bg)] text-[color:var(--funnel-fg)]"
    >
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-end px-4 py-4 sm:px-6 lg:px-10">
        <button
          ref={closeRef}
          type="button"
          onClick={() => latest.current.onClose()}
          className="min-h-11 min-w-11 rounded-full border border-[color:var(--funnel-line)] px-4 text-sm"
        >
          {copy("r.film.close")}
        </button>
      </div>
      <BrandFilm />
      <p className="px-4 pb-8 text-center text-sm text-[color:var(--funnel-muted)]">{copy("r.film.cap")}</p>
    </div>
  );
}
```

`BrandFilm` gives §6.5's behaviour by itself: the poster shows first, and the film plays with sound once tapped. So the lightbox never imports `VslPlayer` or a `VslConfig` (00-index §1.3). Its media listeners sit on the dialog in the capture phase, so they also hear a `<video>` that appears only after the tap.

- [ ] **Step 4: Run the test and the type check**

Run: `npx vitest run src/features/funnel/plan/film-lightbox.test.tsx && npm run typecheck`
Expected: 6 tests pass, and `typecheck` exits 0.

- [ ] **Step 5: Commit and push**

```bash
npm test && npm run typecheck && npm run build
git add src/features/funnel/plan/FilmLightbox.tsx src/features/funnel/plan/film-lightbox.test.tsx
git commit -m "feat(funnel): add the film lightbox around BrandFilm"
git pull --rebase && git push
```

### Task 14: The hero, block 1

**Files:**
- Create: `src/features/funnel/plan/Hero.tsx`
- Test: `src/features/funnel/plan/hero.test.tsx`

**Interfaces:**
- Consumes: `heroTitle` and `Lines` (Task 10); `Swap` and `BookCallLink` (Task 11); `HeroPicture` (Task 12); `FilmLightbox` (Task 13); `copy` from `../data`; `CtaFrom` and `PlanProgress` from `../data/contract`.
- Produces:
  - `FILM_READY = true` (§6.5: `hx.btn2` shows only once lane D's re-rendered film is in `BrandFilm`)
  - `Hero(props: { heroText: Lines; name: string; email: string; headingRef: Ref<HTMLHeadingElement>; onBook(from: CtaFrom): void; onProgress(fields: PlanProgress): void }): JSX.Element`
  - The page's `<h1>` has `id="plan-hero-title"` and `tabIndex={-1}`, so `PlanPage` can focus it.

Notes on block 1:
- `hx.h2` is the second title line, "toned down" (§6.2). It uses `--funnel-muted` in both themes. The dark theme's blue-white gradient needs two colour tokens. Lane A has taken request 17 for them (`--funnel-title-from` and `--funnel-title-to`), but its token block doesn't set them yet, so this task doesn't use them.
- The callouts sit right of the spine, level with G05 and G03, because the left 55 % holds the words (D39).

- [ ] **Step 1: Write the failing test**

`src/features/funnel/plan/hero.test.tsx`:

```tsx
// @vitest-environment jsdom
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calendlyUrl, copy } from "../data";
import { FILM_READY, Hero } from "./Hero";
import { click, render, stopNavigation, textOf, type Rendered } from "./test-utils";

vi.mock("../../home/sections/BrandFilm", async () => {
  const { createElement } = await import("react");
  return { default: () => createElement("video") };
});

const heroText = { desktop: copy("hx.p", { name: "Ananya" }), phone: copy("ph.hx.p", { name: "Ananya" }) };
let screen: Rendered | null = null;
let allowNavigation: () => void = () => undefined;
beforeEach(() => {
  allowNavigation = stopNavigation();
});
afterEach(() => {
  screen?.unmount();
  screen = null;
  allowNavigation();
});

function renderHero(onBook = vi.fn(), headingRef = createRef<HTMLHeadingElement>()) {
  screen = render(
    <Hero heroText={heroText} name="Ananya" email="ananya@studio.in" headingRef={headingRef} onBook={onBook} onProgress={() => undefined} />,
  );
  return screen;
}

describe("Hero (§6.2 block 1)", () => {
  it("shows the eyebrow, both title lines, and their words with the name", () => {
    const { container } = renderHero();
    expect(textOf(container.querySelector("h1"))).toBe(`${copy("hx.h1")} ${copy("hx.h2")}`);
    expect(textOf(container)).toContain(copy("hx.eyebrow"));
    expect(textOf(container)).toContain(heroText.desktop);
    expect(textOf(container)).toContain(heroText.phone);
  });

  it("gives the page its h1, focusable from code", () => {
    const headingRef = createRef<HTMLHeadingElement>();
    const { container } = renderHero(vi.fn(), headingRef);
    expect(headingRef.current).toBe(container.querySelector("h1"));
    expect(headingRef.current?.tabIndex).toBe(-1);
  });

  it("books a call from the hero, with their name and email", () => {
    const onBook = vi.fn();
    const { container } = renderHero(onBook);
    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe(calendlyUrl("Ananya", "ananya@studio.in"));
    expect(textOf(link)).toBe(`${copy("hx.btn1")}↗`);
    click(link);
    expect(onBook).toHaveBeenCalledWith("hero");
  });

  it("opens the film from hx.btn2", () => {
    expect(FILM_READY).toBe(true);
    const { container } = renderHero();
    const button = Array.from(container.querySelectorAll("button")).find((b) => textOf(b) === copy("hx.btn2"));
    click(button ?? null);
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it("shows the three stats, with the phone's own label for the second", () => {
    const { container } = renderHero();
    const stats = textOf(container.querySelector("ul"));
    for (const id of ["hx.stat1.n", "hx.stat1.l", "hx.stat2.n", "hx.stat2.l", "ph.hx.stat2.l", "hx.stat3.n", "hx.stat3.l"]) {
      expect(stats).toContain(copy(id));
    }
  });

  it("keeps the callouts out of the accessibility tree, since the stats say the same", () => {
    const { container } = renderHero();
    const hidden = Array.from(container.querySelectorAll('[aria-hidden="true"]')).map(textOf).join(" ");
    for (const id of ["hx.call1.n", "hx.call1.l", "hx.call2.n", "hx.call2.l"]) {
      expect(hidden).toContain(copy(id));
    }
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/features/funnel/plan/hero.test.tsx`
Expected: FAIL, with `Failed to resolve import "./Hero"`.

- [ ] **Step 3: Write `Hero.tsx`**

`src/features/funnel/plan/Hero.tsx`:

```tsx
// Block 1 (§6.2): the full spine and its numbers. From 1024 px the still fills the hero and the words sit in its
// left 55 %. Under that (D34) the words come first, then the still (or the phone band) at full strength, then the
// stats and the scroll line.
import { useState, type Ref } from "react";
import { copy } from "../data";
import type { CtaFrom, PlanProgress } from "../data/contract";
import { BookCallLink } from "./BookCallLink";
import { FilmLightbox } from "./FilmLightbox";
import { HeroPicture } from "./HeroPicture";
import { heroTitle, type Lines } from "./planView";
import { Swap } from "./Swap";

/** §6.5: hx.btn2 shows only once lane D's re-rendered film is in BrandFilm (lane D, day 1). Set false if it slips. */
export const FILM_READY = true;

/** Where the callouts sit on the still, as fractions of its width and height. Each label sits right of the spine,
 *  with a line to its disc: G05 and G03 in the r17 hero camera's disc boxes (proto/look/web). From 1024 px only. */
const CALLOUTS = [
  { number: "hx.call1.n", label: "hx.call1.l", at: { x: 0.855, y: 0.25 }, disc: { x: 0.759, y: 0.287 } },
  { number: "hx.call2.n", label: "hx.call2.l", at: { x: 0.855, y: 0.465 }, disc: { x: 0.759, y: 0.502 } },
] as const;

const STATS = [
  { number: "hx.stat1.n", label: "hx.stat1.l", phoneLabel: "hx.stat1.l" },
  { number: "hx.stat2.n", label: "hx.stat2.l", phoneLabel: "ph.hx.stat2.l" },
  { number: "hx.stat3.n", label: "hx.stat3.l", phoneLabel: "hx.stat3.l" },
] as const;

const MICRO = "font-mono text-xs uppercase tracking-[0.18em] text-[color:var(--funnel-muted)]";
const BUTTON = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium";
const percent = (fraction: number): string => `${fraction * 100}%`;

export interface HeroProps {
  heroText: Lines;
  name: string;
  email: string;
  headingRef: Ref<HTMLHeadingElement>;
  onBook(from: CtaFrom): void;
  onProgress(fields: PlanProgress): void;
}

export function Hero({ heroText, name, email, headingRef, onBook, onProgress }: HeroProps): JSX.Element {
  const [filmOpen, setFilmOpen] = useState(false);
  const [firstLine, secondLine] = heroTitle();
  return (
    <section aria-labelledby="plan-hero-title" className="relative">
      <div className="lg:relative">
        <div className="px-4 pt-10 sm:px-6 lg:absolute lg:inset-y-0 lg:left-0 lg:z-10 lg:flex lg:w-[55%] lg:flex-col lg:justify-center lg:px-10 lg:pt-0">
          <p className={MICRO}>{copy("hx.eyebrow")}</p>
          <h1
            id="plan-hero-title"
            ref={headingRef}
            tabIndex={-1}
            className="mt-4 text-5xl font-medium leading-[1.02] tracking-tight outline-none lg:text-7xl"
          >
            <Swap lines={firstLine} className="block" />{" "}
            <Swap lines={secondLine} className="block text-[color:var(--funnel-muted)]" />
          </h1>
          <Swap as="p" lines={heroText} className="mt-6 max-w-xl text-base text-[color:var(--funnel-muted)] lg:text-lg" />
          <div className="mt-8 flex flex-wrap gap-3">
            <BookCallLink
              name={name}
              email={email}
              from="hero"
              onBook={onBook}
              className={`${BUTTON} bg-[color:var(--funnel-accent)] text-[color:var(--funnel-on-accent)]`}
            >
              {copy("hx.btn1")}
              <span aria-hidden="true">↗</span>
            </BookCallLink>
            {FILM_READY && (
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => setFilmOpen(true)}
                className={`${BUTTON} border border-[color:var(--funnel-line)]`}
              >
                {copy("hx.btn2")}
              </button>
            )}
          </div>
        </div>
        <div className="relative mt-10 lg:mt-0">
          <HeroPicture className="block h-auto w-full" />
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
          >
            {CALLOUTS.map((c) => (
              <line
                key={c.number}
                x1={c.disc.x}
                y1={c.disc.y}
                x2={c.at.x - 0.01}
                y2={c.at.y + 0.02}
                stroke="var(--funnel-line)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
          {CALLOUTS.map((c) => (
            <div key={c.number} aria-hidden="true" className="absolute hidden lg:block" style={{ left: percent(c.at.x), top: percent(c.at.y) }}>
              <span className="block text-3xl font-medium">{copy(c.number)}</span>
              <span className={`block ${MICRO}`}>{copy(c.label)}</span>
            </div>
          ))}
        </div>
      </div>
      <ul className="grid grid-cols-3 gap-4 px-4 pt-8 sm:px-6 lg:px-10">
        {STATS.map((s) => (
          <li key={s.number}>
            <span className="block text-3xl font-medium lg:text-4xl">{copy(s.number)}</span>{" "}
            <Swap lines={{ desktop: copy(s.label), phone: copy(s.phoneLabel) }} className="block text-sm text-[color:var(--funnel-muted)]" />
          </li>
        ))}
      </ul>
      <Swap as="p" lines={{ desktop: copy("hx.scroll"), phone: copy("ph.hx.scroll") }} className={`px-4 pb-10 pt-6 sm:px-6 lg:px-10 ${MICRO}`} />
      <FilmLightbox open={filmOpen} onClose={() => setFilmOpen(false)} onProgress={onProgress} />
    </section>
  );
}
```

- [ ] **Step 4: Run the test and the type check**

Run: `npx vitest run src/features/funnel/plan/hero.test.tsx && npm run typecheck`
Expected: 6 tests pass, and `typecheck` exits 0.

- [ ] **Step 5: Look at it**

Run `npm run dev`. Render `Hero` on a scratch route of your own, which you never commit, or wait for Task 16's page. Check it at 1440 × 900 and at 390 × 844, in both themes:
- At 1440 px the words sit left of the spine, and the callout lines touch G05 and G03.
- At 390 px the words come first, then the band, then the stats and "Scroll".
- Nothing scrolls sideways.

If the lines miss their discs, fix the fractions in `CALLOUTS` by eye.

- [ ] **Step 6: Commit and push**

```bash
npm test && npm run typecheck && npm run build
git add src/features/funnel/plan/Hero.tsx src/features/funnel/plan/hero.test.tsx
git commit -m "feat(funnel): add the plan hero"
git pull --rebase && git push
```

### Task 15: "You need only {n}", the stops and the close, blocks 2 to 4

**Files:**
- Create: `src/features/funnel/plan/NeedBlock.tsx`, `src/features/funnel/plan/PartStop.tsx`, `src/features/funnel/plan/Close.tsx`
- Test: `src/features/funnel/plan/blocks.test.tsx`

**Interfaces:**
- Consumes: `PlanViewModel`, `StopView` and `markOf` (Task 10); `Swap`, `DESKTOP_ONLY`, `PHONE_ONLY` and `BookCallLink` (Task 11); `copy` from `../data`; `Job`, `JobStatus` and `CtaFrom` from `../data/contract`.
- Produces:
  - `NeedBlock(props: { view: PlanViewModel }): JSX.Element`, carrying `data-depth="0"`
  - `PartStop(props: { stop: StopView }): JSX.Element`, carrying `data-depth={stop.depth}`
  - `Close(props: { view: PlanViewModel; name: string; email: string; onBook(from: CtaFrom): void }): JSX.Element`, carrying `data-depth={view.closeDepth}`
  - Task 16 counts `plan_depth` from these `data-depth` values.

- [ ] **Step 1: Write the failing test**

`src/features/funnel/plan/blocks.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { composePlan, copy } from "../data";
import type { PlanInput } from "../data/contract";
import { Close } from "./Close";
import { NeedBlock } from "./NeedBlock";
import { PartStop } from "./PartStop";
import { buildPlanView } from "./planView";
import { DESKTOP_ONLY, PHONE_ONLY } from "./Swap";
import { click, render, stopNavigation, textOf, type Rendered } from "./test-utils";

const ANANYA_WORDS = "Enquiries come in, but by the time someone calls back they've gone cold.";
const viewOf = (over: Partial<PlanInput>) =>
  buildPlanView({
    plan: composePlan({ teamBand: "6_20", revenueBand: "band_3", currency: "INR", chips: [], problemText: "", ...over }),
    name: "Ananya",
    problemText: over.problemText ?? "",
  });
const ananya = viewOf({ problemText: ANANYA_WORDS });

let screen: Rendered | null = null;
let allowNavigation: () => void = () => undefined;
beforeEach(() => {
  allowNavigation = stopNavigation();
});
afterEach(() => {
  screen?.unmount();
  screen = null;
  allowNavigation();
});

describe("NeedBlock (§6.2 block 2)", () => {
  it("shows her count, the Pilot tag and note, the brain card, the legend and the scroll line", () => {
    screen = render(<NeedBlock view={ananya} />);
    const section = screen.container.querySelector("section");
    const text = textOf(section);
    expect(section?.dataset.depth).toBe("0");
    for (const line of [
      copy("sp.hero.eyebrow"), copy("sp.pilot"), ananya.headline.desktop, ananya.headline.phone, ananya.sub.desktop,
      copy("sp.hero.honest"), copy("ph.hero.honest"), copy("sp.pilot.note"), copy("sp.brain.label"), copy("ph.brain.label"),
      copy("sp.brain.tip"), copy("sp.brain.live"), copy("sp.legend.jobs"), ananya.scroll.desktop,
    ]) {
      expect(text).toContain(line);
    }
    expect(Array.from(section?.querySelectorAll('li > [aria-hidden="true"]') ?? []).map((el) => el.textContent)).toEqual(["●", "◐", "○"]);
  });

  it("leaves the Pilot tag and note off a template A plan (§5.7)", () => {
    screen = render(<NeedBlock view={viewOf({ chips: ["team"] })} />);
    const text = textOf(screen.container);
    expect(text).not.toContain(copy("sp.pilot.note"));
    expect(Array.from(screen.container.querySelectorAll("span")).some((s) => s.textContent === copy("sp.pilot"))).toBe(false);
  });
});

describe("PartStop (§6.2 block 3)", () => {
  it("draws Ananya's first stop: count, heading, desktop tag, her words, agents, jobs and the rest", () => {
    screen = render(<PartStop stop={ananya.stops[0]} />);
    const section = screen.container.querySelector("section");
    expect(section?.dataset.depth).toBe("1");
    expect(textOf(document.getElementById(section?.getAttribute("aria-labelledby") ?? ""))).toBe(copy("dp.deals.heading"));
    expect(textOf(section)).toContain("Part 1 of 4");
    expect(textOf(section)).toContain("1/4 · Deals");
    const tag = Array.from(section?.querySelectorAll("p") ?? []).find((p) => p.textContent === copy("dp.deals.tag"));
    expect(tag?.classList.contains(DESKTOP_ONLY)).toBe(true);
    expect(textOf(section)).toContain(ananya.stops[0].body);
    expect(Array.from(section?.querySelectorAll("li p.font-medium") ?? []).map((p) => p.textContent)).toEqual([
      "Enquiry responder", "Reply sorter", "Call companion",
    ]);
    const details = section?.querySelector("details");
    expect(details?.classList.contains(PHONE_ONLY)).toBe(true);
    expect(details?.querySelector("summary")?.textContent).toBe(ananya.stops[0].agents[0].jobsToggle);
    // 14 jobs (§5.8), each marked once in the desktop list and once in the phone's.
    const jobs = ananya.stops[0].agents.reduce((n, a) => n + a.jobs.length, 0);
    expect(jobs).toBe(14);
    expect(section?.querySelectorAll('[role="img"]')).toHaveLength(2 * jobs);
    expect(textOf(section)).toContain(copy("sp.part.rest"));
    expect(textOf(section)).toContain("Proposal maker");
  });

  it("drops sp.part.rest when the plan has every agent in the department", () => {
    const v = viewOf({ chips: ["convert"], teamBand: "21_50" });
    expect(v.stops[0].rest).toEqual([]);
    screen = render(<PartStop stop={v.stops[0]} />);
    expect(textOf(screen.container)).not.toContain(copy("sp.part.rest"));
  });
});

describe("Close (§6.2 block 4)", () => {
  it("has the close's lines and one link, cta.btn, to Calendly (§6.3)", () => {
    const onBook = vi.fn();
    screen = render(<Close view={ananya} name="Ananya" email="ananya@studio.in" onBook={onBook} />);
    const section = screen.container.querySelector("section");
    expect(section?.dataset.depth).toBe("5");
    for (const line of [ananya.later.desktop, ananya.later.phone, copy("sp.later.sub"), copy("cta.h"), ananya.ctaLead.desktop, ananya.ctaLead.phone, copy("cta.sub")]) {
      expect(textOf(section)).toContain(line);
    }
    const links = section?.querySelectorAll("a") ?? [];
    expect(links).toHaveLength(1);
    expect(textOf(links[0])).toBe(copy("cta.btn"));
    click(links[0]);
    expect(onBook).toHaveBeenCalledWith("close");
  });

  it("shows no price and no free offer (Appendix A)", () => {
    screen = render(<Close view={ananya} name="Ananya" email="ananya@studio.in" onBook={() => undefined} />);
    expect(textOf(screen.container)).not.toMatch(/₹|\$\d|free/i);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/features/funnel/plan/blocks.test.tsx`
Expected: FAIL, with `Failed to resolve import "./Close"`.

- [ ] **Step 3: Write the three blocks**

`src/features/funnel/plan/NeedBlock.tsx`:

```tsx
// Block 2 (§6.2): "you need only {n}". It's plan_depth 0.
import { copy } from "../data";
import type { JobStatus } from "../data/contract";
import { markOf, type PlanViewModel } from "./planView";
import { Swap } from "./Swap";

const STATUSES: readonly JobStatus[] = ["runs_on_our_company_today", "we_build_it_for_you", "mapped"];
const MICRO = "font-mono text-xs uppercase tracking-[0.18em] text-[color:var(--funnel-muted)]";

export function NeedBlock({ view }: { view: PlanViewModel }): JSX.Element {
  return (
    <section
      data-depth={0}
      aria-labelledby="plan-need-title"
      className="border-t border-[color:var(--funnel-line)] px-4 py-16 sm:px-6 lg:px-10 lg:py-24"
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
        <div>
          <p className={`${MICRO} flex flex-wrap items-center gap-3`}>
            <span>{copy("sp.hero.eyebrow")}</span>
            {view.pilot && (
              <span className="rounded-full border border-[color:var(--funnel-line)] px-2 py-0.5 text-[color:var(--funnel-fg)]">
                {copy("sp.pilot")}
              </span>
            )}
          </p>
          <h2 id="plan-need-title" className="mt-4 max-w-3xl text-3xl font-medium leading-tight lg:text-5xl">
            <Swap lines={view.headline} />
          </h2>
          <Swap as="p" lines={view.sub} className="mt-6 max-w-2xl text-[color:var(--funnel-muted)]" />
          <Swap
            as="p"
            lines={{ desktop: copy("sp.hero.honest"), phone: copy("ph.hero.honest") }}
            className="mt-4 max-w-2xl text-[color:var(--funnel-muted)]"
          />
          {view.pilot && <p className="mt-4 max-w-2xl">{copy("sp.pilot.note")}</p>}
        </div>
        <div className="rounded-2xl border border-[color:var(--funnel-line)] bg-[color:var(--funnel-card)] p-6">
          <Swap as="p" lines={{ desktop: copy("sp.brain.label"), phone: copy("ph.brain.label") }} className="font-medium" />
          <p className="mt-3 text-sm text-[color:var(--funnel-muted)]">{copy("sp.brain.tip")}</p>
          <p className="mt-3 text-sm">{copy("sp.brain.live")}</p>
        </div>
      </div>
      <div className="mt-12">
        <p className="text-sm text-[color:var(--funnel-muted)]">{copy("sp.legend.jobs")}</p>
        <ul className="mt-3 flex flex-col gap-2 text-sm sm:flex-row sm:gap-6">
          {STATUSES.map((status) => {
            const mark = markOf(status);
            return (
              <li key={status}>
                <span aria-hidden="true">{mark.glyph}</span> {mark.label}
              </li>
            );
          })}
        </ul>
      </div>
      <Swap as="p" lines={view.scroll} className={`mt-12 ${MICRO}`} />
    </section>
  );
}
```

`src/features/funnel/plan/PartStop.tsx`:

```tsx
// Block 3 (§6.2): one stop per department in the plan, in scroll order (§5.5). Stop i is plan_depth i.
import { copy } from "../data";
import type { Job } from "../data/contract";
import { markOf, type StopView } from "./planView";
import { DESKTOP_ONLY, PHONE_ONLY, Swap } from "./Swap";

const MICRO = "font-mono text-xs uppercase tracking-[0.18em] text-[color:var(--funnel-muted)]";

function JobList({ jobs }: { jobs: readonly Job[] }): JSX.Element {
  return (
    <ul className="mt-2 flex flex-col gap-1 text-sm">
      {jobs.map((job) => {
        const mark = markOf(job.status);
        return (
          <li key={job.id} className="flex gap-2">
            <span role="img" aria-label={mark.label}>{mark.glyph}</span>
            <span>{job.name}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function PartStop({ stop }: { stop: StopView }): JSX.Element {
  const titleId = `plan-stop-${stop.depth}`;
  return (
    <section
      data-depth={stop.depth}
      aria-labelledby={titleId}
      className="border-t border-[color:var(--funnel-line)] px-4 py-16 sm:px-6 lg:px-10 lg:py-20"
    >
      <Swap as="p" lines={stop.count} className={MICRO} />
      <h2 id={titleId} className="mt-3 text-3xl font-medium lg:text-4xl">{stop.heading}</h2>
      <p className={`mt-2 text-[color:var(--funnel-muted)] ${DESKTOP_ONLY}`}>{stop.tag}</p>
      <p className="mt-6 max-w-2xl text-lg">{stop.body}</p>
      <h3 className={`mt-10 ${MICRO}`}>{copy("sp.part.agents")}</h3>
      <ul className="mt-4 grid gap-4 lg:grid-cols-3">
        {stop.agents.map((agent) => (
          <li key={agent.id} className="rounded-2xl border border-[color:var(--funnel-line)] bg-[color:var(--funnel-card)] p-5">
            <p className="font-medium">{agent.name}</p>
            <p className="mt-1 text-sm text-[color:var(--funnel-muted)]">{agent.line}</p>
            <div className={`mt-4 ${DESKTOP_ONLY}`}>
              <p className={MICRO}>{copy("sp.part.jobs")}</p>
              <JobList jobs={agent.jobs} />
            </div>
            <details className={`mt-4 ${PHONE_ONLY}`}>
              <summary className="flex min-h-11 cursor-pointer items-center text-sm">{agent.jobsToggle}</summary>
              <JobList jobs={agent.jobs} />
            </details>
          </li>
        ))}
      </ul>
      {stop.rest.length > 0 && (
        <>
          <h3 className={`mt-10 ${MICRO}`}>{copy("sp.part.rest")}</h3>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[color:var(--funnel-muted)]">
            {stop.rest.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
```

The desktop job list and the phone's closed `<details>` hold the same jobs. CSS hides one of them, and hidden content is out of the accessibility tree, so a screen reader hears each job once.

`src/features/funnel/plan/Close.tsx`:

```tsx
// Block 4 (§6.2): the close. cta.btn is the only wording here (§6.3). Its plan_depth is the number of stops plus one.
import { copy } from "../data";
import type { CtaFrom } from "../data/contract";
import { BookCallLink } from "./BookCallLink";
import type { PlanViewModel } from "./planView";
import { Swap } from "./Swap";

export interface CloseProps {
  view: PlanViewModel;
  name: string;
  email: string;
  onBook(from: CtaFrom): void;
}

export function Close({ view, name, email, onBook }: CloseProps): JSX.Element {
  return (
    <section
      data-depth={view.closeDepth}
      aria-labelledby="plan-close-title"
      className="border-t border-[color:var(--funnel-line)] px-4 py-20 sm:px-6 lg:px-10 lg:py-28"
    >
      <Swap as="p" lines={view.later} className="max-w-2xl text-lg" />
      <p className="mt-2 max-w-2xl text-[color:var(--funnel-muted)]">{copy("sp.later.sub")}</p>
      <h2 id="plan-close-title" className="mt-12 max-w-3xl text-3xl font-medium leading-tight lg:text-5xl">{copy("cta.h")}</h2>
      <Swap as="p" lines={view.ctaLead} className="mt-4 max-w-2xl text-[color:var(--funnel-muted)]" />
      <BookCallLink
        name={name}
        email={email}
        from="close"
        onBook={onBook}
        className="mt-8 inline-flex min-h-11 items-center justify-center rounded-full bg-[color:var(--funnel-accent)] px-6 text-sm font-medium text-[color:var(--funnel-on-accent)]"
      >
        {copy("cta.btn")}
      </BookCallLink>
      <p className="mt-4 text-sm text-[color:var(--funnel-muted)]">{copy("cta.sub")}</p>
    </section>
  );
}
```

- [ ] **Step 4: Run the test and the type check**

Run: `npx vitest run src/features/funnel/plan/blocks.test.tsx && npm run typecheck`
Expected: 6 tests pass, and `typecheck` exits 0.

- [ ] **Step 5: Commit and push**

```bash
npm test && npm run typecheck && npm run build
git add src/features/funnel/plan/NeedBlock.tsx src/features/funnel/plan/PartStop.tsx src/features/funnel/plan/Close.tsx \
  src/features/funnel/plan/blocks.test.tsx
git commit -m "feat(funnel): add the plan's need block, stops and close"
git pull --rebase && git push
```

### Task 16: `PlanPage` and `plan_depth`

Lane A needs this on day 3; finish it by the end of day 4 (00-index §2.1).

**Files:**
- Create: `src/features/funnel/plan/usePlanDepth.ts`, `src/features/funnel/plan/PlanPage.tsx`
- Test: `src/features/funnel/plan/plan-page.test.tsx`

**Interfaces:**
- Consumes: `buildPlanView` (Task 10); `SaveBanner` (Task 11); `Hero` (Task 14); `NeedBlock`, `PartStop` and `Close` (Task 15); `copy` from `../data`; `PlanPageProps`, `PlanProgress` and `CtaFrom` from `../data/contract`; `Helmet` from `react-helmet-async`. The app already wraps every page in its `HelmetProvider`.
- Produces:
  - `usePlanDepth(onDepth: (depth: number) => void): (node: HTMLElement | null) => void`, a callback ref
  - `export function PlanPage(props: PlanPageProps): JSX.Element`, the §1.3 seam
- What `PlanPage` reports through `onProgress` (§9):
  - `{ planDepth }`, each time the visitor reaches a block further down than before;
  - `{ ctaFrom: "hero" | "close", ctaClicked: true }`, on each tap of a "Book a call";
  - `{ filmPlayed: true }` and `{ filmPct }`, from the film (Task 13).

- [ ] **Step 1: Write the failing test**

`src/features/funnel/plan/plan-page.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act } from "react";
import { HelmetProvider } from "react-helmet-async";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calendlyUrl, composePlan, copy } from "../data";
import type { PlanPageProps } from "../data/contract";
import { PlanPage } from "./PlanPage";
import { click, render, stopNavigation, textOf, type Rendered } from "./test-utils";

vi.mock("../../home/sections/BrandFilm", async () => {
  const { createElement } = await import("react");
  return { default: () => createElement("video") };
});

/** jsdom has no IntersectionObserver. This one lets a test say which block came into view. */
class FakeObserver {
  static last: FakeObserver | null = null;
  readonly targets: Element[] = [];
  constructor(private readonly callback: IntersectionObserverCallback) {
    FakeObserver.last = this;
  }
  observe(el: Element): void {
    this.targets.push(el);
  }
  disconnect(): void {
    this.targets.length = 0;
  }
  show(depth: number): void {
    const target = this.targets.find((t) => (t as HTMLElement).dataset.depth === String(depth));
    if (!target) throw new Error(`no block at depth ${depth}`);
    act(() => this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this as unknown as IntersectionObserver));
  }
}

async function waitFor(check: () => boolean, ms = 1_000): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > ms) throw new Error("waitFor: timed out");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  }
}

const ANANYA_WORDS = "Enquiries come in, but by the time someone calls back they've gone cold.";
const plan = composePlan({ teamBand: "6_20", revenueBand: "band_3", currency: "INR", chips: [], problemText: ANANYA_WORDS });
const visitor = { name: "Ananya", email: "ananya@studio.in" };

let screen: Rendered | null = null;
let allowNavigation: () => void = () => undefined;
let onProgress = vi.fn();

function renderPage(over: Partial<PlanPageProps> = {}): Rendered {
  screen = render(
    <HelmetProvider>
      <PlanPage plan={plan} visitor={visitor} words={{ problemText: ANANYA_WORDS, chips: [] }} saveNotice={null} onProgress={onProgress} {...over} />
    </HelmetProvider>,
  );
  return screen;
}

beforeEach(() => {
  onProgress = vi.fn();
  allowNavigation = stopNavigation();
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});
afterEach(() => {
  screen?.unmount();
  screen = null;
  allowNavigation();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("PlanPage (§6)", () => {
  it("draws Ananya's plan: the hero, then blocks at plan_depth 0 to 5", () => {
    const { container } = renderPage();
    expect(textOf(container.querySelector("h1"))).toBe(`${copy("hx.h1")} ${copy("hx.h2")}`);
    expect(Array.from(container.querySelectorAll<HTMLElement>("[data-depth]")).map((el) => el.dataset.depth)).toEqual([
      "0", "1", "2", "3", "4", "5",
    ]);
  });

  it("starts at the top, with focus on the h1", () => {
    const { container } = renderPage();
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    expect(document.activeElement).toBe(container.querySelector("h1"));
  });

  it("sets the tab title to seo.plan.title (§6.1)", async () => {
    renderPage();
    await waitFor(() => document.title === `${copy("seo.plan.title")} | Ziiro AI`);
    expect(document.title).toBe("Your plan | Ziiro AI");
  });

  it("puts the save notice above everything else (§10)", () => {
    const { container } = renderPage({ saveNotice: "unsure" });
    const alert = container.querySelector('[role="alert"]');
    const h1 = container.querySelector("h1");
    expect(textOf(alert)).toBe(copy("sp.save.unsure"));
    expect(alert && h1 ? alert.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING : 0).toBeTruthy();
  });

  it("reports the furthest block reached, and only when it's further (§9 plan_depth)", () => {
    renderPage();
    FakeObserver.last?.show(0);
    FakeObserver.last?.show(2);
    FakeObserver.last?.show(1);
    FakeObserver.last?.show(5);
    expect(onProgress.mock.calls.map(([fields]) => fields)).toEqual([{ planDepth: 0 }, { planDepth: 2 }, { planDepth: 5 }]);
  });

  it("reports which Book a call was tapped (§9 cta_from)", () => {
    const { container } = renderPage();
    const links = Array.from(container.querySelectorAll("a"));
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      calendlyUrl(visitor.name, visitor.email), calendlyUrl(visitor.name, visitor.email),
    ]);
    links.forEach((a) => click(a));
    expect(onProgress.mock.calls.map(([fields]) => fields)).toEqual([
      { ctaFrom: "hero", ctaClicked: true }, { ctaFrom: "close", ctaClicked: true },
    ]);
  });

  it("shows no price anywhere on the plan (§6.3, Appendix A)", () => {
    const { container } = renderPage();
    expect(textOf(container)).not.toMatch(/₹|\$\d/);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/features/funnel/plan/plan-page.test.tsx`
Expected: FAIL, with `Failed to resolve import "./PlanPage"`.

- [ ] **Step 3: Write `usePlanDepth.ts`**

`src/features/funnel/plan/usePlanDepth.ts`:

```ts
// plan_depth (Appendix C): the furthest block the visitor has reached. 0 is "you need only", i is stop i, and the
// number of stops plus one is the close. Each block carries data-depth (Task 15).
import { useCallback, useEffect, useRef } from "react";

/** A block counts as reached once its top is inside the upper 60 % of the screen. */
const ROOT_MARGIN = "0px 0px -40% 0px";

export function usePlanDepth(onDepth: (depth: number) => void): (node: HTMLElement | null) => void {
  const latest = useRef(onDepth);
  const furthest = useRef(-1);
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    latest.current = onDepth;
  }, [onDepth]);
  useEffect(() => () => observer.current?.disconnect(), []);

  return useCallback((node: HTMLElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (node === null || typeof IntersectionObserver === "undefined") return;
    const watcher = new IntersectionObserver(
      (entries) => {
        const deepest = entries
          .filter((e) => e.isIntersecting)
          .reduce((max, e) => Math.max(max, Number((e.target as HTMLElement).dataset.depth)), -1);
        if (deepest <= furthest.current) return;
        furthest.current = deepest;
        latest.current(deepest);
      },
      { rootMargin: ROOT_MARGIN },
    );
    node.querySelectorAll<HTMLElement>("[data-depth]").forEach((el) => watcher.observe(el));
    observer.current = watcher;
  }, []);
}
```

- [ ] **Step 4: Write `PlanPage.tsx`**

`src/features/funnel/plan/PlanPage.tsx`:

```tsx
// S9 (§6): the plan, drawn on the device from the descriptor lane A passes in (00-index §1.3). It renders §6.2's
// blocks 1 to 4. Blocks 0 and 5 are the site's own Navbar and footer (lane D).
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { copy } from "../data";
import type { CtaFrom, PlanPageProps, PlanProgress } from "../data/contract";
import { Close } from "./Close";
import { Hero } from "./Hero";
import { NeedBlock } from "./NeedBlock";
import { PartStop } from "./PartStop";
import { buildPlanView } from "./planView";
import { SaveBanner } from "./SaveBanner";
import { usePlanDepth } from "./usePlanDepth";

/** The site's title suffix, as SEO.tsx writes it. */
const TITLE_SUFFIX = " | Ziiro AI";

export function PlanPage({ plan, visitor, words, saveNotice, onProgress }: PlanPageProps): JSX.Element {
  const view = useMemo(
    () => buildPlanView({ plan, name: visitor.name, problemText: words.problemText }),
    [plan, visitor.name, words.problemText],
  );
  const headingRef = useRef<HTMLHeadingElement>(null);
  const latest = useRef(onProgress);
  useEffect(() => {
    latest.current = onProgress;
  }, [onProgress]);

  const report = useCallback((fields: PlanProgress) => latest.current(fields), []);
  const onBook = useCallback((from: CtaFrom) => report({ ctaFrom: from, ctaClicked: true }), [report]);
  const depthRef = usePlanDepth(useCallback((planDepth: number) => report({ planDepth }), [report]));

  useEffect(() => {
    window.scrollTo(0, 0);
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div ref={depthRef} className="bg-[color:var(--funnel-bg)] text-[color:var(--funnel-fg)]">
      <Helmet>
        <title>{`${copy("seo.plan.title")}${TITLE_SUFFIX}`}</title>
      </Helmet>
      <SaveBanner notice={saveNotice} />
      <Hero
        heroText={view.heroText}
        name={visitor.name}
        email={visitor.email}
        headingRef={headingRef}
        onBook={onBook}
        onProgress={report}
      />
      <NeedBlock view={view} />
      {view.stops.map((stop) => (
        <PartStop key={stop.department} stop={stop} />
      ))}
      <Close view={view} name={visitor.name} email={visitor.email} onBook={onBook} />
    </div>
  );
}
```

- [ ] **Step 5: Run the test, the type check and the whole suite**

Run: `npx vitest run src/features/funnel/plan/plan-page.test.tsx && npm run typecheck && npx vitest run --coverage src/features/funnel`
Expected: 7 tests pass, and `typecheck` exits 0. Coverage is at least 80 % of lines for `src/features/funnel/data/**` and `src/features/funnel/plan/**`.

- [ ] **Step 6: Check it by eye, in both themes and at both sizes**

Ask lane A for a Preview where S9 renders `PlanPage`, or mount it on a scratch route that you never commit. Then, at 1440 × 900 and at 390 × 844, in light and in dark:
- Ananya's plan reads top to bottom as §5.8 says: 4 parts, her words quoted once at Deals, and the Pilot tag.
- Tab goes hero link, film button, then the phone's job toggles (at 390) and the close link. Every target is at least 44 px tall.
- The film opens and closes with Escape, and focus comes back to "See how it works".
- Nothing scrolls sideways at 390 px, and the band shows about 350 px under the words (§6.6).
- The plan's tab title reads "Your plan | Ziiro AI".

- [ ] **Step 7: Check the plan chunk's weight (§13.10)**

This step needs lane A to load the page with `React.lazy`, so that the plan has a chunk of its own. Lane A's code would be:

```tsx
const PlanPage = lazy(() => import("../plan/PlanPage").then((m) => ({ default: m.PlanPage })));
// At S5, the same import() warms the chunk (§13.10, "prefetched at S5").
```

Once that is on the branch:

```bash
npm run build
grep -l "plan-need-title" dist/assets/*.js | while read -r f; do printf '%s %s\n' "$(gzip -9 -c "$f" | wc -c)" "$f"; done
```

Expected: one file, at most 61440 bytes. If the page sits inside the funnel chunk instead, write that to `.team/ziiro-fleet/requests.md` for lane A; don't edit lane A's files.

- [ ] **Step 8: Commit, push and tell lane A**

```bash
npm test && npm run typecheck && npm run build
git add src/features/funnel/plan/usePlanDepth.ts src/features/funnel/plan/PlanPage.tsx src/features/funnel/plan/plan-page.test.tsx
git commit -m "feat(funnel): add PlanPage, the plan at S9"
git pull --rebase && git push
```

Write one line in `.team/ziiro-fleet/worker-3.md`: "PlanPage is on the branch: named export, PlanPageProps, onProgress reports planDepth, ctaFrom and ctaClicked, filmPlayed and filmPct".

---

## Phase 1b: the lit spine and the scroll (named and ordered, not detailed)

Phase 1b gets its own plan once the first release is live (§13.7). These are its tasks, in order. Each builds on `PlanPage`, `plan.litDiscs` and `plan.stops`, which the first release already has.

1. **The disc boxes.** `plan/motion/discs.ts` loads and checks `discs.json`, the box of every disc in every camera's frames (§6.6).
2. **The compositor.** `plan/motion/compositor.ts` draws the quiet base frame and adds each lit disc's glow layer with `globalCompositeOperation = 'lighter'`. Quiet discs keep 12 % of their glow (D28). It has to match `proto/look/web/test.js` within §6.6's tolerances.
3. **Beat 1.** Block 2 gets the still with the plan's discs lit, and one `sp.disc.call` per lit disc. The brain card heads the callout column, and `sp.legend.today` and `sp.legend.later` join the legend.
4. **Disc buttons and panels, desktop only.** Seven buttons over the frame, with hit areas from `discs.json` padded to 44 × 44, labelled `sp.disc.aria` or `sp.disc.aria.none`. A panel shows `sp.vert.dept`, then rows of `sp.vert.title`, `sp.vert.line`, `sp.vert.today` or `sp.vert.later`, `sp.vert.jobs` and `sp.vert.live`. `sp.hint.hover` shows once. Phones get no buttons (§6.2).
5. **The scroll and the push-ins.** The camera closes in on each stop's disc and pulls back between stops (D29, D30). Desktop swaps sides at each stop. A phone holds the 780 × 820 strip and plays only the left-side moves (§6.4).
6. **The still version.** It's for reduced motion, Save-Data, 2G or 3G, no AVIF (D33), or any file of the moving version that fails. Beat 1 is a still, and each close-up swaps in without animation (§6.3). It reports `stillReason`.
7. **Tracking.** `planView` ("motion" or "still") and `discsOpened` (at most 7) go out through `onProgress` (§9).
8. **Weight and checks.** Prefetched bytes stay inside §13.10 (about 147 KB on a phone and 151 KB on desktop with beat 1). Lighthouse and both themes are checked again.

The close-up model stays a parked fallback (wave9.md). Nothing in phase 1b uses it unless the owner brings it back.

---

## Decisions this plan makes, and what it asks others for

Lane C appended these to `.team/ziiro-fleet/requests.md` on 8 Oct. The manager's batch-2 rulings in `.team/ziiro-fleet/funnel/wave9-requests.md` settled rows 1 to 4 and 11 as D35 to D39, and the plan follows them. Each ruling is a default the owner can veto. worker-4's "Contract changes, 8 Oct" (00-index §1.5) settled rows 5 and 7 to 10. Row 6 waits on lane A.

| # | Decision or gap | What the plan does | Asked of |
|---|---|---|---|
| 1 | §5.2 rule 3 says only "within 4 words". The plan also stops negation at a clause break: punctuation, "but", "however", "lekin" or "magar". So "Billing is sorted, but our reels need work" is about content | clause-scoped negation (Tasks 5, 6) | ruled: approved as D35 |
| 2 | §6.3 quoted their words at the first agent of their problem's order. For content, support and hiring words that order is A-default, which starts with agent 29, so the quote landed in Back Office | content, support and hiring words go to their lane agent's department: Content maker 7, Support desk 21, Hiring assistant 33. Words that point at no department go to the plan's first stop (Tasks 7, 10) | ruled: D36 |
| 3 | `sp.hero.scroll` reads "the 1 parts" on B-convert S and hiring S | one-part plans show `sp.hero.scroll.one`, spec §4.5's line, which the generator's `OVERLAY` carries until copy.md takes it (Tasks 3, 10) | ruled: D37 |
| 4 | The film lightbox's close button had no copy line | `r.film.close`, "Close" (Tasks 3, 13) | ruled: D38 |
| 5 | §6.5 wants the poster first and sound once opened, but `BrandFilm` started muted once it was on screen | `BrandFilm`'s default export becomes the click-to-play player and `BRAND_FILM` stays private. The lightbox renders it unedited, names itself with `aria-label={copy("r.film.title")}` and prints no second title (Task 13) | decided: 00-index §1.5, request 13 |
| 6 | §6.2's dark `hx.h2` gradient needs colours, and lane C adds none | `hx.h2` uses `--funnel-muted` in both themes (Task 14). Lane A has taken request 17 (`--funnel-title-from`, `--funnel-title-to`), but its token block doesn't set them yet | worker-1 (lane A), for two tokens |
| 7 | §6.6's "mounted out of sight at S5", and the plan chunk "prefetched at S5" | exports `HeroPicturePrefetch` (Task 12), whose file takes only `light.ts`. Lane A loads it and `PlanPage` through `import()` started at S5, `PlanPage` with `React.lazy` (Task 16) | settled: 00-index §1.5 and lane A's plan |
| 8 | `index.ts` must satisfy `FunnelData`, so whoever imports it gets all the copy, the 137 jobs and the phrase lists: 11,972 bytes gzipped, measured on the source. §13.10 put that data in the plan chunk, but S0 to S5 need `copy()` at once | a light entry, `light.ts` (`FunnelLight`), holds the copy, `calendlyUrl` and `currencyFor`; `index.ts` re-exports it. The copy counts in first paint; the plan chunk's data is now 7,242 bytes gzipped against its 12 KB (Tasks 3, 4, 9) | decided: 00-index §1.5, request 14 |
| 9 | `index.ts` also exports `COPY_LINES`, `wordsDepartmentFor`, `quoteWords` and `cleanProblemText` | `COPY_LINES` is in `FunnelLight`. The other three stay lane C's own exports, outside the contract, since no other lane calls them | decided: 00-index §1.5, request 15 |
| 10 | `LeadPlan` had no `fallback`, and a support L plan has the same agents as an unclassified L plan | `LeadPlan` picks `fallback` from `PlanDescriptor`, which `composePlan` already sets (Task 7). Lane B reads it and no longer classifies on the server | decided: 00-index §1.5, request 16 |
| 11 | The hero callouts' places | right of the spine, level with G05 and G03, since the left 55 % holds the words (Task 14) | ruled: approved as D39 |

Other choices, which need nobody's answer:
- `bucketScores` holds only problems that scored above 0.
- `matchedPhrases` stops at 20 (`LIMITS.matchedPhrases`), and the scores count every match (Review Focus 1).
- Department names come from agents-33.json. `copyKey` is the department ID without its hyphen.
- The desktop and phone lines switch at 600 px, the same width as the hero `<picture>` (§6.6).
- `FILM_READY` in `Hero.tsx` hides `hx.btn2` if lane D's film slips (§6.5).
- The tab title's " | Ziiro AI" matches what `SEO.tsx` writes.

---

## Self-review

**Spec coverage.**

| Spec | Where |
|---|---|
| §5.1 the data | Tasks 1, 3 |
| §5.2 the classifier and the routes | Tasks 5, 6, 7 |
| §5.3 tiers and currency | Task 4 |
| §5.4 priority lists and lanes | Task 7 |
| §5.5 scroll order | Tasks 2, 7 |
| §5.6 marks | Tasks 1, 2, 10, 15 |
| §5.7 fallback headlines and Pilot | Tasks 7, 10, 15 |
| §5.8 Ananya | Tasks 2, 6, 7, 10, 15, 16 |
| §6.1 tab title | Task 16 |
| §6.2 blocks 1 to 4 | Tasks 14, 15. Blocks 0 and 5 are lane D's |
| §6.3 {words}, {name}, Book a call, nothing priced | Tasks 8, 10, 11, 15, 16 |
| §6.4 phone | Tasks 11, 14, 15 |
| §6.5 film | Tasks 13, 14 (00-index §1.5, request 13) |
| §6.6 the `<picture>` | Task 12 |
| §6.7 discs | Tasks 1, 7, 9 |
| §9 plan_depth, film and CTA fields | Tasks 13, 16 |
| §10 save notices | Tasks 11, 16 |
| §11 accessibility: h1 focus, alt text, aria labels, 44 px targets, focus kept in the dialog | Tasks 12 to 16 |
| §12 tests | every task |
| §13.1 bundle-safe data | Task 9 |
| §13.10 budgets | Tasks 9, 16 |
| 00-index §1.5: the light entry, `FunnelLight` and the header's lines | Tasks 3, 4, 9, 12 |
| D35 to D39 (wave9-requests batch 2) | Tasks 3, 6, 7, 10, 13, 14 |

Phase 1b's §6.2 to §6.6 motion is named above, not planned.

**Placeholder scan.** No "TBD", "TODO" or "similar to Task N". Every code step holds its code.

**Type consistency.** Names stay the same from the task that makes them to every task that uses them:
- Data: `agentById`, `jobIdsFor`, `marksFor`, `stopsFor`, `copy`, `COPY_LINES`, `calendlyUrl`, `currencyFor` (these four in `light.ts`), `tierFor`, `classify`, `CLASSIFIER_VERSION`, `priority`, `laneAgent`, `ROUTES`, `agentsFor`, `composePlan`, `wordsDepartmentFor`, `quoteWords`, `cleanProblemText`.
- Plan page: `buildPlanView`, `markOf`, `heroTitle`, `Lines`, `StopView`, `PlanViewModel`, `Swap`, `DESKTOP_ONLY`, `PHONE_ONLY`, `BookCallLink`, `SaveBanner`, `useHtmlTheme`, `HeroPicture`, `HeroPicturePrefetch`, `filmPctFor`, `FilmLightbox`, `FILM_READY`, `Hero`, `NeedBlock`, `PartStop`, `Close`, `usePlanDepth`, `PlanPage`.

Every contract type is used as `contract.ts` spells it. The view model is called `PlanViewModel` because `contract.ts` already has a `PlanView`.

**Review Focus.** Each line has a test in the task that owns the code:
1. Task 6, "returns at most 20 phrases".
2. Tasks 8 and 10, the untouched starter.
3. Task 10, words pointing at a department the plan lacks, and D36's first stop for words that point at none.
4. Task 10, one-part plans (D37).
5. Task 12, the theme switch.

**How this plan was checked.** On 8 Oct, worker-3 copied every code block of this plan, plus `contract.ts` from 00-index §1.2 and P0-T4's starting `light.ts` and `index.ts`, into a scratch project outside the repo. It used a small script and the repo's own `node_modules`, and installed nothing. It ran again after the reconciliation with D35 to D39 and 00-index §1.5, and once more after worker-1's wave 9 finding 1 moved `sp.hero.scroll.one` into `OVERLAY`. Then:
- The generator printed `gen-data: wrote 6 files, 33 agents, 137 jobs` against copy.md as it stands, with no stand-in rows. copy.md has no D37 row, so `sp.hero.scroll.one` comes from `OVERLAY`, in spec §4.5's words.
- `tsc` passed in strict mode on the data module (a copy of `tsconfig.api.json`) and on the plan page (a strict copy of the app settings). That includes `light.ts` against `FunnelLight` and `index.ts` against `FunnelData`.
- The tests ran with a Vitest stand-in on jsdom. Tasks 1 to 9: 92 passed across 12 files. Tasks 10 to 16: 52 passed across 7 files. Every task's count matches its "Expected" line.
- The two import checks failed as they should when `light.ts` was given an agents import and `HeroPicture.tsx` was pointed at `../data`, and passed again once those were taken out.
- The plan chunk's data (`agents.generated.ts` and `classifier/phrases.ts`) came to 7,242 bytes gzipped, and the copy files, now in the light entry, to 4,979. Before the light entry, everything `index.ts` pulled in came to 11,972 bytes.

Three things weren't run, because nothing could be installed: real Vitest, lane D's real `BrandFilm` (the scratch project used a bare `<video>`, as the tests' mock does) and a production build with Tailwind. So read a red in a task's first real run as a possible plan bug, and fix it in the plan's file too.

## Execution

The manager dispatches this plan to worker-3. Subagent-driven execution is recommended: Tasks 10 to 16 lean on exact names from Tasks 1 to 9, and a fresh reviewer per task catches a drifted name before the next task builds on it.
