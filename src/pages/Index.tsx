import SEO from "@/shared/components/SEO";
import Hero from "@/features/home/hero/Hero";
import BrandFilm from "@/features/home/sections/BrandFilm";
import SystemDirectory from "@/features/home/directory/SystemDirectory";
import HowItWorks from "@/features/home/sections/HowItWorks";
import WhyDifferent from "@/features/home/sections/WhyDifferent";
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
 * The handover is deliberately decisive: a block is gone, not dimmed, by the
 * time its neighbour is seated, so the reader is on one section at a time.
 * Nothing here takes the scroller hostage to do it — no wheel interception, no
 * scroll-snap, no paging. The page still scrolls exactly as fast as the reader
 * scrolls it, PageDown still pages, and #how-it-works still lands; the effect
 * is opacity read off where the blocks happen to be. Under reduced motion each
 * scene renders at full strength with no scrub at all.
 *
 *   1. What is Ziiro?                   → Hero
 *   2. What does it actually run?       → SystemDirectory
 *   3. How does it work?                → HowItWorks
 *   4. Why not an agency / hire / GPT?  → WhyDifferent
 *   5. Why book today?                  → FinalCta
 *
 * "What powers it?" used to sit between the last two as the stack diagram.
 * It moved to /who-we-are, where it now runs as section 05 directly after Why
 * Work With Us, whose "Model-agnostic" line it exists to prove. Numbered
 * section headers on this page therefore run 01-03 with nothing skipped.
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
        title="Agentic AI Systems for Founder-Led Teams"
        description="Ziiro is a business-intelligence-first AI consultancy for founder-led teams. We quantify the ROI first, then build only the systems the numbers justify."
        canonical="/"
      />

      <div className="relative z-10">
        <Hero />

        {/* The film, straight after the hero and its scroll cue. `hold` so it
            arrives on the house curve but never dims: a video that fades out
            while the reader is watching it is the same hostility FinalCta
            avoids for the same reason. */}
        <ScrollScene rise={20} hold>
          <BrandFilm />
        </ScrollScene>

        {/* No seam between these two: the directory runs on the same near-black
            field as the hero, so the page opens as one dark block and a join
            across it would only read as a break in that field. */}
        {/* A shorter rise than the copy sections: the directory is a drawn
            object, and travel that reads as arrival on a paragraph reads as
            the diagram sliding. It leaves on the same decisive curve as
            everything else, so the hero's dark field hands over cleanly. */}
        <ScrollScene rise={20}>
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
