import { useMemo } from "react";
import { copy } from "@/features/funnel/data/light";
import VslPlayer, { type VslConfig } from "@/shared/ui/vsl-player";

/**
 * (C) The Business Spine launch film, which the plan opens from "See how it works" (spec §6.5).
 *
 * Lane C's lightbox renders it unchanged (00-index §1.3). It is the click-to-play player: the
 * poster and a play button, and no part of the video loads until the visitor taps play, which
 * then plays it with sound and controls (§13.10: "never preloaded; poster 90 KB at most; video
 * fetched only on tap"). Narrow screens get the phone encode through the player's <source media>.
 *
 * The files are the renamed film, re-rendered with "BRAIN · LIVE" (§6.5, D5): 56.7 s, 1920 × 1080
 * at 60 fps, H.264 with faststart. A new encode gets a new file name, because /media is served
 * immutable for a year (tests/media/immutable.test.ts).
 *
 * No VideoObject schema here: the plan isn't a watch page (src/features/watch/videos.ts says why).
 */
export const SPINE_FILM_FILES = {
  src: "/media/ziiro-business-spine-master.mp4",
  narrowSrc: "/media/ziiro-business-spine-phone.mp4",
  poster: "/media/ziiro-business-spine-poster-1080.jpg",
} as const;

export default function BrandFilm() {
  const film = useMemo<VslConfig>(
    () => ({
      source: { kind: "file", src: SPINE_FILM_FILES.src, narrowSrc: SPINE_FILM_FILES.narrowSrc },
      title: copy("r.film.title"),
      description: copy("r.film.cap"),
      uploadDate: "2026-10-09",
      duration: "PT57S",
      poster: SPINE_FILM_FILES.poster,
    }),
    [],
  );
  return <VslPlayer vsl={film} label={copy("r.film.title")} mode="facade" flush />;
}
