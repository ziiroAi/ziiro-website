import AnimatedSection from "@/components/AnimatedSection";
import GlassCard from "@/components/GlassCard";
import SEO from "@/components/SEO";

const steps = [
  { num: "01", title: "Systems Audit", time: "Free · 30 min", desc: "We map the repeated work, owner bottlenecks, and decision loops that should become agents." },
  { num: "02", title: "Agent Blueprint", time: "1–2 weeks", desc: "A practical architecture for the agents, tools, data, feedback loops, and guardrails." },
  { num: "03", title: "Build & Connect", time: "2–6 weeks", desc: "We connect the system into your stack: outreach, CRM, dashboards, internal ops, and role clarity." },
  { num: "04", title: "Measure & Improve", time: "Ongoing", desc: "We track the outcomes that matter and tune the system so it gets sharper over time." },
];

const values = [
  { icon: "01", title: "Agentic First", desc: "We focus on systems that can act, measure outcomes, and improve — not one-off content tasks." },
  { icon: "02", title: "Founder Leverage", desc: "The goal is to remove work from founders and tiny teams without adding management overhead." },
  { icon: "03", title: "Clear Control", desc: "No black boxes. You should know what the agent does, when it acts, and how performance is measured." },
];

const industries = ["Startups", "Solo Founders", "Founder-led Agencies", "SaaS", "Lean Service Teams", "Communities"];

const About = () => {
  return (
    <div className="relative" style={{ zIndex: 1 }}>
      <SEO
        title="About Ziiro - Founder-Led Agentic AI Studio"
        description="Ziiro is a founder-led AI studio building agentic systems, self-optimizing growth and workflow loops, website optimization, role diagnostics, and focused UGC ads management for lean teams."
        canonical="/about"
      />
      <div className="min-h-screen pt-32 pb-28 px-6">
        <div className="container mx-auto">

          <AnimatedSection>
            <p className="section-label text-center">Who we are</p>
            <h1
              className="display-font text-center mb-4 text-white"
              style={{ fontSize: "clamp(3rem, 7vw, 7rem)" }}
            >
              ABOUT <span className="gradient-text">ZIIRO</span>
            </h1>
            <p className="text-center text-white/45 max-w-2xl mx-auto mb-20">
              Ziiro is a founder-led AI studio building agentic systems for startups, solo founders, and lean teams that need leverage before they can afford headcount.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-24">
            <AnimatedSection>
              <GlassCard hover={false} className="h-full">
                <p className="section-label mb-4">Our Mission</p>
                <p className="text-white/65 leading-relaxed mb-6">
                  To turn repeated work into self-improving systems. We build agents, marketing and outreach loops, website optimization systems, role diagnostics, and selective UGC ad management that help small teams grow with more clarity and less manual drag.
                </p>
                <div
                  className="glass rounded-xl p-5"
                  style={{ borderColor: "rgba(160,168,196,0.15)", background: "rgba(160,168,196,0.04)" }}
                >
                  <p className="text-[#A8B4C8] font-semibold text-sm">
                    "Automating Tomorrow, Today."
                  </p>
                </div>
              </GlassCard>
            </AnimatedSection>

            <AnimatedSection delay={100}>
              <div className="flex flex-col gap-4 h-full">
                {values.map((v) => (
                  <GlassCard key={v.title} hover={false} className="flex-1">
                    <div className="flex items-start gap-4">
                      <span className="text-2xl">{v.icon}</span>
                      <div>
                        <h3 className="font-bold text-white mb-1">{v.title}</h3>
                        <p className="text-white/50 text-sm">{v.desc}</p>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </AnimatedSection>
          </div>

          <AnimatedSection>
            <p className="section-label text-center">How we work</p>
            <h2
              className="display-font text-center mb-16 text-white"
              style={{ fontSize: "clamp(2.5rem, 5vw, 5rem)" }}
            >
              OUR <span className="gradient-text">PROCESS</span>
            </h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-24">
            {steps.map((s, i) => (
              <AnimatedSection key={s.num} delay={i * 80}>
                <div className="glass rounded-xl p-7 h-full relative overflow-hidden">
                  <div
                    className="display-font text-8xl absolute -top-4 -right-2 select-none"
                    style={{ color: "rgba(255,255,255,0.03)", lineHeight: 1 }}
                  >
                    {s.num}
                  </div>
                  <div className="display-font text-5xl gradient-text mb-3 leading-none">{s.num}</div>
                  <h3 className="font-bold text-white mb-1">{s.title}</h3>
                  <span className="text-xs text-[#A8B4C8] font-semibold tracking-wide block mb-3">{s.time}</span>
                  <p className="text-white/50 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection>
            <p className="section-label text-center mb-6">Who we serve</p>
            <div className="flex flex-wrap justify-center gap-3">
              {industries.map((ind) => (
                <span key={ind} className="glass px-6 py-2.5 rounded-full text-sm text-white/65 font-medium">
                  {ind}
                </span>
              ))}
            </div>
          </AnimatedSection>

        </div>
      </div>
    </div>
  );
};

export default About;
