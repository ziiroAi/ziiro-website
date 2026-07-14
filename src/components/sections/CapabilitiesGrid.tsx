import { ClipboardCheck, BarChart3, Bot, RefreshCw, BrainCircuit, UserCheck } from "lucide-react";
import { StaggerContainer, StaggerItem } from "@/components/motion/StaggerChildren";
import MotionReveal from "@/components/motion/MotionReveal";

const capabilities = [
  {
    icon: ClipboardCheck,
    name: "AI Transformation Audit",
    desc: "A structured 7-phase methodology that maps your business, identifies AI opportunities, and builds a prioritized roadmap.",
    color: "#4A6CF7",
  },
  {
    icon: BarChart3,
    name: "Business Intelligence",
    desc: "KPI baselines, analytics dashboards, and ROI models that replace guesswork with clarity.",
    color: "#F59E0B",
  },
  {
    icon: Bot,
    name: "Agentic Systems",
    desc: "Custom AI operators that handle research, routing, follow-ups, reporting, and repetitive decisions.",
    color: "#10B981",
  },
  {
    icon: RefreshCw,
    name: "Self-Optimizing Loops",
    desc: "Marketing, outreach, website, and workflow systems that track outcomes and improve automatically.",
    color: "#8B5CF6",
  },
  {
    icon: BrainCircuit,
    name: "AI Strategy Sprints",
    desc: "Focused roadmaps that identify the highest-leverage system to build first — no random automations.",
    color: "#EC4899",
  },
  {
    icon: UserCheck,
    name: "Role & People Diagnostics",
    desc: "Understand what each person should own, where they're miscast, and which work should move to agents.",
    color: "#06B6D4",
  },
];

export default function CapabilitiesGrid() {
  return (
    <section id="capabilities" className="relative py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <MotionReveal className="text-center mb-16">
          <p className="section-label mb-4">Capabilities</p>
          <h2
            className="font-display font-bold text-[var(--text-primary)] leading-tight"
            style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
          >
            Everything we{" "}
            <span className="gradient-text">deliver.</span>
          </h2>
        </MotionReveal>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((cap) => {
            const Icon = cap.icon;
            return (
              <StaggerItem key={cap.name}>
                <div className="liquid-glass p-7 h-full group hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden">
                  {/* Color glow */}
                  <div
                    className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-15 transition-opacity duration-500"
                    style={{ background: cap.color }}
                  />

                  <div className="relative z-10">
                    <div className="w-11 h-11 rounded-xl neo-inset flex items-center justify-center mb-5">
                      <Icon size={20} style={{ color: cap.color }} />
                    </div>

                    <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">
                      {cap.name}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      {cap.desc}
                    </p>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
}
