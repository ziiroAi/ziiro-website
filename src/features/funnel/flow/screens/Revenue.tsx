/** (C) S5 (spec §4.3, D10): a year's revenue as a band, in rupees for India and dollars elsewhere. */
import { copy, currencyFor } from "@/features/funnel/data/light";
import { revenueOptions } from "../options";
import { OptionButton, Question, TopRow } from "../ui";
import type { ScreenProps } from "./types";

export function Revenue({ state, act, env }: ScreenProps) {
  const currency = currencyFor(env.country, env.timeZone);
  return (
    <section className="f-screen" data-dir={state.dir}>
      <TopRow screen="s5" />
      <Question>{copy("s5.q")}</Question>
      <p className="f-hint">{copy("s5.why")}</p>
      <div className="f-options">
        {revenueOptions(currency).map((option) => (
          <OptionButton
            key={option.id}
            label={option.label}
            selected={state.answers.revenueBand === option.id}
            onPick={() => act({ type: "revenue", value: option.id, currency })}
          />
        ))}
      </div>
    </section>
  );
}
