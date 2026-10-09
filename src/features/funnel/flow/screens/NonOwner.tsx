/**
 * (C) S1b (spec §4.3): for visitors who don't run a business. One tap is saved, then the plan page opens with the
 * sample plan (W17-B: the owner vetoed D15's /products). Its answer stays on screen while the plan's code loads,
 * and after Back, with a button to the plan.
 */
import { copy } from "@/features/funnel/data/light";
import { nonOwnerOptions } from "../options";
import { OptionButton, Question, TopRow } from "../ui";
import type { ScreenProps } from "./types";

export function NonOwner({ state, act, env }: ScreenProps) {
  if (state.nonOwnerDone) {
    return (
      <section className="f-screen" data-dir={state.dir}>
        <TopRow screen="s1b" />
        <Question>{copy("s1b.done")}</Question>
        <button type="button" className="f-act" onClick={env.showGuestPlan}>{copy("s1b.btn.plan")}</button>
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
            onPick={() => {
              act({ type: "nonOwner", value: option.id });
              env.showGuestPlan();
            }}
          />
        ))}
      </div>
    </section>
  );
}
