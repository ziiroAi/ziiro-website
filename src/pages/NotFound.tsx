import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { animate, createAnimatable, stagger } from "animejs";
import DotGlyph from "@/shared/ui/dot-glyph";

const DIGITS = ["4", "0", "4"];

const NotFound = () => {
  const location = useLocation();
  const rootRef = useRef<HTMLDivElement>(null);
  const floatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // The 404 digits rise in one by one
    const letters = root.querySelectorAll<HTMLElement>("[data-nf-letter]");
    const lettersAnim = animate(letters, {
      opacity: [0, 1],
      y: [56, 0],
      delay: reduced ? 0 : stagger(110, { start: 120 }),
      duration: reduced ? 0 : 900,
      ease: "out(3)",
    });

    // Everything else follows in a quieter stagger
    const rest = root.querySelectorAll<HTMLElement>("[data-nf-rise]");
    const restAnim = animate(rest, {
      opacity: [0, 1],
      y: [24, 0],
      delay: reduced ? 0 : stagger(90, { start: 420 }),
      duration: reduced ? 0 : 800,
      ease: "out(3)",
    });

    // Slow drift on the glyph, driven by an Animatable
    let float: ReturnType<typeof createAnimatable> | null = null;
    let interval: number | undefined;
    const floatEl = floatRef.current;
    if (floatEl && !reduced) {
      float = createAnimatable(floatEl, { y: 2800, ease: "inOut(2)" });
      let dir = 1;
      const drift = () => {
        float?.y(dir * 8);
        dir = -dir;
      };
      drift();
      interval = window.setInterval(drift, 2800);
    }

    return () => {
      lettersAnim.revert();
      restAnim.revert();
      if (interval !== undefined) window.clearInterval(interval);
      float?.revert();
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 pb-16 pt-28">
      <div ref={rootRef} className="flex w-full max-w-3xl flex-col items-center text-center">
        <p
          data-nf-rise
          style={{ opacity: 0 }}
          className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]"
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
          ( Signal Lost )
        </p>

        <h1
          className="mt-6 font-display font-semibold"
          style={{
            fontSize: "clamp(6rem, 18vw, 10rem)",
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          {DIGITS.map((d, i) => (
            <span
              key={i}
              data-nf-letter
              style={{ opacity: 0 }}
              className={`inline-block ${
                i === DIGITS.length - 1
                  ? "text-[var(--text-secondary)]"
                  : "text-[var(--text-primary)]"
              }`}
            >
              {d}
            </span>
          ))}
        </h1>

        <p
          data-nf-rise
          style={{ opacity: 0 }}
          className="mt-6 max-w-xl leading-relaxed text-[var(--text-secondary)]"
        >
          This route doesn't exist — yet.
        </p>

        <div data-nf-rise style={{ opacity: 0 }} className="mt-10">
          {/* Drift lives on an inner wrapper so its y-transform never fights
              the entrance rise applied to the outer element. */}
          <div ref={floatRef}>
            <DotGlyph variant="path" />
          </div>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-secondary)]">
            Fig. 404 — No route found
          </p>
        </div>

        <div
          data-nf-rise
          style={{ opacity: 0 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-6"
        >
          <Link
            to="/"
            className="rounded-full bg-[var(--text-primary)] px-8 py-3.5 font-mono text-xs font-semibold uppercase tracking-wide text-[var(--background)] transition-opacity hover:opacity-85"
          >
            Back to base
          </Link>
          <Link
            to="/contact"
            className="border-b border-[var(--text-primary)]/25 pb-1 font-mono text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)] transition-colors hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]"
          >
            Book a call
          </Link>
        </div>

        <p
          data-nf-rise
          style={{ opacity: 0 }}
          className="mt-12 max-w-full truncate font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]"
        >
          [ Requested: {location.pathname} ]
        </p>
      </div>
    </main>
  );
};

export default NotFound;
