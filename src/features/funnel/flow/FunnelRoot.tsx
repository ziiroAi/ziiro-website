/**
 * (C) The funnel at "/" (spec §4; index §1.3): lane D's Index renders <FunnelRoot />.
 * One reducer holds the questions. The screens dispatch, and history, the send and the saves hang off it.
 */
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { SEGMENTS, copy, isOneOf } from "@/features/funnel/data/light";
import { introOffsetMs, introStartMs } from "./boot";
import { useBoot, useEarlyTap, useFocusOnStep, useFunnelAttributes, useIsoLayoutEffect } from "./hooks";
import { useFlowHistory } from "./history";
import { prefetchPlan } from "./plan-chunk";
import { SCREEN_UI } from "./screens";
import { startClockTheme, useChosenTheme } from "./theme";
import { keepPlan, resumedPlan } from "./resume";
import { PlanPrefetch } from "./screens/Plan";
import type { FlowEnv, ScreenProps } from "./screens/types";
import { setCtaReporter, setStage } from "./session";
import { PROGRESS, PROGRESS_TOTAL, createTapGate, funnelStageOf, initialFlow, reduce, type FlowAction, type Screen } from "./state";
import { FlowNote } from "./ui";
import { useLeadSend } from "./useLeadSend";
import { usePlanWarm } from "./usePlanWarm";
import { useGuestPlan } from "./useGuestPlan";
import { useVisitSaves } from "./useVisitSaves";
import { rotateVisit, startVisit } from "./visit-id";

/** g.footer sits under the questions (§4.5): S1 to S7. */
const NOTE_ON: ReadonlySet<Screen> = new Set<Screen>(["s1", "s1b", "s2", "s34", "s5", "s6", "s7"]);

export function FunnelRoot(): JSX.Element {
  const boot = useBoot();
  const [starter] = useState(() => copy("s6.text"));
  // Back to "/" from another page after the send: the same plan on the same visit (review M3).
  const [resumed] = useState(() => (typeof window === "undefined" ? null : resumedPlan(window)));
  const [state, dispatch] = useReducer(reduce, starter, (text: string) => resumed ?? initialFlow(text));
  const roundAtMount = useRef(state.round);
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
  useFunnelAttributes(useChosenTheme(boot.theme), funnelStageOf(state));
  useEffect(() => startClockTheme(), []);  // W18-B: 06:00 and 18:00 cross-fade too, until the visitor chooses
  useEarlyTap(boot, (id) => {
    if (isOneOf(SEGMENTS, id)) dispatch({ type: "segment", value: id });
  });
  useFocusOnStep(state.nav.seq, state.screen, rootRef);
  const onPop = useCallback((screen: Screen) => dispatch({ type: "popTo", screen }), []);
  useFlowHistory(state.nav, state.screen, onPop);
  const send = useLeadSend(state, dispatch, starter);
  const showGuestPlan = useGuestPlan(dispatch);
  usePlanWarm(state.screen);  // the plan's mesh downloads during the questions (W15-M6)
  const [warm, setWarm] = useState(false);
  useEffect(() => {
    if (!resumed) startVisit();  // a reload after a send starts a new visit (§4.1)
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
    if (state.round !== roundAtMount.current) rotateVisit();  // leaving the plan: sending again is a new visit (§4.1)
  }, [state.round]);
  useEffect(() => {
    keepPlan(state);
  }, [state]);
  useEffect(() => {
    if (state.screen !== "s5" && state.screen !== "s1b") return;
    prefetchPlan();  // the plan's code loads during S5 to S8 (§13.1), and on S1b for the sample plan (W17-B)
    setWarm(true);   // and the hero still S9 shows (§6.6)
  }, [state.screen]);
  const { country } = useVisitSaves(state, { boot, starter, introOffsetMs: introOffset });

  const env: FlowEnv = {
    boot,
    introOffsetMs: state.nav.seq === 0 && state.screen === "s1" ? introOffset : null,
    country,
    starter,
    send,
    showGuestPlan,
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
      {warm && state.screen !== "plan" && <PlanPrefetch />}
    </div>
  );
}
