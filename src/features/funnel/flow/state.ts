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

/**
 * The first screen before `target` whose answers are missing, else `target` (review H1). A reload keeps the
 * history entries but not the answers, so Back could otherwise reach S6 or S7 with S3 to S5 unanswered.
 */
function firstGap(answers: Answers, target: Screen): Screen {
  const needs: readonly [Screen, boolean][] = [
    ["s1", answers.segment !== null],
    ["s2", answers.businessType !== null],
    ["s34", answers.yearsBand !== null && answers.teamBand !== null],
    ["s5", answers.revenueBand !== null && answers.revenueCurrency !== null],
  ];
  const gap = needs.find(([screen, done]) => !done && SCREENS.indexOf(screen) < SCREENS.indexOf(target));
  return gap ? gap[0] : target;
}

function popTo(state: FlowState, target: Screen): FlowState {
  const leavingPlan = state.screen === "plan" && target !== "plan";
  const base: FlowState = leavingPlan
    ? { ...state, round: state.round + 1, attempt: 0, contactErrors: [], plan: null, saveNotice: null, secondsToResult: null, progress: {} }
    : state;
  const entry: Screen = target === "s8" ? "s7" : target === "plan" && !base.plan ? "s6" : target;
  const wanted = firstGap(base.answers, entry);
  return {
    ...base,
    screen: wanted,
    dir: SCREENS.indexOf(wanted) < SCREENS.indexOf(state.screen) ? "back" : "forward",
    // The browser already moved; a clamped entry is retagged with the screen it now shows.
    nav: { mode: wanted === entry ? "none" : "replace", seq: base.nav.seq + 1 },
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
