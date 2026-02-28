import AnimatedSection from "@/components/AnimatedSection";
import GlassCard from "@/components/GlassCard";
import StatBox from "@/components/StatBox";

const steps = [
  { num: "01", title: "Discovery Call", time: "Free 30-45 min", desc: "We learn about your business, pain points, and goals." },
  { num: "02", title: "Assessment & Strategy", time: "1-2 weeks", desc: "We audit your processes and design an AI automation roadmap." },
  { num: "03", title: "Design & Planning", time: "1-2 weeks", desc: "Detailed technical planning and solution architecture." },
  { num: "04", title: "Development & Testing", time: "2-6 weeks", desc: "We build, test, and refine your custom automation solutions." },
  { num: "05", title: "Deployment", time: "1-2 weeks", desc: "Seamless rollout with zero downtime and full monitoring." },
  { num: "06", title: "Training & Support", time: "Ongoing", desc: "Comprehensive training and continuous optimization." },
];

const industries = ["E-commerce", "Real Estate", "Healthcare", "Finance", "SaaS", "Professional Services"];

const About = () => {
  return (
    <div className="relative z-10 min-h-screen pt-28 pb-20 px-4">
      <div className="container mx-auto">
        <AnimatedSection>
          <h1 className="text-4xl md:text-6xl font-black text-center mb-4 gradient-text">About Ziiro</h1>
          <p className="text-center text-muted-alpha max-w-2xl mx-auto mb-16">
            We're a team of AI experts on a mission to make intelligent automation accessible to every business.
          </p>
        </AnimatedSection>

        {/* Who We Are */}
        <AnimatedSection>
          <GlassCard hover={false}>
            <h2 className="text-2xl font-bold text-foreground mb-4">Who We Are</h2>
            <p className="text-muted-alpha text-sm mb-6">
              Ziiro is an AI company that helps businesses streamline operations, reduce costs, and scale intelligently. We combine deep technical expertise with business acumen to deliver solutions that generate real ROI.
            </p>
            <h3 className="text-lg font-semibold text-foreground mb-2">Our Mission</h3>
            <p className="text-muted-alpha text-sm mb-6">
              To democratize AI automation and empower businesses of all sizes to operate at peak efficiency.
            </p>
            <h3 className="text-lg font-semibold text-foreground mb-3">Our Values</h3>
            <div className="space-y-2">
              {["Innovation First", "Client Success", "Transparency"].map((v) => (
                <div key={v} className="flex items-center gap-2 text-sm text-secondary-alpha">
                  <span className="text-accent">◆</span> {v}
                </div>
              ))}
            </div>
          </GlassCard>
        </AnimatedSection>

        {/* Process */}
        <AnimatedSection>
          <h2 className="text-3xl md:text-4xl font-black text-center mb-12 gradient-text">Our Process</h2>
        </AnimatedSection>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {steps.map((s, i) => (
            <AnimatedSection key={s.num} delay={i * 100}>
              <GlassCard className="h-full">
                <div className="text-3xl font-black gradient-text mb-2">{s.num}</div>
                <h3 className="text-lg font-bold text-foreground mb-1">{s.title}</h3>
                <span className="text-xs text-accent font-medium">{s.time}</span>
                <p className="text-muted-alpha text-sm mt-3">{s.desc}</p>
              </GlassCard>
            </AnimatedSection>
          ))}
        </div>

        {/* Industries */}
        <AnimatedSection>
          <h2 className="text-3xl md:text-4xl font-black text-center mb-8 gradient-text">Industries We Serve</h2>
        </AnimatedSection>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {industries.map((ind, i) => (
            <AnimatedSection key={ind} delay={i * 80}>
              <GlassCard className="text-center py-6">
                <span className="text-sm font-semibold text-foreground">{ind}</span>
              </GlassCard>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </div>
  );
};

export default About;
