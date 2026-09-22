import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import ErrorBoundary from "@/shared/components/ErrorBoundary";

const DotArt3D = lazy(() => import("@/ogl/DotArt3D"));

/**
 * Floor for the container BEFORE the lazy canvas arrives, so the page does not
 * shrink and re-lengthen around the chunk landing. Once DotArt3D mounts its own
 * section provides the real height, which is taller than this.
 */
const JOURNEY_HEIGHT = "300vh";

/**
 * How long the finished sculpture holds before the footer.
 *
 * SIZED FROM A MEASUREMENT, not from taste. Driven by real wheel events through
 * Lenis at a trackpad cadence, one firm flick carries roughly 1200px, so a hold
 * shorter than that is crossed by a single gesture: the reader arrives on flick
 * N and is gone on flick N+1, and the hold is never something they experience.
 * The sibling dwell at the end of Mission was 675px for exactly that reason and
 * read as no dwell at all. 140vh is ~1260px at a 900px viewport, which outlasts
 * one gesture and releases on the second.
 *
 * It is layout, not scroll-jacking: the section is simply longer than the
 * journey and the content is sticky inside it. Nothing intercepts the wheel,
 * nothing is pinned by script, and the reader can keep scrolling at their own
 * speed at any moment. Under reduced motion it drops to zero and the ending is
 * exactly what it was, which is the required alternative.
 */
const DWELL_VH = 140;

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
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const dwellVh = reducedMotion ? 0 : DWELL_VH;

  /**
   * The scene could not be built, either because it said so through `onFail`
   * or because it threw and the boundary caught it. Either way there is no
   * journey to scroll through, so the container stops reserving three screens
   * for one and the page closes on the ask alone.
   *
   * `useCallback` because DotArt3D holds this in a ref: a fresh arrow every
   * render would be harmless there but is free to avoid.
   */
  const [sceneFailed, setSceneFailed] = useState(false);
  const failScene = useCallback(() => setSceneFailed(true), []);

  /**
   * Under reduced motion the ask is simply THERE, with no fade and no offset,
   * which is the other half of the alternative the dwell owes that reader.
   *
   * It also closes a real hole. The fade is driven by the sticky screen's own
   * visibility, and at the very bottom of the document that screen is pushed up
   * by the height of the footer: measured at 1440x900 it sits at -525..375, a
   * ratio of 0.42, so it fades back out. With the dwell that barely matters,
   * because the ask has already held at full opacity for a screen and a half
   * before the footer takes over. With no dwell there is nothing before it, and
   * a reader who scrolled to the end of the home page found the closing ask at
   * opacity 0.
   *
   * `sceneFailed` is in here for the same reason. When the scene cannot be
   * built the ask IS the ending, so it is simply present rather than waiting
   * on an observer whose geometry just changed underneath it. A fallback that
   * can render at opacity 0 is not a fallback.
   */
  const revealed = reducedMotion || sceneFailed || ctaVisible;

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
  // the cue: no need to reach into DotArt3D's scene index for it. The ref sits
  // on the STICKY screen rather than the block around it, because that block is
  // now over two viewports tall and could never reach a ratio of 0.5.
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
      className="relative w-full"
      style={{
        minHeight: sceneFailed ? `${100 + dwellVh}vh` : JOURNEY_HEIGHT,
      }}
    >
      {/* THE BACKSTOP. The scene's own guards handle the failure we know
          about; this handles the one we do not. Without it a throw anywhere
          inside the 3D subtree unmounts the whole document, and this subtree
          is the last thing before the footer, so it takes the footer with it.
          The fallback is nothing at all, deliberately: the closing ask below
          is a sibling, not a child, so it is untouched by the failure and is
          already the ending the crawler and every no-JS reader get. */}
      {inView && (
        <ErrorBoundary onError={failScene}>
          <Suspense fallback={null}>
            <DotArt3D dwellVh={dwellVh} onFail={failScene} />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* Absolutely placed so its FIRST screen is the last screen of the
          journey: the ask arrives over the burst universe rather than over the
          morph, exactly as before. The block then continues for the dwell, and
          the screen inside it is sticky, so the ask holds there rather than
          being carried off at the moment it lands. */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 z-20 w-full"
        style={{ height: `${100 + dwellVh}vh` }}
      >
        <div
          ref={ctaRef}
          className="sticky top-0 flex h-screen w-full flex-col items-center justify-center text-center"
        >
          <div
            className="flex flex-col items-center transition-all duration-700 ease-out motion-reduce:transition-none"
            style={{
              opacity: revealed ? 1 : 0,
              transform: revealed ? "translateY(0)" : "translateY(24px)",
            }}
          >
            {/* Ink, not white. This copy used to sit over a black canvas; the
              canvas is paper now and the dots are the dark marks on it, so the
              closing ask is set the way the rest of the page is set and the
              button is the same filled black pill as the other CTAs. */}
            <span className="mb-6 font-mono text-[11px] uppercase tracking-[0.4em] text-[var(--text-muted)]">
              The beginning
            </span>
            <h2 className="max-w-3xl px-6 text-4xl font-semibold tracking-tight text-[var(--text-primary)] md:text-6xl">
              Ready to build?
            </h2>
            <p className="mt-4 max-w-md px-6 text-sm text-[var(--text-secondary)]">
              An hourly consultation. No pitch.
            </p>
            <Link
              to="/book-a-call"
              className="pointer-events-auto mt-10 rounded-full bg-[var(--text-primary)] px-8 py-3.5 text-xs font-semibold uppercase tracking-wide text-[var(--background)] transition-opacity hover:opacity-85"
            >
              Book a call
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
