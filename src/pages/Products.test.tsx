// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Products from "./Products";

const html = renderToStaticMarkup(
  <HelmetProvider context={{}}>
    <MemoryRouter>
      <Products />
    </MemoryRouter>
  </HelmetProvider>,
);
const doc = new DOMParser().parseFromString(html, "text/html");
const follows = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

// Its JSON-LD is checked on the built page, in tests/e2e/products.spec.ts: jsdom puts Helmet in client mode.
describe("/products opens on the system graph (W24-B)", () => {
  it("puts the directory right under the page hero, and the stages below it", () => {
    const hero = doc.querySelector("[data-hero-title]")!.closest("section")!;
    const directory = doc.querySelector("section#systems")!;
    const firstStage = doc.querySelector("[data-stage-card]")!;
    expect(hero.nextElementSibling).toBe(directory);
    expect(follows(directory, firstStage)).toBe(true);
    expect(doc.querySelectorAll("[data-stage-card]")).toHaveLength(3);
  });
});
