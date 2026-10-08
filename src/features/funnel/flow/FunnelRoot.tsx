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
