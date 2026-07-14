import { useEffect, useRef, useState } from "react";
import { animate, onScroll, utils } from "animejs";
import SectionHeader from "@/shared/ui/section-header";
import MethodPath from "@/shared/ui/method-path";

const phases = [
  { num: "01", name: "Understand", output: "Business model canvas", desc: "Discovery sessions examining revenue models, customer journeys, operations, cost structure, and growth blockers." },
  { num: "02", name: "Map", output: "Process flowcharts", desc: "Visual documentation of every process step — flagging manual work, bottlenecks, repeated tasks, errors, and handoffs." },
  { num: "03", name: "Measure", output: "KPI baselines", desc: "Establishing baseline metrics: revenue health, operational efficiency, error rates — before any changes." },
  { num: "04", name: "Identify", output: "AI opportunity list", desc: "Evaluating each problem against automation, prediction, summarization, classification, optimization, and decision assistance criteria." },
  { num: "05", name: "Calculate", output: "ROI per opportunity", desc: "Quantifying monthly savings, implementation costs, break-even timelines, and Year 1 ROI for every opportunity." },
  { num: "06", name: "Prioritize", output: "Priority matrix", desc: "Ranking opportunities by value vs. implementation difficulty — a clear 2×2 grid for decision-making." },
  { num: "07", name: "Roadmap", output: "Implementation plan", desc: "Month-by-month implementation with milestones, dependencies, and success criteria for each system." },
];

export default function OrbitalMethodology() {
  const [active, setActive] = useState(0);
  const blocksRef = useRef<HTMLDivElement>(null);
  const progress = useRef({ p: 0 });
  const activeRef = useRef(0);

  // The journey-map progress is scrubbed directly by scroll (with smoothing),
  // so fast scrolling never skips or snaps — the route light always glides.
  // The active phase falls out of the same value, keeping map and copy in sync.
  useEffect(() => {
    const root = blocksRef.current;
    if (!root) return;

    const setActiveIdx = (idx: number) => {
      if (idx !== activeRef.current) {
        activeRef.current = idx;
        setActive(idx);
      }
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Discrete activation, no easing: the phase crossing viewport center wins
      const blocks = [...root.querySelectorAll<HTMLElement>("[data-phase]")];
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const idx = Number((entry.target as HTMLElement).dataset.phase);
            progress.current.p = idx;
            setActiveIdx(idx);
          }
        },
        { rootMargin: "-42% 0px -42% 0px" },
      );
      blocks.forEach((b) => io.observe(b));
      return () => io.disconnect();
    }

    const scrubber = onScroll({
      target: root,
      // p = 0 when the first station reaches viewport center,
      // p = 6 when the last one leaves it — mirrors the sticky map.
      enter: "center top",
      leave: "center bottom",
      sync: 0.12,
    });

    const scrub = animate(progress.current, {
      p: [0, phases.length - 1],
      ease: "linear",
      duration: 1000,
      autoplay: scrubber,
      onUpdate: () => {
        setActiveIdx(
          utils.clamp(Math.round(progress.current.p), 0, phases.length - 1),
        );
      },
    });

    return () => {
      scrub.cancel();
      scrubber.revert();
    };
  }, []);

  return (
    <section id="methodology" className="relative px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          index="02"
          label="Our Methodology"
          meta="07 phases"
          titleA="Seven phases."
          titleB="One system."
          sub="The AI Transformation Audit: a structured route that starts with your business, not with technology. Scroll the path."
        />

        <div className="mt-20 grid grid-cols-1 gap-16 lg:grid-cols-2">
          {/* The journey map rides along while the phases scroll */}
          <div className="hidden lg:block">
            <div className="sticky top-[calc(50vh_-_300px)] flex justify-center">
              <MethodPath progress={progress.current} />
            </div>
          </div>

          {/* Phase stations */}
          <div ref={blocksRef}>
            {phases.map((phase, i) => {
              const isActive = active === i;
              return (
                <div
                  key={phase.num}
                  data-phase={i}
                  className="border-b border-[var(--border)] py-12 transition-opacity duration-500 first:pt-0"
                  style={{ opacity: isActive ? 1 : 0.35 }}
                >
                  <div className="mb-3 flex items-baseline justify-between">
                    <span
                      className={`font-mono text-sm transition-colors duration-500 ${
                        isActive ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"
                      }`}
                    >
                      {phase.num} / 07
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                      {isActive ? "Current station" : ""}
                    </span>
                  </div>
                  <h3
                    className="mb-3 font-display font-semibold tracking-[-0.03em] text-[var(--text-primary)]"
                    style={{ fontSize: "clamp(1.5rem, 2.4vw, 2.1rem)" }}
                  >
                    {phase.name}
                  </h3>
                  <p className="mb-5 max-w-md leading-relaxed text-[var(--text-secondary)]">
                    {phase.desc}
                  </p>
                  <span className="neo-inset inline-block rounded-full px-4 py-2 font-mono text-xs tracking-wide text-[var(--text-secondary)]">
                    → {phase.output}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
