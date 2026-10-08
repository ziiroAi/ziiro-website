/**
 * (C) S6 (spec §4.3, §4.4): the one question that matters. The text box and the chips in the first release;
 * voice comes in phase 2 (decision 20).
 */
import { useEffect } from "react";
import { LIMITS, copy } from "@/features/funnel/data/light";
import { TURNSTILE_SITE_KEY, loadTurnstile } from "@/shared/lib/turnstile";
import { chipOptions } from "../options";
import { OptionButton, Question, TopRow } from "../ui";
import { BLANK, problemTextFrom } from "../words";
import type { ScreenProps } from "./types";

export function Problem({ state, act, edit, env }: ScreenProps) {
  const { problemText, chips } = state.answers;

  useEffect(() => {
    // §4.4: the spam check's script loads when S6 opens, so S7's widget is ready when they send.
    loadTurnstile(TURNSTILE_SITE_KEY).catch(() => undefined);  // no script: the send goes without a token (§10)
  }, []);

  /** copy.md: "cursor on the first blank". Only on the untouched starter, so an edit keeps their own cursor. */
  const toFirstBlank = (box: HTMLTextAreaElement) => {
    if (box.value !== env.starter) return;
    requestAnimationFrame(() => {
      const at = box.value.indexOf(BLANK);
      if (at >= 0) box.setSelectionRange(at, at + BLANK.length);
    });
  };

  return (
    <section className={`f-screen${state.dir === "forward" ? " f-s6-intro" : ""}`} data-dir={state.dir}>
      <div className="f-bridge-hold" aria-hidden="true">{copy("s6.bridge")}</div>
      <TopRow screen="s6" />
      <p className="f-bridge">{copy("s6.bridge")}</p>
      <Question id="f-s6-q">{copy("s6.q")}</Question>
      <p id="f-s6-hint" className="f-hint">{copy("s6.hint")}</p>
      <textarea
        className="f-field f-box"
        aria-labelledby="f-s6-q"
        aria-describedby="f-s6-hint"
        maxLength={LIMITS.problemTextChars}
        value={problemText}
        onFocus={(event) => toFirstBlank(event.currentTarget)}
        onChange={(event) => edit({ type: "problemText", text: event.target.value })}
      />
      <p className="f-small">{copy("s6.chips.lead")}</p>
      <div className="f-chips">
        {chipOptions().map((option) => (
          <OptionButton
            key={option.id}
            kind="chip"
            label={option.label}
            pressed={chips.includes(option.id)}
            onPick={() => act({ type: "chip", value: option.id })}
          />
        ))}
      </div>
      <p className="f-err" role="status">{state.chipsFull ? copy("s6.chips.max") : ""}</p>
      <p className="f-err" role="alert">{state.problemEmpty ? copy("s6.empty") : ""}</p>
      <button
        type="button"
        className="f-act"
        onClick={() => act({ type: "problemDone", hasWords: problemTextFrom(problemText, env.starter) !== "" })}
      >
        {copy("s6.btn")}
      </button>
    </section>
  );
}
