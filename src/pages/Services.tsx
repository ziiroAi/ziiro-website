import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { Bot, BrainCircuit, Clapperboard, RefreshCw, UserCheck } from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";
import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline";
import { selfOptimizingSystemNodes } from "@/data/self-optimizing-systems";

const services = [
  {
    icon: Bot,
    name: "Agentic Systems",
    outcome: "Custom AI operators",
    desc: "We build agents that solve real business workflows: research, routing, follow-ups, reporting, decision support, and repetitive ops that should not live in a founder's head.",
  },
  {
    icon: RefreshCw,
    name: "Self-Optimizing Systems",
    outcome: "Feedback loops that learn",
    desc: "We build marketing, outreach, website, and workflow loops that track outcomes, learn what works, and improve automatically instead of guessing forever.",
  },
  {
    icon: Clapperboard,
    name: "UGC Ads & Management",
    outcome: "Creator-led growth",
    desc: "We source creators, produce UGC-style ads, and manage paid campaigns across Meta and TikTok as a focused side growth channel, not the core identity of Ziiro.",
  },
  {
    icon: BrainCircuit,
    name: "AI Strategy Sprint",
    outcome: "Know what to build",
    desc: "We map your team, stack, and bottlenecks into a focused AI roadmap. No random tools, no black-box pitch — just the highest-leverage system to build first.",
  },
  {
    icon: UserCheck,
    name: "Role Analyzer",
    outcome: "People in the right seats",
    desc: "A people-fit diagnostic for founder-led teams: understand what each person should own, where they are miscast, and how to redesign roles for throughput.",
  },
];

const orbitalData = [
  {
    id: 1,
    title: "Agentic Systems",
    date: "Custom AI operators",
    content: "Agents for research, routing, reporting, follow-ups, and repeated decisions.",
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
    content: "Marketing, outreach, website, and workflow loops that improve automatically over time.",
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
    content: "Creator sourcing, UGC-style ad production, and paid campaign management across Meta and TikTok.",
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
    content: "A focused roadmap for the highest-leverage agentic system to ship first.",
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
    content: "A diagnostic for matching people to the work they should actually own.",
    category: "People Ops",
    icon: UserCheck,
    relatedIds: [3, 4],
    status: "completed" as const,
    energy: 86,
  },
];

const Services = () => {
  return (
    <div className="relative" style={{ zIndex: 1 }}>
      <SEO
        title="Our Services - Agentic Systems, Self-Optimizing Systems, UGC Ads"
        description="Ziiro builds agentic AI systems, self-optimizing marketing, outreach, website, and workflow loops, UGC ads management, AI strategy sprints, and role diagnostics for lean teams."
        canonical="/services"
      />

      {/* HERO — orbital */}
      <section className="relative overflow-hidden border-b border-white/[0.06]" style={{ minHeight: "100vh" }}>
        <div className="grid grid-cols-1 lg:grid-cols-2" style={{ minHeight: "100vh" }}>

          {/* Left — headline */}
          <div className="flex flex-col justify-center px-8 md:px-14 pt-28 pb-12 lg:pt-0 lg:pb-0" style={{ zIndex: 2 }}>
            <AnimatedSection>
              <p className="section-label mb-4">What we do</p>
              <h1 className="display-font text-white leading-none mb-6" style={{ fontSize: "clamp(3.5rem, 7vw, 8rem)" }}>
                WHAT<br /><span className="gradient-text">WE DO.</span>
              </h1>
              <p className="text-white/45 text-lg max-w-md leading-relaxed mb-8">
                Five agentic offers. One direction: turn repeated work into systems that learn.
              </p>
            </AnimatedSection>
          </div>

          {/* Right — orbital */}
          <div
            className="hidden lg:block relative"
            style={{
              minHeight: "100vh",
              background: "linear-gradient(to right, transparent 0%, #060610 18%)",
            }}
          >
            <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
              <RadialOrbitalTimeline timelineData={orbitalData} />
            </div>
            <p
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-white/35 text-xs tracking-widest uppercase"
              style={{ top: "min(calc(50% + 270px), calc(100% - 56px))", zIndex: 0 }}
            >
              Click any service node
            </p>
          </div>

        </div>

        {/* Mobile orbital */}
        <div className="lg:hidden w-full" style={{ height: "560px" }}>
          <RadialOrbitalTimeline timelineData={orbitalData} />
        </div>
        <p className="lg:hidden pb-8 text-center text-white/35 text-xs tracking-widest uppercase">
          Click any service node
        </p>
      </section>

      {/* SERVICE LIST */}
      <div className="pb-28 px-6 pt-20">
        <div className="container mx-auto max-w-5xl">
          <AnimatedSection>
            <p className="section-label mb-10">Our Services</p>
          </AnimatedSection>

          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            {services.map((s, i) => (
              <AnimatedSection key={s.name} delay={i * 60}>
                <div className="flex flex-col md:flex-row md:items-center gap-4 py-8 group">
                  <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg glass">
                    <s.icon size={18} className="text-[#A8B4C8]" />
                  </div>
                  <div className="flex-1 md:pl-4">
                    <div className="flex flex-col md:flex-row md:items-baseline md:gap-4 mb-1">
                      <h3 className="text-lg font-bold text-white">{s.name}</h3>
                      <span className="text-xs font-bold text-[#A8B4C8] tracking-widest uppercase">{s.outcome}</span>
                    </div>
                    <p className="text-white/45 text-sm leading-relaxed">{s.desc}</p>
                  </div>
                  <Link
                    to="/contact"
                    className="btn-glass text-xs !px-5 !py-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Get Started →
                  </Link>
                </div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection delay={200}>
            <div className="mt-24 text-center">
              <h2 className="display-font text-white mb-4" style={{ fontSize: "clamp(2rem, 5vw, 4.5rem)" }}>
                NOT SURE WHERE TO START?
              </h2>
              <p className="text-white/45 mb-8">
                Book a free call. We'll identify the first agentic system worth building for your business.
              </p>
              <Link to="/contact" className="btn-primary-gradient font-bold inline-block">
                Book Free Consultation
              </Link>
            </div>
          </AnimatedSection>

        </div>
      </div>
    </div>
  );
};

export default Services;
