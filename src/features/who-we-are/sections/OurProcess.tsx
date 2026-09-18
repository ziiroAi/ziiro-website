import { useEffect, useRef, useState } from "react";
import { createAnimatable, cubicBezier } from "animejs";
import MotionReveal, { MotionRevealItem } from "@/shared/motion/MotionReveal";
import { CSS_EASE, DURATION, EASE_IN_OUT, MS, STAGGER } from "@/shared/motion/tokens";
import SectionHeader from "@/shared/ui/section-header";
import MethodPath from "@/shared/ui/method-path";
import { PHASES, PROCESS_TERMS } from "@/features/who-we-are/entities/phases";

/** In-page target for links to the process: /who-we-are#process, and anything
 *  that used to point at the retired Process page. */
export const PROCESS_ID = "process";

const TOTAL = String(PHASES.length).padStart(2, "0");

/** The active station's number lighting up. Colour only, on the swap duration,
 *  so it lands as one event with the journey map's station. Inactive stations
 *  stay at full strength: they are content to read ahead, not disabled. */
const STATION_LIGHT = `color ${DURATION.swap}s ${CSS_EASE.outExpo}`;

/**
 * Our process: how an engagement runs, its phases beside the journey map, and
 * what a client can expect from it (the terms strip and each phase's artifact).
 * The phase crossing the middle of the viewport is the active one, and the
 * map's lit route follows it. The map is a fixed 560px canvas, so it only shows
 * from xl up, where each column is at least that wide (at lg it was clipped by
 * the viewport and ran into the phase text); below that the phases read as a
 * plain numbered list.
 */
export default function OurProcess({ index }: { index: string }) {
  const [active, setActive] = useState(0);
  const blocksRef = useRef<HTMLDivElement>(null);
  const progress = useRef({ p: 0 });
  const progressAnim = useRef<ReturnType<typeof createAnimatable> | null>(null);
  const activeRef = useRef(0);

  useEffect(() => {
    // The reader can scroll back up, so this value has to reverse mid-flight:
    // the symmetric curve, not the expo-out used for one-way travel.
    progressAnim.current = createAnimatable(progress.current, {
      p: MS.statement,
      ease: cubicBezier(...EASE_IN_OUT),
    });
    return () => {
      progressAnim.current?.revert();
    };
  }, []);

  // Activate the phase crossing the vertical centre of the viewport
  useEffect(() => {
    const root = blocksRef.current;
    if (!root) return;
    const blocks = [...root.querySelectorAll<HTMLElement>("[data-phase]")];
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const idx = Number((entry.target as HTMLElement).dataset.phase);
          if (idx === activeRef.current) continue;
          activeRef.current = idx;
          setActive(idx);
          progressAnim.current?.p(idx);
        }
      },
      { rootMargin: "-42% 0px -42% 0px" },
    );
    blocks.forEach((b) => io.observe(b));
    return () => io.disconnect();
  }, []);

  return (
    <section id={PROCESS_ID} className="pb-24 md:pb-32">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <SectionHeader
          index={index}
          label="Our Process"
          meta={`${TOTAL} phases`}
          titleA="What happens,"
          titleB="and when."
          sub="It starts with a paid consultation, billed hourly. If there's work worth doing, the phases below follow, and each one ends in something concrete you keep, whether or not we build anything together."
        />

        <MotionReveal
          stagger={STAGGER.card}
          className="mt-12 grid grid-cols-1 border-y border-[var(--border)] sm:grid-cols-3"
        >
          {PROCESS_TERMS.map((term) => (
            <MotionRevealItem
              key={term}
              className="border-t border-[var(--border)] py-5 font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-secondary)] first:border-t-0 sm:border-l sm:border-t-0 sm:pl-8 sm:first:border-l-0 sm:first:pl-0"
            >
              {term}
            </MotionRevealItem>
          ))}
        </MotionReveal>

        <div className="mt-16 grid grid-cols-1 gap-16 xl:grid-cols-2">
          {/* The journey map rides along while the phases scroll */}
          <div className="hidden xl:block">
            <div className="sticky top-[calc(50vh_-_360px)] flex justify-center">
              <MethodPath progress={progress.current} labels={PHASES.map((p) => p.num)} />
            </div>
          </div>

          <div ref={blocksRef}>
            {/* `amount={0}` is load-bearing: an IntersectionObserver threshold
                is a fraction of the TARGET, and this column is taller than a
                phone screen several times over, so any higher threshold can
                never be reached and the phases would stay hidden for good. */}
            <MotionReveal stagger={STAGGER.card} amount={0}>
              {PHASES.map((phase, i) => {
                const isActive = active === i;
                return (
                  <MotionRevealItem key={phase.num}>
                    <div
                      data-phase={i}
                      className={`border-b border-[var(--border)] pb-10 ${i === 0 ? "" : "pt-10"}`}
                    >
                      <div className="mb-3 flex items-baseline justify-between gap-4">
                        <span
                          className="font-mono text-sm"
                          style={{
                            color: isActive ? "var(--accent)" : "var(--text-secondary)",
                            transition: STATION_LIGHT,
                          }}
                        >
                          {phase.num} / {TOTAL}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                          {phase.days}
                        </span>
                      </div>

                      <h3
                        className="font-display font-semibold text-[var(--text-primary)]"
                        style={{ fontSize: "clamp(1.4rem, 2.2vw, 1.9rem)", letterSpacing: "-0.03em" }}
                      >
                        {phase.name}
                      </h3>

                      <p className="mt-3 max-w-md leading-relaxed text-[var(--text-secondary)]">
                        {phase.desc}
                      </p>

                      <p className="mt-5 inline-block rounded-full border border-[var(--border)] px-4 py-2 font-mono text-xs tracking-wide text-[var(--text-secondary)]">
                        → {phase.output}
                      </p>
                    </div>
                  </MotionRevealItem>
                );
              })}
            </MotionReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
