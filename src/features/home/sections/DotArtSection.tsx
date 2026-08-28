import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const DotArt3D = lazy(() => import("@/ogl/DotArt3D"));

/** Matches the scroll height of DotArt3D's own section. */
const JOURNEY_HEIGHT = "300vh";

/**
 * The closing dot-art journey, and the ask that lands on the end of it.
 *
 * Two things are deliberate here.
 *
 * The CTA lives in this component rather than inside DotArt3D, because
 * DotArt3D is lazy and `renderToString` cannot flush Suspense: anything inside
 * that boundary is absent from the prerendered HTML. The homepage's closing ask
 * was invisible to every crawler that doesn't execute JavaScript. Out here it
 * ships in the static HTML, positioned over the last screen of the journey so
 * the visual payoff is unchanged.
 *
 * And the WebGL import waits for the viewport. `lazy` only code-splits, so
 * previously the chunk downloaded and ran on every homepage visit whether or
 * not anyone scrolled this far, spending ~470ms of main thread during hydration
 * on an effect below the fold.
 */
export default function DotArtSection() {
  const ref = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);

  // Load the canvas only once the journey is near. Generous margin so the
  // chunk is decoded before the section is actually on screen.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setInView(true);
        io.disconnect();
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The CTA occupies the final screen of the journey, so its own visibility is
  // the cue: no need to reach into DotArt3D's scene index for it.
  useEffect(() => {
    const el = ctaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setCtaVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setCtaVisible(entry.intersectionRatio > 0.5),
      { threshold: [0, 0.5, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="relative w-full bg-[#040507]"
      style={{ minHeight: JOURNEY_HEIGHT }}
    >
      {inView && (
        <Suspense fallback={null}>
          <DotArt3D />
        </Suspense>
      )}

      {/* Absolutely placed on the last screen of the journey, so it arrives
          over the burst universe rather than over the morph. */}
      <div
        ref={ctaRef}
        className="pointer-events-none absolute bottom-0 left-0 z-20 flex h-screen w-full flex-col items-center justify-center text-center"
      >
        <div
          className="flex flex-col items-center transition-all duration-700 ease-out motion-reduce:transition-none"
          style={{
            opacity: ctaVisible ? 1 : 0,
            transform: ctaVisible ? "translateY(0)" : "translateY(24px)",
          }}
        >
          <span className="mb-6 font-mono text-[11px] uppercase tracking-[0.4em] text-white/40">
            The beginning
          </span>
          <h2 className="max-w-3xl px-6 text-4xl font-semibold tracking-tight text-white md:text-6xl">
            Ready to build?
          </h2>
          <p className="mt-4 max-w-md px-6 text-sm text-white/50">
            Free 30-minute call. No pitch.
          </p>
          <Link
            to="/contact"
            className="pointer-events-auto mt-10 rounded-full bg-white px-8 py-3.5 text-xs font-semibold uppercase tracking-wide text-black transition-opacity hover:opacity-85"
          >
            Book your call
          </Link>
        </div>
      </div>
    </div>
  );
}
