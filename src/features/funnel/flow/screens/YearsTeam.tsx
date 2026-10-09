/** (C) S3 + S4 (spec §4.3): years and team on one screen. The first tap fills its row and brings the team row forward. */
import { copy } from "@/features/funnel/data/light";
import { teamOptions, yearsOptions } from "../options";
import { OptionButton, Question, TopRow } from "../ui";
import type { ScreenProps } from "./types";

export function YearsTeam({ state, act }: ScreenProps) {
  const { yearsBand, teamBand } = state.answers;
  return (
    <section className="f-screen" data-dir={state.dir}>
      <TopRow screen="s34" />
      <Question id="f-s3-q">{copy("s3.q")}</Question>
      <p className="f-hint">{copy("s3.why")}</p>
      <div className="f-options f-short" role="group" aria-labelledby="f-s3-q">
        {yearsOptions().map((option) => (
          <OptionButton
            key={option.id}
            label={option.label}
            pressed={yearsBand === option.id}
            onPick={() => act({ type: "years", value: option.id })}
          />
        ))}
      </div>
      <div className={`f-row2${state.teamRowForward ? " is-forward" : ""}`}>
        <Question id="f-s4-q" focusFirst={state.teamRowForward}>{copy("s4.q")}</Question>
        <p className="f-hint">{copy("s4.why")}</p>
        <div className="f-options f-short" role="group" aria-labelledby="f-s4-q">
          {teamOptions().map((option) => (
            <OptionButton
              key={option.id}
              label={option.label}
              selected={teamBand === option.id}
              onPick={() => act({ type: "team", value: option.id })}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
