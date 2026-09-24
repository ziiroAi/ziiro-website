import { Fragment, useEffect, useRef } from "react";
import { createTimeline } from "animejs";

import { HEADLINE_LINE_GAP } from "@/shared/components/SplitHeadline";
import { DIRECTORY_STATS } from "@/features/home/directory/pipelines";
import HeroActions from "./HeroActions";
import HeroStage from "./stage/HeroStage";
import { DEPARTMENTS } from "./orbit";
import {
  EYEBROW,
  HEADLINE_LEAD,
  HEADLINE_TAIL,
  SUPPORT,
  TRUST,
} from "./heroContent";

/**
 * The homepage opener, "Core Brain": built to the owner's reference picture,
 * a 1536x1024 composition, measured from it pixel by pixel.
 *
 * On desktop the hero IS the picture. It is one 1536x1024 composition scaled
 * by a single unit (`--u` in index.css), so the argument on the left, the
 * brain on the right and the hairline frame around them keep their exact
 * relationships at any window size. Narrower or portrait screens get a
 * stacked layout: the copy, then the stage, then the strip.
 *
 * The old WebGL orb ("Your AI" and the cycling role word) and the scroll cue
 * are retired from here (git history has them). The roles the orb cycled now
 * live on the department threads, one per department, in the stage.
 *
 * THE H1 AND THE BRAIN ARE NEVER HIDDEN. One of them is the LCP element
 * (usually the brain image), and anything hidden behind an
 * entrance animation paints late and drags LCP with it. Everything else in
 * the column rises in behind the h1; the orbit and core fade in over the
 * brain. Hiding sits behind the `js` class set in
 * index.html, so the prerendered page reads in full without JavaScript, and
 * under reduced motion nothing hides at all.
 */

/** Two digits, the way the reference sets every count in the strip. */
const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * A " · "-separated line with room around each dot, which wraps only at a dot. The separator keeps its
 * plain spaces inside the span, so the text node still reads "a · b" to a
 * crawler and a screen reader; the extra room is padding, not characters.
 */
function Separated({ text }: { text: string }) {
  const parts = text.split(" · ");
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={part}>
          {i > 0 && <span className="cb-sep"> · </span>}
          <span className="cb-seg">{part}</span>
        </Fragment>
      ))}
    </>
  );
}

const STRIP_LEFT = `[ ${pad2(DEPARTMENTS.length)} departments ]`;
const STRIP_RIGHT = `${pad2(DIRECTORY_STATS.jobs)} jobs of work · mapped across ${pad2(
  DIRECTORY_STATS.agents,
)} agents · ${pad2(DIRECTORY_STATS.live)} live`;

export default function Hero() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // Nothing is hidden under this preference (index.css), so there is
    // nothing to reveal.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const q = (sel: string) => root.querySelectorAll<HTMLElement>(sel);
    const rise = { opacity: [0, 1], y: [10, 0], duration: 620 };

    // Short on purpose: the brain turns and the departments flow for as long as
    // the hero is on screen, and a long entrance on top of that is a third
    // thing moving. Everything is in by ~1.1s.
    const tl = createTimeline({ defaults: { ease: "out(3)" } });
    tl.add(q("[data-hero-eyebrow]"), rise, 0)
      .add(q("[data-hero-stage-fade]"), { opacity: [0, 1], duration: 900, ease: "out(2)" }, 120)
      .add(q("[data-hero-support]"), rise, 180)
      .add(q("[data-hero-actions]"), rise, 280)
      .add(q("[data-hero-trust]"), rise, 380)
      .add(q("[data-hero-strip]"), { opacity: [0, 1], duration: 620 }, 460);

    return () => {
      tl.cancel();
    };
  }, []);

  return (
    <section ref={rootRef} className="cb-hero" aria-labelledby="hero-heading">
      <div className="cb-comp">
        <span aria-hidden="true" className="cb-rule cb-rule--top" />
        <span aria-hidden="true" className="cb-rule cb-rule--bottom" />

        {/* ── Left: the argument ─────────────────────────────────────────── */}
        <div className="cb-copy relative z-[2]">
          <p
            data-hero="eyebrow"
            data-hero-reveal
            data-hero-eyebrow
            className="cb-eyebrow font-hero-mono"
            style={{ color: "var(--cb-muted)" }}
          >
            <Separated text={EYEBROW} />
          </p>

          {/* One h1, two block lines. HEADLINE_LINE_GAP is a real character
              between them, so the accessible and indexed text reads "Your
              business just run better." rather than running the lines
              together. Block layout discards it on screen. */}
          <h1 id="hero-heading" data-hero="h1" className="cb-h1 font-hero-serif">
            <span className="block">{HEADLINE_LEAD}</span>
            {HEADLINE_LINE_GAP}
            <span className="block">{HEADLINE_TAIL}</span>
          </h1>

          <p
            data-hero="support"
            data-hero-reveal
            data-hero-support
            className="cb-support font-hero-sans"
            style={{ color: "var(--cb-support)" }}
          >
            {SUPPORT}
          </p>

          <HeroActions />

          <p
            data-hero="footnote"
            data-hero-reveal
            data-hero-trust
            className="cb-footnote font-hero-mono"
            style={{ color: "var(--cb-muted)" }}
          >
            <Separated text={TRUST} />
          </p>
        </div>

        {/* ── Right: the brain, the orbit and the core ─────────────────── */}
        <HeroStage />

        {/* ── The strip under the bottom rule ─────────────────────────────── */}
        <div data-hero-reveal data-hero-strip className="cb-strip relative z-[2]">
          <p
            data-hero="strip-left"
            className="cb-strip-text cb-strip-left font-hero-mono"
            style={{ color: "var(--cb-ink-500)" }}
          >
            {STRIP_LEFT}
          </p>
          <p
            data-hero="strip-right"
            className="cb-strip-text cb-strip-right font-hero-mono"
            style={{ color: "var(--cb-muted)" }}
          >
            <Separated text={STRIP_RIGHT} />
          </p>
        </div>
      </div>
    </section>
  );
}
