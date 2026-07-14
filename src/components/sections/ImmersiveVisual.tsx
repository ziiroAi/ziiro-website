import MotionReveal from "@/components/motion/MotionReveal";
import ParallaxLayer from "@/components/motion/ParallaxLayer";

export default function ImmersiveVisual() {
  return (
    <section className="relative py-40 px-6 overflow-hidden">
      {/* Parallax background elements */}
      <ParallaxLayer speed={0.2} className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-10"
          style={{ background: "var(--accent)" }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full blur-3xl opacity-8"
          style={{ background: "var(--accent-light)" }}
        />
      </ParallaxLayer>

      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle, var(--text-primary) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <MotionReveal>
          <blockquote className="font-display text-[var(--text-primary)] leading-relaxed mb-8"
            style={{ fontSize: "clamp(1.3rem, 3vw, 2rem)" }}
          >
            "We don't sell AI tools. We build systems that compound.
            Every outcome feeds the next decision. Every cycle gets sharper.
            That's the difference between automation and intelligence."
          </blockquote>
        </MotionReveal>

        <MotionReveal delay={0.2}>
          <p className="text-sm text-[var(--text-muted)] font-mono tracking-wider uppercase">
            — Ziiro Methodology
          </p>
        </MotionReveal>
      </div>
    </section>
  );
}
