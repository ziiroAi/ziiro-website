// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Privacy from "./Privacy";

const html = renderToStaticMarkup(
  <HelmetProvider context={{}}>
    <MemoryRouter>
      <Privacy />
    </MemoryRouter>
  </HelmetProvider>,
);
const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("the Privacy page covers the funnel (spec §13.8, B6)", () => {
  it("names the five services, and Singapore for the database", () => {
    for (const name of ["Vercel", "Neon", "Singapore", "Resend", "Cloudflare Turnstile", "Calendly"]) {
      expect(text).toContain(name);
    }
  });

  it("says what the funnel stores, and what it never stores", () => {
    for (const phrase of [
      "the options you tap", "your name, your email address", "the words you type about your business",
      "do not store your IP address", "never store audio",
    ]) expect(text).toContain(phrase);
  });

  it("says a reply to the plan email is enough to be deleted", () => {
    expect(text).toContain("reply to the plan email and say so");
    expect(text).toContain("within 7 days");
  });

  it("numbers its sections 01 to 10, in order", () => {
    expect([...html.matchAll(/>(\d{2})<\/p>/g)].map((match) => match[1]))
      .toEqual(["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"]);
  });

  it("is dated October 2026", () => {
    expect(text).toContain("Effective date: October 2026");
  });
});
