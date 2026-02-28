import { Link } from "react-router-dom";
import AnimatedSection from "@/components/AnimatedSection";
import GlassCard from "@/components/GlassCard";
import StatBox from "@/components/StatBox";
import FloatingBubbles from "@/components/FloatingBubbles";

const features = [
  { icon: "🚀", title: "Lightning Fast", desc: "Deploy in weeks, see ROI in 3-6 months with rapid AI integration." },
  { icon: "💎", title: "Premium Quality", desc: "Enterprise-grade AI solutions built for reliability and scale." },
  { icon: "🎯", title: "Result-Driven", desc: "Save 20-40 hours weekly with intelligent process automation." },
  { icon: "🔒", title: "Secure & Compliant", desc: "GDPR and HIPAA compliant solutions you can trust." },
  { icon: "🤝", title: "Dedicated Support", desc: "24/7 priority support from our expert automation team." },
  { icon: "📈", title: "Scalable Solutions", desc: "Architecture that grows seamlessly with your business." },
];

const Home = () => {
  return (
    <div className="relative min-h-screen">
      <FloatingBubbles />

      {/* Hero */}
      <section className="relative z-10 min-h-screen flex items-center justify-center px-4 pt-20">
        <div className="text-center max-w-4xl mx-auto">
          <AnimatedSection>
            <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6">
              <span className="gradient-text">Transform Your Business</span>
              <br />
              <span className="text-foreground">with AI</span>
            </h1>
          </AnimatedSection>
          <AnimatedSection delay={200}>
            <p className="text-lg md:text-xl text-secondary-alpha max-w-2xl mx-auto mb-10">
              Automate workflows, boost productivity, and scale effortlessly with intelligent automation solutions.
            </p>
          </AnimatedSection>
          <AnimatedSection delay={400}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/contact" className="btn-primary-gradient text-base">
                Start Your Journey
              </Link>
              <Link to="/services" className="btn-glass text-base">
                Explore Services
              </Link>
            </div>
          </AnimatedSection>
          <AnimatedSection delay={600}>
            <div className="mt-12 max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-2xl aspect-video">
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/djV11Xbc914"
                title="Ziiro AI Agency"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="border-0"
              />
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 py-20 px-4">
        <div className="container mx-auto">
          <AnimatedSection>
            <h2 className="text-3xl md:text-5xl font-black text-center mb-4 gradient-text">
              Why Choose Ziiro?
            </h2>
            <p className="text-center text-muted-alpha mb-12 max-w-xl mx-auto">
              We deliver measurable results through cutting-edge AI automation.
            </p>
          </AnimatedSection>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <AnimatedSection key={f.title} delay={i * 100}>
                <GlassCard className="h-full">
                  <div className="text-4xl mb-4">{f.icon}</div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{f.title}</h3>
                  <p className="text-muted-alpha text-sm">{f.desc}</p>
                </GlassCard>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <AnimatedSection>
            <GlassCard hover={false} className="text-center py-16 px-8">
              <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4">
                Ready to Automate?
              </h2>
              <p className="text-muted-alpha mb-8 max-w-lg mx-auto">
                Schedule a free consultation and discover how Ziiro can save you 20-40 hours per week.
              </p>
              <Link to="/contact" className="btn-primary-gradient text-base inline-block">
                Book Free Consultation
              </Link>
            </GlassCard>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
};

export default Home;
