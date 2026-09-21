import { useEffect, useState, type MouseEvent } from "react";

import {
  scrollTo,
  easeInOutCubic,
  headerOffset,
} from "@/shared/motion/SmoothScroll";
import { CSS_EASE, DURATION } from "@/shared/motion/tokens";

/**
 * Scroll cue. A label and a hairline rail with a single dark point falling
 * down it — the movement is the invitation, so the rail itself stays at the
 * edge of visibility and nothing bounces.
 *
 * On the old black field the point was a lit one: an orange dot with an 8px
 * glow around it. A glow is light added to a ground, and there is no light to
 * add to white — it would have rendered as a smudge travelling down a hairline.
 * So the point is now the ink itself and the glow is gone; the rail is a
 * border-token hairline, and the contrast between them is what the eye tracks.
 *
 * IT BELONGS TO THE TOP OF THE PAGE AND NOWHERE ELSE. It sits inside the hero
 * section, so it has never floated down the page, but it also used to hold
 * full strength right up until the hero scrolled off. A cue has done its whole
 * job the moment the reader scrolls, so it now fades out over the first short
 * stretch of movement and is gone well before the hero is.
 *
 * Once faded it is made properly absent rather than merely invisible: an
 * invisible link that still takes clicks and still answers a screen reader is
 * a trap sitting over the page.
 */

/** How far the reader scrolls before the cue is fully gone, in px. Short on
 *  purpose: this is "you have started", not "you have arrived". */
const FADE_OVER = 140;
export default function ScrollIndicator() {
  /** 1 at the very top, 0 once the reader has scrolled FADE_OVER. Starts at 1
   *  so the prerendered markup and the first paint both show the cue. */
  const [visible, setVisible] = useState(1);

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const p = Math.min(Math.max(window.scrollY / FADE_OVER, 0), 1);
      setVisible(1 - p);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Below this it is invisible anyway, and an invisible control that still
  // takes clicks and answers a screen reader is worse than no control.
  const idle = visible < 0.02;

  /**
   * The href stays real — shareable, middle-clickable, and something a crawler
   * can follow — but the click is handed to Lenis. A native hash jump moves the
   * document while the smooth scroller still believes the page is where it left
   * it, and the frame after that it eases back: the reader sees a stutter at
   * exactly the moment they accepted the invitation.
   *
   * The target was #how-it-works until that section was cut from the homepage.
   * It is #systems now — the directory, which is the next anchored block down.
   * Deliberately NOT repointed off the page the way the hero's "See how it
   * works" button was, which now goes to /docs#lifecycle: this is a scroll
   * cue, and a cue that says
   * the page continues below has to continue below. Sending it to another page
   * would make the one control whose entire meaning is "keep scrolling" the
   * one that leaves.
   */
  const onActivate = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    // Reduced motion: SmoothScroll never constructs Lenis under that
    // preference, so scrollTo() falls back to window.scrollTo with
    // behavior:"smooth" — an animated travel, which is the one thing the
    // preference asks us not to do. Fall through to the browser's own instant
    // hash jump, which is exactly what this link did before.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    e.preventDefault();

    // Two corrections over a bare scrollTo, both of which were visible.
    //
    // The offset: without it Lenis parks the section's top edge at scrollY
    // exactly, which puts its heading UNDER the fixed navbar — you accept the
    // invitation and arrive at a section whose title you cannot read.
    //
    // The easing: the instance runs expo-out, which is right for a wheel notch
    // and wrong here. This travel is most of a page — measured at 2402px on a
    // 900px viewport — and expo-out covers 255px of it in the first frame, so
    // the page lurches and then crawls to a stop. Ease-in-out accelerates,
    // cruises and decelerates, which is what a long deliberate travel should
    // feel like. The duration scales with the distance for the same reason: a
    // fixed duration makes a short hop sluggish and a long one frantic.
    const target = document.querySelector("#systems");
    const distance = target
      ? Math.abs(target.getBoundingClientRect().top)
      : window.innerHeight;

    scrollTo("#systems", {
      offset: headerOffset(),
      duration: Math.min(1.7, 0.7 + distance / 2600),
      easing: easeInOutCubic,
    });
  };

  return (
    <a
      data-hero-reveal
      data-hero-scroll
      href="#systems"
      onClick={onActivate}
      tabIndex={idle ? -1 : undefined}
      aria-hidden={idle || undefined}
      className="group inline-flex flex-col items-center gap-3 rounded-[10px] px-3 py-2 focus-visible:outline-none focus-visible:ring-1"
      style={{
        ["--tw-ring-color" as string]: "var(--text-primary)",
        // Opacity follows scroll directly, with no transition on it: the value
        // IS the scroll position, and a transition on a scrubbed property
        // chases its input instead of tracking it.
        opacity: visible,
        visibility: idle ? "hidden" : "visible",
        pointerEvents: idle ? "none" : undefined,
      }}
    >
      <span
        className="font-mono text-[10px] font-bold uppercase text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] group-focus-visible:text-[var(--text-primary)]"
        style={{
          letterSpacing: "0.34em",
          // The label brightening is a pointer response, not an entrance, so it
          // runs at DURATION.micro. At the 300ms it used to use, the cue was
          // still warming up after the cursor had already moved on.
          transitionProperty: "color",
          transitionDuration: `${DURATION.micro}s`,
          transitionTimingFunction: CSS_EASE.out,
        }}
      >
        Scroll
      </span>
      <span
        aria-hidden="true"
        className="relative block h-7 w-px overflow-hidden"
        style={{
          background:
            "linear-gradient(to bottom, transparent, var(--border-strong) 30%, var(--border-strong) 70%, transparent)",
        }}
      >
        <span
          className="hero-scroll-dot absolute left-1/2 top-0 block h-3 w-px -translate-x-1/2"
          style={{
            background:
              "linear-gradient(to bottom, transparent, var(--text-primary), transparent)",
          }}
        />
      </span>
    </a>
  );
}
