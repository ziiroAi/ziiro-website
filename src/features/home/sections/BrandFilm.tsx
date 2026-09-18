import VslPlayer, { type VslConfig } from "@/shared/ui/vsl-player";

/**
 * The brand film, sitting between the hero and the system directory.
 *
 * Nothing about this section is heavy until the reader asks for it. VslPlayer
 * runs in its default "facade" mode, which means no <video> element exists in
 * the DOM at all until the play button is pressed — the only thing that loads
 * on approach is a 37 KB poster, and it is lazy. So the 4.8 MB file costs the
 * page nothing unless someone actually wants to watch, and because playback
 * only ever starts from that press, the film can never begin talking at a
 * reader who did not ask it to.
 *
 * No VideoObject schema here, deliberately. videos.ts records what happened
 * last time a video was marked up as structured data on a page that was about
 * something else: Google reported "Video isn't on a watch page" and dropped it.
 * The schema belongs on /watch/<slug>, not on the home page.
 */

/** Runtime is 40.2s; the encode is 1920x1080 H.264 with faststart. */
const BRAND_FILM: VslConfig = {
  source: { kind: "file", src: "/media/ziiro-brand-anthem.mp4" },
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
        <VslPlayer vsl={BRAND_FILM} label="The film" />
      </div>
    </section>
  );
}
