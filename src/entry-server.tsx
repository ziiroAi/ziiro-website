import type { ComponentType } from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { HelmetProvider } from "react-helmet-async";
import { Providers } from "@/app/App";
import Navbar from "@/shared/components/Navbar";
import Footer from "@/shared/components/Footer";
import Index from "@/pages/Index";
import Contact from "@/pages/Contact";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import Audit from "@/pages/Audit";
import Pricing from "@/pages/Pricing";
import Mission from "@/pages/Mission";
import Products from "@/pages/Products";
import Process from "@/pages/Process";
import NotFound from "@/pages/NotFound";

// Eager map (no lazy) so renderToString emits full content, not Suspense
// fallbacks. Decorative WebGL (DotArtSection/particles) stays lazy inside
// pages and renders its fallback server-side — that's fine, it's visual only.
const routes: Record<string, ComponentType> = {
  "/": Index,
  "/contact": Contact,
  "/privacy": Privacy,
  "/terms": Terms,
  "/audit": Audit,
  "/pricing": Pricing,
  "/mission": Mission,
  "/products": Products,
  "/process": Process,
};

interface HelmetTag {
  toString(): string;
}
interface HelmetData {
  title?: HelmetTag;
  meta?: HelmetTag;
  link?: HelmetTag;
  script?: HelmetTag;
}

export function render(url: string): { appHtml: string; head: string } {
  const Page = routes[url] ?? NotFound;
  const helmetContext: { helmet?: HelmetData } = {};

  const appHtml = renderToString(
    <HelmetProvider context={helmetContext}>
      <Providers>
        <StaticRouter location={url}>
          <Navbar />
          <Page />
          <Footer />
        </StaticRouter>
      </Providers>
    </HelmetProvider>,
  );

  const h = helmetContext.helmet;
  const head = h
    ? [h.title, h.meta, h.link, h.script]
        .map((t) => (t ? t.toString() : ""))
        .join("\n    ")
    : "";

  return { appHtml, head };
}
