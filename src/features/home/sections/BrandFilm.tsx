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
 * Wide screens get the master render itself, untouched: 1080p at 5.8 Mbps,
 * 30 MB. The 0.86 Mbps cut that shipped before blocked up the film's pale
 * gradients and softened its small type, and this film is the brand's first
 * impression, so here quality wins over bytes. Phones get a 1080p x264
 * re-encode of that master (CRF 18, veryslow): half the bytes at 15.7 MB, and
 * at a phone's frame width the difference does not show (VMAF 96.9 against
 * the master, 93.7 on its worst frame).
 *
 * A new encode gets a new file name. /media is served `immutable` for a year,
 * so a file replaced under the same name would keep playing the old copy for
 * everyone who has already seen it.
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

/** Runtime is 40.2s; both encodes are 1920x1080 H.264 with faststart. */
const BRAND_FILM: VslConfig = {
  source: {
    kind: "file",
    src: "/media/ziiro-brand-anthem-master.mp4",
    narrowSrc: "/media/ziiro-brand-anthem-phone.mp4",
  },
  // The film's own opening line, not a claim written for it.
  title: "Running a business shouldn't mean drowning in it.",
  description:
    "A short film on what Ziiro builds and why: the manual work that piles up inside a growing business, and the systems we put in its place.",
  uploadDate: "2026-09-19",
  duration: "PT40S",
  poster: "/media/ziiro-brand-anthem-poster-1080.jpg",
  runtime: "40 sec",
};

/**
 * How tall the film is allowed to be, as a fraction of the viewport, and the
 * 16:9 the frame actually holds. The cap is applied as a max WIDTH, because the
 * frame is `aspect-video w-full` and width is the only thing it reads: a width
 * of `H * 16/9` is the same statement as a height of H.
 *
 * ITEM 4, PART ONE. The frame used to be sized by width alone, so how much of
 * the screen the film owned was a side effect of how wide the browser happened
 * to be. On a short laptop the 16:9 frame came out 741px tall in a 700px
 * viewport, so the hero above and the directory below were both in view while
 * the film played, all three competing. Tying the height to the viewport
 * instead means the film owns the screen at every shape.
 *
 * On a phone the arithmetic changes nothing: 74svh of a 844px viewport asks for
 * a 1110px wide frame and there are 342px, so width still governs and the
 * section keeps its ordinary padding rather than opening a void around a small
 * video.
 */
const FILM_MAX_VH = 74;
const FILM_MAX_WIDTH = `calc(${FILM_MAX_VH}svh * 16 / 9)`;

export default function BrandFilm() {
  return (
    // svh, not vh: on mobile browsers vh is the tallest the viewport ever gets,
    // so a vh-sized section is taller than the screen while the toolbar is out.
    <section className="relative flex items-center py-24 md:min-h-[100svh] md:py-0">
      <div className="mx-auto w-full max-w-[1400px] px-6 md:px-10">
        <div className="mx-auto w-full" style={{ maxWidth: FILM_MAX_WIDTH }}>
          <VslPlayer vsl={BRAND_FILM} label="The film" mode="autoplay" />
        </div>
      </div>
    </section>
  );
}
