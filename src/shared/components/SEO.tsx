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

const SEO = ({ title, description, canonical, ogImage = DEFAULT_OG, schema, noindex }: SEOProps) => {
  const fullTitle = title ? `${title} | Ziiro AI` : "Ziiro AI — Leverage AI Anywhere | Agentic AI Systems for Startups";
  const desc = description || "Business-intelligence-first AI consultancy for startups and founder-led teams. We prove the ROI, then build agentic systems and self-optimizing loops.";
  const url = canonical ? `${BASE_URL}${canonical}` : BASE_URL;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, follow" />}

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={ogImage} />

      {schema && (
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      )}
    </Helmet>
  );
};

export default SEO;
