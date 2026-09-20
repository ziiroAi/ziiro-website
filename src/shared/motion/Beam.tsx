import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import type { BorderBeamProps } from "border-beam";

/**
 * Beam: the site's one "this is active" signal.
 *
 * MEANING. In the Ziiro motion language a beam means active, selected, being
 * worked on. It is deliberately used in exactly two places, the Contact booking
 * card and the currently selected stage on Products, because the value of the
 * signal is entirely in its scarcity. If everything glows, nothing reads as
 * active. Do not reach for this to decorate a third thing.
 *
 * WHY THE BEAM IS AN OVERLAY RATHER THAN A WRAPPER.
 * `border-beam` is built to wrap its children, and the obvious shape is
 * `{loaded ? <BorderBeam>{children}</BorderBeam> : <div>{children}</div>}`.
 * That shape is wrong here and it fails loudly. Swapping the wrapper's element
 * type makes React unmount and rebuild the whole subtree, and both pages this
 * is used on animate their entrances imperatively: the card and the stage rows
 * start at inline `opacity: 0` and are brought to 1 by anime.js, and the arrow
 * and title nudges hold animatable handles to specific DOM nodes. A rebuild
 * hands back fresh nodes at `opacity: 0` with every handle pointing at a
 * detached element, so the content goes invisible the moment the beam arrives.
 *
 * So the children are rendered once, in a wrapper that never changes type, and
 * the beam is laid over them as an absolutely positioned sibling. Nothing
 * inside is ever remounted, no entrance is reset, and no handle is orphaned.
 * `pointer-events: none` keeps the overlay from eating clicks on the card it
 * sits on top of.
 *
 * COST. The site scores 62/100 on performance and its LCP is held up by
 * main-thread work during hydration, not by network weight, so this stays off
 * that path:
 *
 *   - `border-beam` is dynamically imported, so it lands in its own chunk and
 *     never enters the critical bundle.
 *   - The chunk is not requested until the host is near the viewport, so a
 *     visitor who never scrolls to it never pays for it.
 *   - Under prefers-reduced-motion the import never happens at all. The effect
 *     is absent rather than paused. (The library honours the preference too;
 *     this is belt and braces, and it saves the download.)
 *   - The animation is CSS keyframes driven by data attributes. No canvas, no
 *     WebGL, no timers, so an unlit beam costs the main thread nothing.
 *
 * PRERENDERING. No browser API in the render body. On the server and on first
 * paint this is a plain div around the real children, so a crawler receives the
 * content with no effect markup at all.
 *
 * `active` is a CSS state inside the library rather than a mount, which is what
 * lets the Products beam transfer between stages as a cross-fade.
 */
type BeamProps = {
  children: ReactNode;
  /** Sits on the wrapper, which is the grid item. Layout cannot shift when the
   *  beam loads, because the beam never participates in layout. */
  className?: string;
  /** False leaves the beam mounted but unlit. This is how it transfers. */
  active?: boolean;
  /** 0 to 1. The site's resting values are low on purpose. */
  strength?: number;
  /** Seconds per travel. Slower reads as alive; faster reads as urgent. */
  duration?: number;
  size?: BorderBeamProps["size"];
  /** Corner radius in px, to match the element underneath. The library's
   *  auto-detection reads its own first child, which here is the empty sizing
   *  span, so it has to be told. */
  radius?: number;
};

export default function Beam({
  children,
  className,
  active = true,
  strength = 0.22,
  duration = 8,
  size = "md",
  radius = 0,
}: BeamProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [Lit, setLit] = useState<ComponentType<BorderBeamProps> | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        import("border-beam")
          .then((mod) => {
            if (!cancelled) setLit(() => mod.BorderBeam);
          })
          // A failed chunk leaves the plain element on screen, which is the
          // whole point of the content not living inside the effect.
          .catch(() => {});
      },
      // Fetch a little before it is on screen so the beam is already there when
      // the section arrives, rather than lighting up late.
      { rootMargin: "200px" },
    );
    observer.observe(host);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={hostRef} className={className} style={{ position: "relative" }}>
      {children}
      {Lit && (
        <Lit
          className="pointer-events-none absolute inset-0"
          // Monochrome, always. The site is ink on white and the library's
          // default is a full rainbow, so these three are not optional:
          // `mono` picks the greyscale ramp, `staticColors` stops the hue-shift
          // animation, and `light` adapts the glow to a white ground.
          colorVariant="mono"
          staticColors
          theme="light"
          size={size}
          active={active}
          strength={strength}
          duration={duration}
          borderRadius={radius}
          aria-hidden="true"
        >
          <span className="block h-full w-full" />
        </Lit>
      )}
    </div>
  );
}
