# Business Spine funnel, 00 index: contracts, phase 0, integration and launch

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the three day-1 contracts so four lanes can build the funnel's first release at the same time, then run phase 0, the integration days and the launch.

**Architecture:** One TypeScript file, `src/features/funnel/data/contract.ts`, holds every ID the funnel sends or stores, the plan descriptor, the `/visit` and `/lead` bodies and the data module's shape. The browser (lanes A, C and D) and `api/funnel/*` (lane B) import that same file, so any field the browser can send is one the server accepts. Phase 0 commits it to the branch, together with the test tools, before any lane commits.

**Tech Stack:** Vite 8 + React 18 SPA with a prerender script; Vercel Functions (Node.js runtime, region `sin1`); Neon Postgres through the Vercel Marketplace; Resend; Cloudflare Turnstile; Vitest, Playwright, axe.

**Spec:** `docs/superpowers/specs/2026-10-07-business-spine-funnel-design.md`, approved on 8 Oct with D1–D34 standing, the camera push-in on the long model (D29, D30) and the phone hero stacked (D34) (`.team/ziiro-fleet/funnel/wave9.md`). Every § below is a section of that spec. Blockers are named B1 to B7 as in §13.8; lane B's tasks are called "lane B, Task n".

**The other plans** (all in `docs/superpowers/plans/`):

| Lane | Plan | Builder |
|---|---|---|
| A · Questions, S0–S8 | `2026-10-08-funnel-lane-a.md` | worker-1 |
| B · Server and data | `2026-10-08-funnel-lane-b.md` | worker-4 |
| C · Data module, classifier, plan page | `2026-10-08-funnel-lane-c.md` | worker-3 |
| D · Site and QA | `2026-10-08-funnel-lane-d.md` | worker-2 |

## Global Constraints

- Branching: `feat/business-spine-funnel` is cut from `ziiroai/dev` after main has been merged into dev. PRs go from the feature branch into `dev`, then from `dev` into `main`, all on the `ziiroai` remote. Never force-push (wave9.md).
- Funnel functions use `export async function POST(request: Request)` and `export const config = { runtime: "nodejs", maxDuration: 15 }`, with `"regions": ["sin1"]` in `vercel.json` (§13.2).
- Packages are installed in phase 0 only, and these are the only new ones: `@neondatabase/serverless` (runtime, used inside `api/` only); `vitest@^4.1.11`, `@vitest/coverage-v8@^4.1.11`, `jsdom@^29.0.2`, `@playwright/test`, `@axe-core/playwright` (dev). The three pins keep Node 25 supported (§1.5, request 5). Lighthouse runs through `npx --yes lighthouse@13.5.0` and isn't installed. Any other package needs a line in `.team/ziiro-fleet/requests.md` first (§13.1, D25).
- No new UI dependency, and no WebGL, Spline, framer-motion or Preloader on `/` (§13.10).
- `contract.ts` and everything under `src/features/funnel/data/` use relative imports only (no `@/`), never touch the DOM or `import.meta`, and pass `strict` TypeScript, because `api/funnel/*` bundles them too (§13.1).
- Typed words never travel in `/visit` (D13). These are never stored: IP address, raw audio, precise location, a WhatsApp number (§9).
- Logs never carry a submitted field or an IP (§13.2, and the logging policy in `api/_lib.ts`).
- Every visible line comes from a copy ID (§4.5, `copy.md`), and no visitor-facing words are written in code. Appendix A's claims are binding.
- Budgets (§13.10): JS before first paint 150 KB gz or less, of which the funnel chunk is 25 KB gz or less; plan chunk 60 KB gz or less, its data 12 KB gz or less. The copy lines sit in the light entry and count in first paint, not in the plan chunk (§1.5, request 14); LCP 2.0 s or less; CLS 0.02 or less; Lighthouse mobile 90 or more on `/`.
- WCAG 2.2 AA on `/`, in both themes, at 390 px and 1440 px (§11).
- Every task is test-first, with at least 80 % line coverage on the funnel logic (§12).
- The Calendly link stays `INTERIM_BOOKING_URL` in `src/features/pricing/entities/rates.ts`. Import it; never copy it (§13.6).
- Lanes own separate files (§13.7, and §1.3 below). If you need a file another lane owns, that is a dependency on their task. Don't make the edit yourself.

## Review Focus

1. **Contract drift.** If the browser sends a key or value that `/visit` refuses, the save gets a 400 nobody sees, because saves are fire and forget (§10), and the drop-off data quietly goes missing. Test: P0-T4's compile-time check that `VISIT_FIELD_KEYS` covers `VisitFields`, plus the test in lane B, Task 5 that every value of every enum in `contract.ts` is accepted.
2. **A Preview without the test keys or the schema.** Then every lead answers 403, or every save answers 500, while the screens still look fine. Test: I-T1 reads the three rows in the Neon preview branch instead of trusting the screen.
3. **Functions outside `sin1`.** Each Neon query would then cross an ocean, which squeezes S8's 8-second wait. Test: P0-T5 step 6 reads the function region from `x-vercel-id` on a Preview.
4. **The production sending domain isn't verified.** The plan email then fails, and the visitor sees nothing different (ruling 8). Test: L-T3 needs `plan_emails.status = 'sent'` and the email in the owner's inbox, not just a 200.
5. **Sending again after Back.** Back from the plan lands on S6, and sending again is a new visit with a new lead (§4.1), while a double tap must stay one lead. Test: I-T2's second and third cases.

---

## 1. The day-1 contracts

### 1.1 Where they live

- **`src/features/funnel/data/contract.ts`** holds all three contracts: the plan descriptor, the `/visit` and `/lead` bodies (§13.2), and the data module's shape, together with every ID they use and the seams in §1.3. P0-T4 writes it. After that, a change follows §1.4.
- **`src/features/funnel/data/light.ts`** is the data module's light entry: the copy, `calendlyUrl` and `currencyFor`, with no agents data, jobs or phrase lists (§1.5, request 14). P0-T4 creates it as `export * from "./contract";`. Lane C adds its light exports there, until `import * as light from "./light"` satisfies `FunnelLight`. The header, the film and lane A's screens import from it, never from `index.ts`.
- **`src/features/funnel/data/index.ts`** is the full entry point, for the plan chunk and `api/funnel/*`. P0-T4 creates it as `export * from "./light";`. Lane C adds the rest there, until `import * as data from "./index"` satisfies `FunnelData`. In the browser it is imported only by the plan chunk's modules, and by lane A through `import()` (§1.5).

### 1.2 `contract.ts`

The full file. P0-T4 commits it unchanged.

```ts
/**
 * (C) Business Spine funnel: the day-1 contracts (spec §13.7).
 *
 * Every ID the funnel sends or stores, the plan descriptor, the two request bodies (§13.2)
 * and the data module's shape. The browser (lanes A, C, D) and api/funnel/* (lane B) both
 * import this file, so it stays pure: relative imports only, no "@/" alias, no DOM,
 * no import.meta, strict-mode clean.
 *
 * Changing it: docs/superpowers/plans/2026-10-08-funnel-00-index.md §1.4.
 */

export const isOneOf = <T extends string | number>(values: readonly T[], value: unknown): value is T =>
  (values as readonly unknown[]).includes(value);

/* ── Steps (§4.3) ──────────────────────────────────────────────────────────── */

export const STEPS = ["S0", "S1", "S1b", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9"] as const;
export type StepId = (typeof STEPS)[number];

/* ── Answers, as option IDs in display order (§4.3, §9) ────────────────────────
 * Option i takes its label from item i of its copy line split on " · ", or from
 * s1.o{i+1} and s1b.o{i+1}. An ID never changes when its label does. */

/** S1: s1.o1–s1.o5. "business" and "agency" go on to S2; the other three go to S1b. */
export const SEGMENTS = ["business", "agency", "freelance", "starting", "student"] as const;
export type Segment = (typeof SEGMENTS)[number];

/** S1b: s1b.o1–s1b.o5. */
export const NON_OWNER_REASONS = ["own_work", "thinking_of_starting", "learning", "saw_a_post", "something_else"] as const;
export type NonOwnerReason = (typeof NON_OWNER_REASONS)[number];

/** S2: the 12 items of s2.o. "agency" is preselected after s1.o2; "other" opens the s2.other box. */
export const BUSINESS_TYPES = [
  "interior", "clinic", "real_estate", "education", "insurance_loans", "law_consultancy",
  "agency", "retail", "fitness", "manufacturing", "food", "other",
] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

/** S3: s3.o. */
export const YEARS_BANDS = ["under_1", "1_3", "3_5", "5_10", "10_plus"] as const;
export type YearsBand = (typeof YEARS_BANDS)[number];

/** S4: s4.o. */
export const TEAM_BANDS = ["solo", "2_5", "6_20", "21_50", "50_plus"] as const;
export type TeamBand = (typeof TEAM_BANDS)[number];

/** S5, lowest band first: s5.o.IN when the currency is INR, s5.o.other when it's USD (§5.3, D10).
 *  "undisclosed" is s5.skip. */
export const REVENUE_BANDS = ["band_1", "band_2", "band_3", "band_4", "band_5", "undisclosed"] as const;
export type RevenueBand = (typeof REVENUE_BANDS)[number];

export const CURRENCIES = ["INR", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** S6: the 9 items of s6.chips. */
export const CHIPS = ["leads", "convert", "followups", "ads", "content", "numbers", "payments", "team", "support"] as const;
export type ChipId = (typeof CHIPS)[number];

/** "voice" arrives in phase 2. */
export const INPUT_MODES = ["typed", "chips", "mixed", "voice"] as const;
export type InputMode = (typeof INPUT_MODES)[number];

/* ── Problems, templates and tiers (§5) ───────────────────────────────────── */

export const BUCKETS = [
  "lead_gen", "sales", "ads", "numbers", "payments", "team_ops", "content", "support", "hiring", "unclassified",
] as const;
export type Bucket = (typeof BUCKETS)[number];

/** §5.2: the problem a tapped chip sets. */
export const CHIP_BUCKET: Readonly<Record<ChipId, Bucket>> = {
  leads: "lead_gen", convert: "sales", followups: "sales", ads: "ads", content: "content",
  numbers: "numbers", payments: "payments", team: "team_ops", support: "support",
};

export const TEMPLATES = ["A", "B"] as const;
export type Template = (typeof TEMPLATES)[number];

export const ORDER_VARIANTS = ["A-default", "A-payments", "A-numbers", "A-team", "B-convert", "B-volume"] as const;
export type OrderVariant = (typeof ORDER_VARIANTS)[number];

/** §5.4: content, support and hiring plans use A-default plus the lane's agent. */
export const LANES = ["content", "support", "hiring"] as const;
export type Lane = (typeof LANES)[number];

export const TIERS = ["S", "M", "L"] as const;
export type Tier = (typeof TIERS)[number];
export const TIER_SIZE: Readonly<Record<Tier, 3 | 6 | 9>> = { S: 3, M: 6, L: 9 };

/* ── The spine (§5.1, §6.7) ────────────────────────────────────────────────── */

/** Spine order, top first. Each is the prefix of its agents' IDs. */
export const DEPARTMENTS = ["intelligence", "marketing", "sales", "deals", "customer", "operations", "back-office"] as const;
export type DepartmentId = (typeof DEPARTMENTS)[number];

/** The gap numbers in owner-models/full-gaps.json, bottom first. G00 and G08 are the end discs. */
export const DISCS = ["G00", "G01", "G02", "G03", "G04", "G05", "G06", "G07", "G08"] as const;
export type DiscId = (typeof DISCS)[number];

/** §6.7's disc map. */
export const DEPARTMENT_DISC: Readonly<Record<DepartmentId, DiscId>> = {
  intelligence: "G07", marketing: "G06", sales: "G05", deals: "G04",
  customer: "G03", operations: "G02", "back-office": "G01",
};

/** The 33 agents. Index i holds agent number i + 1 (D1: agents-33.json's "vertebra" is "number" here). */
export const AGENT_IDS = [
  "intelligence-markets", "intelligence-companies", "intelligence-people", "intelligence-monitoring", "intelligence-synthesis",
  "marketing-insights", "marketing-creation", "marketing-repurposing", "marketing-distribution", "marketing-brand-deals",
  "sales-targeting", "sales-lead-sourcing", "sales-enrichment", "sales-outreach-writing", "sales-sequencing-send",
  "deals-inbound", "deals-reply-handling", "deals-call-cycle", "deals-deal-artifacts", "deals-pipeline-ops",
  "customer-support", "customer-success", "customer-community",
  "operations-onboarding", "operations-build-ops", "operations-client-comms", "operations-knowledge", "operations-reliability",
  "back-office-money-in", "back-office-finance-reporting", "back-office-records", "back-office-office", "back-office-talent",
] as const;
export type AgentId = (typeof AGENT_IDS)[number];

/** A job's kebab ID in agents-33.json, unique across all 137. */
export type JobId = string;

/** ● ◐ ○ (§5.6). A status belongs to a job, never to an agent. */
export const JOB_STATUSES = ["runs_on_our_company_today", "we_build_it_for_you", "mapped"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/* ── Versions and limits ───────────────────────────────────────────────────── */

/** The s7.consent wording. New words get a new date. Saved with each contact (§4.4). */
export const CONSENT_VERSION = "2026-10-08";
/** The g.footer wording. Saved on each visit as notice_version (Appendix C). */
export const NOTICE_VERSION = "2026-10-08";
/** Turnstile's action at S7 (§13.4). */
export const TURNSTILE_ACTION = "funnel_lead";
/** How long S8 waits for /lead, counted from the tap on s7.btn (§4.3). */
export const LEAD_TIMEOUT_MS = 8_000;

export const LIMITS = {
  visitBodyBytes: 4_096,        // §13.2
  leadBodyBytes: 10_000,        // §13.2; readJson's cap in api/_lib.ts
  nameChars: 80,                // §13.2
  emailChars: 254,
  businessOtherChars: 80,       // §10, the S2 box
  problemTextChars: 600,        // §4.4
  chips: 3,
  agentIds: 9,
  contactErrors: 10,            // Appendix C
  discsOpened: 7,               // Appendix C
  matchedPhrases: 20,
  phraseChars: 60,
  utmChars: 100,
  landingPathChars: 200,        // Appendix C, this line and the next four
  entryIntentChars: 60,
  referrerHostChars: 120,
  timezoneChars: 64,
  localeChars: 35,
  versionChars: 40,
  secondsToResultMax: 86_400,
  planDepthMax: 20,
  bucketScoreMax: 1_000,
} as const;

/* ── POST /api/funnel/visit (§13.2) ────────────────────────────────────────── */

export const DAY_PARTS = ["morning", "afternoon", "evening"] as const;   // §4.2's edges
export type DayPart = (typeof DAY_PARTS)[number];
export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];
export const DEVICE_CLASSES = ["mobile", "tablet", "desktop"] as const;
export type DeviceClass = (typeof DEVICE_CLASSES)[number];
/** Which S7 check failed, never the value (§9). */
export const CONTACT_ERRORS = ["name", "email", "phone", "consent", "bot", "rate", "server", "timeout"] as const;
export type ContactError = (typeof CONTACT_ERRORS)[number];
export const CTA_FROM = ["header", "hero", "close"] as const;
export type CtaFrom = (typeof CTA_FROM)[number];
export const FILM_PCTS = [0, 25, 50, 75, 100] as const;
export type FilmPct = (typeof FILM_PCTS)[number];
/** Phase 1b. */
export const PLAN_VIEWS = ["motion", "still"] as const;
export type PlanView = (typeof PLAN_VIEWS)[number];
/** Phase 1b. "unsupported" means no AVIF; "failed" means a file of the moving version didn't load. */
export const STILL_REASONS = ["reduced_motion", "save_data", "slow_connection", "unsupported", "failed"] as const;
export type StillReason = (typeof STILL_REASONS)[number];

/** Each value is at most LIMITS.utmChars long. */
export interface Utm { source?: string; medium?: string; campaign?: string; term?: string; content?: string }

/**
 * Every answer so far, on every save, so a dropped save loses nothing (§10).
 * camelCase here, snake_case columns (Appendix C). Never typed text (D13).
 * A key that is absent leaves its column alone; a key that is present overwrites it.
 */
export interface VisitFields {
  // context, sent from the first save on
  noticeVersion: string;               // NOTICE_VERSION
  landingPath?: string;
  entryIntent?: string;                // a search page's slug (phase 3)
  referrerHost?: string;
  utm?: Utm;
  timezone?: string;                   // Intl time zone, "Asia/Kolkata"
  locale?: string;                     // navigator.languages[0]
  dayPart?: DayPart;
  theme?: Theme;
  deviceClass?: DeviceClass;
  isReturning?: boolean;
  // taps
  segment?: Segment;
  nonOwnerReason?: NonOwnerReason;
  businessType?: BusinessType;
  yearsBand?: YearsBand;
  teamBand?: TeamBand;
  revenueBand?: RevenueBand;
  revenueCurrency?: Currency;
  chips?: ChipId[];                    // tap order, at most 3
  inputMode?: InputMode;
  // the plan, from S8 on
  bucketPrimary?: Bucket;
  bucketSecondary?: Bucket | null;
  bucketScores?: Partial<Record<Bucket, number>>;
  template?: Template;
  orderVariant?: OrderVariant;
  tier?: Tier;
  agentIds?: AgentId[];                // scroll order, 1 to 9; the server derives job_ids
  classifierVersion?: string;
  agentsVersion?: string;
  // progress
  secondsToResult?: number;            // whole seconds from landing to the plan painted
  contactErrors?: ContactError[];      // in the order they happened
  planDepth?: number;                  // 0 = "you need only", i = stop i, stops + 1 = the close
  filmPlayed?: boolean;
  filmPct?: FilmPct;
  ctaFrom?: CtaFrom;
  ctaClicked?: boolean;                // the server stamps cta_clicked_at once
  webdriver?: boolean;                 // navigator.webdriver; true sets bot_flag
  // phase 1b
  planView?: PlanView;
  stillReason?: StillReason;
  discsOpened?: DepartmentId[];        // at most 7
}

/** The keys /visit accepts inside fields. Any other key gets a 400. */
export const VISIT_FIELD_KEYS = [
  "noticeVersion", "landingPath", "entryIntent", "referrerHost", "utm", "timezone", "locale", "dayPart", "theme",
  "deviceClass", "isReturning", "segment", "nonOwnerReason", "businessType", "yearsBand", "teamBand", "revenueBand",
  "revenueCurrency", "chips", "inputMode", "bucketPrimary", "bucketSecondary", "bucketScores", "template",
  "orderVariant", "tier", "agentIds", "classifierVersion", "agentsVersion", "secondsToResult", "contactErrors",
  "planDepth", "filmPlayed", "filmPct", "ctaFrom", "ctaClicked", "webdriver", "planView", "stillReason", "discsOpened",
] as const satisfies readonly (keyof VisitFields)[];

type MissingVisitKeys = Exclude<keyof VisitFields, (typeof VISIT_FIELD_KEYS)[number]>;
/** Breaks the type check when VisitFields gains a key that VISIT_FIELD_KEYS lacks. */
export const VISIT_KEYS_COMPLETE: [MissingVisitKeys] extends [never] ? true : never = true;

export interface VisitRequest {
  id: string;                          // v4 UUID from crypto.randomUUID(), kept in sessionStorage, or in memory when storage is blocked
  step: StepId;                        // the screen now showing; last_step only moves forward
  fields: VisitFields;
}

/** 200 carries the country from x-vercel-ip-country, which S7 uses to prefill the phone code.
 *  400 names the first bad key: a key of fields, or "id", "step" or "payload". 415 and 429 send { success: false }. */
export type VisitResponse =
  | { success: true; country: string | null }
  | { success: false; field: string }
  | { success: false };

/* ── POST /api/funnel/lead (§13.2) ─────────────────────────────────────────── */

/** The field a 400 names. "payload" covers a bad shape, plan or answer. */
export const LEAD_FIELDS = ["name", "email", "phone", "consent", "payload"] as const;
export type LeadField = (typeof LEAD_FIELDS)[number];

/** contacts.flag: a second try saved although the spam check or the rate limit failed (§10). */
export const LEAD_FLAGS = ["turnstile_unverified", "turnstile_failed", "rate_limited"] as const;
export type LeadFlag = (typeof LEAD_FLAGS)[number];

/** What /lead answers. plan_emails.status can also be sent_by_hand, delivered, bounced or complained. */
export const PLAN_EMAIL_STATUSES = ["sent", "failed", "held"] as const;
export type PlanEmailStatus = (typeof PLAN_EMAIL_STATUSES)[number];

export interface LeadAnswers {
  businessOther?: string;              // the s2.other text, at most 80; absent unless S2 was "other"
  problemText?: string;                // the S6 box, at most 600; absent when empty
  chips: ChipId[];                     // tap order, at most 3
  inputMode: InputMode;
}

/** fallback picks em.subject.fallback and em.need.fallback (§5.7). A support L plan and an unclassified L plan
 *  list the same agents, so the server can't tell them apart from agentIds (§1.5, request 16). */
export type LeadPlan = Pick<
  PlanDescriptor,
  "template" | "orderVariant" | "tier" | "agentIds" | "matchedPhrases" | "classifierVersion" | "agentsVersion" | "fallback"
>;

export interface LeadRequest {
  visitId: string;                     // the visit's id; it keys the lead, one contact per visit
  retry?: boolean;                     // true on the visitor's second try only (§10)
  name: string;
  email: string;
  phone?: string;                      // E.164, "+919876543210"; absent when left blank (the server also takes "")
  consent: { given: true; version: string };  // version is CONSENT_VERSION
  turnstileToken?: string;             // absent when the widget gave no token
  answers: LeadAnswers;
  plan: LeadPlan;
}

/** 200 when the lead reached the database or the alert. 400 names the field.
 *  403 (spam check) and 429 (rate limit) happen on a first try only; they, 415 and 502 send { success: false }. */
export type LeadResponse =
  | { success: true; planEmail: PlanEmailStatus }
  | { success: false; field: LeadField }
  | { success: false };

/* ── The plan descriptor (§5) ──────────────────────────────────────────────── */

/** ● ◐ ○ */
export interface MarkCounts { runs: number; build: number; mapped: number }

export interface PlanStop {
  department: DepartmentId;
  disc: DiscId;
  agentIds: AgentId[];                 // the plan's agents in this department, in priority-list order
  jobIds: JobId[];                     // their jobs, agent by agent, in agents-33.json order
  marks: MarkCounts;
  departmentAgents: number;            // all agents in the department: {m} in sp.disc.call
}

export interface Classification {
  bucketPrimary: Bucket;               // "unclassified" under §5.2 rule 6
  bucketSecondary: Bucket | null;      // saved, never shown (D12)
  bucketScores: Partial<Record<Bucket, number>>;
  matchedPhrases: string[];            // phrase-list entries as written in templates.md §1, in text order; sent only inside /lead
}

export interface PlanInput {
  teamBand: TeamBand;
  revenueBand: RevenueBand;
  currency: Currency;
  chips: ChipId[];                     // tap order
  problemText: string;                 // "" when nothing was typed
}

export interface PlanDescriptor extends Classification {
  template: Template;
  orderVariant: OrderVariant;
  lane: Lane | null;
  tier: Tier;
  agentIds: AgentId[];                 // 3, 6 or 9, in scroll order (§5.5)
  jobIds: JobId[];                     // equals jobIdsFor(agentIds)
  stops: PlanStop[];                   // one per department in the plan, in scroll order; equals stopsFor(agentIds)
  marks: MarkCounts;                   // over jobIds
  litDiscs: DiscId[];                  // the stops' discs, G00 first (§6.7); used from phase 1b
  pilot: boolean;                      // template B (§5.7)
  fallback: boolean;                   // bucketPrimary is "unclassified" (§5.7)
  currency: Currency;
  classifierVersion: string;
  agentsVersion: string;
}

/* ── The data module's shape (§5.1, §13.1) ─────────────────────────────────── */

export interface Job { id: JobId; name: string; status: JobStatus }

export interface Agent {
  id: AgentId;
  number: number;                      // 1 to 33
  department: DepartmentId;
  name: string;                        // the plain name in copy.md's agent table, "Enquiry responder"
  line: string;                        // the one-line description in the same table
  jobs: readonly Job[];                // agents-33.json order
}

export interface Department {
  id: DepartmentId;
  name: string;                        // "Back Office"
  copyKey: string;                     // its dp.* key: "backoffice" for dp.backoffice.why
  disc: DiscId;                        // DEPARTMENT_DISC[id]
  numbers: readonly [number, number];  // first and last agent number, [29, 33]
  agentIds: readonly AgentId[];
}

/** Placeholder text without its braces, mapped to a value: copy("em.said", { "their words": "…" }). */
export type CopyVars = Readonly<Record<string, string | number>>;

/** What src/features/funnel/data/light.ts exports: no agents data, jobs or phrase lists, so the header (every page),
 *  the questions (S0 to S8) and the film can import it without the plan chunk (§13.10, 00-index §1.5). Lane C builds it. */
export interface FunnelLight {
  COPY_LINES: Readonly<Record<string, string>>;  // every copy line by ID, placeholders unfilled; the claims check reads it
  copy(id: string, vars?: CopyVars): string;     // throws on an unknown ID or a placeholder left unfilled
  calendlyUrl(name: string, email: string): string;                         // INTERIM_BOOKING_URL with name and email
  currencyFor(country: string | null, timeZone: string | null): Currency;  // §5.3
}

/** What src/features/funnel/data/index.ts exports, to the plan chunk and the server: light.ts and the rest. Lane C builds it. */
export interface FunnelData extends FunnelLight {
  AGENTS_VERSION: string;              // agents-33.json "version": "2026-10-04"
  CLASSIFIER_VERSION: string;          // "kw-1" in the first release; lane C changes it when the rules change
  agents: readonly Agent[];            // 33, by number
  departments: readonly Department[];  // 7, spine order
  priority: Readonly<Record<OrderVariant, readonly AgentId[]>>;  // §5.4, 9 each
  laneAgent: Readonly<Record<Lane, AgentId>>;  // content: marketing-creation, support: customer-support, hiring: back-office-talent
  agentById(id: string): Agent | undefined;
  jobIdsFor(agentIds: readonly AgentId[]): JobId[];
  stopsFor(agentIds: readonly AgentId[]): PlanStop[];
  tierFor(team: TeamBand, revenue: RevenueBand): Tier;                       // §5.3
  classify(problemText: string, chips: readonly ChipId[]): Classification;  // §5.2
  composePlan(input: PlanInput): PlanDescriptor;                            // §5.2 to §5.5
}

/* ── Seams between lanes (00-index §1.3) ───────────────────────────────────── */

/** What lane C's plan page reports. Lane A sends it with the next /visit save. */
export type PlanProgress = Pick<
  VisitFields,
  "planDepth" | "filmPlayed" | "filmPct" | "ctaFrom" | "ctaClicked" | "planView" | "stillReason" | "discsOpened"
>;

/** Props of PlanPage in src/features/funnel/plan/PlanPage.tsx (lane C), which lane A renders at S9. */
export interface PlanPageProps {
  plan: PlanDescriptor;
  visitor: { name: string; email: string };
  words: { problemText: string; chips: ChipId[] };
  saveNotice: "fail" | "unsure" | null;  // sp.save.fail or sp.save.unsure at the top (§10)
  onProgress(fields: PlanProgress): void;
}

/** "plan" from S9 on; "questions" before it and after Back from S9. On / the header shows only the logo
 *  while it's "questions" (D6), and its links once it's "plan" (§6.2). */
export type FunnelStage = "questions" | "plan";

/** funnelSession in src/features/funnel/flow/session.ts (lane A). The header and its nav pill (lane D) use it.
 *  stage and subscribe suit useSyncExternalStore; session.ts imports nothing from the screens or the data module. */
export interface FunnelSession {
  leadContact(): { name: string; email: string } | null;  // set once S7 has been sent; otherwise null. The same object until it changes
  reportCta(from: CtaFrom): void;                          // does nothing until the visit has an id
  stage(): FunnelStage;                                    // "questions" when the page loads
  subscribe(onChange: () => void): () => void;             // onChange runs after stage() or leadContact() changes; returns the unsubscribe
}
```

### 1.3 Seams between lanes

These are the only places where one lane's code calls another's, plus the one file two lanes edit. Each name is fixed here, so neither side has to wait.

| Seam | Written by | Used by | Exact name |
|---|---|---|---|
| The funnel at `/` | A | D (`src/pages/Index.tsx`) | `export function FunnelRoot(): JSX.Element` in `src/features/funnel/flow/FunnelRoot.tsx`, with no props |
| The plan at S9 | C | A | `export function PlanPage(props: PlanPageProps): JSX.Element` in `src/features/funnel/plan/PlanPage.tsx` |
| The header and its nav pill to Calendly (D6, D14) | A | D (`src/shared/components/Navbar.tsx`) | `export const funnelSession: FunnelSession` in `src/features/funnel/flow/session.ts`, with `stage()` and `subscribe()`. A stub lands on day 1: `leadContact()` null, `reportCta` doing nothing, `stage()` `"questions"`, and `subscribe` returning an unsubscribe that does nothing |
| Copy, booking link and currency (the light entry) | C | A (S0 to S8), D (the header, the film, the claims check) | `src/features/funnel/data/light.ts`, which satisfies `FunnelLight` |
| Data, copy and the plan (the full entry) | C | A (through `import()` only), B, C's plan modules, D's tests | `src/features/funnel/data/index.ts`, which satisfies `FunnelData` and re-exports `light.ts` |
| Contact checks (§4.4: "the form imports the same checks the server runs") | B | A (the S7 form) | `src/shared/lib/contact-checks.ts`, exporting `isValidEmail`, `isDisposableEmail`, `cleanName`, `isValidName`, `isE164`, `toE164` and `cleanEcho` (lane B, Task 1) |
| Funnel colours | A | C | CSS custom properties set under `[data-theme="light"]` and `[data-theme="dark"]` on `<html>`: `--funnel-bg`, `--funnel-fg`, `--funnel-muted`, `--funnel-line`, `--funnel-card`, `--funnel-accent`, `--funnel-on-accent`. Lane C adds no colour values of its own |
| The entry stylesheet | A writes two lines; D owns the file | A (its styles at first paint), D | `src/index.css`. Lane A adds two `@import` lines at the top on day 1 (lane A Task 1, Step 5): `@import "./features/funnel/tokens.css";` and `@import "./features/funnel/flow/flow.css";`. Lane D keeps them as the first lines, with `@tailwind base;` third, through its Tasks 8 (the burger-nav merge) and 9 (the old homepage's rules). Lane A's `tokens.test.ts` checks those three lines |
| Hero stills | D | C (the `<picture>`, §6.6) | `public/spine/r17/{light,dark}/hero/hero-{1280,1920,2560}.{avif,webp}` and `phone-{828,1170}.{avif,webp}` |
| The film | D | C (the lightbox behind "See how it works") | `export default function BrandFilm(): JSX.Element` in `src/features/home/sections/BrandFilm.tsx`, with no props: the click-to-play player. The poster shows first, no part of the video loads until a tap, and then it plays with sound and controls. Its frame label is `r.film.title`. Lane C renders `<BrandFilm />` without editing it, never imports `VslPlayer` or a `VslConfig`, and prints no second title (§1.5, requests 4 and 13). Lane D keeps the file when it deletes the old home sections (D26) |
| Ananya's `/lead` body | B | D (e2e), B (golden email test) | `tests/fixtures/ananya-lead.json` (lane B, Task 7) |
| Claims check (§12) | D | all | `tests/claims/claims.test.ts`. It reads `COPY_LINES` and the output of lane B's `buildPlanEmail(input: PlanEmailInput): Email`, exported with both types from `api/funnel/_email.ts` (§1.5, request 3) |
| Copy placeholders | C | A, B, C | A placeholder's key is its text without braces: `{their words}`, `{agent name}`, `{Calendly link}` and `{dp.*.why}` are filled as `"their words"`, `"agent name"`, `"Calendly link"` and `"dp.*.why"`. The one list placeholder is stored as a single key: `em.said.chips` is held as `You picked: {chips}.`, filled with the chip labels joined by `", "`, so the visible words stay those in `copy.md` |

**`src/index.css` is lane D's.** §13.7 gives it to no lane, yet two lanes edit it. Lane D owns it and commits its own edits (Tasks 8 and 9). Lane A commits only its two `@import` lines (Task 1, Step 5), under "The entry stylesheet" row above, so §2.3's rule holds for both lanes.

**What lane A does with each `/lead` answer** (§10). Lane B returns exactly these statuses; lane A maps them:

| Answer | `contactErrors` gets | First try | Second try |
|---|---|---|---|
| 200 | nothing | S8, then the plan | the plan |
| 400 with `field` name, email, phone or consent | that field | S7, with `s7.err.<field>` | the plan, with `sp.save.fail` |
| 400 with `field` payload | `server` | S7, with `g.error` | the plan, with `sp.save.fail` |
| 403 | `bot` | S7, with `s7.err.bot` | can't happen: a second try is saved flagged and answers 200 |
| 429 | `rate` | S7, with `g.error` | can't happen, for the same reason |
| 415, 502 or anything else | `server` | S7, with `g.error` | the plan, with `sp.save.fail` |
| no answer within `LEAD_TIMEOUT_MS` | `timeout` | S7, with `g.error` | the plan, with `sp.save.unsure` |

### 1.4 Changing a contract

- Don't edit `contract.ts` from inside a lane. Append one line to `.team/ziiro-fleet/requests.md` instead: `<role> -> worker-4: contract: <the change, in one line>`. The manager routes it, worker-4 makes the change in a commit of its own, and the lanes that use the changed name are told.
- Adding an optional field or a new enum value is cheap. Renaming or removing something breaks other lanes, so it needs the manager's go-ahead.
- A consent or notice wording change also bumps `CONSENT_VERSION` or `NOTICE_VERSION`, in the same commit as the words.

### 1.5 Contract changes, 8 Oct

worker-4 decided the wave 9 requests addressed to it (`.team/ziiro-fleet/funnel/wave9-requests.md`, items 1 to 7 and 13 to 16). The Global Constraints, §1.1 to §1.3, §2.2, P0-T1, P0-T4 and I-T3 already read as decided. This section records what changed and why, and what each lane still owes.

**The decisions**

1. **`FunnelSession` gains `stage()` and `subscribe()`: accepted.** `stage()` returns a `FunnelStage`, `"questions"` or `"plan"`. `subscribe(onChange)` returns the unsubscribe, which is the shape `useSyncExternalStore` takes. `subscribe` also fires when `leadContact()` changes, and `leadContact()` returns the same object until it changes, so it can serve as a snapshot too.
2. **`COPY_LINES` in the data module: accepted.** It sits in `FunnelLight` (request 14), so `index.ts` has it as well.
3. **`buildPlanEmail`: the path is confirmed, the guessed signature isn't.**
   - It stays `buildPlanEmail(input: PlanEmailInput): Email` in `api/funnel/_email.ts`, which exports both types:
     - `PlanEmailInput = { name: string; email: string; problemText?: string; chips: ChipId[]; plan: LeadPlan }`
     - `Email = { subject: string; text: string }`
   - The email needs no visit ID, consent or token, so the claims check can write emails for plans that no fixture covers.
   - From a `LeadRequest`: `buildPlanEmail({ name: lead.name, email: lead.email, problemText: lead.answers.problemText, chips: lead.answers.chips, plan: lead.plan })`.
4. **The film: see request 13, which decides it together with worker-3's request.**
5. **Packages: accepted, and widened to Vitest.**
   - P0-T4 pins `jsdom@^29.0.2` and `vitest@^4.1.11`, with `@vitest/coverage-v8@^4.1.11`. The reason is the Node version range each package says it supports, checked with `npm view` on 8 Oct:

     | Package | Version | Node range | Includes 25? |
     |---|---|---|---|
     | jsdom | 30.x | `^22.22.2`, `^24.15.0`, `>=26.0.0` | no |
     | Vitest | 5.0.3 | `^22.12.0`, `^24.0.0`, `>=26.0.0` | no |
     | jsdom | 29.1.1 | `>=24.0.0` | yes |
     | Vitest | 4.1.11 | `^20`, `^22`, `>=24`; Vite 6, 7 or 8 | yes |

   - This Mac runs Node v25.9.0, so jsdom 30 and Vitest 5 are out.
   - Lighthouse runs as `npx --yes lighthouse@13.5.0`, by hand, with no `package.json` entry. It needs Node 22.19 or later.
6. **I-T3 also checks the build: accepted.** I-T3 step 1 runs `npm run build && npm run check:build` after the claims tests.
7. **The bypass secret: accepted.** If one is made, Div sends it privately to the lane B and lane D builders. It stays out of GitHub, because nothing in Actions reads it: lane D's Preview smoke test (its Task 16) and Lighthouse on the `dev` Preview both run by hand.

From worker-3's batch:

13. **The film (with request 4): worker-2's shape.**
    - `BrandFilm`'s default export is the click-to-play player, `VslPlayer` in `"facade"` mode: the poster first, the video fetched only on a tap, then sound and controls (§6.5, §13.10). Its frame label is `r.film.title`. The file also exports `SPINE_FILM_FILES`, for lane D's own tests.
    - `BRAND_FILM` stays private. worker-3 asked for it only to reach the poster-first mode, and that's what the default export now is. With one way to show the film, the label, the files and the no-preload rule live in one file.
    - Lane C's lightbox names its dialog with `aria-label={copy("r.film.title")}` in place of its `<h2>`, so the title shows once. It keeps `r.film.cap` under the film, and its close button says `r.film.close` (D38) once that line exists (`g.back` until then). Closing the lightbox unmounts `BrandFilm`, which stops the film.
14. **Chunk weight: a light entry, `src/features/funnel/data/light.ts`.**
    - It satisfies `FunnelLight`: `COPY_LINES`, `copy`, `calendlyUrl` and `currencyFor`. It imports only `contract.ts` and lane C's copy, booking-link and currency files: never the agents data, the jobs, the classifier or `compose.ts`.
    - `index.ts` re-exports it and adds the rest (`FunnelData extends FunnelLight`).
    - The header, the film and lane A's screens import `light.ts` only. Lane A reaches `composePlan` through `import("@/features/funnel/data")`, started at S5 with the plan page's own `import()`, so the agents data, the jobs and the phrase lists stay in the plan chunk.
    - The other option was to carry the whole module (11,972 B gz, by worker-3's measure) in lane A's 25 KB gz chunk. That would spend about half the chunk, mostly on jobs and phrase lists that S0 to S7 never read.
    - **One change to §13.10:** the copy lines move from the plan chunk to the light entry, because the header (on every page), S0 to S8 and the film need them first. They now count in "JS before first paint" (150 KB gz). The plan chunk's 12 KB gz data cap covers the agents, the jobs, the phrase lists and the disc map.
    - If lane D's budget check puts first paint over 150 KB gz, tell worker-4: the next step, splitting the copy by surface, is a contract change.
15. **`wordsDepartmentFor`, `quoteWords` and `cleanProblemText` in `FunnelData`: declined.** `COPY_LINES` joins under request 2. None of the three has a caller in another lane:
    - `quoteWords` and `wordsDepartmentFor` serve lane C's page (§6.3, D36).
    - The email quotes their words once, near the top, with lane B's `cleanEcho` at 140 characters (§13.3). `cleanEcho` takes out links, addresses and phone numbers, and keeps the closing punctuation that `copy.md` M shows. `quoteWords` would leave links in and drop that full stop.
    - S6's starter belongs to lane A, whose plan already turns an untouched starter into "" and drops the unfilled blanks (lane A, Review Focus 1). So `cleanProblemText` has no caller.
    - Lane C may keep all three as its own exports, outside the contract.
16. **`fallback` in `LeadPlan`: accepted, as the manager prefers.** `LeadPlan` picks `fallback` from `PlanDescriptor`, `buildPlanEmail` reads it, and the server no longer imports `classify`. Classifying again on the server could disagree with the plan the visitor saw.

**What each lane owes**

- **Phase 0 (the lane B builder):** P0-T4 installs the pinned versions and creates `light.ts` next to `index.ts`. P0-T1 item 5 sends the bypass secret to the lane B and lane D builders.
- **Lane A:**
  - `session.ts` gets `stage()` and `subscribe()` and imports nothing from the screens or the data module. It lands on day 1 as the stub in §1.3 (request 9).
  - S0 to S8 import from `@/features/funnel/data/light` or `contract.ts`, never from `@/features/funnel/data`. `composePlan` comes through `import("@/features/funnel/data")` at S5, next to the plan page's own `import()` (requests 11 and 18).
  - The `/lead` body's `plan` carries `fallback` from `composePlan`.
  - The S6 starter rule stays in lane A.
- **Lane B:** done in this pass. Tasks 7, 8 and 10 carry `fallback`: the fixture, `parseLead`, `buildPlanEmail` and the golden test. `_email.ts` drops `classify`. Request 3 changes nothing.
- **Lane C:**
  - Put `COPY_LINES`, `copy`, `calendlyUrl` and `currencyFor` in `light.ts`, and keep `index.ts` as `export * from "./light"` plus the rest.
  - Test that `light.ts` satisfies `FunnelLight`, and that its imports never reach the agents data, the classifier or `compose.ts`.
  - Measure the plan chunk's data without the copy lines.
  - In `FilmLightbox`, replace the `<h2>` with `aria-label={copy("r.film.title")}`, keep `r.film.cap`, and switch the close button to `r.film.close` when worker-1 adds it.
  - Correct the seam notes: lane B calls neither `quoteWords` nor `wordsDepartmentFor`, and lane A doesn't call `cleanProblemText`.
- **Lane D:**
  - The header and `BrandFilm` import `copy` and `calendlyUrl` from `@/features/funnel/data/light`.
  - The claims check reads `COPY_LINES` from `light.ts`, and calls `buildPlanEmail` with a `PlanEmailInput` (request 3) whose `plan` carries `fallback`. Its `emailText` in `sources.ts` is the only change.
  - The budget check also fails when a job name or a phrase-list entry shows up in the entry chunk or the funnel chunk.
  - The Preview smoke test and Lighthouse run by hand, with the bypass secret from Div.

---

## 2. Lane order and dependencies

### 2.1 Calendar

The build starts the working day after the owner approves these plans (§13.7). With approval on Thu 8 Oct:

| Day | Date | Phase 0 and integration | Lane A (4.5 d) | Lane B (4 d) | Lane C (3 d) | Lane D (2.5 d) |
|---|---|---|---|---|---|---|
| 1 | Fri 9 Oct | Morning: phase 0 (P0-T1 to P0-T6) | Afternoon: head script, greeting, tokens | Afternoon: Tasks 1 to 4 (contact checks, `_lib.ts`, Turnstile, `vercel.json` and `.env.example`) | Afternoon: agents data, `jobIdsFor`, `stopsFor` | Afternoon: film string change and re-render (render lock), Index swap coded against §1.3; it lands day 2 morning |
| 2 | Mon 12 Oct | | Morning: `FunnelRoot`, pushed with lane C's copy. Then S1 to S5, Back, history | Tasks 5 to 7 (`parseVisit`, `/visit`, `parseLead` and Ananya's fixture) | copy lines, `calendlyUrl`, `tierFor`, `currencyFor`, `classify` | stills and phone band, nav |
| 3 | Tue 13 Oct | | S6, S7, the Turnstile hook | Tasks 8 and 9 (`_email.ts`, then `/lead`) | `composePlan`, `PlanPage` | Playwright, claims check, Lighthouse and prerender checks, CI (ends midday) |
| 4 | Wed 14 Oct | | S7's retry rule, S8, `funnelSession` | Task 9 finished; Tasks 10 and 11 (golden email, Privacy text) | `PlanPage` finished (ends) | helps lane A |
| 5 | Thu 15 Oct | | S9 mount, the `/visit` sender (ends) | Task 12, saved queries and live SQL checks (ends midday) | helps lane A | helps lane A |
| 6 | Fri 16 Oct | I-T1 to I-T4 | | | | |
| 7 | Mon 19 Oct | Morning: I-T5, then L-T1 to L-T3. **Live around midday** | | | | |

- If approval comes on Fri 9 Oct, every date moves one working day and launch is Tue 20 Oct.
- If launch would land after Tue 20 Oct, lane D ships the removal of the 127/30 line by itself first, so the VIT talk on 21 Oct never shows it (D27).
- Lane A plus integration is the critical path. A builder whose lane ends early helps lane A with tasks lane A hands over, and never edits lane A's files without asking.

### 2.2 Who needs what, and by when

| Needed by | Deliverable | From | Ready by |
|---|---|---|---|
| A, B, C, D | the branch, `contract.ts`, the test tools | phase 0 | day 1, before noon |
| C's plan page | funnel colour tokens | A | day 1 |
| D's stills | the `/spine/` cache rule in `vercel.json` | B | day 1 |
| A's S7 form | `contact-checks.ts` | B | day 1 |
| D's header | the `funnelSession` stub (§1.3) | A | day 1 |
| B's `/visit` (job_ids) | `jobIdsFor`, `stopsFor`, `agentById` | C | day 1 |
| A's screens, D's header and film | `COPY_LINES` and `copy`, in `light.ts` | C | day 2, morning |
| D's Index swap | `FunnelRoot` | A | day 2, morning (pushed with lane C's copy) |
| D's Index swap | `seo.home.*` in `light.ts` | C | day 2, morning |
| A's S5 | `currencyFor`, in `light.ts` | C | day 2 |
| D's nav pill, B's email | `calendlyUrl`, in `light.ts` | C | day 2 |
| A's background saves | `/visit` on the Preview | B | day 2 |
| D's e2e, B's golden email | `tests/fixtures/ananya-lead.json` | B | day 2 |
| C's hero `<picture>` | stills in `public/spine/r17/` | D | day 2 |
| A's S8, through `import()` | `composePlan`, in `index.ts` | C | day 3, morning |
| A's S9 | `PlanPage` | C | day 3 |
| D's claims check | `buildPlanEmail` | B | day 3 |
| A's S7 send | `/lead` on the Preview | B | day 4 |
| D's nav pill | `funnelSession`, complete | A | day 4 |
| D's spine-files spec | `HeroPicturePrefetch` mounted at S5 | A | day 4 |

If a deliverable isn't there when your task needs it, write your test against the contract, mocking `src/features/funnel/data/light.ts` or `index.ts` with `vi.mock` (or the endpoint with a Playwright route mock), finish the rest of the task, and land it once the deliverable is in. Never write your own copy of another lane's code.

### 2.3 Rules for the shared branch

- All four lanes commit to `feat/business-spine-funnel`. Pull with `git pull --rebase` before you push, and push small commits often. Never force-push.
- Commit only files your lane owns (§13.7, plus §1.3 above). `package.json` and `package-lock.json` change in phase 0 and in lane D's tasks only.
- Before you push, run `npm test`, `npm run typecheck` and `npm run build`. A red branch blocks the other three lanes.
- One draft PR, from the feature branch into `dev`, is opened in P0-T3. Every push makes a Vercel Preview.

**Where each lane works** (the manager's ruling, `funnel/wave10.md`; it wins where a task says otherwise):
- Each lane has its own git worktree under `/Users/rits/ziiro-build/`, outside the vault, so `node_modules` stays out of Obsidian and Spotlight. Lane B's is `lane-b` (P0-T2). After P0-T4 is pushed, worker-4 makes the other three: `git worktree add -b lane-x /Users/rits/ziiro-build/lane-x ziiroai/feat/business-spine-funnel`, with x = a, c and d, then runs `npm ci` in each.
- The vault checkout (`/Users/rits/Div's Second Brain/03 Projects/ziiro`) stays on the owner's branch, untouched. Nobody switches branches or builds there.
- To sync, commit only the files your lane owns, each by its path, and never with `git add -A`. Then run `git pull --rebase ziiroai feat/business-spine-funnel` and `git push ziiroai HEAD:feat/business-spine-funnel`. Never force-push.
- Each lane runs `vite preview` and Playwright on its own port, so parallel runs don't collide: A 4173, B 4174, C 4175, D 4176. Set the port with `PORT` where a config reads it, or pass `--port` to `vite preview`.

---

## 3. Phase 0 (day 1, morning)

Run by the lane B builder (worker-4), with Div for P0-T1. P0-T2 to P0-T4 come first, because the other lanes start the moment P0-T4 is pushed.

### Task P0-T1: The owner's items

**Files:**
- Create: `.team/ziiro-fleet/funnel/phase0.md` (a status list with no secret values in it)

**Interfaces:**
- Consumes: §13.5, §13.6, §13.8, and `.team/ziiro-fleet/funnel/contact-fix.md`
- Produces: B1 and B3 closed; the env vars from §13.6 set; a Neon branch for lane B's live SQL checks

- [ ] **Step 1: Send Div this list first thing (through the manager)**

1. **B1:** go through `contact-fix.md`'s eight steps (about 20 minutes). In step 1, verify `ziiroai.com` in Resend (SPF and DKIM), because `PLAN_FROM` sends from it (§13.3), and turn open and click tracking off for that domain.
2. **B3:** install Neon from the Vercel Marketplace on project `ziiro-ai-vision` in the "ziiro" team. Free plan, AWS Singapore (`aws-ap-southeast-1`), connected to Production and Preview (§13.5). About 5 minutes.
3. **Env vars** (§13.6), under Vercel, Project, Settings, Environment Variables:
   - `PLAN_FROM` = `Adyut at ziiro <adyut@ziiroai.com>` on Production, Preview and Development;
   - `PLAN_REPLY_TO` = the team inbox on Production (D7, until Adyut sends his address, B4), and the tester's inbox on Preview and Development;
   - `TEAM_INBOX` = the tester's inbox on Preview and Development;
   - `TURNSTILE_SECRET_KEY` = `1x0000000000000000000000000000000AA` and `VITE_TURNSTILE_SITE_KEY` = `1x00000000000000000000AA` on Preview and Development only. Production keeps the real keys (§13.4).
4. **After P0-T6:** in the Neon console, create a branch named `builders` from `main`, and send its connection string privately to the lane B builder. It never goes into git or a chat log.
5. **If Preview deployments ask for a Vercel login:** Project, Settings, Deployment Protection, Protection Bypass for Automation, then generate a secret. Send it privately to the lane B and lane D builders, who set it as `VERCEL_AUTOMATION_BYPASS_SECRET` for a single command at a time. Don't add it to GitHub: lane D's Preview smoke test (its Task 16) and Lighthouse on the `dev` Preview run by hand, and nothing in Actions reads it (§1.5, request 7).
6. **Start the remaining launch blockers now, so they are closed by L-T1:** B2 (Vercel Pro), B5 (which Tripo plan made the two GLBs), and B7 (Adyut agrees to handle deletion replies and failed or held plan emails the same working day). Blocker B6, the Privacy text, comes from lane B, Task 11 for Div to approve.

- [ ] **Step 2: Record what's closed**

Write `.team/ziiro-fleet/funnel/phase0.md`, one line per item: `B1 | closed | 9 Oct`, `B3 | closed | 9 Oct`, `env | set | 9 Oct`, `neon builders branch | sent | 9 Oct`, `bypass | not needed` or `sent to B and D`, then `B2`, `B5` and `B7` with their state. Names and states only, never a value.

- [ ] **Step 3: Verify**

These items are verified by P0-T5 step 6 (the region and the Preview env) and by P0-T6 step 5 (the tables on Neon `main`). Neither has to wait for this step; finish them when Div's answers arrive.

### Task P0-T2: The branch

**Files:** none (git only)

**Interfaces:**
- Produces: `feat/business-spine-funnel` on `ziiroai`, cut from a `dev` that includes `main`

- [ ] **Step 1: Merge main into dev** (squash merges leave dev behind)

Run it in a new worktree, never in the vault checkout (§2.3):

```bash
git fetch ziiroai
git worktree add --detach /Users/rits/ziiro-build/lane-b ziiroai/dev
cd /Users/rits/ziiro-build/lane-b
git merge --no-ff ziiroai/main -m "Merge main into dev"
```

Expected: the merge completes with no conflicts, because `main` and `dev` hold the same files (§13.9). If it reports a conflict, run `git merge --abort` and stop: tell the manager, and don't resolve it yourself.

- [ ] **Step 2: Check that dev now equals main, then build it**

```bash
git diff --stat ziiroai/main HEAD
npm ci && npm run build
```

Expected: the diff prints nothing, and the build ends with `node scripts/llms-full.mjs` exiting 0.

- [ ] **Step 3: Push dev and cut the branch**

```bash
git push ziiroai HEAD:dev
git switch -c feat/business-spine-funnel
git push -u ziiroai feat/business-spine-funnel
```

Expected: the push is a fast-forward of `dev` (no `--force`, ever). `git status` shows `On branch feat/business-spine-funnel` and a clean tree, and the branch is on `ziiroai` for the other lanes to base on.

### Task P0-T3: The build's first commit: the spec and the plans

**Files:**
- Commit: `docs/superpowers/specs/2026-10-07-business-spine-funnel-design.md`, and the five plans `docs/superpowers/plans/2026-10-08-funnel-{00-index,lane-a,lane-b,lane-c,lane-d}.md`

**Interfaces:**
- Consumes: the branch from P0-T2
- Produces: the draft PR into `dev`, which gives every later push a Preview

- [ ] **Step 1: Copy the six documents from the vault checkout into `lane-b`, then commit them and nothing else**

```bash
cd /Users/rits/ziiro-build/lane-b
V="/Users/rits/Div's Second Brain/03 Projects/ziiro"
mkdir -p docs/superpowers/specs docs/superpowers/plans
cp "$V/docs/superpowers/specs/2026-10-07-business-spine-funnel-design.md" docs/superpowers/specs/
cp "$V"/docs/superpowers/plans/2026-10-08-funnel-*.md docs/superpowers/plans/
git add docs/superpowers/specs/2026-10-07-business-spine-funnel-design.md \
  docs/superpowers/plans/2026-10-08-funnel-00-index.md docs/superpowers/plans/2026-10-08-funnel-lane-a.md \
  docs/superpowers/plans/2026-10-08-funnel-lane-b.md docs/superpowers/plans/2026-10-08-funnel-lane-c.md \
  docs/superpowers/plans/2026-10-08-funnel-lane-d.md
git commit -m "docs: add the Business Spine funnel spec and its build plans"
git show --stat --pretty= HEAD
```

Expected: `6 files changed`, and only those six paths listed.

- [ ] **Step 2: Push and open the draft PR**

```bash
git push -u ziiroai feat/business-spine-funnel
gh pr create --repo ziiroAi/ziiro-website --base dev --head feat/business-spine-funnel --draft \
  --title "Business Spine funnel, first release" \
  --body "Spec: docs/superpowers/specs/2026-10-07-business-spine-funnel-design.md. Plans: docs/superpowers/plans/2026-10-08-funnel-*.md. Draft until I-T5."
```

Expected: `gh` prints the PR URL. Put that URL into `.team/ziiro-fleet/funnel/phase0.md`.

### Task P0-T4: The test tools and the contract

**Files:**
- Create: `vitest.config.ts`, `tsconfig.api.json`, `src/features/funnel/data/contract.ts`, `src/features/funnel/data/light.ts`, `src/features/funnel/data/index.ts`
- Modify: `package.json` (dependencies and four scripts), `package-lock.json`
- Test: `src/features/funnel/data/contract.test.ts`

**Interfaces:**
- Produces: everything in §1.2; the scripts `npm test`, `npm run test:watch`, `npm run coverage` and `npm run typecheck`

- [ ] **Step 1: Install the packages, all of them at once**

```bash
npm install @neondatabase/serverless
npm install --save-dev vitest@^4.1.11 @vitest/coverage-v8@^4.1.11 jsdom@^29.0.2 @playwright/test @axe-core/playwright
npx vitest --version
```

Expected: no peer-dependency error, and no `EBADENGINE` warning on this Mac's Node v25.9.0. Vitest prints `vitest/4.1.x`. Don't move to Vitest 5 or jsdom 30, because both leave Node 25 out (§1.5, request 5). If npm reports a conflict anyway, stop and tell the manager, with npm's message.

- [ ] **Step 2: Add the scripts to `package.json`**

Add these four entries to `"scripts"`, leaving the existing ones as they are:

```json
"test": "vitest run",
"test:watch": "vitest",
"coverage": "vitest run --coverage",
"typecheck": "tsc -p tsconfig.app.json && tsc -p tsconfig.api.json"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.ts"],
    exclude: ["node_modules/**", "tests/e2e/**"],
    coverage: {
      provider: "v8",
      include: ["src/features/funnel/**/*.{ts,tsx}", "api/funnel/**/*.ts", "src/shared/lib/contact-checks.ts"],
      exclude: ["**/*.test.{ts,tsx}"],
      thresholds: { lines: 80 },
    },
  },
});
```

The React plugin is the one `vite.config.ts` already uses, so `.tsx` tests compile JSX the same way the app does. DOM tests opt in with `// @vitest-environment jsdom` as their first line. Playwright specs live in `tests/e2e/` as `*.spec.ts` (lane D), outside Vitest.

- [ ] **Step 4: Create `tsconfig.api.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["node"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true
  },
  "include": ["api/**/*.ts", "src/features/funnel/data/**/*.ts", "src/shared/lib/contact-checks.ts", "tests/api/**/*.ts"]
}
```

Today's `api/*.ts` already pass this config. That was checked on 8 Oct with `tsc` in strict mode, and it exited 0.

- [ ] **Step 5: Write the failing test**

`src/features/funnel/data/contract.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import * as c from "./contract";

const LISTS = {
  STEPS: c.STEPS, SEGMENTS: c.SEGMENTS, NON_OWNER_REASONS: c.NON_OWNER_REASONS, BUSINESS_TYPES: c.BUSINESS_TYPES,
  YEARS_BANDS: c.YEARS_BANDS, TEAM_BANDS: c.TEAM_BANDS, REVENUE_BANDS: c.REVENUE_BANDS, CURRENCIES: c.CURRENCIES,
  CHIPS: c.CHIPS, INPUT_MODES: c.INPUT_MODES, BUCKETS: c.BUCKETS, TEMPLATES: c.TEMPLATES,
  ORDER_VARIANTS: c.ORDER_VARIANTS, LANES: c.LANES, TIERS: c.TIERS, DEPARTMENTS: c.DEPARTMENTS, DISCS: c.DISCS,
  AGENT_IDS: c.AGENT_IDS, JOB_STATUSES: c.JOB_STATUSES, DAY_PARTS: c.DAY_PARTS, THEMES: c.THEMES,
  DEVICE_CLASSES: c.DEVICE_CLASSES, CONTACT_ERRORS: c.CONTACT_ERRORS, CTA_FROM: c.CTA_FROM, FILM_PCTS: c.FILM_PCTS,
  PLAN_VIEWS: c.PLAN_VIEWS, STILL_REASONS: c.STILL_REASONS, LEAD_FIELDS: c.LEAD_FIELDS, LEAD_FLAGS: c.LEAD_FLAGS,
  PLAN_EMAIL_STATUSES: c.PLAN_EMAIL_STATUSES, VISIT_FIELD_KEYS: c.VISIT_FIELD_KEYS,
};

describe("the funnel contract", () => {
  it.each(Object.entries(LISTS))("%s has no repeated value", (_name, values) => {
    expect(new Set<unknown>(values).size).toBe(values.length);
  });

  it("has one ID per option on screen (§4.3)", () => {
    expect(c.SEGMENTS).toHaveLength(5);          // s1.o1–s1.o5
    expect(c.NON_OWNER_REASONS).toHaveLength(5); // s1b.o1–s1b.o5
    expect(c.BUSINESS_TYPES).toHaveLength(12);   // s2.o
    expect(c.YEARS_BANDS).toHaveLength(5);       // s3.o
    expect(c.TEAM_BANDS).toHaveLength(5);        // s4.o
    expect(c.REVENUE_BANDS).toHaveLength(6);     // five bands and s5.skip
    expect(c.CHIPS).toHaveLength(9);             // s6.chips
  });

  it("lists the 33 agents by number, each under one of the 7 departments", () => {
    expect(c.AGENT_IDS).toHaveLength(33);
    expect(c.AGENT_IDS[15]).toBe("deals-inbound");          // 16, Enquiry responder
    expect(c.AGENT_IDS[28]).toBe("back-office-money-in");   // 29, Collections agent
    expect(c.AGENT_IDS[32]).toBe("back-office-talent");     // 33, Hiring assistant
    for (const id of c.AGENT_IDS) {
      expect(c.DEPARTMENTS.filter((d) => id.startsWith(`${d}-`))).toHaveLength(1);
    }
  });

  it("maps every chip to its problem and every department to its disc (§5.2, §6.7)", () => {
    expect(Object.keys(c.CHIP_BUCKET).sort()).toEqual([...c.CHIPS].sort());
    expect(c.CHIP_BUCKET.followups).toBe("sales");
    expect(c.DEPARTMENT_DISC).toEqual({
      intelligence: "G07", marketing: "G06", sales: "G05", deals: "G04",
      customer: "G03", operations: "G02", "back-office": "G01",
    });
  });

  it("sizes the tiers 3, 6 and 9, and keeps the schema's limits (§5.3, Appendix C)", () => {
    expect(c.TIER_SIZE).toEqual({ S: 3, M: 6, L: 9 });
    expect(c.LIMITS).toMatchObject({
      nameChars: 80, problemTextChars: 600, businessOtherChars: 80, chips: 3, agentIds: 9,
      visitBodyBytes: 4_096, leadBodyBytes: 10_000, contactErrors: 10, discsOpened: 7,
    });
  });

  it("tells allowed values from others with isOneOf", () => {
    expect(c.isOneOf(c.CHIPS, "ads")).toBe(true);
    expect(c.isOneOf(c.CHIPS, "Ads burn money")).toBe(false);
    expect(c.isOneOf(c.FILM_PCTS, 50)).toBe(true);
    expect(c.isOneOf(c.FILM_PCTS, "50")).toBe(false);
  });
});
```

- [ ] **Step 6: Run it and watch it fail**

Run: `npx vitest run src/features/funnel/data/contract.test.ts`
Expected: FAIL, with `Failed to resolve import "./contract"`.

- [ ] **Step 7: Create `contract.ts`, `light.ts` and `index.ts`**

Copy §1.2 into `src/features/funnel/data/contract.ts` exactly as it is. Then create `src/features/funnel/data/light.ts`:

```ts
// The funnel's light entry, for the header (every page), the questions (S0 to S8) and the film.
// It never imports the agents data, the jobs, the classifier or compose.ts (00-index §1.5).
// Lane C adds its light exports below this line until the module satisfies FunnelLight (contract.ts).
export * from "./contract";
```

And `src/features/funnel/data/index.ts`:

```ts
// The funnel's full data module, for the plan chunk and api/funnel/*: the light entry and the rest.
// Lane C adds its exports below this line until the module satisfies FunnelData (contract.ts).
export * from "./light";
```

- [ ] **Step 8: Run the test, the type check and the build**

```bash
npx vitest run src/features/funnel/data/contract.test.ts
npm run typecheck
npm run build
```

Expected: 36 tests pass (31 list checks and 5 others). `typecheck` exits 0; if `VISIT_FIELD_KEYS` ever loses a key, it fails on `VISIT_KEYS_COMPLETE`. The build exits 0.

- [ ] **Step 9: Commit and push**

```bash
git add package.json package-lock.json vitest.config.ts tsconfig.api.json \
  src/features/funnel/data/contract.ts src/features/funnel/data/light.ts src/features/funnel/data/index.ts \
  src/features/funnel/data/contract.test.ts
git commit -m "feat(funnel): add the day-1 contracts and the test tools"
git push
```

Then tell the manager that the contract is on the branch. Lanes A, C and D start from this commit.

### Task P0-T5: The function skeletons, in `sin1`

**Files:**
- Create: `api/funnel/visit.ts`, `api/funnel/lead.ts`
- Modify: `vercel.json` (one top-level key)
- Test: `tests/api/funnel/skeleton.test.ts`

**Interfaces:**
- Consumes: `isJsonRequest` and `jsonResponse` from `api/_lib.ts`
- Produces: two Node functions in `sin1`, which lane B builds out in Tasks 6 and 9

- [ ] **Step 1: Write the failing test**

`tests/api/funnel/skeleton.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import * as lead from "../../../api/funnel/lead";
import * as visit from "../../../api/funnel/visit";
import vercel from "../../../vercel.json";

const post = (body: string, type = "application/json") =>
  new Request("https://ziiroai.com/api/funnel/x", {
    method: "POST",
    headers: { "content-type": type, origin: "https://ziiroai.com" },
    body,
  });

describe.each([
  ["visit", visit],
  ["lead", lead],
] as const)("/api/funnel/%s, phase 0", (_name, fn) => {
  it("runs on Node.js for at most 15 s", () => {
    expect(fn.config).toEqual({ runtime: "nodejs", maxDuration: 15 });
  });

  it("refuses a body that isn't JSON with 415 and no-store", async () => {
    const res = await fn.POST(post("a=1", "text/plain"));
    expect(res.status).toBe(415);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("answers 501 until lane B builds it", async () => {
    const res = await fn.POST(post("{}"));
    expect(res.status).toBe(501);
    expect(await res.json()).toEqual({ success: false });
  });
});

describe("vercel.json", () => {
  it("pins the functions to Singapore (§13.2)", () => {
    expect(vercel.regions).toEqual(["sin1"]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/api/funnel/skeleton.test.ts`
Expected: FAIL, with `Failed to resolve import "../../../api/funnel/lead"`.

- [ ] **Step 3: Write both skeletons and the region**

`api/funnel/visit.ts`:

```ts
// POST /api/funnel/visit: phase 0 skeleton. Lane B, Task 6 builds it (spec §13.2).
import { isJsonRequest, jsonResponse } from "../_lib";

export const config = { runtime: "nodejs", maxDuration: 15 };

export async function POST(request: Request): Promise<Response> {
  if (!isJsonRequest(request)) return jsonResponse(request, { success: false }, 415);
  return jsonResponse(request, { success: false }, 501);
}
```

`api/funnel/lead.ts`:

```ts
// POST /api/funnel/lead: phase 0 skeleton. Lane B, Task 9 builds it (spec §13.2).
import { isJsonRequest, jsonResponse } from "../_lib";

export const config = { runtime: "nodejs", maxDuration: 15 };

export async function POST(request: Request): Promise<Response> {
  if (!isJsonRequest(request)) return jsonResponse(request, { success: false }, 415);
  return jsonResponse(request, { success: false }, 501);
}
```

In `vercel.json`, add `"regions": ["sin1"],` as the first key inside the top-level object, above `"cleanUrls": true,`.

- [ ] **Step 4: Run the tests, the type check and the build**

```bash
npx vitest run tests/api/funnel/skeleton.test.ts
npm run typecheck && npm run build
```

Expected: 7 tests pass (3 per function, plus the region). `typecheck` and `build` exit 0.

- [ ] **Step 5: Commit and push**

```bash
git add api/funnel/visit.ts api/funnel/lead.ts vercel.json tests/api/funnel/skeleton.test.ts
git commit -m "feat(funnel): add the Node function skeletons in sin1"
git push
```

- [ ] **Step 6: Check the region and the Preview env on the PR's Preview**

Take the Preview URL from the PR's Vercel comment. Then run this, leaving out the bypass header if P0-T1 item 5 wasn't needed:

```bash
PREVIEW=https://<the PR's preview host>
curl -s -D - -o /dev/null -X POST "$PREVIEW/api/funnel/visit" \
  -H "content-type: application/json" -H "x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET" -d '{}' \
  | grep -i -E "^HTTP|^x-vercel-id"
```

Expected: `HTTP/2 501`, and an `x-vercel-id` whose second part is `sin1`, such as `bom1::sin1::…`. Then open the Preview's `/contact` page: the Turnstile widget renders with Cloudflare's "testing only" label, which shows the Preview has the test site key.

### Task P0-T6: The schema on Neon

**Files:**
- Create: `db/funnel.sql`

**Interfaces:**
- Consumes: Appendix C
- Produces: the three tables on Neon `main`. Every Preview branch is copied from `main`, so the Previews get them too (§13.5). Lane B owns `db/funnel.sql` from here on.

- [ ] **Step 1: Write the file**

Copy the SQL block in Appendix C, from its first comment line down to the last `create index` line, into `db/funnel.sql` unchanged. Put `begin;` above it and `commit;` below it. The nine saved queries stay out of this file; lane B, Task 12 puts them in `db/funnel-queries.sql`.

- [ ] **Step 2: Run it on a throwaway local Postgres**

This needs Postgres 13 or newer on the PATH (`initdb`, `pg_ctl`, `psql`); Homebrew's `postgresql@14` on the Mac works.

```bash
PGTMP=$(mktemp -d)
initdb -D "$PGTMP/data" -U postgres >/dev/null
pg_ctl -D "$PGTMP/data" -o "-p 54931 -c unix_socket_directories=''" -l "$PGTMP/log" -w start
psql -h 127.0.0.1 -p 54931 -U postgres -v ON_ERROR_STOP=1 -q -f db/funnel.sql
psql -h 127.0.0.1 -p 54931 -U postgres -At -c "select string_agg(table_name, ',' order by table_name) from information_schema.tables where table_schema = 'public'"
pg_ctl -D "$PGTMP/data" -m fast stop
```

Expected: the file runs with no error, and the last query prints `contacts,plan_emails,visits`. The data directory sits in a temp folder, so nothing is left behind in the repo.

- [ ] **Step 3: Commit and push**

```bash
git add db/funnel.sql
git commit -m "feat(funnel): add the funnel schema v3.1"
git push
```

- [ ] **Step 4: Apply it on Neon `main`**

Div (or a builder signed in to Neon) opens the Neon console, picks the project, branch `main` and the SQL Editor, pastes `db/funnel.sql` and runs it.

- [ ] **Step 5: Check it on Neon**

In the same SQL Editor:

```sql
select table_name from information_schema.tables where table_schema = 'public' order by 1;
select count(*) from visits;
```

Expected: `contacts`, `plan_emails` and `visits`, then `0`. Then P0-T1 item 4 can run: the `builders` branch, created from `main` after this step.

---

## 4. Integration (day 6 and the morning of day 7)

All four builders take part. Fix a seam in the lane that owns the file, under that lane's test-first rule.

### Task I-T1: The Preview smoke test

**Files:** none; the record goes into `.team/ziiro-fleet/funnel/integration.md`

**Interfaces:**
- Consumes: every lane's day-5 state on the PR's Preview, with Cloudflare's test keys and the Neon preview branch (§12, "Preview smoke test")

- [ ] **Step 1: Run Ananya's flow on the Preview by hand**

On a phone-sized window (390 × 844): "I run a business", "Interior design / architecture", "5–10 years", "6–20", "₹1–5Cr". At S6, type "Enquiries come in, but by the time someone calls back they've gone cold." Then "That's it". At S7: name `Ananya`, the tester's email, tick the consent, "Show me my plan".

Expected: S8 plays, and the plan shows 6 agents in 4 stops (Deals, Sales, Marketing, Back Office) with the Pilot tag (§5.8).

- [ ] **Step 2: Read the rows on the Neon preview branch**

In the Neon console, open the preview branch made for this deployment, then the SQL Editor:

```sql
select last_step, template, order_variant, tier, cardinality(agent_ids) as agents, bot_flag, notice_version
from visits order by created_at desc limit 1;

select c.name, c.flag, c.consent_version, p.status, p.resend_id is not null as has_resend_id,
       cardinality(p.job_ids) as jobs
from contacts c join plan_emails p on p.contact_id = c.id
order by c.created_at desc limit 1;
```

Expected: `S9 | B | B-convert | M | 6 | f | 2026-10-08`, then `Ananya | (null) | 2026-10-08 | sent | t | 26`.

- [ ] **Step 3: Check the tester's inbox**

Expected: one team alert, and one plan email from "Adyut at ziiro" that matches `copy.md` M line by line for Ananya, with the changed `em.pilot` from §4.5. It has exactly one link, the Calendly link with her name and email, and the link isn't rewritten for tracking.

- [ ] **Step 4: Record it**

Append to `.team/ziiro-fleet/funnel/integration.md`: the date, the Preview URL, the two query results and "email OK" or what differed. A difference is fixed in the lane that owns the file, then this task runs again.

### Task I-T2: The cross-lane end-to-end checks

**Files:**
- Create: `tests/e2e/integration.spec.ts` (written by the lane D builder, on lane D's Playwright setup)

**Interfaces:**
- Consumes: lane D's `playwright.config.ts` (with `vite preview` as its web server); `tests/fixtures/ananya-lead.json` (lane B, Task 7); `tapThrough(page: Page, ...names: string[]): Promise<void>` from `tests/e2e/support/questions.ts` (lane A, Task 15); the copy lines as visible labels

- [ ] **Step 1: Write the test**

```ts
import { expect, test, type Page, type Request } from "@playwright/test";
import ananya from "../fixtures/ananya-lead.json";
import { tapThrough } from "./support/questions";

const leadBodies: Record<string, unknown>[] = [];

test.beforeEach(async ({ page }) => {
  leadBodies.length = 0;
  await page.route("**/api/funnel/visit", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, country: "IN" }) }),
  );
  await page.route("**/api/funnel/lead", async (route, request: Request) => {
    leadBodies.push(request.postDataJSON());
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, planEmail: "sent" }) });
  });
});

async function answerAsAnanya(page: Page) {
  await page.goto("/");
  // The questions ignore a tap for 350 ms after each step (lane A's double-tap guard), so tapThrough waits 400 ms first.
  await tapThrough(page, "I run a business", "Interior design / architecture", "5–10 years", "6–20", "₹1–5Cr");
  await page.getByRole("textbox").fill("Enquiries come in, but by the time someone calls back they've gone cold.");
  await tapThrough(page, "That's it");
  await fillContact(page);
}

async function fillContact(page: Page) {
  await page.getByLabel("Your name").fill("Ananya");
  // "Email" alone also matches the consent box, whose label says "email me".
  await page.getByLabel("Email", { exact: true }).fill("ananya@example.com");
  await page.getByRole("checkbox").check();
}

test("Ananya's lead body is the fixture lane B turns into the golden email", async ({ page }) => {
  await answerAsAnanya(page);
  await page.getByRole("button", { name: "Show me my plan" }).click();
  await expect.poll(() => leadBodies.length).toBe(1);
  const body = leadBodies[0] as typeof ananya;
  expect({ ...body, visitId: ananya.visitId, turnstileToken: ananya.turnstileToken }).toEqual(ananya);
});

test("a double tap on send makes one lead", async ({ page }) => {
  await answerAsAnanya(page);
  await page.getByRole("button", { name: "Show me my plan" }).dblclick();
  await page.waitForTimeout(1_000);
  expect(leadBodies).toHaveLength(1);
});

test("Back from the plan lands on S6, and sending again is a new visit (§4.1)", async ({ page }) => {
  await answerAsAnanya(page);
  await page.getByRole("button", { name: "Show me my plan" }).click();
  await expect.poll(() => leadBodies.length).toBe(1);
  await page.goBack();
  await expect(page.getByRole("button", { name: "That's it" })).toBeVisible();
  await tapThrough(page, "That's it");
  await fillContact(page);
  await page.getByRole("button", { name: "Show me my plan" }).click();
  await expect.poll(() => leadBodies.length).toBe(2);
  expect((leadBodies[1] as { visitId: string }).visitId).not.toBe((leadBodies[0] as { visitId: string }).visitId);
});
```

The labels are copy lines: `s1.o1`, `s2.o`, `s3.o`, `s4.o`, `s5.o.IN`, `s6.btn`, `s7.name`, `s7.email` and `s7.btn`. `fill` and `check` work whether or not S7 kept the earlier values.

Two things from lane A (`wave9-requests.md` batch 3):
- **The email label matches exactly** (request 20). `s7.consent` says "email me", so a plain `getByLabel("Email")` finds two fields and Playwright stops.
- **The taps go at a person's pace** (request 21). The questions ignore a tap for 350 ms after each step, which is lane A's double-tap guard (`TAP_LOCK_MS`). Playwright clicks the next screen's button sooner than that.
  - Every option and every "That's it" goes through lane A's `tapThrough`, which waits `TAP_PACE_MS` (400 ms) before each tap. That includes the "That's it" after Back.
  - The send button isn't held by the guard. Lane A's `sendContact` clicks it straight away too, and the double tap on it is the second case's to catch.
  - If `tests/e2e/support/questions.ts` isn't there yet, put `await page.waitForTimeout(400)` before each of those clicks instead.

- [ ] **Step 2: Build, then run it**

Lane D's Playwright config serves `dist/` with `vite preview` on port 4173, and away from CI it reuses a server already running there. Without a fresh build, the check either tests a stale `dist/` from before the last pull or, in a fresh checkout, fails to start. So stop any old preview first, then build:

```bash
lsof -ti tcp:4173 | xargs -r kill
VITE_TURNSTILE_SITE_KEY= npm run build && npx playwright test tests/e2e/integration.spec.ts
```

The empty `VITE_TURNSTILE_SITE_KEY=` builds without the spam check, like lane D's CI build, so S7's token is empty at once (lane A, Task 15). A key in your `.env` would otherwise load the real widget.

Expected: the first line prints nothing, and the build exits 0. Then 6 passed (3 cases × 2 projects, phone and desktop). A failure belongs to the lane whose file is at fault: lane A for the flow and the visit ID, lane C for the plan fields, lane B for the fixture.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/integration.spec.ts
git commit -m "test(funnel): add the cross-lane end-to-end checks"
git push
```

### Task I-T3: The claims review (Appendix A)

**Files:**
- Create: `.team/ziiro-fleet/funnel/claims-review.md`

- [ ] **Step 1: Run the claims check, on the source and on the build**

```bash
npx vitest run tests/claims
npm run build && npm run check:build
```

Expected: both pass (§12, request 6).
- The claims tests cover the funnel's copy lines, every reachable plan page, every plan email and `public/llms.txt`.
- `check:build` (`tests/build/claims-dist.check.ts`) covers the prerendered `/` and its llms-full section. It writes matches on other pages, such as /pricing, to `test-results/claims-report.md` as notes, without failing.

- [ ] **Step 2: Read every funnel line against the "Never" column**

On the Preview, in both themes: S0 to S8, the S1b path, and the plan for A-default, A-payments, A-numbers, A-team, B-convert, B-volume and an unclassified answer. Also the plan email for B-convert and for an unclassified answer. For each one, check the "Never" column of Appendix A, check that the Pilot tag is on both B plans, and check that only `cta.btn` sits at the close.

- [ ] **Step 3: Record it**

In `claims-review.md`, one line per screen or plan: `ok`, or the line ID and the problem. A problem in copy goes to lane C, in the email to lane B, on a screen to lane A. The review passes when every line says `ok`.

### Task I-T4: Real devices

**Files:** append to `.team/ziiro-fleet/funnel/integration.md`

- [ ] **Step 1: iPhone, Safari.** The full flow in light (daytime) and in dark (the device set to dark). Then one VoiceOver pass: focus moves to each question, `g.progress` is read out, the S8 lines are announced, and the consent box reads as a checkbox (§11).
- [ ] **Step 2: Mid-range Android phone on 4G, Chrome.** The full flow in both themes. The hero band loads `phone-1170` and nothing under the other theme's folder (§12). Taps answer at once, and no network wait shows between steps.
- [ ] **Step 3: Record it.** Device, browser, theme, `pass`, or the step and what went wrong. A failure goes back to the lane that owns the screen.

### Task I-T5: Merge into dev

- [ ] **Step 1: Check the branch is green.** The GitHub Actions run (lane D's CI: lint, type check, unit, API and claims tests, build, Playwright) passes on the PR's last commit.
- [ ] **Step 2: Mark the PR ready.** Run `gh pr ready --repo ziiroAi/ziiro-website feat/business-spine-funnel`.
- [ ] **Step 3: Div merges it into `dev`** with "Create a merge commit", so each lane's commits stay readable.
- [ ] **Step 4: Check the `dev` Preview.** Re-run I-T1 steps 1 and 2 on it, and expect the same rows.

---

## 5. Launch checklist (day 7)

### Task L-T1: Gates before the deploy

- [ ] **Step 1: The blockers (§13.8).** B1, B2, B3, B5, B6 (the Privacy text approved by Div) and B7 are closed in `phase0.md`. B4 may stay open (D7).
- [ ] **Step 2: Production env.** `PLAN_FROM`, `PLAN_REPLY_TO`, `TEAM_INBOX`, the real Turnstile keys and the Neon variables are set on Production. Div checks this in the Vercel dashboard, because the builders' CLI account can't see the project.
- [ ] **Step 3: Speed.** Lighthouse mobile on the `dev` Preview's `/`: performance 90 or more, LCP 2.0 s or less, CLS 0.02 or less (§13.10). Lane D runs it.
- [ ] **Step 4: Reviews.** I-T3 and I-T4 have passed, and D27 is taken care of if launch has slipped past Tue 20 Oct.

### Task L-T2: Deploy

- [ ] **Step 1: Merge main into dev again** (squash merges leave dev behind)

```bash
git fetch ziiroai
git switch --detach ziiroai/dev
git merge --no-ff ziiroai/main -m "Merge main into dev"
npm ci && npm run build
git push ziiroai HEAD:dev
```

Expected:
- The merge is clean, or prints "Already up to date."
- The build ends with `node scripts/llms-full.mjs` exiting 0.
- The push is a fast-forward of `dev`, or "Everything up-to-date" when there was nothing to merge. Never `--force`.

This isn't a rerun of P0-T2. It skips P0-T2's empty-diff check, because `dev` now carries the funnel, so it differs from `main`. It cuts no branch either: `feat/business-spine-funnel` already exists. If the merge reports a conflict, run `git merge --abort` and stop: tell the manager, and don't resolve it yourself.
- [ ] **Step 2: Open the release PR:** `gh pr create --repo ziiroAi/ziiro-website --base main --head dev --title "Business Spine funnel, first release" --body "Integration record: .team/ziiro-fleet/funnel/integration.md"`. Div merges it.
- [ ] **Step 3: Check production.**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://ziiroai.com/
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://ziiroai.com/api/funnel/visit -H "content-type: application/json" -d '{}'
```

Expected: `200`, then `400`. The built `/visit` refuses an empty body; a `501` would mean the skeleton is still live.

### Task L-T3: The live test lead (the launch gate, §12)

- [ ] **Step 1:** Div runs the whole flow on ziiroai.com from his own phone, using his own email.
- [ ] **Step 2: The emails.** Within a minute the team alert reaches `TEAM_INBOX` (and `PLAN_REPLY_TO`, if that's different), and the plan email reaches his inbox, not spam. It comes from "Adyut at ziiro", with exactly one link, to Calendly, with his name and email filled in.
- [ ] **Step 3: The rows on Neon `main`.** Saved query 1 (new leads) shows his lead with `plan_email = sent`, and no flag.
- [ ] **Step 4: Clean up.** Note his visit's ID with `select visit_id from contacts where lower(email) = lower('<his email>');`, then run saved query 8 with his email. That deletes the contact, and the plan-email row goes with it. Then run `update visits set bot_flag = true, updated_at = now() where id = '<that visit id>';`, so the test stays out of every count.
- [ ] **Step 5:** Write `launched | <date and time> | live test lead ok` into `phase0.md`, and tell the manager.

### Task L-T4: The first week (§13.11, risk 1)

- [ ] **Step 1:** Every working day, Adyut runs saved query 1 (new leads) and saved query 3 (plan emails to send by hand). A failed or held plan email is sent by hand the same day, then marked with saved query 6.
- [ ] **Step 2:** Watch Resend's daily count. Move to Resend Pro before leads pass about 40 a day (§13.3).
- [ ] **Step 3:** On day 30 after launch, run saved query 4. If more than 40 % of visitors leave at S7, S7 moves after the plan (D23).
