/** (C) The background saves (spec §9, §13.2): one /visit post per step, never waited on, failures dropped (§10). */
import {
  LIMITS, NOTICE_VERSION, type DeviceClass, type StepId, type Utm, type VisitFields, type VisitRequest, type VisitResponse,
} from "@/features/funnel/data/light";
import type { Boot } from "./boot";
import { STEP_OF, type FlowState } from "./state";
import { inputModeOf, problemTextFrom } from "./words";

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
