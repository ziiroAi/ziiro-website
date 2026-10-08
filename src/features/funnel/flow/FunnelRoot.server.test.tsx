import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FunnelRoot } from "./FunnelRoot";

vi.mock("@/features/funnel/data/light", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import("./test/fake-data")).FAKE_DATA,
}));

describe("FunnelRoot in the prerender (§4.2, §10: / without JavaScript)", () => {
  const html = renderToString(<FunnelRoot />);

  it("holds Hello., the daytime line and S1's five options as real buttons", () => {
    expect(html).toContain(">Hello.</h1>");
    expect(html).toContain("Glad you&#x27;re here.");
    expect(html.match(/<button[^>]*data-early="/g)).toHaveLength(5);
  });

  it("prints the greeting snippet right after the header, so it runs before first paint", () => {
    expect(html).toMatch(/<\/header><script>\(function\(s\)\{try\{var b=window.__funnelBoot/);
  });

  it("has g.noscript with a plain Calendly link", () => {
    expect(html).toContain("<noscript>");
    expect(html).toContain('<a class="f-link" href="https://calendly.com/ziiro-work/30min">Book a call</a>');
  });
});
