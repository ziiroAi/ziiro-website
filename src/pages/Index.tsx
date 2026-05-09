import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { Mail, Video, GitBranch, Users, PenLine } from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";
import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline";

const steps = [
  { num: "01", title: "Discovery Call", detail: "We uncover where automation creates the biggest leverage and we learn your business." },
  { num: "02", title: "Architecture Blueprint", detail: "A custom system design with clear timeline and fixed pricing." },
  { num: "03", title: "Build & Deploy", detail: "Your AI system goes live in weeks, fully connected to your stack." },
  { num: "04", title: "Autonomous Growth", detail: "Your pipeline runs 24/7. You stay in control in 15–20 minutes per day." },
];

const servicesData = [
  {
    id: 1,
    title: "Cold Outreach",
    date: "More booked calls",
    content: "Hyper-personalised email and LinkedIn sequences that land in inboxes, not spam — and get replies.",
    category: "Outreach",
    icon: Mail,
    relatedIds: [3, 4],
    status: "completed" as const,
    energy: 92,
  },
  {
    id: 2,
    title: "UGC Ads & Management",
    date: "Lower CAC, higher ROAS",
    content: "We source creators, produce UGC-style ads, and manage your paid campaigns across Meta and TikTok.",
    category: "Ads",
    icon: Video,
    relatedIds: [4],
    status: "completed" as const,
    energy: 88,
  },
  {
    id: 3,
    title: "Pipeline Automation",
    date: "Zero leads fall through",
    content: "Automated follow-ups, CRM updates, and deal-stage triggers so your pipeline runs itself.",
    category: "Automation",
    icon: GitBranch,
    relatedIds: [1, 4],
    status: "completed" as const,
    energy: 95,
  },
  {
    id: 4,
    title: "Lead Generation",
    date: "Qualified leads daily",
    content: "We build targeted prospect lists and multi-channel flows that deliver sales-ready leads on autopilot.",
    category: "Growth",
    icon: Users,
    relatedIds: [1, 2, 3],
    status: "completed" as const,
    energy: 90,
  },
  {
    id: 5,
    title: "Social Content",
    date: "Always-on presence",
    content: "Scroll-stopping posts, carousels, and short-form video content that builds your brand every day.",
    category: "Content",
    icon: PenLine,
    relatedIds: [2, 4],
    status: "completed" as const,
    energy: 85,
  },
];

const Home = () => {
  return (
    <div className="relative" style={{ zIndex: 1 }}>
      <SEO
        title="AI Automation Agency - Scale Your Business on Autopilot"
        description="Ziiro AI automates your sales outreach, lead generation, pipeline management, and content — so your business runs 24/7. Book a free consultation today."
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
                <span className="text-white">LIMITS.</span>
                <br />
                <span className="gradient-text">INFINITE</span>
                <br />
                <span className="gradient-text">POSSIBILITIES.</span>
              </h1>

              <p className="text-white/50 text-base max-w-md mb-8 leading-relaxed">
                We automate your workflows, build AI agents, and scale your business — while you focus on what matters.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/contact" className="btn-primary-gradient text-sm font-bold tracking-wide">
                  Book Free Consultation
                </Link>
                <button
                  onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                  className="btn-glass text-sm"
                >
                  See How It Works
                </button>
              </div>

              <p className="mt-8 text-white/20 text-xs tracking-widest uppercase">
                Click any service node
              </p>
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
            <div style={{ position: "absolute", inset: 0 }}>
              <RadialOrbitalTimeline timelineData={servicesData} />
            </div>
          </div>

        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="relative py-24 px-6 border-t border-white/[0.06]">
        <div className="container mx-auto max-w-5xl">
          <AnimatedSection>
            <p className="section-label text-center mb-4">How it works</p>
            <h2 className="display-font text-center mb-14 text-white" style={{ fontSize: "clamp(2.5rem, 5vw, 5rem)" }}>
              FOUR STEPS TO <span className="gradient-text">AUTOMATION</span>
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

          {/* Header */}
          <AnimatedSection>
            <p className="section-label mb-4">Case Study</p>
            <h2 className="display-font text-white mb-5" style={{ fontSize: "clamp(2rem, 4.5vw, 4rem)" }}>
              We Run Our Own Pipeline<br />
              <span className="gradient-text">On This.</span>
            </h2>
            <p className="text-white/50 text-sm leading-relaxed max-w-xl mb-16">
              ZIIRO&apos;s go-to-market runs on the exact same AI automation system we build for clients.<br />
              Shared data layer. Centralized command center.<br />
              Pipeline runs 24/7.
            </p>
          </AnimatedSection>

          {/* Metrics row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-px mb-16" style={{ background: "rgba(255,255,255,0.06)" }}>
            {[
              { value: "24+", label: "AI workflows deployed", sub: "Lead sourcing, outreach, qualification, follow-ups, reporting" },
              { value: "24/7", label: "Autonomous operation", sub: "Outbound + inbound running nonstop" },
              { value: "~$200/mo", label: "Total infra cost", sub: "Tools, APIs, automation stack" },
              { value: "20 min/day", label: "Human time required", sub: "Only monitoring + approvals" },
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
              Our own client pipeline is powered entirely by this system.
              If it didn&apos;t work, we wouldn&apos;t run our business on it.
            </p>
          </AnimatedSection>

        </div>
      </section>

      {/* BOOK A CALL */}
      <section className="relative py-28 px-6 border-t border-white/[0.06] text-center">
        <AnimatedSection>
          <h2 className="display-font text-white mb-4" style={{ fontSize: "clamp(2.5rem, 6vw, 6rem)" }}>
            READY TO <span className="gradient-text">AUTOMATE?</span>
          </h2>
          <p className="text-white/45 mb-10 text-base max-w-lg mx-auto">
            Free 30-minute call. No pitch — just a clear plan for your business.
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
