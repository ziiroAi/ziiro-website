import {
  createElement,
  Fragment,
  useEffect,
  useRef,
  type CSSProperties,
  type ElementType,
} from "react";

/**
 * ── TEXT FILL ─────────────────────────────────────────────────────────
 * Meaning, per the motion system: "this is an important principle."
 *
 * The sentence is legible from the moment it appears, set in subdued grey.
 * As the reader scrolls, ink flows through it left to right until it is at
 * full strength. Nothing is hidden and nothing arrives; a statement that was
 * already there simply resolves.
 *
 * WHY THIS IS NOT TextReveal, since the two sit one import apart.
 * TextReveal is a reveal: words start at opacity 0.14 behind a 5px blur and
 * shift on y, so the sentence is effectively absent until it arrives. This is
 * a fill: no blur, no travel, and the resting state is READABLE. The
 * difference is the whole point of the effect. One says "here is something
 * new", the other says "read this, it matters". A page should carry at most
 * one of either, or neither means anything.
 *
 * IMPLEMENTATION NOTES, both of which are constraints rather than taste:
 *
 *   1. ONE copy of the text in the DOM. The obvious way to build a fill is a
 *      grey layer with an ink layer clipped over it, and it is wrong here:
 *      the duplicate is read by text extractors and AI crawlers as doubled
 *      text. TextReveal's own header records the same finding about anime's
 *      splitText. So the fill is per-word opacity on a single set of spans,
 *      against ink that is already the right colour.
 *   2. Only opacity is animated, never colour or filter. Grey is ink at low
 *      alpha on the site's white ground, which is exactly what "fills from
 *      subdued grey into full ink" describes, and it composites for free.
 *
 * The front is continuous, not a stagger: each word's alpha is a function of
 * how far the scroll-driven front has passed it, so mid-scroll the sentence
 * is part ink and part grey with a soft edge between, and it tracks the
 * scrubbing in both directions.
 */

/** Alpha of a word the front has not reached yet. Chosen to stay comfortably
 *  legible on white rather than to look like a loading state. */
const REST_ALPHA = 0.28;

/** How many words wide the soft edge of the front is. Below about one the
 *  fill reads as a row of switches flipping; much above two and the sentence
 *  never looks decisively finished. */
const FEATHER = 1.6;

/** Scroll window the fill is scrubbed across, as a fraction of the viewport
 *  height either side of the element's centre. */
const WINDOW = 0.42;

export default function TextFill({
  text,
  as = "h2",
  className,
  style,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const words = [...el.querySelectorAll<HTMLElement>("[data-tf-word]")];
    if (!words.length) return;

    // Reduced motion gets the resolved state, not the resting one: a sentence
    // permanently at 28% would read as disabled text rather than as a
    // principle. The effect is the emphasis, so without motion we keep the
    // emphasis and drop the motion.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      for (const w of words) w.style.opacity = "1";
      return;
    }

    let raf = 0;
    let queued = false;

    const apply = () => {
      queued = false;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // 0 when the element's centre sits a window below the viewport centre,
      // 1 when it sits a window above it. Clamped, so the state is stable
      // once the reader has scrolled past.
      const centre = r.top + r.height / 2;
      const raw = (vh / 2 + vh * WINDOW - centre) / (2 * vh * WINDOW);
      const p = raw < 0 ? 0 : raw > 1 ? 1 : raw;

      // The front travels a little past the end so the last word can reach
      // full ink before the scrub finishes.
      const front = p * (words.length + FEATHER);
      for (let i = 0; i < words.length; i++) {
        const d = (front - i) / FEATHER;
        const t = d < 0 ? 0 : d > 1 ? 1 : d;
        words[i].style.opacity = String(REST_ALPHA + (1 - REST_ALPHA) * t);
      }
    };

    // Coalesced to one write per frame: scroll fires far more often than the
    // compositor can use, and this page is already carrying a canvas.
    const onScroll = () => {
      if (queued) return;
      queued = true;
      raf = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [text]);

  const parts = text.split(" ");
  /**
   * The separator is a text node BETWEEN the spans, not the last character
   * inside one. Both put a real space in `textContent`, so both read correctly
   * to a crawler, but only this one survives on screen: CSS strips white space
   * at the end of an inline-block box, so a space tucked inside the span
   * renders as nothing and the sentence displays as "Anywheredoesn'tmean".
   * TextReveal appears to get away with the other arrangement only because the
   * prerenderer happens to emit its separators as U+00A0, which does not
   * collapse. That is luck, not design, so this does not copy it.
   */
  const children = parts.map((word, i) => (
    <Fragment key={i}>
      <span
        data-tf-word
        style={{ display: "inline-block", opacity: REST_ALPHA, willChange: "opacity" }}
      >
        {word}
      </span>
      {i < parts.length - 1 ? " " : ""}
    </Fragment>
  ));

  return createElement(as, { ref, className, style }, children);
}
