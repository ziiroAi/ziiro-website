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
 * The homepage opener, "Core Brain". The right half, the frame and the strip
 * are built to the owner's reference picture (a 1536x1024 composition); the
 * left column is main's original argument, by the owner's request.
 *
 * On desktop the stage takes the picture's verticals: every stage size is a
 * reference pixel times one unit (`--u` in index.css), the top rule lies on
 * the navbar's bottom edge, and the 941u below it are fitted to the rest of
 * the viewport. Horizontally the hero spans the full window. The column, the
 * strip and the bar's logo share one left edge (the bar's gutter), and the
 * stage, whose right side is the brain's flat side, sits flush against the
 * right edge. The column is centred between the two rules. Narrower or
 * portrait screens get a stacked layout: the copy, then the stage (still
 * flush right), then the strip.
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

  /**
   * `--vw`: the page width WITHOUT a classic scrollbar. The hero sizes itself
   * in `--u`, a fraction of the width, and pins the stage to the right edge;
   * `100vw` counts the scrollbar on Windows, which would push the flush-right
   * brain ~15px under it. On macOS the two are equal, and `100vw` is the
   * pre-hydration fallback in index.css. Only this hero reads it, so the hero
   * publishes it (it used to come from the navbar).
   */
  useEffect(() => {
    const root = document.documentElement;
    const publish = () => root.style.setProperty("--vw", `${root.clientWidth}px`);
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(root);
    return () => {
      ro.disconnect();
    };
  }, []);

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

        {/* ── Left: the argument ─────────────────────────────────────────────
            main's column, class for class: the outlined eyebrow pill, the
            two-tone Helvetica h1, the grey support, the two pills and the
            Space Mono trust line. index.css only places the column (and, on
            desktop, centres it between the rules); every type size and
            margin here is main's. */}
        <div className="cb-copy relative z-[2] flex flex-col items-start text-left">
          {/* The eyebrow is a pill rather than a bare line, which is what gives
              the column a top edge to hang off. Hairline border, no fill: on
              white a filled chip would be the heaviest thing on the page. */}
          <p
            data-hero="eyebrow"
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

          {/* One h1, two tones of one family. HEADLINE_LINE_GAP is a real
              character between the block lines, so the accessible and indexed
              text reads "Your business just run better." rather than running
              the lines together; block layout discards it on screen.
              Medium Helvetica at -0.015em, as on main: the face is already
              tightly fitted, so tighter tracking starts closing counters at
              display sizes.
              Unlike main, neither line carries a reveal hook: the h1 is NEVER
              hidden, because it can be the page's LCP element. */}
          <h1
            id="hero-heading"
            data-hero="h1"
            className="mt-6 md:mt-7"
            style={{
              fontSize: "clamp(2.3rem, 7.2vw, 3.4rem)",
              lineHeight: 1.06,
              letterSpacing: "-0.015em",
            }}
          >
            <span className="block font-display font-medium" style={{ color: "var(--text-primary)" }}>
              {HEADLINE_LEAD}
            </span>
            {HEADLINE_LINE_GAP}
            <span className="block font-display font-medium" style={{ color: "var(--text-secondary)" }}>
              {HEADLINE_TAIL}
            </span>
          </h1>

          <p
            data-hero="support"
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
            data-hero="footnote"
            data-hero-reveal
            data-hero-trust
            className="mt-6 font-mono text-[10px] uppercase md:mt-7"
            // main's spacing, so no extra room around the dots: Separated only
            // keeps each phrase whole, so a phone wraps at a dot and never
            // inside "YOU KEEP THE ROADMAP".
            style={{
              letterSpacing: "0.24em",
              color: "var(--text-secondary)",
              ["--cb-sep-pad" as string]: "0",
            }}
          >
            <Separated text={TRUST} />
          </p>
        </div>

        {/* ── Right: the brain, the orbit and the core ─────────────────── */}
        <HeroStage />

        {/* ── The strip under the bottom rule ─────────────────────────────── */}
        <div data-hero-reveal data-hero-strip className="cb-strip relative z-[2]">
          {/* Space Mono, the trust line's face: two different monos stacked
              one above the other would read as a mistake. */}
          <p
            data-hero="strip-left"
            className="cb-strip-text cb-strip-left font-mono"
            style={{ color: "var(--cb-ink-500)" }}
          >
            {STRIP_LEFT}
          </p>
          <p
            data-hero="strip-right"
            className="cb-strip-text cb-strip-right font-mono"
            style={{ color: "var(--cb-muted)" }}
          >
            <Separated text={STRIP_RIGHT} />
          </p>
        </div>
      </div>
    </section>
  );
}
