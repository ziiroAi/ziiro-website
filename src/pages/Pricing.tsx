import { useState } from "react";
import { Link } from "react-router-dom";
import AnimatedSection from "@/components/AnimatedSection";
import GlassCard from "@/components/GlassCard";

const plans = [
  {
    name: "Starter",
    price: "$1,500",
    setup: "$1,000",
    badge: "Small Business",
    featured: false,
    features: [
      "1 AI chatbot OR 1 focused agentic system",
      "Integration with up to 3 tools",
      "Basic analytics dashboard",
      "Email support (48h response)",
      "Monthly optimisation call",
      "3-month minimum commitment",
    ],
    cta: "Get Started",
  },
  {
    name: "Growth",
    price: "$2,500",
    setup: "$1,000",
    badge: "Most Popular",
    featured: true,
    features: [
      "1 AI chatbot + 2 self-optimizing systems",
      "Integration with up to 10 tools",
      "Advanced analytics (3 dashboards)",
      "Priority support (24h response)",
      "2 monthly optimisation calls",
      "Quarterly strategy session",
      "Content generation (20 pieces/month)",
      "Training for up to 5 team members",
      "6-month minimum commitment",
      "10% discount for annual payment",
    ],
    cta: "Get Started",
  },
  {
    name: "Enterprise",
    price: "$3,000+",
    setup: "Custom",
    badge: "Large Teams",
    featured: false,
    features: [
      "Unlimited chatbots and agentic systems",
      "Unlimited tool integrations",
      "Custom AI model development",
      "Unlimited dashboards & analytics",
      "24/7 priority support",
      "Dedicated account manager",
      "Weekly optimisation calls",
      "Monthly strategy sessions",
      "Custom reporting",
      "Unlimited team training",
      "SLA guarantees",
      "15% discount for annual payment",
    ],
    cta: "Contact Sales",
  },
];

const addons = [
  { name: "Extra agentic system", price: "+$500/mo" },
  { name: "Additional dashboard", price: "+$400/mo" },
  { name: "Training session", price: "$200" },
  { name: "Emergency support", price: "$100/hr" },
];

const faqs = [
  { q: "Can I upgrade my plan later?", a: "Absolutely. Upgrade at any time and we'll prorate the difference — no penalty, no hassle." },
  { q: "What's included in setup?", a: "Integration configuration, custom system design, testing, and initial training for your team." },
  { q: "Do you offer refunds?", a: "We offer a satisfaction guarantee within the first 30 days. If you're not happy, we'll work with you to make it right." },
  { q: "How long are the contracts?", a: "Starter: 3 months. Growth: 6 months. Enterprise: 12 months. Annual payment gets you a discount." },
  { q: "What payment methods do you accept?", a: "All major credit cards, ACH transfers, and wire transfers for enterprise accounts." },
];

const Pricing = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="relative" style={{ zIndex: 1 }}>
      <div className="min-h-screen pt-32 pb-28 px-6">
        <div className="container mx-auto">

          <AnimatedSection>
            <p className="section-label text-center">Investment</p>
            <h1
              className="display-font text-center mb-4 text-white"
              style={{ fontSize: "clamp(3rem, 7vw, 7rem)" }}
            >
              TRANSPARENT <span className="gradient-text">PRICING</span>
            </h1>
            <p className="text-center text-white/45 max-w-xl mx-auto mb-20">
              No hidden fees. No surprise invoices. Pick the plan that matches where your business is going.
            </p>
          </AnimatedSection>

          {/* Pricing cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start mb-24">
            {plans.map((p, i) => (
              <AnimatedSection key={p.name} delay={i * 120}>
                <div
                  className={`glass rounded-xl p-8 relative ${
                    p.featured ? "lg:scale-105 lg:-my-4" : ""
                  }`}
                  style={
                    p.featured
                      ? { border: "1px solid rgba(160,168,196,0.2)", background: "rgba(160,168,196,0.05)" }
                      : {}
                  }
                >
                  {p.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span
                        className={`text-xs font-bold px-4 py-1 rounded-full ${
                          p.featured
                            ? "btn-primary-gradient !py-1 !px-4"
                            : "glass text-white/55"
                        }`}
                      >
                        {p.badge}
                      </span>
                    </div>
                  )}

                  <div className="text-center mt-4 mb-8">
                    <h3 className="font-bold text-white mb-2">{p.name}</h3>
                    <div className="display-font gradient-text leading-none mb-1" style={{ fontSize: "3.5rem" }}>
                      {p.price}
                    </div>
                    <span className="text-xs text-white/40">/month · Setup: {p.setup}</span>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {p.features.map((f) => (
                      <li key={f} className="text-sm text-white/65 flex items-start gap-2">
                        <span className="text-[#A8B4C8] mt-0.5 shrink-0">✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/contact"
                    className={`block text-center w-full ${p.featured ? "btn-primary-gradient font-bold" : "btn-glass"}`}
                  >
                    {p.cta}
                  </Link>
                </div>
              </AnimatedSection>
            ))}
          </div>

          {/* Add-ons */}
          <AnimatedSection>
            <p className="section-label text-center mb-6">Add-ons</p>
          </AnimatedSection>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-24">
            {addons.map((a, i) => (
              <AnimatedSection key={a.name} delay={i * 60}>
                <GlassCard className="text-center">
                  <h4 className="text-sm font-semibold text-white mb-1">{a.name}</h4>
                  <span className="text-sm gradient-text font-bold">{a.price}</span>
                </GlassCard>
              </AnimatedSection>
            ))}
          </div>

          {/* FAQ */}
          <AnimatedSection>
            <p className="section-label text-center mb-6">Got questions?</p>
            <h2
              className="display-font text-center mb-12 text-white"
              style={{ fontSize: "clamp(2rem, 4vw, 4rem)" }}
            >
              FREQUENTLY ASKED
            </h2>
          </AnimatedSection>

          <div className="max-w-2xl mx-auto space-y-3">
            {faqs.map((f, i) => (
              <AnimatedSection key={i} delay={i * 50}>
                <button
                  className="glass w-full text-left p-5 rounded-xl transition-all duration-200 hover:bg-white/[0.07]"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-sm font-semibold text-white">{f.q}</span>
                    <span className="text-[#A8B4C8] text-lg shrink-0">{openFaq === i ? "−" : "+"}</span>
                  </div>
                  {openFaq === i && (
                    <p className="text-sm text-white/50 mt-3 leading-relaxed">{f.a}</p>
                  )}
                </button>
              </AnimatedSection>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Pricing;
