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

/**
 * contacts.flag: a second try saved although the spam check failed or was down (§10, review M1). rate_limited
 * stays for rows saved before review M2, which now runs the spam check on a limited second try.
 */
export const LEAD_FLAGS = ["turnstile_unverified", "turnstile_failed", "turnstile_unavailable", "rate_limited"] as const;
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
  /** W17-B: the sample plan for a visitor from S1b, who runs no business and gave no name: sp.guest.note at the top. */
  guest?: boolean;
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
