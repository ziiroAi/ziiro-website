import VslPlayer, { type VslConfig } from "@/shared/ui/vsl-player";

/**
 * The brand film, sitting between the hero and the system directory.
 *
 * It runs in "autoplay" mode: muted, it starts itself once the frame is
 * properly on screen and stops the moment the reader scrolls off it. The
 * section stays cheap anyway, because none of the video is fetched until the
 * reader is one screen away — `preload="none"` until an observer says
 * otherwise — and the poster underneath is a lazy <img> rather than the
 * eagerly-fetched `poster` attribute. A reader who never scrolls this far
 * downloads nothing but the markup.
 *
 * Phones get the 2.7 MB 720p encode instead of the 5.0 MB master. At this
 * frame's width on a phone the two are indistinguishable, and the master is
 * 2.3 MB of someone's data plan spent on pixels their screen cannot show.
 *
 * It starts muted and it can always be stopped: WCAG 2.2.2 for the moving
 * picture, and plain manners for the sound. See scroll-autoplay-video.tsx for
 * the rules it holds to.
 *
 * No VideoObject schema here, deliberately. videos.ts records what happened
 * last time a video was marked up as structured data on a page that was about
 * something else: Google reported "Video isn't on a watch page" and dropped it.
 * The schema belongs on /watch/<slug>, not on the home page.
 */

/** Runtime is 40.2s; the encode is 1920x1080 H.264 with faststart. */
const BRAND_FILM: VslConfig = {
  source: {
    kind: "file",
    src: "/media/ziiro-brand-anthem.mp4",
    narrowSrc: "/media/ziiro-brand-anthem-720.mp4",
  },
  // The film's own opening line, not a claim written for it.
  title: "Running a business shouldn't mean drowning in it.",
  description:
    "A short film on what Ziiro builds and why: the manual work that piles up inside a growing business, and the systems we put in its place.",
  uploadDate: "2026-09-19",
  duration: "PT40S",
  poster: "/media/ziiro-brand-anthem-poster.jpg",
  runtime: "40 sec",
};

export default function BrandFilm() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-[1400px] px-6 py-24 md:px-10 md:py-32">
        <VslPlayer vsl={BRAND_FILM} label="The film" mode="autoplay" />
      </div>
    </section>
  );
}
