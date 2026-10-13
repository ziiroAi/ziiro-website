/**
 * (C) S0 + S1 (spec §4.2, §4.3): the greeting, its second line and the promise, then "What do you do?".
 * The prerender puts this in the HTML, so the greeting is the LCP and S1 reads as text without JavaScript.
 */
import type { CSSProperties } from "react";
import { copy } from "@/features/funnel/data/light";
import { INTERIM_BOOKING_URL } from "@/features/pricing/entities/rates";
import { greetingSnippet, type SubId } from "../boot";
import { segmentOptions } from "../options";
import { OptionButton, Question, TopRow } from "../ui";
import type { ScreenProps } from "./types";

const SUBS: readonly SubId[] = ["s0.sub.early", "s0.sub.day", "s0.sub.late"];

/** The line around a link's words, so the words stay in the copy line: [before, after]. */
function around(line: string, words: string): [string, string] {
  const at = line.indexOf(words);
  if (at < 0) throw new Error(`"${words}" is not in "${line}"`);
  return [line.slice(0, at), line.slice(at + words.length)];
}

export function Landing({ state, act, env }: ScreenProps) {
  const { boot, introOffsetMs } = env;
  const intro = introOffsetMs !== null;
  const subs = Object.fromEntries(SUBS.map((id) => [id, copy(id)])) as Record<SubId, string>;
  const book = copy("nav.btn");
  const [beforeBook, afterBook] = around(copy("g.noscript"), book);
  return (
    <section
      className={`f-screen f-landing${intro ? " f-intro-on" : ""}`}
      data-dir={intro ? undefined : state.dir}
      style={intro ? ({ "--f-t": `${introOffsetMs}ms` } as CSSProperties) : undefined}
    >
      {intro && (
        <div className="f-intro" aria-hidden="true">
          <p className="f-intro-greet" data-greet="" lang={boot.lang} suppressHydrationWarning>{boot.greeting}</p>
          <p className="f-intro-sub" data-sub="" suppressHydrationWarning>{subs[boot.sub]}</p>
          <p className="f-intro-promise">{copy("s0.promise")}</p>
        </div>
      )}
      <header className="f-head">
        <h1 data-greet="" lang={boot.lang} suppressHydrationWarning>{boot.greeting}</h1>
        <p data-sub="" suppressHydrationWarning>{subs[boot.sub]}</p>
        <p className="sr-only">{copy("s0.promise")}</p>
      </header>
      {intro && <script dangerouslySetInnerHTML={{ __html: greetingSnippet(subs) }} />}
      <div className="f-s1">
        <TopRow screen="s1" back={false} />
        <Question>{copy("s1.q")}</Question>
        <div className="f-options">
          {segmentOptions().map((option) => (
            <OptionButton
              key={option.id}
              label={option.label}
              early={option.id}
              selected={state.answers.segment === option.id}
              onPick={() => act({ type: "segment", value: option.id })}
            />
          ))}
        </div>
        <p className="f-about">{copy("g.about")}</p>
      </div>
      <noscript>
        <p className="f-small">
          {beforeBook}<a className="f-link" href={INTERIM_BOOKING_URL}>{book}</a>{afterBook}
        </p>
      </noscript>
    </section>
  );
}
