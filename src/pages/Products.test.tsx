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
describe("/products opens on the system graph (W24-B2)", () => {
  it("opens on the directory: the page eyebrow, then the counted sentence as the page's only h1", () => {
    const sections = [...doc.querySelectorAll("section")];
    expect(sections[0].id).toBe("systems");
    expect([...doc.querySelectorAll("h1")].map((h) => h.textContent)).toEqual([
      "137 jobs of work, mapped across 33 agents in 7 departments.",
    ]);
    expect(sections[0].querySelector("h1")).not.toBeNull();
    expect(sections[0].textContent).toContain("( Ziiro / Products )");
    expect(sections[0].textContent).not.toContain("Sec. 01");
  });

  it("follows it with the old hero, verbatim and as an h2, as the lead-in to the stages", () => {
    const directory = doc.querySelector("section#systems")!;
    const leadIn = doc.querySelector("section[data-stages-lead]")!;
    const firstStage = doc.querySelector("[data-stage-card]")!;
    expect(directory.nextElementSibling).toBe(leadIn);
    expect(leadIn.querySelector("h2")?.textContent).toBe(
      "Diagnose. Build. Optimize. Everything we make sits in one of these three.",
    );
    expect(leadIn.textContent).toContain(
      "What follows is the catalogue: what each stage produces, and what you are actually handed at the end of it. No stage ships a slide deck. What it costs to engage is set out on Pricing.",
    );
    expect(follows(leadIn, firstStage)).toBe(true);
    expect(doc.querySelectorAll("[data-stage-card]")).toHaveLength(3);
  });
});
