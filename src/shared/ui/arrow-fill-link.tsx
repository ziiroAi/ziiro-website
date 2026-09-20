import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { animate, createSpring } from "animejs";

/**
 * The site's SECONDARY call to action, and the only one.
 *
 * Adapted from ObsidianUI's Arrow Fill. The ink sweeps in from the left while
 * the arrow travels, and the label stays legible the whole way across. What was
 * stripped on the way in: the rounded-rectangle shadow, the colour pair and the
 * scale bounce. This site is ink on paper and its pills are circles at the ends.
 *
 * HIERARCHY. One primary look, one secondary look, nothing else. The filled
 * black pill is reserved for booking, which is the only primary action on the
 * site and is getting its own treatment later. Everything that sends a reader
 * somewhere else, Products, Docs, Pricing, the walkthrough, wears this. Do not
 * put this on a /contact button and do not invent a third style beside it.
 *
 * ── THE CONTRAST PROBLEM, which is the reason this is not a CSS hover fill ──
 * The fill is --text-primary and the resting label is --text-primary. A single
 * label that swapped colour when the fill arrived would be invisible at every
 * partial fill: half the word sitting on ink, still painted ink. So the label is
 * drawn twice. The base copy is ink, and a second copy in --background is
 * clipped to exactly the filled region, so every pixel of every letter is
 * whichever colour contrasts with what is behind it. Both states measure
 * 19.8:1 against their ground and no intermediate frame is ever worse. The
 * second copy is aria-hidden so a screen reader reads the label once.
 *
 * ── APPLE RULES ──
 * Pointer DOWN, not release: `pointerdown` drives the fill, so the button has
 * already answered before the click resolves.
 *
 * Interruptible: one number, `progress`, is driven by a spring and every state
 * change RETARGETS it rather than restarting it. anime's default composition
 * replaces the running animation and picks up the current value, so pulling the
 * pointer away at 40% reverses from 40% instead of snapping to 1 and falling.
 * The whole visual reads that one number through a CSS variable, so the fill,
 * the clip and the arrow can never drift out of sync with each other.
 *
 * Critically damped, no overshoot: an Apple response of ~0.35s at damping ratio
 * 1.0 converts to these physical units as stiffness 322 and damping 36, since
 * response = 2*pi*sqrt(mass/stiffness) and critical damping is
 * 2*sqrt(stiffness*mass). A bounce here would be the button disagreeing with
 * the pointer about where it had stopped.
 *
 * Keyboard: focus-visible drives the same fill, because an affordance that only
 * exists on hover strands anyone arriving by tab.
 *
 * Reduced motion: a gentler equivalent rather than nothing. The same spring
 * runs, but it drives opacity instead of travel: the fill cross-fades at full
 * width and the arrow holds still. Nothing slides, and the state is still
 * legible.
 */

/** How far the arrow travels, in px. Far enough to read as travel next to the
 *  sweep, short enough that it never reaches the label. */
const ARROW_TRAVEL = 10;

/** Apple's default: damping ratio 1.0, response ~0.35s, no overshoot.
 *  response = 2*pi*sqrt(mass/stiffness) -> stiffness 322 at mass 1.
 *  critical damping = 2*sqrt(stiffness*mass) -> 36. */
const FILL_SPRING = { mass: 1, stiffness: 322, damping: 36 };

export interface ArrowFillLinkProps {
  /** Internal route. Use this or `href`, not both. */
  to?: string;
  /** External URL. Opens in a new tab. */
  href?: string;
  children: string;
  className?: string;
  style?: CSSProperties;
}

export default function ArrowFillLink({
  to,
  href,
  children,
  className = "",
  style,
}: ArrowFillLinkProps) {
  const root = useRef<HTMLAnchorElement>(null);
  // The single animated number. Held in a ref rather than in state because it
  // changes every frame and nothing about it needs a React render.
  const progress = useRef({ p: 0 });
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(m.matches);
    sync();
    m.addEventListener("change", sync);
    return () => m.removeEventListener("change", sync);
  }, []);

  // Retarget, never restart. anime replaces the running animation on this
  // property and continues from wherever the value actually is.
  const drive = (target: number) => {
    const el = root.current;
    if (!el) return;
    animate(progress.current, {
      p: target,
      ease: createSpring(FILL_SPRING),
      onUpdate: () => {
        el.style.setProperty("--fill", String(progress.current.p));
      },
    });
  };

  const handlers = {
    onPointerEnter: () => drive(1),
    onPointerLeave: () => drive(0),
    // Pointer DOWN, not release. The fill is already committed by the time the
    // click fires, which is the point of the rule.
    onPointerDown: () => drive(1),
    onPointerCancel: () => drive(0),
    onFocus: (e: React.FocusEvent<HTMLAnchorElement>) => {
      if (e.currentTarget.matches(":focus-visible")) drive(1);
    },
    onBlur: () => drive(0),
  };

  const shell =
    "group relative isolate inline-flex min-h-[48px] items-center justify-center gap-2 overflow-hidden rounded-full border px-6 text-[14px] font-medium tracking-[-0.005em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

  const shellStyle: CSSProperties = {
    borderColor: "var(--border-strong)",
    color: "var(--text-primary)",
    background: "var(--background)",
    // Tailwind cannot alpha-modify a var() colour, so the ring and its offset
    // are painted from real tokens rather than from a /opacity suffix that
    // would silently emit no rule at all.
    ["--tw-ring-offset-color" as string]: "var(--background)",
    ["--tw-ring-color" as string]: "var(--text-primary)",
    ["--fill" as string]: 0,
    ...style,
  };

  const body = (
    <>
      {/* The ink. Under normal motion it sweeps from the left; under reduced
          motion it sits at full width and cross-fades instead, which is a
          gentler equivalent rather than the effect switched off. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: "var(--text-primary)",
          transformOrigin: "left center",
          transform: reduced ? "none" : "scaleX(var(--fill))",
          opacity: reduced ? "var(--fill)" : 1,
        }}
      />

      {/* Label, ink copy. Sits under the clipped copy below. */}
      <span className="relative">{children}</span>

      {/* Label, paper copy, clipped to exactly the filled region so a letter is
          never painted ink on ink. Positioned over the ink copy rather than
          replacing it, which is what keeps every partial frame readable. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 px-6"
        style={{
          color: "var(--background)",
          clipPath: reduced
            ? "none"
            : "inset(0 calc((1 - var(--fill)) * 100%) 0 0)",
          opacity: reduced ? "var(--fill)" : 1,
        }}
      >
        <span>{children}</span>
        <Arrow travel={reduced ? 0 : ARROW_TRAVEL} />
      </span>

      <Arrow travel={reduced ? 0 : ARROW_TRAVEL} />
    </>
  );

  if (href) {
    return (
      <a
        ref={root}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${shell} ${className}`}
        style={shellStyle}
        {...handlers}
      >
        {body}
      </a>
    );
  }

  return (
    <Link
      ref={root}
      to={to ?? "/"}
      className={`${shell} ${className}`}
      style={shellStyle}
      {...handlers}
    >
      {body}
    </Link>
  );
}

/** The site's arrow, travelling off the same --fill the ink reads. */
function Arrow({ travel }: { travel: number }) {
  return (
    <svg
      aria-hidden="true"
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="relative shrink-0"
      style={{
        transform: travel
          ? `translateX(calc(var(--fill) * ${travel}px))`
          : "none",
      }}
    >
      <path d="M3 7.5h9M8.4 3.9 12 7.5l-3.6 3.6" />
    </svg>
  );
}
