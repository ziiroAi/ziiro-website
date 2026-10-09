// Block 1 (§6.2): the full spine and its numbers. The spine is the plan's one stage (W15-B, PlanStage): from 1024 px
// it fills the screen behind the hero, with the words over its left 55 % and the spine on the right. Under that (D34)
// the words come first, then the stage as a sticky band, then the stats and the scroll line.
import { useState, type ReactNode, type Ref } from "react";
import { copy } from "../data";
import type { CtaFrom, PlanProgress } from "../data/contract";
import { BookCallLink } from "./BookCallLink";
import { FilmLightbox } from "./FilmLightbox";
import { heroTitle, type Lines } from "./planView";
import { Swap } from "./Swap";

/** §6.5: hx.btn2 shows only once lane D's re-rendered film is in BrandFilm (lane D, day 1). Set false if it slips. */
export const FILM_READY = true;

const STATS = [
  { number: "hx.stat1.n", label: "hx.stat1.l", phoneLabel: "hx.stat1.l" },
  { number: "hx.stat2.n", label: "hx.stat2.l", phoneLabel: "ph.hx.stat2.l" },
  { number: "hx.stat3.n", label: "hx.stat3.l", phoneLabel: "hx.stat3.l" },
] as const;

const MICRO = "font-mono text-xs uppercase tracking-[0.18em] text-[color:var(--funnel-muted)]";
const BUTTON = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium";
/** From 1024 px the hero lies over the stage: it fills the screen under the bar and lets the pointer through to the
 *  spine, except on the words themselves. */
const OVER_STAGE = "relative lg:z-10 lg:pointer-events-none";

export interface HeroProps {
  heroText: Lines;
  name: string;
  email: string;
  headingRef: Ref<HTMLHeadingElement>;
  onBook(from: CtaFrom): void;
  onProgress(fields: PlanProgress): void;
  /** The plan's stage (W15-B), placed between the words and the stats: the phone's sticky band. */
  stage?: ReactNode;
}

export function Hero({ heroText, name, email, headingRef, onBook, onProgress, stage }: HeroProps): JSX.Element {
  const [filmOpen, setFilmOpen] = useState(false);
  const [firstLine, secondLine] = heroTitle();
  return (
    <>
      <section
        aria-labelledby="plan-hero-title"
        className={`${OVER_STAGE} pb-10 lg:flex lg:min-h-[calc(100vh-var(--nav-h,84px))] lg:items-center lg:pb-0`}
      >
        <div className="px-4 pt-24 sm:px-6 lg:pointer-events-auto lg:w-[55%] lg:px-10 lg:pt-0">
          <p className={MICRO}>{copy("hx.eyebrow")}</p>
          <h1
            id="plan-hero-title"
            ref={headingRef}
            tabIndex={-1}
            className="mt-4 text-5xl font-medium leading-[1.02] tracking-tight outline-none lg:text-7xl"
          >
            <Swap lines={firstLine} className="block" />{" "}
            <Swap lines={secondLine} className="block text-[color:var(--funnel-muted)]" />
          </h1>
          <Swap as="p" lines={heroText} className="mt-6 max-w-xl text-base text-[color:var(--funnel-muted)] lg:text-lg" />
          <div className="mt-8 flex flex-wrap gap-3">
            <BookCallLink
              name={name}
              email={email}
              from="hero"
              onBook={onBook}
              className={`${BUTTON} bg-[color:var(--funnel-accent)] text-[color:var(--funnel-on-accent)]`}
            >
              {copy("hx.btn1")}
              <span aria-hidden="true">↗</span>
            </BookCallLink>
            {FILM_READY && (
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => setFilmOpen(true)}
                className={`${BUTTON} border border-[color:var(--funnel-line)]`}
              >
                {copy("hx.btn2")}
              </button>
            )}
          </div>
        </div>
      </section>
      {stage}
      <div className={OVER_STAGE}>
        <ul className="grid grid-cols-3 gap-4 px-4 pt-8 sm:px-6 lg:pointer-events-auto lg:w-[55%] lg:px-10">
          {STATS.map((s) => (
            <li key={s.number}>
              <span className="block text-3xl font-medium lg:text-4xl">{copy(s.number)}</span>{" "}
              <Swap lines={{ desktop: copy(s.label), phone: copy(s.phoneLabel) }} className="block text-sm text-[color:var(--funnel-muted)]" />
            </li>
          ))}
        </ul>
        <Swap as="p" lines={{ desktop: copy("hx.scroll"), phone: copy("ph.hx.scroll") }} className={`px-4 pb-10 pt-6 sm:px-6 lg:px-10 ${MICRO}`} />
      </div>
      <FilmLightbox open={filmOpen} onClose={() => setFilmOpen(false)} onProgress={onProgress} />
    </>
  );
}
