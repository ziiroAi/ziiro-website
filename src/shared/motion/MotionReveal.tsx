import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import {
  DURATION,
  EASE_OUT_EXPO,
  STAGGER,
  TRAVEL,
  VIEWPORT,
} from "./tokens";

interface MotionRevealProps {
  children: ReactNode;
  direction?: "up" | "down" | "left" | "right" | "none";
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
 * CRAWLER SAFETY — do not remove `data-reveal`.
 *
 * This site prerenders (`vite build --ssr` then scripts/prerender.mjs), and
 * framer-motion serialises `initial` into inline styles. That means the static
 * HTML shipped to anything that does not execute JavaScript — crawlers, a
 * failed bundle, reader modes — contains `opacity: 0` on every revealing
 * block, and the page reads as empty. That is not a hypothetical: the built
 * dist/index.html demonstrably carried it.
 *
 * `data-reveal` pairs with a single rule in index.css, gated on the `js` class
 * that index.html sets from an inline script before first paint:
 *
 *     html:not(.js) [data-reveal] { opacity: 1 !important; transform: none !important }
 *
 * `!important` is load-bearing here — it is the only thing in CSS that outranks
 * framer's inline style. No JS means no `js` class means the content is
 * visible; a real browser gets the class before paint, the rule never matches,
 * and the reveal behaves normally. This is the same mechanism the hero and the
 * system directory already use for their own entrances.
 */
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
  const shouldReduce = useReducedMotion();
  const Tag = motion[as];

  // Under reduced motion the content is simply present. Not a shorter
  // animation — none, and no wrapper transform left behind either.
  if (shouldReduce) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  const offsets = {
    up: { y: TRAVEL.reveal },
    down: { y: -TRAVEL.reveal },
    left: { x: -TRAVEL.reveal },
    right: { x: TRAVEL.reveal },
    none: {},
  } as const;

  if (stagger !== undefined) {
    return (
      <Tag
        className={className}
        initial="hidden"
        whileInView="visible"
        viewport={{ once, amount }}
        variants={{
          hidden: {},
          visible: {
            transition: { staggerChildren: stagger || STAGGER.card, delayChildren: delay },
          },
        }}
      >
        {children}
      </Tag>
    );
  }

  return (
    <Tag
      data-reveal
      className={className}
      initial={{ opacity: 0, ...offsets[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration, delay, ease: EASE_OUT_EXPO }}
    >
      {children}
    </Tag>
  );
}

/**
 * One item inside a staggered <MotionReveal stagger={...}>. Its timing comes
 * from the parent's variants, so it takes no duration of its own — that is
 * what keeps a staggered list in one rhythm instead of N independent ones.
 */
export function MotionRevealItem({
  children,
  className,
  direction = "up",
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  direction?: "up" | "down" | "left" | "right" | "none";
  as?: "div" | "li" | "span";
}) {
  const shouldReduce = useReducedMotion();
  const Tag = motion[as];

  if (shouldReduce) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  const offsets = {
    up: { y: TRAVEL.reveal },
    down: { y: -TRAVEL.reveal },
    left: { x: -TRAVEL.reveal },
    right: { x: TRAVEL.reveal },
    none: {},
  } as const;

  return (
    <Tag
      data-reveal
      className={className}
      variants={{
        hidden: { opacity: 0, ...offsets[direction] },
        visible: {
          opacity: 1,
          x: 0,
          y: 0,
          transition: { duration: DURATION.reveal, ease: EASE_OUT_EXPO },
        },
      }}
    >
      {children}
    </Tag>
  );
}
