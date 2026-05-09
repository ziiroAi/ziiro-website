import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
}

const BASE_URL = "https://ziiro.work";
const DEFAULT_OG = `${BASE_URL}/og-image.jpeg`;

const SEO = ({ title, description, canonical, ogImage = DEFAULT_OG }: SEOProps) => {
  const fullTitle = title ? `${title} | Ziiro AI` : "Ziiro AI - AI Automation Agency | Scale Your Business on Autopilot";
  const desc = description || "We automate your workflows, build AI agents, and scale your business while you focus on what matters.";
  const url = canonical ? `${BASE_URL}${canonical}` : BASE_URL;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
};

export default SEO;
