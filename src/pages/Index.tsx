import SEO from "@/shared/components/SEO";
import HeroBackdrop from "@/features/home/sections/HeroBackdrop";
import Hero from "@/features/home/sections/Hero";
import HowItWorks from "@/features/home/sections/HowItWorks";
import WhyDifferent from "@/features/home/sections/WhyDifferent";
import WhatPowersZiiro from "@/features/home/sections/WhatPowersZiiro";
import FinalCta from "@/features/home/sections/FinalCta";
import DotArtSection from "@/features/home/sections/DotArtSection";

/**
 * One continuous story, not a stack of sections.
 *
 * Continuity is carried by the content itself rather than by a background
 * effect: every block is scrub-linked to scroll via ScrollScene, so a section
 * is already receding while the next is arriving, and the comparison section
 * lets three of its four routes fall away as you pass them. There is no
 * decorative particle field behind the copy — it competed with the text and
 * earned nothing.
 *
 *   1. What is Ziiro?                   → Hero
 *   2. How does it work?                → HowItWorks
 *   3. Why not an agency / hire / GPT?  → WhyDifferent
 *   4. What powers it?                  → WhatPowersZiiro
 *   5. Why book today?                  → FinalCta
 *
 * The dot-art world runs after the ask, as the closing note. It owns its own
 * scroll and its own visual language.
 */
export default function Home() {
  return (
    <div className="relative">
      <SEO
        title="Ziiro: AI That Has to Pay for Itself"
        description="Ziiro is a business-intelligence-first AI consultancy for founder-led teams. We find where your hours and money go, quantify the ROI, then build only the systems the numbers justify."
        canonical="/"
      />

      {/* Starfield, hero only: fades out across the first screen. */}
      <HeroBackdrop />

      <div className="relative z-10">
        <Hero />

        <div className="border-t border-[var(--border)]">
          <HowItWorks />
        </div>

        <div className="border-t border-[var(--border)]">
          <WhyDifferent />
        </div>

        <div className="border-t border-[var(--border)]">
          <WhatPowersZiiro />
        </div>

        {/* No border: the argument has resolved, so the ask arrives on a clean
            field rather than behind another dividing line. */}
        <FinalCta />
      </div>

      <DotArtSection />
    </div>
  );
}
