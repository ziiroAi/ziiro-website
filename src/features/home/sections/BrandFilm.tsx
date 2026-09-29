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
 * The film is the Business Brain launch cut, 1080p at 60fps. Both copies are
 * x264 veryslow encodes straight from its lossless render, and this film is
 * the brand's first impression, so here quality wins over bytes. Wide screens
 * get CRF 14: 35.8 MB at 5.05 Mbps, SSIM 0.9991 against the render. Phones
 * get CRF 18: 23.0 MB at 3.24 Mbps, SSIM 0.9986, and at a phone's frame width
 * the difference does not show. Both are converted to BT.709 and tagged so:
 * browsers read untagged HD video as BT.709, and ffmpeg's untagged BT.601
 * default shifts the orange. High@4.2 keeps 1080p60 within older phones'
 * decoders.
 *
 * The poster is the film's reveal: the lockup and "Business Brain" on white.
 * The film opens on white, so poster to first frame is white to white. No
 * poster is baked into frame 0, because it would flash at every autoplay
 * start.
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

/** Runtime is 56.7s; both encodes are 1920x1080 at 60fps, H.264 with faststart. */
const BRAND_FILM: VslConfig = {
  source: {
    kind: "file",
    src: "/media/ziiro-business-brain-master.mp4",
    narrowSrc: "/media/ziiro-business-brain-phone.mp4",
  },
  // The film's own opening lines, not a claim written for it.
  title: "Everyone's selling you AI to replace your team. We built the opposite.",
  description:
    "The launch film for Business Brain: it maps a business against 137 jobs, keeps only the ones worth automating, and wires its departments into one brain. Agents prepare, people approve.",
  uploadDate: "2026-09-29",
  duration: "PT57S",
  poster: "/media/ziiro-business-brain-poster-1080.jpg",
  runtime: "57 sec",
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
