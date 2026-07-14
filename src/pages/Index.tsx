import SEO from "@/components/SEO";
import HeroCarousel from "@/components/sections/HeroCarousel";
import DotArtSection from "@/components/sections/DotArtSection";
import ServicesCarousel from "@/components/sections/ServicesCarousel";
import OrbitalMethodology from "@/components/sections/OrbitalMethodology";
import RollingCounters from "@/components/sections/RollingCounters";

export default function Home() {
  return (
    <div className="relative">
      <SEO
        title="Ziiro — Leverage AI Anywhere"
        description="Ziiro is a force multiplier for founder-led teams: we start with business intelligence, prove the ROI, then build agentic systems and self-optimizing loops — any industry, any function, any process."
        canonical="/"
      />

      <HeroCarousel />

      <DotArtSection />

      <div id="services">
        <ServicesCarousel />
      </div>

      <div id="methodology" className="border-t border-[var(--border)]">
        <OrbitalMethodology />
      </div>

      <div className="border-t border-[var(--border)]">
        <RollingCounters />
      </div>
    </div>
  );
}
