/** (C) S2 (spec §4.3): the kind of business. Twelve types; Other opens a box of 80 characters (§10). */
import type { FormEvent } from "react";
import { LIMITS, copy } from "@/features/funnel/data/light";
import { businessOptions } from "../options";
import { OptionButton, Question, TopRow } from "../ui";
import type { ScreenProps } from "./types";

const BOX = "f-s2-other";

export function BusinessType({ state, act, edit }: ScreenProps) {
  const chosen = state.answers.businessType;
  const otherOpen = chosen === "other";
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    act({ type: "businessOtherDone" });
  };
  return (
    <section className="f-screen" data-dir={state.dir}>
      <TopRow screen="s2" />
      <Question>{copy("s2.q")}</Question>
      <p className="f-hint">{copy("s2.hint")}</p>
      <div className="f-tiles">
        {businessOptions().map((option) => (
          <OptionButton
            key={option.id}
            kind="tile"
            label={option.label}
            selected={chosen === option.id}
            expanded={option.id === "other" ? otherOpen : undefined}
            controls={option.id === "other" && otherOpen ? BOX : undefined}
            onPick={() => act({ type: "business", value: option.id })}
          />
        ))}
      </div>
      {otherOpen && (
        <form id={BOX} className="f-other" onSubmit={onSubmit}>
          <label className="sr-only" htmlFor={`${BOX}-text`}>{copy("s2.other")}</label>
          <input
            id={`${BOX}-text`}
            className="f-field"
            type="text"
            autoFocus
            maxLength={LIMITS.businessOtherChars}
            placeholder={copy("s2.other")}
            value={state.answers.businessOther}
            onChange={(event) => edit({ type: "businessOther", text: event.target.value })}
          />
          {/* §4.3 gives the box no button of its own, so it borrows s6.btn's words */}
          <button type="submit" className="f-act">{copy("s6.btn")}</button>
        </form>
      )}
    </section>
  );
}
