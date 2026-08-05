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
    path: "/audit",
    sources: ["src/pages/Audit.tsx", "src/features/audit"],
    changefreq: "monthly",
    priority: "0.9",
    fallback: "2026-07-27",
  },
  {
    path: "/who-we-are",
    sources: ["src/pages/WhoWeAre.tsx", "src/shared/ui/vsl-player.tsx"],
    changefreq: "monthly",
    priority: "0.8",
    fallback: "2026-08-01",
  },
  {
    path: "/process",
    sources: ["src/pages/Process.tsx"],
    changefreq: "monthly",
    priority: "0.8",
    fallback: "2026-07-30",
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
