// Block 1 (§6.2): the full spine and its numbers. From 1024 px the still fills the hero and the words sit in its
// left 55 %. Under that (D34) the words come first, then the still (or the phone band) at full strength, then the
// stats and the scroll line.
import { useState, type Ref } from "react";
import { copy } from "../data";
import type { CtaFrom, PlanProgress } from "../data/contract";
import { BookCallLink } from "./BookCallLink";
import { FilmLightbox } from "./FilmLightbox";
import { HeroPicture } from "./HeroPicture";
import { heroTitle, type Lines } from "./planView";
import { Swap } from "./Swap";

/** §6.5: hx.btn2 shows only once lane D's re-rendered film is in BrandFilm (lane D, day 1). Set false if it slips. */
export const FILM_READY = true;

/** Where the callouts sit on the still, as fractions of its width and height. Each label sits right of the spine,
 *  with a line to its disc: G05 and G03 in the r17 hero camera's disc boxes (proto/look/web). From 1024 px only. */
const CALLOUTS = [
  { number: "hx.call1.n", label: "hx.call1.l", at: { x: 0.855, y: 0.25 }, disc: { x: 0.759, y: 0.287 } },
  { number: "hx.call2.n", label: "hx.call2.l", at: { x: 0.855, y: 0.465 }, disc: { x: 0.759, y: 0.502 } },
] as const;

const STATS = [
  { number: "hx.stat1.n", label: "hx.stat1.l", phoneLabel: "hx.stat1.l" },
  { number: "hx.stat2.n", label: "hx.stat2.l", phoneLabel: "ph.hx.stat2.l" },
  { number: "hx.stat3.n", label: "hx.stat3.l", phoneLabel: "hx.stat3.l" },
] as const;

const MICRO = "font-mono text-xs uppercase tracking-[0.18em] text-[color:var(--funnel-muted)]";
const BUTTON = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium";
const percent = (fraction: number): string => `${fraction * 100}%`;
/** The stills end on a hard edge a shade off the page. The last 15 % fades out, so the spine dissolves into the
 *  page colour the stats sit on. The phone band (under 600 px) also starts mid page, so its first 12 % fades in.
 *  The stills are immutable (§6.6), so this is CSS, not new pixels. */
const FADE_OUT =
  "[mask-image:linear-gradient(to_bottom,#000_85%,transparent)] " +
  "max-[599px]:[mask-image:linear-gradient(to_bottom,transparent,#000_12%,#000_85%,transparent)]";

export interface HeroProps {
  heroText: Lines;
  name: string;
  email: string;
  headingRef: Ref<HTMLHeadingElement>;
  onBook(from: CtaFrom): void;
  onProgress(fields: PlanProgress): void;
}

export function Hero({ heroText, name, email, headingRef, onBook, onProgress }: HeroProps): JSX.Element {
  const [filmOpen, setFilmOpen] = useState(false);
  const [firstLine, secondLine] = heroTitle();
  return (
    <section aria-labelledby="plan-hero-title" className="relative">
      <div className="lg:relative">
        <div className="px-4 pt-24 sm:px-6 lg:absolute lg:inset-y-0 lg:left-0 lg:z-10 lg:flex lg:w-[55%] lg:flex-col lg:justify-center lg:px-10 lg:pt-0">
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
        <div className="relative mt-10 lg:mt-0">
          <HeroPicture className={`block h-auto w-full ${FADE_OUT}`} />
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
          >
            {CALLOUTS.map((c) => (
              <line
                key={c.number}
                x1={c.disc.x}
                y1={c.disc.y}
                x2={c.at.x - 0.01}
                y2={c.at.y + 0.02}
                stroke="var(--funnel-line)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
          {CALLOUTS.map((c) => (
            <div key={c.number} aria-hidden="true" className="absolute hidden lg:block" style={{ left: percent(c.at.x), top: percent(c.at.y) }}>
              <span className="block text-3xl font-medium">{copy(c.number)}</span>
              <span className={`block ${MICRO}`}>{copy(c.label)}</span>
            </div>
          ))}
        </div>
      </div>
      <ul className="grid grid-cols-3 gap-4 bg-[color:var(--funnel-bg)] px-4 pt-8 sm:px-6 lg:px-10">
        {STATS.map((s) => (
          <li key={s.number}>
            <span className="block text-3xl font-medium lg:text-4xl">{copy(s.number)}</span>{" "}
            <Swap lines={{ desktop: copy(s.label), phone: copy(s.phoneLabel) }} className="block text-sm text-[color:var(--funnel-muted)]" />
          </li>
        ))}
      </ul>
      <Swap as="p" lines={{ desktop: copy("hx.scroll"), phone: copy("ph.hx.scroll") }} className={`px-4 pb-10 pt-6 sm:px-6 lg:px-10 ${MICRO}`} />
      <FilmLightbox open={filmOpen} onClose={() => setFilmOpen(false)} onProgress={onProgress} />
    </section>
  );
}
