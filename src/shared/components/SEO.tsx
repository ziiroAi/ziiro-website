import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  /**
   * Route-level JSON-LD, on top of the WebPage + BreadcrumbList every page
   * gets. An array is emitted as one @graph, so its nodes omit "@context";
   * a single object is emitted as-is and carries its own.
   */
  schema?: object | object[];
  /**
   * Explicit breadcrumb trail. Needed when a path contains a segment that
   * isn't a real page: /watch/<slug> has no /watch index, and deriving the
   * trail from the URL would cite a 404 as an ancestor.
   */
  breadcrumb?: { name: string; path: string }[];
  /** Keep the page out of the index (e.g. the 404 route). */
  noindex?: boolean;
}

const BASE_URL = "https://ziiro.work";
/**
 * The share card: the mark and wordmark on the white ground, 1200x630 for the
 * 1.91:1 slot Facebook, LinkedIn, Slack and X all crop to. OG_W/OG_H are
 * declared to the scrapers below and have to keep matching the actual file, so
 * they live next to the URL rather than inline in the markup.
 */
const DEFAULT_OG = `${BASE_URL}/og-image.png`;
const OG_W = "1200";
const OG_H = "630";
/** Matches the WebSite node @id in index.html's static @graph. */
const WEBSITE_ID = `${BASE_URL}/#website`;

/** Turn a path segment ("self-hosted") into a human label ("Self Hosted"). */
const titleCase = (segment: string): string =>
  segment
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

/**
 * Build a truthful BreadcrumbList from the canonical path.
 * "/" → [Home]; "/products" → [Home, Products].
 */
const buildBreadcrumb = (path: string, id: string) => {
  const segments = path.split("/").filter(Boolean);
  const itemListElement: Array<Record<string, unknown>> = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: BASE_URL,
    },
  ];

  let cumulative = "";
  segments.forEach((segment, index) => {
    cumulative += `/${segment}`;
    itemListElement.push({
      "@type": "ListItem",
      position: index + 2,
      name: titleCase(segment),
      item: `${BASE_URL}${cumulative}`,
    });
  });

  return {
    "@type": "BreadcrumbList",
    "@id": id,
    itemListElement,
  };
};

/** BreadcrumbList from an explicit trail, for paths the URL can't describe. */
const trailBreadcrumb = (
  trail: { name: string; path: string }[],
  id: string,
) => ({
  "@type": "BreadcrumbList",
  "@id": id,
  itemListElement: trail.map((crumb, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: crumb.name,
    item: crumb.path === "/" ? BASE_URL : `${BASE_URL}${crumb.path}`,
  })),
});

const SEO = ({ title, description, canonical, ogImage = DEFAULT_OG, schema, noindex, breadcrumb }: SEOProps) => {
  const fullTitle = title ? `${title} | Ziiro AI` : "Ziiro AI: Leverage AI Anywhere | Agentic AI Systems for Startups";
  const desc = description || "Business-intelligence-first AI consultancy for startups and founder-led teams. We prove the ROI, then build agentic systems and self-optimizing loops.";
  const path = canonical || "/";
  const url = canonical ? `${BASE_URL}${canonical}` : BASE_URL;

  const breadcrumbId = `${url}#breadcrumb`;
  const pageGraph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        name: fullTitle,
        description: desc,
        url,
        isPartOf: { "@id": WEBSITE_ID },
        inLanguage: "en",
        breadcrumb: { "@id": breadcrumbId },
      },
      breadcrumb
        ? trailBreadcrumb(breadcrumb, breadcrumbId)
        : buildBreadcrumb(path, breadcrumbId),
    ],
  };

  // Several nodes travel as one @graph rather than several script tags: one
  // document, one place for a validator to look.
  const extraSchema = Array.isArray(schema)
    ? { "@context": "https://schema.org", "@graph": schema }
    : schema;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {/* A noindex page has no canonical worth declaring, and the 404's would
          point at /404, which isn't a real route. */}
      {!noindex && <link rel="canonical" href={url} />}
      {noindex && <meta name="robots" content="noindex, follow" />}
      {!noindex && (
        <meta
          name="robots"
          content="max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        />
      )}

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Ziiro AI" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={fullTitle} />
      <meta property="og:image:width" content={OG_W} />
      <meta property="og:image:height" content={OG_H} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={fullTitle} />

      <script type="application/ld+json">{JSON.stringify(pageGraph)}</script>

      {extraSchema && (
        <script type="application/ld+json">{JSON.stringify(extraSchema)}</script>
      )}
    </Helmet>
  );
};

export default SEO;
