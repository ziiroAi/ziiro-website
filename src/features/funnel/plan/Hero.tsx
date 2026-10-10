// Block 1 (§6.2): the full spine and its numbers. The spine is the plan's one stage (W15-B, PlanStage): from 1024 px
// it fills the screen behind the hero, with the words over its left 55 % and the spine on the right. W16-H lays the
// words out as the owner's reference (w16/owner/owner-11-hero-reference.png): a wide-tracked eyebrow, a big tight
// headline, a narrow paragraph, the CTA row, the stats directly under it, and a scroll cue at the bottom right. Under
// 1024 px (D34) the words and stats come first, then the stage as a sticky band.
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

/** The reference's eyebrow and cue: small caps, set very wide. */
const WIDE = "text-xs uppercase tracking-[0.32em] text-[color:var(--funnel-muted)] lg:text-[13px]";
/** The reference's buttons: tall pills, about 60 px at 1440, the label and its glyph spaced apart. */
const BUTTON = "inline-flex min-h-12 items-center justify-center gap-4 rounded-full px-6 text-sm font-medium lg:min-h-[3.75rem] lg:px-8 lg:text-base";
/** From 1024 px the hero lies over the stage: it fills the screen under the bar and lets the pointer through to the
 *  spine, except on the words themselves. */
const OVER_STAGE = "relative lg:z-10 lg:pointer-events-none";
/** W15-B3: PlanStage fades the hero's words and stats out as the spine sets off left (--hero-words, 0 to 1) and hides
 *  them once gone, so the spine never crosses them. */
const MAKES_WAY = "lg:opacity-[var(--hero-words,1)] lg:group-data-[hero-hidden]/stage:invisible";
/** W20-MID: the section starts under the fixed nav, so centring the words in it put them under the bar on a short
 *  screen (1024 x 768, 1280 x 720). Three rows: the words in the middle, the space above at least the nav's height
 *  and a gap, the space below what's left. Where the words fit centred (1440 x 900: 103 px above) nothing moves. */
const CLEAR_OF_NAV = "lg:grid-rows-[minmax(calc(var(--nav-h,84px)+16px),1fr)_auto_minmax(0,1fr)]";

export interface HeroProps {
  heroText: Lines;
  name: string;
  email: string;
  headingRef: Ref<HTMLHeadingElement>;
  onBook(from: CtaFrom): void;
  onProgress(fields: PlanProgress): void;
  /** The plan's stage (W15-B), placed between the words and the stats: the phone's sticky band. */
  stage?: ReactNode;
  /** W17-B: the sample plan for a visitor from S1b: sp.guest.note above the eyebrow, and the cue says explore. */
  guest?: boolean;
}

/** The reference's scroll cue: a mouse outline with its wheel dot, and the line in two short rows beside it. On a
 *  phone, just the line under the stats. From 1024 px it sits at the screen's bottom (the section ends a nav height
 *  short), under the lowest callout and right of the legend. */
function ScrollCue({ guest }: { guest: boolean }): JSX.Element {
  return (
    <div
      data-scroll-cue
      className="mt-8 flex items-center gap-4 px-4 opacity-[var(--scroll-cue,1)] group-data-[cue-gone]/stage:invisible sm:px-6 lg:absolute lg:bottom-[calc(1.5rem-var(--nav-h,84px))] lg:right-10 lg:mt-0 lg:px-0"
    >
      <span aria-hidden="true" className="relative hidden h-12 w-7 rounded-full border border-[color:var(--funnel-muted)] lg:block">
        <span className="absolute left-1/2 top-2.5 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[color:var(--funnel-fg)]" />
      </span>
      <Swap as="p" lines={{ desktop: copy(guest ? "hx.scroll.guest" : "hx.scroll"), phone: copy("ph.hx.scroll") }} className={`${WIDE} lg:max-w-[9rem] lg:leading-relaxed`} />
    </div>
  );
}

export function Hero({ heroText, name, email, headingRef, onBook, onProgress, stage, guest = false }: HeroProps): JSX.Element {
  const [filmOpen, setFilmOpen] = useState(false);
  const [firstLine, secondLine] = heroTitle();
  return (
    <>
      <section
        aria-labelledby="plan-hero-title"
        className={`${OVER_STAGE} ${MAKES_WAY} pb-10 lg:grid lg:min-h-[calc(100vh-var(--nav-h,84px))] lg:pb-0 ${CLEAR_OF_NAV}`}
      >
        <div className={`px-4 pt-24 sm:px-6 lg:row-start-2 lg:pointer-events-auto lg:w-[55%] lg:px-10 xl:pl-16 ${guest ? "lg:pt-14" : "lg:pt-0"}`}>
          {guest && (
            // In the words' column, so it sits under the nav and is read before the h1; not an alert, it's how the page opens.
            <p data-guest-note className="mb-6 w-fit max-w-full rounded-xl border border-[color:var(--funnel-line)] bg-[color:var(--funnel-card)] px-4 py-3 text-sm lg:mb-5 lg:py-2">
              {copy("sp.guest.note")}
            </p>
          )}
          <p className={WIDE}>{copy("hx.eyebrow")}</p>
          <h1
            id="plan-hero-title"
            ref={headingRef}
            tabIndex={-1}
            className="mt-5 text-5xl font-semibold leading-[0.96] tracking-[-0.035em] outline-none lg:mt-7 lg:text-[clamp(4.5rem,7vw,7.5rem)] lg:leading-[0.94]"
          >
            <Swap lines={firstLine} className="block" />{" "}
            <Swap lines={secondLine} className="block text-[color:var(--funnel-muted)]" />
          </h1>
          <Swap as="p" lines={heroText} className="mt-6 max-w-[30rem] text-base leading-relaxed lg:mt-8 lg:text-lg" />
          <div className="mt-8 flex flex-wrap gap-3 lg:mt-9 lg:gap-4">
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
                <span aria-hidden="true">▷</span>
              </button>
            )}
          </div>
          <ul data-hero-stats className="mt-12 grid grid-cols-3 gap-4 lg:mt-20 lg:flex lg:gap-0 lg:divide-x lg:divide-[color:var(--funnel-line)]">
            {STATS.map((s) => (
              <li key={s.number} className="lg:px-10 lg:first:pl-0">
                <span className="block text-3xl font-semibold tracking-tight lg:text-[2rem]">{copy(s.number)}</span>{" "}
                <Swap
                  lines={{ desktop: copy(s.label), phone: copy(s.phoneLabel) }}
                  className="mt-1 block text-sm tracking-[0.04em] text-[color:var(--funnel-muted)] lg:text-base"
                />
              </li>
            ))}
          </ul>
        </div>
        <ScrollCue guest={guest} />
      </section>
      {/* The stage starts the hero's travel a screen above block 2; the old stats row and scroll line kept block 2
          that far down, and this keeps it there now they sit in the hero, or reduced motion cuts away at scroll 0. */}
      <div data-hero-hold aria-hidden="true" className="hidden lg:block lg:h-48" />
      {stage}
      <FilmLightbox open={filmOpen} onClose={() => setFilmOpen(false)} onProgress={onProgress} />
    </>
  );
}
