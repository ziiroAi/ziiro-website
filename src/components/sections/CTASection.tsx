import { Link } from "react-router-dom";
import MotionReveal from "@/components/motion/MotionReveal";

export default function CTASection() {
  return (
    <section className="relative py-40 px-6 text-center overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 60%, var(--accent-surface) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10">
        <MotionReveal>
          <h2
            className="font-display font-bold text-[var(--text-primary)] mb-6"
            style={{ fontSize: "clamp(2.5rem, 6vw, 5.5rem)" }}
          >
            Ready to{" "}
            <span className="gradient-text">build?</span>
          </h2>
        </MotionReveal>

        <MotionReveal delay={0.1}>
          <p className="text-[var(--text-secondary)] text-lg mb-10 max-w-md mx-auto">
            Free 30-minute call. No pitch — just a clear read on where agents can create leverage.
          </p>
        </MotionReveal>

        <MotionReveal delay={0.2}>
          <Link to="/contact" className="btn-primary text-base font-bold inline-block">
            Book Your Call
          </Link>
        </MotionReveal>
      </div>
    </section>
  );
}
