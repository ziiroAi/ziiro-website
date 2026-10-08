/** (C) S1b (spec §4.3, D15): for visitors who don't run a business. One tap is saved, then the site opens up. */
import { Link } from "react-router-dom";
import { copy } from "@/features/funnel/data/light";
import { nonOwnerOptions } from "../options";
import { OptionButton, Question, TopRow } from "../ui";
import type { ScreenProps } from "./types";

export function NonOwner({ state, act }: ScreenProps) {
  if (state.nonOwnerDone) {
    return (
      <section className="f-screen" data-dir={state.dir}>
        <TopRow screen="s1b" />
        <Question>{copy("s1b.done")}</Question>
        <Link className="f-act" to="/products">{copy("s1b.btn")}</Link>
      </section>
    );
  }
  return (
    <section className="f-screen" data-dir={state.dir}>
      <TopRow screen="s1b" />
      <Question>{copy("s1b.q")}</Question>
      <div className="f-options">
        {nonOwnerOptions().map((option) => (
          <OptionButton
            key={option.id}
            label={option.label}
            selected={state.answers.nonOwnerReason === option.id}
            onPick={() => act({ type: "nonOwner", value: option.id })}
          />
        ))}
      </div>
    </section>
  );
}
