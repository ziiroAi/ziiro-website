import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { Mail, Video, GitBranch, Users, PenLine } from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";
import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline";

const services = [
  {
    icon: Mail,
    name: "Cold Outreach",
    outcome: "More booked calls",
    desc: "Hyper-personalised email and LinkedIn sequences that land in inboxes, not spam — and get replies. We build, launch, and manage your entire outbound engine.",
  },
  {
    icon: Video,
    name: "UGC Ads & Management",
    outcome: "Lower CAC, higher ROAS",
    desc: "We source creators, produce UGC-style ads, and manage your paid campaigns across Meta and TikTok. Creative that converts, handled end to end.",
  },
  {
    icon: GitBranch,
    name: "Pipeline Automation",
    outcome: "Zero leads fall through",
    desc: "Automated follow-ups, CRM updates, and deal-stage triggers so your pipeline runs itself. No more manual data entry or missed opportunities.",
  },
  {
    icon: Users,
    name: "Lead Generation",
    outcome: "Qualified leads daily",
    desc: "We build targeted prospect lists and multi-channel flows that deliver sales-ready leads on autopilot. Your team closes — we fill the top of funnel.",
  },
  {
    icon: PenLine,
    name: "Social Content",
    outcome: "Always-on presence",
    desc: "Scroll-stopping posts, carousels, and short-form video content that builds your brand every day. Consistent output without the content team overhead.",
  },
];

const orbitalData = [
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

const Services = () => {
  return (
    <div className="relative" style={{ zIndex: 1 }}>
      <SEO
        title="Our Services - Cold Outreach, Lead Gen, Pipeline Automation and More"
        description="Five AI-powered services: cold outreach, UGC ads, pipeline automation, lead generation, and social content. One system built to grow your pipeline on autopilot."
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
                Five services. One system. Built to grow your pipeline on autopilot.
              </p>
              <p className="text-white/20 text-xs tracking-widest uppercase">
                Click any service node
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
            <div style={{ position: "absolute", inset: 0 }}>
              <RadialOrbitalTimeline timelineData={orbitalData} />
            </div>
          </div>

        </div>

        {/* Mobile orbital */}
        <div className="lg:hidden w-full" style={{ height: "420px" }}>
          <RadialOrbitalTimeline timelineData={orbitalData} />
        </div>
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
                Book a free call. We'll tell you exactly where AI will move the needle for your business.
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
