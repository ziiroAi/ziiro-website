import MotionReveal, { MotionRevealItem } from "@/shared/motion/MotionReveal";
import { STAGGER } from "@/shared/motion/tokens";
import SectionHeader from "@/shared/ui/section-header";

/**
 * Why work with us: how we approach the work, what we are good at, and what
 * sets us apart. Nothing here is new: every line is lifted from copy the site
 * already publishes, so change them together.
 *  - Numbers first, Simple beats clever, The mechanism, We use what we build:
 *    the Mission page's principles 01, 04, 02 and 05.
 *  - You keep the work, and the header: the retired Process page.
 *  - Model-agnostic: the "What Powers Ziiro" stack, which now runs as the
 *    section directly below this one rather than on the home page. Keep the
 *    two in step: this states the claim, that one is the evidence for it.
 */
const reasons = [
  {
    label: "Numbers first",
    body: "Every engagement begins with understanding operations, not pitching solutions.",
  },
  {
    label: "Simple beats clever",
    body: "If a spreadsheet fix saves more than an AI system, we'll tell you. We recommend what works, even if it's simpler and cheaper than expected.",
  },
  {
    label: "The mechanism, not the value",
    body: "The value is hours recovered, money saved, growth unlocked. AI is just how we get there.",
  },
  {
    label: "We use what we build",
    body: "We run our own company on the same systems we build for clients. If we wouldn't use it ourselves, we won't sell it to you.",
  },
  {
    label: "Model-agnostic",
    body: "GPT, Claude, Gemini. Interchangeable by design, and never the differentiator.",
  },
  {
    label: "You keep the work",
    body: "Even if we recommend building nothing, the process maps, the baselines and the ROI math stay yours.",
  },
];

export default function WhyWorkWithUs({ index }: { index: string }) {
  return (
    <section className="pb-24 md:pb-32">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <SectionHeader
          index={index}
          label="Why Work With Us"
          meta="No handoffs"
          titleA="The people who scope it"
          titleB="are the people who build it."
          sub="We stay small on purpose. No account layers, no handoff to a junior after the pitch: the person who maps your process is the person who ships the system."
        />

        <MotionReveal
          stagger={STAGGER.card}
          className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {reasons.map((r) => (
            <MotionRevealItem key={r.label}>
              <div className="flex h-full flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7">
                <h3 className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                  <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  {r.label}
                </h3>
                <p
                  className="mt-6 font-display font-medium text-[var(--text-primary)]"
                  style={{ fontSize: "clamp(1.1rem, 1.5vw, 1.3rem)", letterSpacing: "-0.02em", lineHeight: 1.35 }}
                >
                  {r.body}
                </p>
              </div>
            </MotionRevealItem>
          ))}
        </MotionReveal>
      </div>
    </section>
  );
}
