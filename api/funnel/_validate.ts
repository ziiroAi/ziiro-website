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
