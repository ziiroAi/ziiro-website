import { describe, expect, it } from "vitest";
import { departments } from "./agents";
import { BUSINESS_TYPES, CHIPS, NON_OWNER_REASONS, REVENUE_BANDS, SEGMENTS, TEAM_BANDS, YEARS_BANDS } from "./contract";
import { copy, COPY_LINES } from "./copy";

describe("copy", () => {
  it("returns a line with no placeholders as it is", () => {
    expect(copy("hx.btn1")).toBe("Book a call");
    expect(copy("seo.plan.title")).toBe("Your plan");
  });

  it("fills placeholders by the text inside the braces (00-index §1.3)", () => {
    expect(copy("sp.part.count", { i: 1, d: 4 })).toBe("Part 1 of 4");
    expect(copy("em.said", { "their words": "Leads go cold" })).toBe('You said: "Leads go cold"');
    expect(copy("em.dept", { Department: "Deals", "dp.*.why": "Replies go out fast." })).toBe("Deals. Replies go out fast.");
    expect(copy("em.said.chips", { chips: "Team chaos, Ads burn money" })).toBe("You picked: Team chaos, Ads burn money.");
  });

  it("puts a value in as plain text, never as a pattern or a new placeholder", () => {
    expect(copy("hx.p", { name: "$& {n}" }).startsWith("$& {n}, this is what a full Business Spine looks like")).toBe(true);
  });

  it("throws on an unknown ID, Object.prototype's keys included", () => {
    expect(() => copy("hx.nope")).toThrow('copy: unknown ID "hx.nope"');
    expect(() => copy("constructor")).toThrow("unknown ID");
    expect(() => copy("toString")).toThrow("unknown ID");
  });

  it("throws on a placeholder left unfilled", () => {
    expect(() => copy("sp.hero.h")).toThrow('copy: "sp.hero.h" needs {n}');
    expect(() => copy("sp.hero.sub", { n: 6 })).toThrow("needs {j}");
  });
});

describe("the generated lines", () => {
  it("take spec §4.5's lines over copy.md", () => {
    expect(copy("sp.pilot.note")).toBe(
      "This plan is a pilot. Parts of it are still being built. The part that answers questions about your business is live today, and we can show you one in 30 seconds.",
    );
    expect(copy("sp.later.sub")).toBe("Your business will change. When it does, add an agent.");
    expect(copy("hx.alt.dark")).toBe("A tall spine of dark chrome vertebrae, every disc glowing a cool blue-white.");
    expect(copy("s1b.o5")).toBe("Something else");
    expect(copy("g.footer")).toBe("Your answers are saved to shape your plan. · Privacy");
    expect(copy("r.film.close")).toBe("Close");
    expect(copy("sp.hero.scroll.one")).toBe("Scroll through the one part you need.");
  });

  it("store em.said.chips with one {chips} placeholder (00-index §1.3)", () => {
    expect(COPY_LINES["em.said.chips"]).toBe("You picked: {chips}.");
  });

  it("carry the header's lines, the film's and the one-part scroll line (wave9-requests item 8, D37, D38)", () => {
    const needed = [
      "nav.home.aria", "nav.mission", "nav.who", "nav.products", "nav.btn", "ph.nav.menu",
      "r.film.title", "r.film.cap", "r.film.close", "sp.hero.scroll.one",
    ];
    expect(needed.filter((id) => !COPY_LINES[id])).toEqual([]);
  });

  it("keep no editor's note or old wording", () => {
    const noted = Object.entries(COPY_LINES).filter(([, line]) => /\[|⚑|⚖|\*\*|owner to confirm|vertebra\b|Business Brain/i.test(line));
    expect(noted).toEqual([]);
  });

  it("leave the retired lines out (§4.5)", () => {
    const retired = [
      "sp.email.fail", "hx.p.open", "ph.hint", "sp.hero.h.one", "sp.hero.sub.one", "ph.hero.h.one",
      "em.need.one", "em.subject.one", "r.legend.centre",
    ];
    expect(retired.filter((id) => id in COPY_LINES)).toEqual([]);
  });

  it("split each option line into one label per contract ID (§4.3)", () => {
    const count = (id: string) => copy(id).split(" · ").length;
    expect(["s2.o", "s3.o", "s4.o", "s5.o.IN", "s5.o.other", "s6.chips"].map(count)).toEqual([
      BUSINESS_TYPES.length, YEARS_BANDS.length, TEAM_BANDS.length,
      REVENUE_BANDS.length - 1, REVENUE_BANDS.length - 1, CHIPS.length,
    ]);
    expect(SEGMENTS.filter((_, i) => !COPY_LINES[`s1.o${i + 1}`])).toEqual([]);
    expect(NON_OWNER_REASONS.filter((_, i) => !COPY_LINES[`s1b.o${i + 1}`])).toEqual([]);
  });

  it("have a heading, tag, why and words line for each department", () => {
    const missing = departments.flatMap((d) =>
      ["heading", "tag", "why", "words"].map((f) => `dp.${d.copyKey}.${f}`).filter((id) => !COPY_LINES[id]),
    );
    expect(missing).toEqual([]);
  });
});
