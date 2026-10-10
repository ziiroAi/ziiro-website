/**
 * (C) The background saves (spec §9, §10): one /visit post whenever the step or an answer changes, never waited on.
 * Each carries the landing context and every answer so far, so a dropped save loses nothing (index §1.2).
 */
import { useEffect, useRef, useState } from "react";
import type { VisitFields } from "@/features/funnel/data/light";
import type { Boot } from "./boot";
import { localTimeZone } from "./region";
import type { FlowState } from "./state";
import { S1_SHOWN_MS, answerFields, landingFields, postVisit, stepOf } from "./visit";
import { markStep } from "./visit-id";

interface SaveEnv {
  boot: Boot;
  starter: string;
  introOffsetMs: number;  // minus the time since first paint (Task 2)
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
  const fields = answerFields(state, env.starter);
  const key = JSON.stringify([state.round, step, fields]);

  useEffect(() => {
    const visit = markStep(step);
    const save = () => {
      landing.current ??= landingFields(window, env.boot, localTimeZone());
      void postVisit({ id: visit.id, step, fields: { ...landing.current, ...fields } }).then((answer) => {
        if (answer?.success && answer.country) setCountry(answer.country);
      });
    };
    // The first save runs among the first commit's effects. Its time-zone lookup loads ICU's zone data (~30 ms on a
    // phone profile), so it gets a task of its own (W15-E). Saves queued behind it keep their order: timers are FIFO.
    if (landing.current) save();
    else setTimeout(save, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the key holds the round, the step and the fields
  }, [key]);

  return { country };
}
