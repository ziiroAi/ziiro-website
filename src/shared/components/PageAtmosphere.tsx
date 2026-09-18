import { useEffect, useRef } from "react";

/**
 * The field behind the whole site, travelling with the reader.
 *
 * It was born to rescue a black ground: the hero and the directory painted
 * their own field and everything past them was flat black, so two warm and
 * violet lights were floated behind the page to stop it going dead. The ground
 * is paper now, and paper does not need rescuing. A saturated pool that reads
 * as light on black reads as a stain on white, so both hues are gone and what
 * is left is a neutral unevenness in the sheet.
 *
 * It is also off by default: `--page-atmosphere` is 0 in the palette, and this
 * component does no scroll work at all while it is. The layer stays because a
 * white page can still want its paper lit, and it is now drawn so that raising
 * that token gives light rather than a colour cast.
 *
 * Fixed rather than per-section on purpose: the shading stays put while content
 * moves over it, which reads as depth rather than as decoration attached to
 * a particular block.
 *
 * What changed, and why it matters more than it sounds:
 *
 * The lights used to be scroll-blind. They drifted on their own keyframes and
 * ignored the reader entirely, so every section arrived onto an identical
 * backdrop — which is precisely what made the page feel like a stack of panels
 * rather than one space. Sections can animate beautifully on their own and the
 * experience still reads as half-finished, because nothing connects them.
 *
 * Now the field is scroll-linked. Three things move as you travel:
 *
 *   1. PARALLAX. Each pool translates at its own fraction of the scroll, so
 *      passing a section boundary moves you *through* the light rather than
 *      cutting to the next slide. The rates are deliberately unequal — equal
 *      rates read as one flat plane sliding.
 *   2. HANDOFF. The warm pool leads at the top of the document, the violet
 *      takes over through the middle, and the warm returns for the closing
 *      ask. So the page has a colour arc, and arriving at the CTA feels like
 *      coming back to where you started rather than reaching the end of a list.
 *   3. DEPTH. The whole field creeps up in scale as you descend, which reads
 *      as the camera moving forward.
 *
 * Everything is transform and opacity, written straight to style inside a rAF.
 * No filter is animated: these pools carry a 70-80px blur, and re-running that
 * blur every frame is exactly the "large animated CSS filter in a continuous
 * scene" the design brief rules out. Blur is set once; only cheap compositor
 * properties move.
 */

/** Each pool's share of the scroll, and how its opacity arcs across the page.
 *  `lead` is where in the document (0..1) the light is at its brightest. */
const POOLS = [
  { rate: -0.16, lead: 0.06, spread: 0.5, base: 0.55, peak: 1 },
  { rate: 0.1, lead: 0.5, spread: 0.46, base: 0.5, peak: 1 },
  { rate: -0.07, lead: 0.9, spread: 0.42, base: 0.35, peak: 1 },
] as const;

export default function PageAtmosphere() {
  const poolRefs = useRef<(HTMLDivElement | null)[]>([]);
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Nothing is visible while the palette keeps the field at zero, and a
    // scroll listener that moves an invisible layer is pure cost on every page
    // of the site. Read once, in an effect, so SSR never touches the DOM.
    const level = getComputedStyle(document.documentElement)
      .getPropertyValue("--page-atmosphere")
      .trim();
    if (level !== "" && Number(level) === 0) return;

    let raf = 0;
    let last = -1;

    const apply = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const y = window.scrollY;
      const p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
      if (Math.abs(p - last) < 0.0004) return;
      last = p;

      // The field creeps forward as you descend. 3% over the whole document is
      // deliberately below the threshold you can catch happening.
      const field = fieldRef.current;
      if (field) field.style.transform = `scale(${(1 + p * 0.03).toFixed(4)})`;

      for (let i = 0; i < POOLS.length; i++) {
        const el = poolRefs.current[i];
        if (!el) continue;
        const { rate, lead, spread, base, peak } = POOLS[i];

        // Parallax against the actual pixels scrolled, not the fraction —
        // otherwise a long page and a short one move the light by wildly
        // different amounts for the same gesture.
        const ty = y * rate;

        // A soft bell centred on this pool's moment in the document.
        const d = (p - lead) / spread;
        const weight = Math.exp(-d * d);
        const opacity = base + (peak - base) * weight;

        el.style.transform = `translate3d(0, ${ty.toFixed(1)}px, 0)`;
        el.style.opacity = opacity.toFixed(3);
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const pool = (i: number) => (el: HTMLDivElement | null) => {
    poolRefs.current[i] = el;
  };

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ opacity: "var(--page-atmosphere, 1)" }}
    >
      <div ref={fieldRef} className="absolute inset-0" style={{ willChange: "transform" }}>
        {/* Each pool is the page's own ink at a few percent, not a hue. On
            paper that is the difference between a sheet that is lit unevenly
            and a sheet someone has spilled something on. */}
        <div
          ref={pool(0)}
          className="hero-drift-a absolute left-[-14%] top-[-6%] h-[78vh] w-[78vh] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--text-primary) 4%, transparent) 0%, transparent 70%)",
            filter: "blur(70px)",
            willChange: "transform, opacity",
          }}
        />
        <div
          ref={pool(1)}
          className="hero-drift-b absolute right-[-16%] top-[30%] h-[80vh] w-[80vh] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--text-primary) 4%, transparent) 0%, transparent 70%)",
            filter: "blur(70px)",
            willChange: "transform, opacity",
          }}
        />
        <div
          ref={pool(2)}
          className="hero-drift-a absolute bottom-[-14%] left-1/3 h-[60vh] w-[60vh] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--text-primary) 3%, transparent) 0%, transparent 68%)",
            filter: "blur(80px)",
            willChange: "transform, opacity",
          }}
        />
      </div>

      {/* Grain sits outside the moving field: it is a plate over the lens, not
          part of the scene, and it must not scale or it starts to shimmer. */}
      <div
        className="absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage: "var(--hero-noise)",
          backgroundSize: "160px 160px",
        }}
      />
    </div>
  );
}
