import { useEffect, useRef } from "react";
import { createTimeline, stagger } from "animejs";

import IntelligenceOrb from "./IntelligenceOrb";
import HeroActions from "./HeroActions";
import ScrollIndicator from "./ScrollIndicator";
import {
  EYEBROW,
  HEADLINE_LEAD,
  HEADLINE_TAIL,
  SUPPORT,
  TRUST,
} from "./heroContent";

/**
 * The homepage opener.
 *
 * Two columns from `lg` up: the argument on the left, the object on the right.
 * Below that they stack, copy first. The composition used to be one centred
 * stack with the orb on top, on a near-black field the section painted for
 * itself. Both of those are gone. The page is white everywhere now, so the
 * hero inherits the site's ground instead of asserting its own, and the
 * reading order is the ordinary one: the sentence leads and the object
 * illustrates it.
 *
 * `data-hero-dark` stays on the section because other code still keys off it,
 * but it no longer flips anything — the scope that used to invert the palette
 * has been retired. `data-nav-dark` is gone outright: it existed to make the
 * navbar invert for the distance it overlapped a black hero, and there is no
 * black hero to overlap.
 *
 * There is no atmosphere layer either. `HeroAtmosphere` was, by the end, two
 * faint accent washes and nothing else — one warm, one cool — and the brief is
 * now black ink on white paper with every hue-carrying wash removed rather than
 * toned down. With both washes gone the component had no content left, so it is
 * deleted rather than kept as a wrapper around nothing. The section's ground is
 * simply the page's.
 *
 * Entrance order is the argument's order — the eyebrow names the field, the
 * claim lands, the object arrives alongside it, then the support, then what to
 * do. All of it on one anime.js timeline (the house convention) at absolute
 * positions, so the left column and the right one can overlap deliberately
 * rather than by arithmetic on relative offsets.
 */
export default function Hero() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // The CSS already leaves everything visible under this preference, so
    // there is nothing to reveal and nothing to clean up.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const q = (sel: string) => root.querySelectorAll<HTMLElement>(sel);

    const tl = createTimeline({ defaults: { ease: "out(3)", duration: 700 } });

    tl.add(
      q("[data-hero-orb]"),
      { opacity: [0, 1], scale: [0.86, 1], duration: 1200, ease: "out(4)" },
      0,
    )
      .add(q("[data-hero-eyebrow]"), { opacity: [0, 1], y: [10, 0], duration: 620 }, 60)
      .add(q("[data-hero-glow]"), { opacity: [0, 1], scale: [0.72, 1], duration: 1600 }, 120)
      .add(
        q("[data-hero-line]"),
        {
          opacity: [0, 1],
          y: [28, 0],
          duration: 900,
          ease: "out(4)",
          delay: stagger(110),
        },
        220,
      )
      .add(q("[data-hero-support]"), { opacity: [0, 1], y: [14, 0], duration: 700 }, 560)
      .add(q("[data-hero-actions]"), { opacity: [0, 1], y: [14, 0], duration: 700 }, 720)
      .add(q("[data-hero-orb-label]"), { opacity: [0, 1], y: [10, 0], duration: 620 }, 800)
      .add(q("[data-hero-trust]"), { opacity: [0, 1], y: [10, 0], duration: 600 }, 880)
      .add(q("[data-hero-orb-word]"), { opacity: [0, 1], y: [14, 0], duration: 760 }, 920)
      .add(q("[data-hero-scroll]"), { opacity: [0, 1], duration: 700 }, 1100);

    return () => {
      tl.cancel();
    };
  }, []);

  return (
    <section
      ref={rootRef}
      data-hero-dark
      className="relative isolate overflow-hidden"
      style={{ background: "var(--background)", color: "var(--text-primary)" }}
    >
      <div
        data-hero-column
        className="relative z-10 mx-auto grid min-h-[100svh] w-full max-w-[1200px] grid-cols-1 items-center gap-y-12 px-6 pb-20 pt-24 md:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.88fr)] lg:gap-x-12 lg:pb-28 lg:pt-32"
      >
        {/* ── Left: the argument ───────────────────────────────────────── */}
        <div className="flex flex-col items-start text-left">
          {/* The eyebrow is a pill rather than a bare line, which is what gives
              the column a top edge to hang off when nothing above it is
              centred. Hairline border, no fill: on white a filled chip would
              be the heaviest thing on the page. */}
          <p
            data-hero-reveal
            data-hero-eyebrow
            className="inline-flex items-center rounded-full border px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase md:text-[11px]"
            style={{
              letterSpacing: "0.2em",
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            {EYEBROW}
          </p>

          {/* One h1, two tones of one family. The sr-only tail keeps the full
              sentence a crawler used to get from the old hidden h1, without
              hiding anything a sighted visitor needs. */}
          {/* Tracking and weight are both set for Helvetica Neue, which is what
              font-display resolves to now. -0.035em and font-bold were tuned
              for Instrument Sans and are wrong for this face twice over:
              Helvetica is already tightly fitted, so past about -0.02em the
              counters start closing at display sizes, and `font-bold` asks for
              a real Helvetica Bold 700 rather than the lighter setting the
              reference uses. Medium is the Swiss display weight and keeps the
              line airy without going limp. */}
          <h1
            className="mt-6 md:mt-7"
            style={{
              fontSize: "clamp(2.3rem, 7.2vw, 3.4rem)",
              lineHeight: 1.06,
              letterSpacing: "-0.015em",
            }}
          >
            <span
              data-hero-reveal
              data-hero-line
              className="block font-display font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              {HEADLINE_LEAD}
            </span>
            <span
              data-hero-reveal
              data-hero-line
              className="block font-display font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              {HEADLINE_TAIL}
            </span>
            <span className="sr-only">
              {" "}
              Business intelligence and agentic AI systems for founder-led teams.
            </span>
          </h1>

          <p
            data-hero-reveal
            data-hero-support
            className="mt-5 max-w-[46ch] text-[15px] leading-relaxed md:mt-6 md:text-[16px]"
            style={{ color: "var(--text-secondary)" }}
          >
            {SUPPORT}
          </p>

          <div className="mt-7 md:mt-8">
            <HeroActions />
          </div>

          <p
            data-hero-reveal
            data-hero-trust
            className="mt-6 font-mono text-[10px] uppercase md:mt-7"
            style={{ letterSpacing: "0.24em", color: "var(--text-secondary)" }}
          >
            {TRUST}
          </p>
        </div>

        {/* ── Right: the object ────────────────────────────────────────── */}
        <div className="flex w-full justify-center lg:justify-end">
          <IntelligenceOrb />
        </div>
      </div>

      {/* The cue is pinned to the section rather than sitting at the end of a
          column, which is what lets the grid above centre itself without the
          cue dragging the composition down. index.css already drops it below
          800px of viewport height; `hidden lg:block` extends that judgement to
          the breakpoint where the layout stacks, for the same reason.

          Below lg the orb moves from beside the copy to under it, and a
          full-height hero then has to hold a pill, a two-line headline, two
          lines of copy, two buttons, a two-line trust line AND the orb. At
          390x844 that is 844px of content in 844px of viewport, so the pinned
          cue had nothing left to stand in and grazed the orb's bloom. Something
          has to yield there and the cue is the right thing: it is decorative,
          and on a stacked layout the fact that the page continues is not
          exactly a secret. */}
      <div
        data-hero-scroll-slot
        className="absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2 md:bottom-10 lg:block"
      >
        <ScrollIndicator />
      </div>
    </section>
  );
}
