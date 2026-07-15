import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  /** Route-level JSON-LD (e.g. BreadcrumbList + page type). */
  schema?: object;
  /** Keep the page out of the index (e.g. the 404 route). */
  noindex?: boolean;
}

const BASE_URL = "https://ziiro.work";
const DEFAULT_OG = `${BASE_URL}/og-image.jpeg`;
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

const SEO = ({ title, description, canonical, ogImage = DEFAULT_OG, schema, noindex }: SEOProps) => {
  const fullTitle = title ? `${title} | Ziiro AI` : "Ziiro AI — Leverage AI Anywhere | Agentic AI Systems for Startups";
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
      buildBreadcrumb(path, breadcrumbId),
    ],
  };

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />
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
      <meta property="og:image:width" content="1024" />
      <meta property="og:image:height" content="1024" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={ogImage} />

      <script type="application/ld+json">{JSON.stringify(pageGraph)}</script>

      {schema && (
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      )}
    </Helmet>
  );
};

export default SEO;
