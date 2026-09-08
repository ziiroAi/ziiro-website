import type { MouseEvent } from "react";

import {
  scrollTo,
  easeInOutCubic,
  headerOffset,
} from "@/shared/motion/SmoothScroll";
import { CSS_EASE, DURATION } from "@/shared/motion/tokens";

/**
 * Scroll cue. A label and a hairline rail with a single point of light falling
 * down it — the movement is the invitation, so the rail itself stays at the
 * edge of visibility and nothing bounces.
 *
 * It sits in normal flow at the end of the hero column (pushed down with
 * mt-auto) rather than being absolutely pinned, so on a short viewport it
 * follows the content instead of landing on top of the buttons.
 */
export default function ScrollIndicator() {
  /**
   * The href stays real — shareable, middle-clickable, and something a crawler
   * can follow — but the click is handed to Lenis. A native hash jump moves the
   * document while the smooth scroller still believes the page is where it left
   * it, and the frame after that it eases back: the reader sees a stutter at
   * exactly the moment they accepted the invitation.
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
    const target = document.querySelector("#how-it-works");
    const distance = target
      ? Math.abs(target.getBoundingClientRect().top)
      : window.innerHeight;

    scrollTo("#how-it-works", {
      offset: headerOffset(),
      duration: Math.min(1.7, 0.7 + distance / 2600),
      easing: easeInOutCubic,
    });
  };

  return (
    <a
      data-hero-reveal
      data-hero-scroll
      href="#how-it-works"
      onClick={onActivate}
      className="group inline-flex flex-col items-center gap-3 rounded-[10px] px-3 py-2 focus-visible:outline-none focus-visible:ring-1"
      style={{ ["--tw-ring-color" as string]: "rgba(255,138,61,0.75)" }}
    >
      <span
        className="font-mono text-[10px] font-bold uppercase text-[var(--hero-faint)] group-hover:text-[var(--hero-ink)] group-focus-visible:text-[var(--hero-ink)]"
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
            "linear-gradient(to bottom, transparent, rgba(242,238,233,0.16) 30%, rgba(242,238,233,0.16) 70%, transparent)",
        }}
      >
        <span
          className="hero-scroll-dot absolute left-1/2 top-0 block h-3 w-px -translate-x-1/2"
          style={{
            background:
              "linear-gradient(to bottom, transparent, var(--hero-accent), transparent)",
            boxShadow: "0 0 8px rgba(255,138,61,0.9)",
          }}
        />
      </span>
    </a>
  );
}
