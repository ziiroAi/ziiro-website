import SectionHeader from "@/shared/ui/section-header";
import ScrollScene from "@/shared/motion/ScrollScene";
import { useSectionProgress } from "../narrative/useSectionProgress";

/**
 * The "we're not another AI agency" beat, argued against the three things a
 * founder is actually choosing between: an agency, hiring internally, or just
 * using the chat tools directly.
 *
 * The narrative move is scroll-linked rather than decorative: as the section
 * travels up, the three alternatives recede and Ziiro strengthens, so by the
 * time the visitor reaches the bottom only one route is still going. That
 * hands straight into the next section, which is what the surviving route
 * turns out to be made of.
 */
const alternatives = [
  {
    name: "Typical AI agency",
    points: [
      "Starts with AI tools",
      "Sells automation first",
      "Generic workflows",
      "Measures activity",
      "One-time delivery",
    ],
  },
  {
    name: "Internal team",
    points: [
      "Knows the business",
      "Hard to scale",
      "Expensive to staff",
      "Slow execution",
      "Limited AI expertise",
    ],
  },
  {
    name: "ChatGPT or Claude alone",
    points: [
      "Gives you answers",
      "No business context",
      "No integrations",
      "No implementation",
      "No accountability",
    ],
  },
];

const ziiro = [
  "Starts with business intelligence",
  "Finds where money is actually lost",
  "Quantifies ROI before building",
  "Builds only what the numbers justify",
  "Measures outcomes continuously",
  "Keeps improving the system after launch",
];

export default function WhyDifferent() {
  const { ref, progress } = useSectionProgress<HTMLDivElement>();

  // The alternatives hold their ground through the first half of the section
  // (they have to be readable to make the argument) and only fall away once
  // the visitor has passed them.
  const fade = Math.max(0, Math.min(1, (progress - 0.52) / 0.34));
  const altOpacity = 1 - fade * 0.72;
  const altShift = fade * 22;

  return (
    <section ref={ref} className="relative px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          index="03"
          label="Why We're Different"
          meta="the comparison"
          titleA="Four ways to get AI."
          titleB="One that pays back."
          sub="You have real alternatives to hiring us. Here is what each of them actually gets you."
        />

        <div className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {alternatives.map((alt, i) => (
            <div
              key={alt.name}
              style={{
                opacity: altOpacity,
                transform: `translate3d(0, ${altShift.toFixed(1)}px, 0)`,
                transition: "none",
                willChange: "opacity, transform",
              }}
            >
              <ScrollScene rise={20} exitTo={1}>
                <div className="flex h-full flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7">
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                    {alt.name}
                  </p>
                  <ul className="mt-7 space-y-4">
                    {alt.points.map((p) => (
                      <li
                        key={p}
                        className="flex gap-3 text-sm leading-relaxed text-[var(--text-secondary)]"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-2 h-px w-3 shrink-0 bg-[var(--text-secondary)]"
                        />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollScene>
            </div>
          ))}

          {/* The route that keeps going. It gains presence as the others lose it. */}
          <ScrollScene rise={20} exitTo={1}>
            <div
              className="neo-inset flex h-full flex-col rounded-2xl border p-7"
              style={{
                // color-mix against the accent rather than literal white:
                // white read cold beside the warm ink in dark, and disappeared
                // completely on warm paper in light, taking the whole
                // scroll-linked strengthening beat with it.
                borderColor: `color-mix(in srgb, var(--accent) ${(26 + fade * 40).toFixed(0)}%, var(--border-strong))`,
              }}
            >
              <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-primary)]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)]" />
                Ziiro
              </p>
              <ul className="mt-7 space-y-4">
                {ziiro.map((p) => (
                  <li
                    key={p}
                    className="flex gap-3 text-sm leading-relaxed text-[var(--text-primary)]"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--text-primary)]"
                    />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </ScrollScene>
        </div>
      </div>
    </section>
  );
}
