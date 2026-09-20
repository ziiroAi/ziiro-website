import type { VslConfig } from "@/shared/ui/vsl-player";

export interface VideoEntry {
  /** URL segment: the video lives at /watch/<slug>. */
  slug: string;
  vsl: VslConfig;
  /** Page <title> and meta description for the watch page. */
  seoTitle: string;
  seoDescription: string;
  /** What the video actually covers, in order. Text near the player is a
   *  ranking signal, and it's what a visitor scans before spending 8 minutes. */
  covers: string[];
}

/**
 * Every video gets its own watch page.
 *
 * Google only indexes a video when it sits on a page dedicated to it, with a
 * real player element in the DOM. A video embedded as supporting content on a
 * page about something else gets reported as "Video isn't on a watch page" and
 * dropped, which is exactly what happened to this one on /who-we-are.
 */
export const videos: VideoEntry[] = [
  {
    slug: "how-ziiro-works",
    vsl: {
      source: { kind: "youtube", id: "_R1Z7rfoaJA" },
      title: "I built an AI agency. Here's exactly how it works.",
      description:
        "A screen-share walkthrough of Ziiro, top to bottom: what we do, how we work, what you invest, and where your data goes. We don't sell AI for AI's sake. We start with your numbers, where the hours go and where the money leaks, and only build something when the math says it's worth it.",
      uploadDate: "2026-07-26",
      duration: "PT7M50S",
      runtime: "8 min",
    },
    // 44 chars, so the rendered title is 55 with " | Ziiro AI" — inside the
    // ~50-60 Google shows without truncating, where the old 46 left value on
    // the table. "8-Minute" is not a new claim: it is `runtime` above, the
    // PT7M50S duration, and the wording seoDescription and summary already use.
    seoTitle: "How Ziiro Works: A Full 8-Minute Walkthrough",
    seoDescription:
      "An eight-minute screen-share walkthrough of how Ziiro works end to end: what we build, how an engagement runs, what you invest, and where your data goes.",
    // Three topics, not four. "What you invest and how scope gets set" is gone
    // from this list because the video's own description already says it and
    // Pricing is where the answer actually lives; four scannable lines under a
    // player is one more than anyone reads before pressing play.
    covers: [
      "What we do, and what we deliberately don't",
      "How an engagement runs, start to finish",
      "Where your data goes and who can see it",
    ],
  },
];

export const videoBySlug = (slug: string | undefined): VideoEntry | undefined =>
  videos.find((v) => v.slug === slug);

/** Canonical path for a video's watch page. */
export const watchPath = (slug: string) => `/watch/${slug}`;
