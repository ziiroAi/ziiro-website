import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Site-wide smooth scrolling, and the single rAF loop that drives it.
 *
 * Lenis works by taking over the wheel/keyboard scroll and easing the document
 * toward the target position itself. That is what produces the "weighted"
 * feel — a wheel notch becomes a short damped travel instead of a jump — and
 * it is the largest single contributor to a site reading as smooth.
 *
 * Four rules this component exists to hold:
 *
 *   1. ONE driver. Lenis needs exactly one `raf(time)` call per frame. The
 *      other animated things on this site (the orb, the dot-art scene, the
 *      scroll scrubbers) run their own loops, which is fine — what is not fine
 *      is two loops both calling `lenis.raf`, which double-steps the easing.
 *   2. Touch stays native. `smoothWheel` only. Hijacking touch scrolling on a
 *      phone is how smooth-scroll libraries earn their bad reputation: it
 *      fights the platform's own rubber-banding and momentum, and it breaks
 *      scroll-to-refresh. The wheel is the input that benefits.
 *   3. Reduced motion turns it off completely — not "less smooth", off. Under
 *      that preference the browser's own instant scrolling is the correct
 *      behaviour, and Lenis is simply never constructed.
 *   4. It must not swallow the page. Anything with its own scroll container
 *      (a modal body, an overflow panel) opts out with `data-lenis-prevent`,
 *      which Lenis honours natively.
 *
 * Exposed on `window.__lenis` deliberately: anchor links, the scroll indicator
 * and route changes all need to command the scroller rather than call
 * `window.scrollTo`, which Lenis would immediately fight.
 */

/**
 * Deliberately `__lenis`, not `lenis`: the library already ships an ambient
 * declaration for `window.lenis` describing its dev-tools flag object, and
 * redeclaring that property with a different type is a hard TS error.
 */
declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

export default function SmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;

    const lenis = new Lenis({
      // ~1s to settle a wheel gesture. Long enough to read as weighted, short
      // enough that the page still feels like it obeys you.
      duration: 1.05,
      // Exponential-out. The classic Lenis curve: immediate response, long
      // quiet settle — the same shape as EASE_OUT_EXPO in the token file.
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Native touch. See rule 2.
      syncTouch: false,
      touchMultiplier: 1,
      wheelMultiplier: 1,
    });

    window.__lenis = lenis;
    // Lets CSS opt individual things out, and gives us a hook for debugging.
    document.documentElement.classList.add("lenis-active");

    let raf = 0;
    const frame = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      delete window.__lenis;
      document.documentElement.classList.remove("lenis-active");
    };
  }, []);

  return null;
}

/**
 * Scroll to a target, through Lenis when it is running and natively when it
 * is not. Use this instead of `window.scrollTo` or `scrollIntoView` anywhere
 * on the site — a raw scroll call fights the smooth scroller mid-animation and
 * the page visibly stutters.
 */
export function scrollTo(
  target: string | number | HTMLElement,
  opts: { offset?: number; immediate?: boolean } = {},
) {
  const { offset = 0, immediate = false } = opts;

  if (window.__lenis) {
    window.__lenis.scrollTo(target, { offset, immediate });
    return;
  }

  // No Lenis: reduced motion, or before mount.
  const behavior: ScrollBehavior = immediate ? "instant" : "smooth";
  if (typeof target === "number") {
    window.scrollTo({ top: target + offset, behavior });
    return;
  }
  const el =
    typeof target === "string" ? document.querySelector(target) : target;
  if (!el) return;
  window.scrollTo({
    top: el.getBoundingClientRect().top + window.scrollY + offset,
    behavior,
  });
}
