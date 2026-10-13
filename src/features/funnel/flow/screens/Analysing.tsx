/** (C) S8 (spec §4.3, §11.7): three short lines while the lead is saved. No fake percentage, and no limit on the visitor. */
import { useEffect, useState } from "react";
import { copy } from "@/features/funnel/data/light";
import { teamOptions } from "../options";
import { S8_LINE_AT_MS, s8LineAt, s8Lines } from "../send";
import { problemTextFrom } from "../words";
import type { ScreenProps } from "./types";

export function Analysing({ state, env }: ScreenProps) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const timers = S8_LINE_AT_MS.slice(1).map((at) => setTimeout(() => setShown(s8LineAt(at)), at));
    return () => timers.forEach(clearTimeout);
  }, []);

  const { answers } = state;
  const teamLabel = teamOptions().find((option) => option.id === answers.teamBand)?.label ?? "";
  const lines = s8Lines({ problemText: problemTextFrom(answers.problemText, env.starter), chips: answers.chips, teamBand: answers.teamBand, teamLabel });
  const line = lines[Math.min(shown, lines.length - 1)];

  return (
    <section className="f-screen f-s8" tabIndex={-1} data-question="" aria-live="polite">
      <p>
        <span key={shown}>{copy(line.id, line.vars)}</span>
      </p>
    </section>
  );
}
