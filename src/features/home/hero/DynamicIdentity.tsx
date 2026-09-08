import { useCallback, useEffect, useState } from "react";

/**
 * The hero's rotating-text primitive, and the timer that drives it.
 *
 * Two decisions worth keeping:
 *
 * 1. Every item is rendered, stacked in a single grid cell. The box is
 *    therefore always as wide and as tall as the longest item, so a word
 *    swapping from "Business" to "Optimization" shifts nothing around it.
 *    Cycling by swapping textContent instead would reflow the whole hero
 *    twice per phrase.
 *
 * 2. The item that just left exits upward and the next one arrives from
 *    below, so the rotation reads as one column of text moving in a single
 *    direction rather than a pile of crossfades. That's the whole difference
 *    between "the system is thinking" and "the text changed".
 *
 * 3. The incoming item waits for `gap` milliseconds before it starts. Fading
 *    both at once looks fine in motion but leaves the outgoing word legible
 *    behind the incoming one for a beat, and at large sizes that ghost is
 *    very visible. Letting the box go empty first costs nothing and reads as
 *    a deliberate beat rather than a smear.
 */

/** Advance an index on an interval, honouring reduced motion (which pins it
 *  at the first item so the content is still there, just still). */
export function useCycle(length: number, interval = 2400, startDelay = 0) {
  const [index, setIndex] = useState(0);
  // Bumped on a manual advance to restart the interval — without it the next
  // automatic tick fires straight after the one you asked for.
  const [nonce, setNonce] = useState(0);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % length);
    setNonce((n) => n + 1);
  }, [length]);

  useEffect(() => {
    if (length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let tick = 0;
    const start = window.setTimeout(
      () => {
        tick = window.setInterval(
          () => setIndex((i) => (i + 1) % length),
          interval,
        );
      },
      nonce === 0 ? startDelay : interval,
    );

    return () => {
      window.clearTimeout(start);
      if (tick) window.clearInterval(tick);
    };
  }, [length, interval, startDelay, nonce]);

  return [index, next] as const;
}

interface DynamicIdentityProps {
  items: readonly string[];
  /** Controlled, so a word and its caption can share one timer. */
  index: number;
  className?: string;
  style?: React.CSSProperties;
  /** How far items travel on the way in and out. */
  travel?: number;
  blur?: number;
  duration?: number;
  /** Dead air between one item leaving and the next arriving. Without it the
   *  two cross over and you read a ghost of the outgoing word through the
   *  incoming one. Keep it at or above `durationOut`, or the ghost is back. */
  gap?: number;
  /** How long the outgoing item takes to clear. Deliberately much shorter than
   *  `duration`: the word you are leaving has already been read, so it can go
   *  quickly, while the one arriving deserves the time to settle. Making both
   *  the same length is what forces `gap` to be long enough to feel like a
   *  stall. */
  durationOut?: number;
  /** What a screen reader hears in place of the animation. */
  srLabel?: string;
  /** "slide" moves the column in one direction; "scale" shrinks the outgoing
   *  item away and lets the next arrive at rest. */
  variant?: "slide" | "scale";
  /** How far a scale-variant item shrinks on its way out. Small on purpose:
   *  a deep shrink reads as a pop, and the point of this swap is that it
   *  doesn't. */
  scaleFrom?: number;
}

export default function DynamicIdentity({
  items,
  index,
  className = "",
  style,
  travel = 8,
  blur = 6,
  duration = 560,
  durationOut = 240,
  gap = 240,
  srLabel,
  variant = "slide",
  scaleFrom = 0.88,
}: DynamicIdentityProps) {
  const previous = (index - 1 + items.length) % items.length;
  // Slow out, slow in: the scale swap needs to settle rather than snap.
  const ease = "cubic-bezier(0.33, 0, 0.2, 1)";

  return (
    <span className={`relative inline-grid ${className}`} style={style}>
      {/* Announced once and never again — a live region that retextifies every
          two seconds is hostile to a screen reader, so the visual rotation is
          hidden and the full set is read as a plain list instead. */}
      <span className="sr-only">{srLabel ?? items.join(", ")}</span>

      {items.map((item, i) => {
        // −1 leaving (upward), 0 present, +1 waiting (below).
        const position = i === index ? 0 : i === previous ? -1 : 1;
        const active = position === 0;
        const wait = active ? gap : 0;
        const dur = active ? duration : durationOut;

        return (
          <span
            key={item}
            aria-hidden="true"
            style={{
              gridArea: "1 / 1",
              opacity: active ? 1 : 0,
              // `undefined`, NOT "blur(0px)" — and the difference is the whole
              // bug this once had on device.
              //
              // An element carrying ANY filter value stays on the filtered
              // rendering path: it is rasterised into a texture rather than
              // drawn as text. On a DPR-3 phone that texture is routinely
              // rasterised below native resolution and scaled back up, so the
              // resting word rendered permanently soft — crisp in every desktop
              // browser and visibly fuzzy on a real handset. blur(0px) is not a
              // no-op; only removing the property is.
              //
              // Omitting it here computes to `filter: none`, and CSS still
              // animates none <-> blur() because the spec substitutes the
              // identity value for the missing function. The transition is
              // unchanged; only the resting state leaves the texture path.
              filter: active ? undefined : `blur(${blur}px)`,
              transform:
                variant === "scale"
                  ? `scale(${active ? 1 : scaleFrom})`
                  : `translate3d(0, ${position * travel}px, 0)`,
              // Only the arriving item waits; the one leaving goes at once.
              // The delay is written into the shorthand rather than set as a
              // longhand beside it — React warns about mixing the two, and it
              // can genuinely drop one of them on a re-render.
              transition: [
                `opacity ${dur}ms ${ease} ${wait}ms`,
                `filter ${dur}ms ${ease} ${wait}ms`,
                `transform ${dur}ms ${ease} ${wait}ms`,
              ].join(", "),
              // `filter` is deliberately NOT hinted here. It is not a
              // compositor property, so the hint pins the element to the
              // filtered texture path for its whole life — the same class of
              // mistake as `will-change: border-radius` on the orb's blobs,
              // which the component next door already documents. Both are
              // invisible on desktop and obvious on a phone.
              willChange: "opacity, transform",
            }}
          >
            {item}
          </span>
        );
      })}
    </span>
  );
}
