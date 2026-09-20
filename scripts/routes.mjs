// The single route table. Prerendering, the sitemap, and the llms.txt coverage
// check all read from here, so a new page can't be prerendered but missing from
// the sitemap (or listed in the sitemap but never built).
//
// `sources` are the files that actually render the route. The sitemap derives
// <lastmod> from the newest git commit touching them, so the date reflects when
// the page changed rather than when someone remembered to edit an XML file.
export const routes = [
  {
    path: "/",
    sources: ["src/pages/Index.tsx", "src/features/home"],
    changefreq: "weekly",
    priority: "1.0",
    // Fallback <lastmod> for build environments without usable git history
    // (shallow clones). Bump only if the git lookup ever stops working.
    fallback: "2026-08-01",
  },
  {
    path: "/products",
    sources: ["src/pages/Products.tsx"],
    changefreq: "monthly",
    priority: "0.9",
    fallback: "2026-07-27",
  },
  {
    path: "/who-we-are",
    sources: ["src/pages/WhoWeAre.tsx", "src/features/who-we-are", "src/shared/ui/vsl-player.tsx"],
    changefreq: "monthly",
    priority: "0.8",
    fallback: "2026-08-01",
  },
  {
    path: "/watch/how-ziiro-works",
    sources: ["src/pages/Watch.tsx", "src/features/watch/videos.ts"],
    changefreq: "monthly",
    priority: "0.8",
    fallback: "2026-08-06",
    // Emits the <video:video> sitemap extension. This is how Google discovers
    // a video independently of crawling the page, and the fields mirror the
    // VideoObject schema on the watch page itself.
    video: {
      title: "I built an AI agency. Here's exactly how it works.",
      description:
        "A screen-share walkthrough of Ziiro, top to bottom: what we do, how we work, what you invest, and where your data goes.",
      thumbnail: "https://i.ytimg.com/vi/_R1Z7rfoaJA/maxresdefault.jpg",
      playerLoc:
        "https://www.youtube-nocookie.com/embed/_R1Z7rfoaJA?rel=0&modestbranding=1&playsinline=1",
      durationSeconds: 470,
      publicationDate: "2026-07-26",
    },
  },
  {
    path: "/mission",
    sources: ["src/pages/Mission.tsx"],
    changefreq: "monthly",
    priority: "0.8",
    fallback: "2026-07-27",
  },
  {
    path: "/contact",
    sources: ["src/pages/Contact.tsx"],
    changefreq: "monthly",
    priority: "0.7",
    fallback: "2026-07-27",
  },
  {
    path: "/pricing",
    sources: ["src/pages/Pricing.tsx"],
    changefreq: "monthly",
    priority: "0.7",
    fallback: "2026-07-27",
  },
  {
    path: "/docs",
    // Docs renders the shared FAQ, the audit phases, and the walkthrough entry,
    // so a change to any of those is a change to this page.
    sources: [
      "src/pages/Docs.tsx",
      "src/features/pricing/entities/faqs.ts",
      "src/features/who-we-are/entities",
      "src/features/watch/videos.ts",
    ],
    changefreq: "monthly",
    priority: "0.6",
    fallback: "2026-09-16",
  },
  {
    path: "/careers",
    sources: ["src/pages/Careers.tsx"],
    // There is nothing to apply for, so nothing here goes stale on a schedule.
    // It changes when the hiring position changes, which is not a cadence.
    changefreq: "yearly",
    priority: "0.4",
    fallback: "2026-09-20",
  },
  {
    path: "/privacy",
    sources: ["src/pages/Privacy.tsx"],
    changefreq: "yearly",
    priority: "0.3",
    fallback: "2026-07-27",
  },
  {
    path: "/terms",
    sources: ["src/pages/Terms.tsx"],
    changefreq: "yearly",
    priority: "0.3",
    fallback: "2026-07-27",
  },
];

/** Every path we prerender, in route-table order. */
export const routePaths = routes.map((r) => r.path);
