import SEO from "@/shared/components/SEO";
import Hero from "@/features/home/hero/Hero";
import SystemDirectory from "@/features/home/directory/SystemDirectory";
import HowItWorks from "@/features/home/sections/HowItWorks";
import WhyDifferent from "@/features/home/sections/WhyDifferent";
import WhatPowersZiiro from "@/features/home/sections/WhatPowersZiiro";
import FinalCta from "@/features/home/sections/FinalCta";
import DotArtSection from "@/features/home/sections/DotArtSection";
import ScrollScene, { SectionSeam } from "@/shared/motion/ScrollScene";

/**
 * One continuous story, not a stack of sections.
 *
 * Continuity is carried by the content itself rather than by a background
 * effect: every block below the hero is scrub-linked to scroll via
 * ScrollScene, so a section is already receding while the next is arriving and
 * the two overlap instead of hard-cutting. There is no decorative particle
 * field behind the copy — it competed with the text and earned nothing.
 *
 *   1. What is Ziiro?                   → Hero
 *   2. What does it actually run?       → SystemDirectory
 *   3. How does it work?                → HowItWorks
 *   4. Why not an agency / hire / GPT?  → WhyDifferent
 *   5. What powers it?                  → WhatPowersZiiro
 *   6. Why book today?                  → FinalCta
 *
 * Three deliberate exceptions to the scrubbing:
 *
 * The **hero** is not wrapped. It owns its own entrance timeline, and layering
 * a scroll scrub on top of that would fight it for the same opacity during the
 * first second of the page.
 *
 * **FinalCta** is wrapped with `hold`, so it arrives but never dims. It is the
 * booking ask and the last thing on the page — fading it out as the reader
 * approaches the button would be actively hostile.
 *
 * The **dot-art world** runs after the ask, as the closing note. It owns its
 * own scroll and its own visual language, so it is left alone entirely.
 *
 * The joins are SectionSeam rather than `border-t`. A hairline says these are
 * two separate documents; the seam is a soft band of the page's own light that
 * brightens as it crosses the middle of the screen, so a boundary reads as
 * something you pass through.
 */
export default function Home() {
  return (
    <div className="relative">
      <SEO
        title="Ziiro: AI That Has to Pay for Itself"
        description="Ziiro is a business-intelligence-first AI consultancy for founder-led teams. We find where your hours and money go, quantify the ROI, then build only the systems the numbers justify."
        canonical="/"
      />

      <div className="relative z-10">
        <Hero />

        {/* No seam between these two: the directory runs on the same near-black
            field as the hero, so the page opens as one dark block and a join
            across it would only read as a break in that field. */}
        <ScrollScene rise={20} exitTo={0.5}>
          <SystemDirectory />
        </ScrollScene>

        <SectionSeam />
        <ScrollScene>
          <HowItWorks />
        </ScrollScene>

        <SectionSeam />
        <ScrollScene>
          <WhyDifferent />
        </ScrollScene>

        <SectionSeam />
        <ScrollScene>
          <WhatPowersZiiro />
        </ScrollScene>

        {/* No seam: the argument has resolved, so the ask arrives on a clean
            field rather than behind another dividing line. */}
        <ScrollScene rise={30} hold>
          <FinalCta />
        </ScrollScene>
      </div>

      <DotArtSection />
    </div>
  );
}
