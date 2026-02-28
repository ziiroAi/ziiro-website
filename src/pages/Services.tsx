import { Link } from "react-router-dom";
import AnimatedSection from "@/components/AnimatedSection";
import GlassCard from "@/components/GlassCard";

const services = [
  {
    icon: "🤖",
    name: "AI Chatbots & Virtual Assistants",
    desc: "24/7 customer support automation that handles inquiries, qualifies leads, and schedules appointments.",
    features: ["Multi-channel deployment", "50+ languages", "Lead qualification", "Appointment scheduling"],
    price: "$500/month",
  },
  {
    icon: "⚡",
    name: "Workflow Automation",
    desc: "Automate repetitive tasks across your entire tech stack and free your team for high-value work.",
    features: ["CRM automation", "Email sequences", "Data sync", "Document processing"],
    price: "$1,500/month",
  },
  {
    icon: "📊",
    name: "Data Processing & Analytics",
    desc: "Transform raw data into actionable insights with AI-powered analytics and visualization.",
    features: ["Predictive analytics", "Custom dashboards", "Automated reporting", "Data visualization"],
    price: "$2,000/month",
  },
  {
    icon: "✍️",
    name: "Content Generation",
    desc: "AI-powered content creation at scale for every channel and audience.",
    features: ["SEO content", "Social media automation", "Email marketing", "Product descriptions"],
    price: "$1,500/month",
  },
  {
    icon: "💰",
    name: "Sales & Marketing Automation",
    desc: "Intelligent lead management that nurtures prospects and closes deals faster.",
    features: ["Lead scoring", "Email campaigns", "Retargeting", "A/B testing"],
    price: "$2,500/month",
  },
  {
    icon: "🎨",
    name: "Custom AI Solutions",
    desc: "Tailored automation solutions designed specifically for your unique business challenges.",
    features: ["Custom AI models", "API development", "Legacy integration", "Voice automation"],
    price: "Custom quote",
  },
];

const Services = () => {
  return (
    <div className="relative z-10 min-h-screen pt-28 pb-20 px-4">
      <div className="container mx-auto">
        <AnimatedSection>
          <h1 className="text-4xl md:text-6xl font-black text-center mb-4 gradient-text">
            Our Services
          </h1>
          <p className="text-center text-muted-alpha max-w-2xl mx-auto mb-16">
            Comprehensive AI automation solutions tailored to your business needs.
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((s, i) => (
            <AnimatedSection key={s.name} delay={i * 100}>
              <GlassCard className="h-full flex flex-col">
                <div className="text-4xl mb-4">{s.icon}</div>
                <h3 className="text-xl font-bold text-foreground mb-2">{s.name}</h3>
                <p className="text-muted-alpha text-sm mb-4">{s.desc}</p>
                <ul className="space-y-1.5 mb-6 flex-1">
                  {s.features.map((f) => (
                    <li key={f} className="text-sm text-secondary-alpha flex items-center gap-2">
                      <span className="text-accent">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-foreground/10">
                  <span className="text-sm font-semibold gradient-text">{s.price}</span>
                  <Link to="/contact" className="btn-glass text-xs !px-5 !py-2">
                    Learn More
                  </Link>
                </div>
              </GlassCard>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Services;
