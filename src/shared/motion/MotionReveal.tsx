import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
  type RefObject,
} from "react";

import {
  CSS_EASE,
  DURATION,
  STAGGER,
  TRAVEL,
  VIEWPORT,
} from "./tokens";

type Direction = "up" | "down" | "left" | "right" | "none";

interface MotionRevealProps {
  children: ReactNode;
  direction?: Direction;
  delay?: number;
  duration?: number;
  className?: string;
  once?: boolean;
  amount?: number;
  /** Reveal direct children one after another instead of the block as a
   *  whole. Each child must be a <MotionRevealItem>. */
  stagger?: number;
  as?: "div" | "section" | "ul" | "ol" | "li" | "span";
}

/**
 * The house scroll reveal.
 *
 * Everything about the defaults changed when the site's motion was unified,
 * and the direction of the change is worth stating: it got *smaller and
 * faster*, not slower and grander. It used to travel 40–50px over 800ms on a
 * generic ease. It now travels 22px over 620ms on expo-out.
 *
 * The reason is that a reveal is not the point of the page — the sentence
 * underneath it is. A long slide makes the reader wait to start reading, and
 * a symmetric ease leaves the element visibly still moving while they try. An
 * expo-out that covers most of its distance in the first third puts the words
 * in a readable position almost immediately and spends the remaining time
 * settling, which is what "smooth" actually means here.
 *
 * `once` defaults to true and should stay that way. Content that re-hides when
 * you scroll back up is the fastest way to make a smooth site irritating.
 *
 * WHY THIS IS NOT framer-motion ANY MORE.
 *
 * It used to be, and that single decision put a 118KB animation library on the
 * critical path of every route on the site. Not because every route animates
 * much: because Footer renders a MotionReveal, Footer is in the app shell, and
 * a static shell import is a global import. /pricing and /docs are text pages
 * and they were both downloading and parsing framer-motion before they could
 * finish becoming readable. What the library was actually being asked to do
 * here is fade-and-translate an element when it scrolls into view, which is an
 * IntersectionObserver and a CSS transition. So that is what it is now. The
 * timings, the curve and the props are unchanged, so the 100-plus call sites
 * did not have to move.
 *
 * CRAWLER SAFETY — do not remove `data-reveal`.
 *
 * This site prerenders (`vite build --ssr` then scripts/prerender.mjs), and a
 * reveal is hidden before it runs. That means the static HTML shipped to
 * anything that does not execute JavaScript — crawlers, a failed bundle,
 * reader modes — contains `opacity: 0` on every revealing block, and the page
 * reads as empty. That is not a hypothetical: the built dist/index.html
 * demonstrably carried it. framer-motion used to write that inline style by
 * serialising `initial`; this component writes it directly, so the hazard and
 * the mitigation are both exactly as they were.
 *
 * `data-reveal` pairs with a single rule in index.css, gated on the `js` class
 * that index.html sets from an inline script before first paint:
 *
 *     html:not(.js) [data-reveal] { opacity: 1 !important; transform: none !important }
 *
 * `!important` is load-bearing here — it is the only thing in CSS that outranks
 * an inline style. No JS means no `js` class means the content is visible; a
 * real browser gets the class before paint, the rule never matches, and the
 * reveal behaves normally. This is the same mechanism the hero and the system
 * directory already use for their own entrances.
 */

/** The offset a hidden block sits at, as a CSS transform. */
function hiddenTransform(direction: Direction): string {
  switch (direction) {
    case "up":
      return `translateY(${TRAVEL.reveal}px)`;
    case "down":
      return `translateY(-${TRAVEL.reveal}px)`;
    case "left":
      return `translateX(-${TRAVEL.reveal}px)`;
    case "right":
      return `translateX(${TRAVEL.reveal}px)`;
    default:
      return "none";
  }
}

/**
 * False on the server and on the first client render, so the markup this
 * component produces during hydration matches what was prerendered. The real
 * answer arrives in an effect, one frame later, which is soon enough: nothing
 * has been allowed to move yet at that point.
 */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

/**
 * Thresholds dense enough that a block entering from the bottom of the
 * viewport reports its progress more than once. A single `threshold: amount`
 * fires only on the crossing, and an element taller than the viewport can
 * never reach a ratio of 0.2 at all, which would strand its content hidden
 * forever. That failure mode is the entire bug this file was edited under, so
 * `shouldShow` below also accepts "the top of this block has scrolled well
 * into view" as sufficient, independently of ratio.
 */
const THRESHOLDS = [0, 0.05, 0.1, 0.15, 0.2, 0.3, 0.5, 0.75, 1];

function shouldShow(entry: IntersectionObserverEntry, amount: number): boolean {
  if (!entry.isIntersecting) return false;
  if (entry.intersectionRatio >= amount) return true;
  // Taller than the viewport, or close to it: reveal once its top has come up
  // past the lower fifth of the screen.
  const viewport = entry.rootBounds?.height ?? window.innerHeight;
  return entry.boundingClientRect.top <= viewport * 0.8;
}

/** Watch `ref` and report the first (or, when `once` is false, current) sighting. */
function useInView(
  ref: RefObject<HTMLElement | null>,
  { once, amount, active }: { once: boolean; amount: number; active: boolean },
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;

    // No IntersectionObserver (very old browsers, some prerender contexts):
    // show the content rather than hide it behind a capability check.
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (shouldShow(entry, amount)) {
            setInView(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { threshold: THRESHOLDS },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, once, amount, active]);

  return inView;
}

/** What a staggered parent tells its items: when to go, and how far apart. */
interface StaggerGroup {
  shown: boolean;
  step: number;
  delayChildren: number;
  el: RefObject<HTMLElement | null>;
}

const StaggerContext = createContext<StaggerGroup | null>(null);

export default function MotionReveal({
  children,
  direction = "up",
  delay = 0,
  duration = DURATION.reveal,
  className,
  once = VIEWPORT.once,
  amount = VIEWPORT.amount,
  stagger,
  as = "div",
}: MotionRevealProps) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once, amount, active: true });
  const Tag = as as ElementType;

  const shown = inView || reduced;

  if (stagger !== undefined) {
    // The parent of a staggered group never moves itself; it only decides when
    // its items start. Same as the empty `hidden`/`visible` variants it had
    // when this was framer-motion.
    return (
      <StaggerContext.Provider
        value={{
          shown,
          step: stagger || STAGGER.card,
          delayChildren: delay,
          el: ref,
        }}
      >
        <Tag ref={ref} className={className}>
          {children}
        </Tag>
      </StaggerContext.Provider>
    );
  }

  const style: CSSProperties = {
    opacity: shown ? 1 : 0,
    transform: shown ? "none" : hiddenTransform(direction),
    // Under reduced motion the content is simply present. Not a shorter
    // animation — none, and no wrapper transform left behind either.
    transition: reduced
      ? "none"
      : `opacity ${duration}s ${CSS_EASE.outExpo} ${delay}s, transform ${duration}s ${CSS_EASE.outExpo} ${delay}s`,
    willChange: shown ? undefined : "opacity, transform",
  };

  return (
    <Tag ref={ref} data-reveal className={className} style={style}>
      {children}
    </Tag>
  );
}

/**
 * One item inside a staggered <MotionReveal stagger={...}>. Its timing comes
 * from the parent's context, so it takes no duration of its own — that is
 * what keeps a staggered list in one rhythm instead of N independent ones.
 *
 * Its place in the sequence is read from DOM order rather than counted during
 * render, because a render-time counter double-counts under StrictMode and
 * breaks the moment an item is wrapped in anything.
 *
 * Used outside a staggered parent it still works, revealing on its own the way
 * a plain <MotionReveal> would.
 */
export function MotionRevealItem({
  children,
  className,
  direction = "up",
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  direction?: Direction;
  as?: "div" | "li" | "span";
}) {
  const group = useContext(StaggerContext);
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const [index, setIndex] = useState(0);
  const Tag = as as ElementType;

  // Standalone: behave like a MotionReveal and watch itself.
  const selfInView = useInView(ref, {
    once: VIEWPORT.once,
    amount: VIEWPORT.amount,
    active: group === null,
  });

  useEffect(() => {
    if (!group) return;
    const el = ref.current;
    const parent = group.el.current;
    if (!el || !parent) return;
    const items = parent.querySelectorAll("[data-reveal-item]");
    const at = Array.prototype.indexOf.call(items, el);
    setIndex(at < 0 ? 0 : at);
  }, [group]);

  const shown = (group ? group.shown : selfInView) || reduced;
  const delay = group ? group.delayChildren + index * group.step : 0;

  const style: CSSProperties = {
    opacity: shown ? 1 : 0,
    transform: shown ? "none" : hiddenTransform(direction),
    transition: reduced
      ? "none"
      : `opacity ${DURATION.reveal}s ${CSS_EASE.outExpo} ${delay}s, transform ${DURATION.reveal}s ${CSS_EASE.outExpo} ${delay}s`,
    willChange: shown ? undefined : "opacity, transform",
  };

  return (
    <Tag ref={ref} data-reveal data-reveal-item className={className} style={style}>
      {children}
    </Tag>
  );
}
