import { useEffect, useRef } from "react";
import { createTimeline, stagger } from "animejs";

import HeroAtmosphere from "./HeroAtmosphere";
import IntelligenceOrb from "./IntelligenceOrb";
import HeroActions from "./HeroActions";
import ScrollIndicator from "./ScrollIndicator";
import {
  EYEBROW,
  HEADLINE_SANS,
  HEADLINE_SERIF,
  SUPPORT,
  TRUST,
} from "./heroContent";

/**
 * The homepage opener.
 *
 * The section paints its own near-black ground and its own ink, so it reads
 * the same on either site theme rather than being a dark hero that turns grey
 * when someone flips the toggle. Its palette is scoped under [data-hero-dark]
 * and doesn't leak; the navbar picks the same attribute up and inverts itself
 * for the distance it overlaps this section.
 *
 * The composition is one centred column with the orb on top, because the orb
 * has to be read before the headline: it states the sequence (understand →
 * measure → build → optimise → outcomes) that the headline then compresses
 * into four words. Everything below it is deliberately quiet so the negative
 * space between the two does the work.
 *
 * Entrance order is the argument's order — the object arrives, it lights, it
 * names itself, then the claim lands, then what it means, then what to do.
 * All of it on one anime.js timeline (the house convention) rather than a
 * scatter of delays.
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

    tl.add(q("[data-hero-orb]"), {
      opacity: [0, 1],
      scale: [0.82, 1],
      duration: 1200,
      ease: "out(4)",
    })
      .add(
        q("[data-hero-glow]"),
        { opacity: [0, 1], scale: [0.7, 1], duration: 1600 },
        "-=980",
      )
      .add(
        q("[data-hero-orb-label]"),
        { opacity: [0, 1], y: [10, 0], duration: 620 },
        "-=840",
      )
      .add(
        q("[data-hero-orb-word]"),
        { opacity: [0, 1], y: [16, 0], duration: 760 },
        "-=480",
      )
      .add(
        q("[data-hero-eyebrow]"),
        { opacity: [0, 1], y: [10, 0], duration: 620 },
        "-=460",
      )
      .add(
        q("[data-hero-line]"),
        {
          opacity: [0, 1],
          y: [30, 0],
          duration: 900,
          ease: "out(4)",
          delay: stagger(110),
        },
        "-=420",
      )
      .add(
        q("[data-hero-support]"),
        { opacity: [0, 1], y: [14, 0], duration: 700 },
        "-=640",
      )
      .add(
        q("[data-hero-actions]"),
        { opacity: [0, 1], y: [14, 0], duration: 700 },
        "-=520",
      )
      .add(q("[data-hero-scroll]"), { opacity: [0, 1], duration: 700 }, "-=380");

    return () => {
      tl.cancel();
    };
  }, []);

  return (
    <section
      ref={rootRef}
      data-hero-dark
      data-nav-dark
      className="relative isolate overflow-hidden"
      style={{ background: "var(--hero-bg)", color: "var(--hero-ink)" }}
    >
      <HeroAtmosphere />

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1120px] flex-col items-center px-6 pb-8 pt-14 text-center md:px-10 md:pt-20">
        <IntelligenceOrb />

        <p
          data-hero-reveal
          data-hero-eyebrow
          className="mt-7 flex items-center gap-3 font-mono text-[10px] font-bold uppercase md:mt-10 md:text-[11px]"
          style={{ letterSpacing: "0.2em", color: "var(--hero-accent)" }}
        >
          {EYEBROW}
        </p>

        {/* One h1. The visible line is the positioning; the sr-only tail keeps
            the full sentence a crawler used to get from the old hidden h1,
            without hiding anything a sighted visitor needs. */}
        <h1
          className="mt-3 max-w-[16ch] md:mt-5"
          style={{
            fontSize: "clamp(2.85rem, 7.4vw, 4.5rem)",
            lineHeight: 1.0,
            letterSpacing: "-0.035em",
          }}
        >
          <span
            data-hero-reveal
            data-hero-line
            className="block font-display font-bold"
            style={{ color: "rgba(242,238,233,0.93)" }}
          >
            {HEADLINE_SANS}
          </span>
          {/* The serif carries the promise. It runs slightly larger because an
              italic display serif reads optically smaller than a bold grotesk
              at the same point size, and the violet cast is a glow rather
              than a fill so the letterforms stay clean. */}
          <span
            data-hero-reveal
            data-hero-line
            className="block font-serif italic"
            style={{
              fontSize: "1.07em",
              lineHeight: 1.0,
              letterSpacing: "-0.015em",
              color: "var(--hero-ink)",
              textShadow: "0 0 80px rgba(255,138,61,0.3)",
            }}
          >
            {HEADLINE_SERIF}
          </span>
          <span className="sr-only">
            {" "}
            Business intelligence and agentic AI systems for founder-led teams.
          </span>
        </h1>

        <p
          data-hero-reveal
          data-hero-support
          className="mt-5 max-w-[68ch] text-[14px] leading-relaxed md:mt-6 md:text-[15px]"
          style={{ color: "var(--hero-dim)" }}
        >
          {SUPPORT}
        </p>

        <div className="mt-6 w-full sm:w-auto md:mt-8">
          <HeroActions />
        </div>

        <p
          data-hero-reveal
          data-hero-actions
          className="mt-4 font-mono text-[10px] uppercase md:mt-5"
          style={{ letterSpacing: "0.24em", color: "var(--hero-faint)" }}
        >
          {TRUST}
        </p>

        {/* mt-auto, so on a tall viewport the cue sits at the bottom edge and
            on a short one it simply follows the buttons.

            Its height is part of the hero's fixed cost, and that cost is what
            `--orb` is solved against — see index.css. Change the padding here
            and the reserve there has to move with it, or the cue drops below
            the fold again. */}
        <div data-hero-scroll-slot className="mt-auto pt-6 md:pt-8">
          <ScrollIndicator />
        </div>
      </div>
    </section>
  );
}
