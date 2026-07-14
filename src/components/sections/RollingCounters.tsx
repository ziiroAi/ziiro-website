import { useEffect, useRef } from "react";
import { animate, onScroll, stagger, utils } from "animejs";
import SectionHeader from "@/components/ui/section-header";

const metrics = [
  { value: 2400, suffix: "+", label: "Hours Automated", sub: "Weekly across client systems" },
  { value: 47, suffix: "", label: "Systems Built", sub: "Agents, loops, and dashboards" },
  { value: 12000, suffix: "+", label: "Decisions / Day", sub: "Handled by our agents" },
];

const format = (n: number, suffix: string) =>
  `${Math.round(n).toLocaleString("en-US")}${suffix}`;

export default function RollingCounters() {
  const gridRef = useRef<HTMLDivElement>(null);

  // Cards rise in and the numbers count up — both fire once, on scroll enter.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const cards = [...grid.querySelectorAll<HTMLElement>("[data-metric-card]")];
    const values = [...grid.querySelectorAll<HTMLElement>("[data-metric-value]")];

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      cards.forEach((card) => {
        card.style.opacity = "1";
      });
      values.forEach((el, i) => {
        el.textContent = format(metrics[i].value, metrics[i].suffix);
      });
      return;
    }

    const anims: ReturnType<typeof animate>[] = [];
    const trigger = onScroll({ target: grid, enter: "bottom-=10% top" });

    anims.push(
      animate(cards, {
        opacity: [0, 1],
        y: [28, 0],
        duration: 700,
        ease: "out(3)",
        delay: stagger(110),
        autoplay: trigger,
        onBegin: () => {
          // Count up on plain objects; utils.round keeps the digits honest
          values.forEach((el, i) => {
            const { value, suffix } = metrics[i];
            const counter = { v: 0 };
            anims.push(
              animate(counter, {
                v: value,
                duration: 1400,
                delay: 150 + i * 110,
                ease: "out(3)",
                onUpdate: () => {
                  el.textContent = format(utils.round(counter.v, 0), suffix);
                },
                onComplete: () => {
                  el.textContent = format(value, suffix);
                },
              }),
            );
          });
        },
      }),
    );

    return () => {
      anims.forEach((a) => a.cancel());
      trigger.revert();
    };
  }, []);

  return (
    <section className="relative px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          index="03"
          label="Our Impact"
          meta="running totals"
          titleA="Measured in outcomes,"
          titleB="not promises."
        />

        <div ref={gridRef} className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-3">
          {metrics.map((m) => (
            <div
              key={m.label}
              data-metric-card
              style={{ opacity: 0 }}
              className="neo-inset flex min-h-[220px] flex-col justify-between rounded-2xl p-8"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--accent)]">
                {m.label}
              </p>
              <div>
                <div
                  data-metric-value
                  className="font-display font-semibold text-[var(--text-primary)]"
                  style={{
                    fontSize: "clamp(2.6rem, 5vw, 3.8rem)",
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                  }}
                >
                  {format(0, m.suffix)}
                </div>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
                  {m.sub}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
