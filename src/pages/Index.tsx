import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { Bot, BrainCircuit, Clapperboard, RefreshCw, UserCheck } from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";
import DeferredDottedSurface from "@/components/DeferredDottedSurface";
import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline";
import { selfOptimizingSystemNodes } from "@/data/self-optimizing-systems";

const steps = [
  { num: "01", title: "Systems Audit", detail: "We find the manual loops, decision bottlenecks, and founder tasks that should become agentic systems." },
  { num: "02", title: "Agent Blueprint", detail: "A clear architecture for the agents, tools, data, and feedback loops your business actually needs." },
  { num: "03", title: "Build & Connect", detail: "We ship the workflows into your stack: outreach, CRM, reporting, role clarity, and internal ops." },
  { num: "04", title: "Measure & Improve", detail: "The system tracks outcomes, learns what works, and gives your team a simple control panel." },
];

const servicesData = [
  {
    id: 1,
    title: "Agentic Systems",
    date: "Custom AI operators",
    content: "We build agents that handle real business workflows: research, routing, follow-ups, reporting, and repetitive decisions.",
    category: "Agents",
    icon: Bot,
    relatedIds: [3, 4],
    status: "completed" as const,
    energy: 96,
  },
  {
    id: 2,
    title: "Self-Optimizing Systems",
    date: "Feedback loops that learn",
    content: "Marketing, outreach, website, and workflow loops that track outcomes and improve automatically over time.",
    category: "Optimization",
    icon: RefreshCw,
    relatedIds: [1, 3],
    status: "completed" as const,
    energy: 94,
    childNodes: selfOptimizingSystemNodes,
  },
  {
    id: 3,
    title: "UGC Ads & Management",
    date: "Creator-led growth",
    content: "Creator sourcing, UGC-style ad production, and Meta/TikTok campaign management as a focused side growth channel.",
    category: "Creative Growth",
    icon: Clapperboard,
    relatedIds: [1, 2, 4],
    status: "completed" as const,
    energy: 92,
  },
  {
    id: 4,
    title: "AI Strategy Sprint",
    date: "Know what to build",
    content: "We map your team, stack, and constraints into a focused roadmap instead of selling random automations.",
    category: "Consulting",
    icon: BrainCircuit,
    relatedIds: [1, 3, 5],
    status: "completed" as const,
    energy: 88,
  },
  {
    id: 5,
    title: "Role Analyzer",
    date: "People in the right seats",
    content: "A diagnostic that reveals what each person should own, so founders stop dragging people through the wrong work.",
    category: "People Ops",
    icon: UserCheck,
    relatedIds: [3, 4],
    status: "completed" as const,
    energy: 86,
  },
];

const Home = () => {
  const scrollBehavior = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

  return (
    <div className="relative" style={{ zIndex: 1 }}>
      <DeferredDottedSurface />
      <SEO
        title="Agentic AI Systems for Startups and Solo Founders"
        description="Ziiro builds agentic AI systems, self-optimizing marketing, outreach, website, and workflow loops, plus role diagnostics for startups and solo founders."
        canonical="/"
      />

      {/* HERO */}
      <section className="relative overflow-hidden" style={{ minHeight: "100vh" }}>
        <div className="grid grid-cols-1 lg:grid-cols-2" style={{ minHeight: "100vh" }}>

          {/* Left — text */}
          <div className="flex flex-col justify-center px-8 md:px-14 pt-28 pb-12 lg:pt-0 lg:pb-0" style={{ zIndex: 2 }}>
            <AnimatedSection>
              <h1 className="display-font leading-none mb-6" style={{ fontSize: "clamp(2.6rem, 5.5vw, 5.5rem)" }}>
                <span className="text-white">ZIIRO</span>
                <br />
                <span className="text-white">BUILDS</span>
                <br />
                <span className="gradient-text">AGENTIC</span>
                <br />
                <span className="gradient-text">SYSTEMS.</span>
              </h1>

              <p className="text-white/50 text-base max-w-md mb-8 leading-relaxed">
                We build self-improving AI systems for startups and solo founders: agents that automate work, learn from outcomes, and free you from manual drag.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/contact" className="btn-primary-gradient text-sm font-bold tracking-wide">
                  Book Free Consultation
                </Link>
                <button
                  onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: scrollBehavior() })}
                  className="btn-glass text-sm"
                >
                  See How It Works
                </button>
              </div>

            </AnimatedSection>
          </div>

          {/* Right — orbital services */}
          <div
            className="hidden lg:block relative"
            style={{
              minHeight: "100vh",
              background: "linear-gradient(to right, transparent 0%, #060610 18%)",
            }}
          >
            <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
              <RadialOrbitalTimeline timelineData={servicesData} />
            </div>
            <p
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-white/35 text-xs tracking-widest uppercase"
              style={{ top: "min(calc(50% + 270px), calc(100% - 56px))", zIndex: 0 }}
            >
              Click any service node
            </p>
          </div>

        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="relative py-24 px-6 border-t border-white/[0.06]">
        <div className="container mx-auto max-w-5xl">
          <AnimatedSection>
            <p className="section-label text-center mb-4">How it works</p>
            <h2 className="display-font text-center mb-14 text-white" style={{ fontSize: "clamp(2.5rem, 5vw, 5rem)" }}>
              FOUR STEPS TO <span className="gradient-text">AGENTS</span>
            </h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-px" style={{ background: "rgba(255,255,255,0.06)" }}>
            {steps.map((s, i) => (
              <div key={s.num} className="h-full">
                <AnimatedSection delay={i * 100} className="h-full">
                  <div className="flex flex-col px-7 py-10 bg-[#060610] h-full">
                    <div className="display-font gradient-text mb-4 leading-none" style={{ fontSize: "2.5rem" }}>{s.num}</div>
                    <h3 className="font-bold text-white text-sm mb-3">{s.title}</h3>
                    <p className="text-white/40 text-xs leading-relaxed">{s.detail}</p>
                  </div>
                </AnimatedSection>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CASE STUDY */}
      <section id="results" className="relative py-24 border-t border-white/[0.06]">
        <div className="mx-auto max-w-6xl px-8">

          <AnimatedSection>
            <p className="section-label mb-4">Strategic Focus</p>
            <h2 className="display-font text-white mb-5" style={{ fontSize: "clamp(2rem, 4.5vw, 4rem)" }}>
              Built For Founder-Led Teams<br />
              <span className="gradient-text">That Need Leverage.</span>
            </h2>
            <p className="text-white/50 text-sm leading-relaxed max-w-xl mb-16">
              Ziiro is focused on agentic AI systems for lean, founder-led teams.
              The goal is simple: turn repeated work into measurable systems that improve with every outcome.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-px mb-16" style={{ background: "rgba(255,255,255,0.06)" }}>
            {[
              { value: "Agents", label: "Core offer", sub: "Custom AI operators for real workflows, not surface-level automation" },
              { value: "Loops", label: "Differentiator", sub: "Marketing, website, outreach, and ops systems that track outcomes and improve over time" },
              { value: "Founders", label: "Primary ICP", sub: "Startups, solo founders, and lean teams that need leverage fast" },
              { value: "Roles", label: "People fit", sub: "Diagnostics that help each person own the work they are best built for" },
            ].map((m, i) => (
              <div key={m.label} className="h-full">
                <AnimatedSection delay={i * 80} className="h-full">
                  <div className="bg-[#060610] px-6 py-10 h-full flex flex-col">
                    <div className="display-font text-white mb-2" style={{ fontSize: "clamp(1.4rem, 2vw, 2rem)" }}>
                      {m.value}
                    </div>
                    <p className="text-white/70 text-xs font-semibold mb-2 tracking-wide">{m.label}</p>
                    <p className="text-white/30 text-xs leading-relaxed">{m.sub}</p>
                  </div>
                </AnimatedSection>
              </div>
            ))}
          </div>

          {/* Trust footer */}
          <AnimatedSection>
            <p className="text-white/25 text-xs text-center border-t border-white/[0.06] pt-8">
              We are steering Ziiro toward agentic AI products and systems that double as real portfolio proof.
            </p>
          </AnimatedSection>

        </div>
      </section>

      {/* BOOK A CALL */}
      <section className="relative py-28 px-6 border-t border-white/[0.06] text-center">
        <AnimatedSection>
          <h2 className="display-font text-white mb-4" style={{ fontSize: "clamp(2.5rem, 6vw, 6rem)" }}>
            READY TO <span className="gradient-text">BUILD AGENTS?</span>
          </h2>
          <p className="text-white/45 mb-10 text-base max-w-lg mx-auto">
            Free 30-minute call. No pitch — just a clear read on where agents can create leverage.
          </p>
          <Link to="/contact" className="btn-primary-gradient text-base font-bold inline-block">
            Book Your Free Call
          </Link>
        </AnimatedSection>
      </section>

    </div>
  );
};

export default Home;
