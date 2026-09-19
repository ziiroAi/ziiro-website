/**
 * Page-level JSON-LD builders.
 *
 * They live beside SEO.tsx rather than inside it so the head component stays
 * generic, and outside the page files so a schema edit can't collide with an
 * edit to the body those pages render.
 *
 * Every node here is built from copy the page already shows. Google requires
 * the markup and the visible page to agree, so nothing is asserted that a
 * reader can't see: /pricing and /products quote no figures ("No menu
 * prices"), so their Offers carry names and descriptions and no price.
 *
 * Nodes omit "@context" on purpose: SEO wraps an array of them in one @graph.
 */

const BASE_URL = "https://ziiro.work";
/** Matches the Organization node @id in index.html's static @graph. */
const ORGANIZATION_ID = `${BASE_URL}/#organization`;

export interface SchemaFaq {
  q: string;
  a: string;
}

/**
 * FAQPage for a page that already renders these questions and answers.
 * An answer inside a collapsed accordion still counts: it is in the HTML.
 */
export const faqPageSchema = (faqs: SchemaFaq[], path: string) => {
  const url = `${BASE_URL}${path}`;
  return {
    "@type": "FAQPage",
    "@id": `${url}#faq`,
    url,
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };
};

export interface SchemaOffering {
  name: string;
  description: string;
}

/**
 * A Service whose OfferCatalog lists what the page sets out: the engagements
 * on /pricing, the systems on /products. No price: the pages state none.
 */
export const serviceCatalogSchema = ({
  path,
  name,
  description,
  catalogName,
  offerings,
}: {
  path: string;
  name: string;
  description: string;
  catalogName: string;
  offerings: SchemaOffering[];
}) => {
  const url = `${BASE_URL}${path}`;
  return {
    "@type": "Service",
    "@id": `${url}#service`,
    name,
    description,
    serviceType: "AI consultancy",
    url,
    provider: { "@id": ORGANIZATION_ID },
    mainEntityOfPage: { "@id": `${url}#webpage` },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: catalogName,
      itemListElement: offerings.map((offering) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: offering.name,
          description: offering.description,
          provider: { "@id": ORGANIZATION_ID },
        },
      })),
    },
  };
};
