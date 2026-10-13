/**
 * (C) The background saves (spec §9, §10): one /visit post whenever the step or an answer changes, never waited on.
 * Each carries the landing context and every answer so far, so a dropped save loses nothing (index §1.2).
 */
import { useEffect, useRef, useState } from "react";
import { NOTICE_VERSION, type VisitFields } from "@/features/funnel/data/light";
import type { Boot } from "./boot";
import { localTimeZone } from "./region";
import type { FlowState } from "./state";
import { S1_SHOWN_MS, answerFields, landingFields, postVisit, stepOf } from "./visit";
import { markStep } from "./visit-id";

interface SaveEnv {
  boot: Boot;
  starter: string;
  introOffsetMs: number;  // minus the time since first paint (Task 2)
  resumed: boolean;       // the plan came back from resume.ts: its visit already holds this step and these answers
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
  // A resumed plan's visit already holds its landing context and answers. This page view's would overwrite them
  // (review C-1b: another width, theme or hour; N-2: inputMode from the kept words), so on that visit it saves only
  // what the plan adds: depth, the film, the CTAs. A new round is a new visit, and saves everything again.
  const resumedRound = useRef(env.resumed ? state.round : null);
  const quiet = state.round === resumedRound.current;
  const fields = quiet ? { ...state.progress } : answerFields(state, env.starter);
  const key = JSON.stringify([state.round, step, fields]);
  // ...and the resumed plan itself was saved before it was kept, so its first key counts as saved (review C-1).
  const saved = useRef(env.resumed ? key : null);

  useEffect(() => {
    if (key === saved.current) return;
    const visit = markStep(step);
    const save = () => {
      const context = quiet ? { noticeVersion: NOTICE_VERSION } : (landing.current ??= landingFields(window, env.boot, localTimeZone()));
      void postVisit({ id: visit.id, step, fields: { ...context, ...fields } }).then((answer) => {
        if (answer?.success && answer.country) setCountry(answer.country);
      });
    };
    // The first save runs among the first commit's effects. Its time-zone lookup loads ICU's zone data (~30 ms on a
    // phone profile), so it gets a task of its own (W15-E). Saves queued behind it keep their order: timers are FIFO.
    if (landing.current || quiet) save();
    else setTimeout(save, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the key holds the round, the step and the fields
  }, [key]);

  return { country };
}
