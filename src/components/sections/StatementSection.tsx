import MotionReveal from "@/components/motion/MotionReveal";

export default function StatementSection() {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center px-6 py-32">
      {/* Soft background glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          background: "radial-gradient(circle at 50% 50%, var(--accent-surface) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 max-w-4xl text-center">
        <MotionReveal>
          <p className="section-label mb-6">Our Philosophy</p>
        </MotionReveal>

        <MotionReveal delay={0.1}>
          <h2
            className="font-display font-bold text-[var(--text-primary)] leading-[1.1] mb-8 text-balance"
            style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}
          >
            We start with your business.{" "}
            <span className="gradient-text">Find the problems.</span>{" "}
            Then prescribe the right system.
          </h2>
        </MotionReveal>

        <MotionReveal delay={0.2}>
          <p className="text-[var(--text-secondary)] text-lg leading-relaxed max-w-2xl mx-auto mb-10">
            Most AI consultancies sell tools. We sell outcomes. Our methodology inverts the traditional approach:
            understand your business first, map every process, measure what matters, then build only the systems
            that create real leverage.
          </p>
        </MotionReveal>

        <MotionReveal delay={0.3}>
          <a
            href="#methodology"
            className="btn-glass text-sm font-semibold inline-block"
          >
            Explore our method
          </a>
        </MotionReveal>
      </div>
    </section>
  );
}
