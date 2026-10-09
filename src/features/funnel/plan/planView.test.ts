import { describe, expect, it } from "vitest";
import { composePlan, copy, quoteWords } from "../data";
import type { PlanInput } from "../data/contract";
import { buildPlanView, heroTitle, markOf, WORDS_MAX } from "./planView";

const ANANYA_WORDS = "Enquiries come in, but by the time someone calls back they've gone cold.";
const view = (over: Partial<PlanInput>, name = "Ananya") =>
  buildPlanView({
    plan: composePlan({ teamBand: "6_20", revenueBand: "band_3", currency: "INR", chips: [], problemText: "", ...over }),
    name,
    problemText: over.problemText ?? "",
  });

describe("buildPlanView: Ananya (§5.8)", () => {
  const v = view({ problemText: ANANYA_WORDS });

  it("counts her 6 agents and 26 jobs", () => {
    expect(v.headline).toEqual({
      desktop: "Out of 137 jobs across 33 agents, you need only 6 today.",
      phone: "137 jobs. 33 agents. You need 6 today.",
    });
    expect(v.sub.desktop).toContain("You need 6 of them today, carrying 26 jobs between them.");
    expect(v.scroll).toEqual({ desktop: "Scroll through the 4 parts you need.", phone: "Scroll" });
    expect(v.pilot).toBe(true);
  });

  it("numbers her four stops and quotes her words once, at Deals", () => {
    expect(v.stops.map((s) => [s.depth, s.count.desktop, s.count.phone, s.quotesWords])).toEqual([
      [1, "Part 1 of 4", "1/4 · Deals", true],
      [2, "Part 2 of 4", "2/4 · Sales", false],
      [3, "Part 3 of 4", "3/4 · Marketing", false],
      [4, "Part 4 of 4", "4/4 · Back Office", false],
    ]);
    expect(v.stops[0].body).toBe(
      copy("dp.deals.words", { words: "Enquiries come in, but by the time someone calls back they've gone cold" }),
    );
    expect(v.stops[3].body).toBe(copy("dp.backoffice.why"));
    expect(v.closeDepth).toBe(5);
  });

  it("lists the stop's agents with their lines, and the department's other agents by name", () => {
    expect(v.stops[0].agents.map((a) => a.name)).toEqual(["Enquiry responder", "Reply sorter", "Call companion"]);
    expect(v.stops[0].agents[0].jobsToggle).toMatch(/^\d+ jobs · tap to open$/);
    expect(v.stops[0].rest).toEqual(["Proposal maker", "Pipeline keeper"]);
  });

  it("fills the hero and the close with her name and her count", () => {
    expect(v.heroText.desktop.startsWith("Ananya, this is what a full Business Spine looks like")).toBe(true);
    expect(v.heroText.phone.startsWith("Ananya, this is the full spine.")).toBe(true);
    expect(v.later).toEqual({ desktop: copy("sp.later"), phone: "Pay for today's 6. Add the rest later." });
    expect(v.ctaLead.phone).toBe("Start with the 6 you need.");
  });
});

describe("buildPlanView: their words (§6.3)", () => {
  it("uses .why at every stop when only chips were tapped", () => {
    expect(view({ chips: ["convert"] }).stops.filter((s) => s.quotesWords)).toEqual([]);
  });

  it("doesn't quote the untouched S6 starter (Review Focus 2)", () => {
    expect(view({ chips: ["convert"], problemText: copy("s6.text") }).stops.filter((s) => s.quotesWords)).toEqual([]);
  });

  it("quotes nowhere when the words point at a department the plan lacks (Review Focus 3)", () => {
    const v = view({ chips: ["payments"], problemText: "our facebook ads burn money every single month" });
    expect(v.stops.map((s) => s.department)).not.toContain("marketing");
    expect(v.stops.filter((s) => s.quotesWords)).toEqual([]);
  });

  it("quotes content words at Marketing, the Content maker's department (D36)", () => {
    const v = view({ chips: ["convert"], problemText: "no time for reels and posting every week" });
    expect(v.stops.filter((s) => s.quotesWords).map((s) => s.department)).toEqual(["marketing"]);
  });

  it("quotes words that point at no department at the plan's first stop (D36)", () => {
    const chipPlan = view({ chips: ["convert"], problemText: "We are a family business." });
    expect(chipPlan.stops.map((s) => s.quotesWords)).toEqual([true, false, false, false]);
    expect(chipPlan.stops[0].body).toBe(copy("dp.deals.words", { words: "We are a family business" }));
    expect(view({ problemText: "help" }).stops.map((s) => s.quotesWords)).toEqual([true, false]);
  });

  it("cuts long words at 120 characters", () => {
    const long = `${ANANYA_WORDS} ${"Again and again, every week. ".repeat(6)}`;
    const quote = quoteWords(long, WORDS_MAX);
    expect([...quote].length).toBeLessThanOrEqual(WORDS_MAX);
    expect(quote.endsWith("…")).toBe(true);
    expect(view({ problemText: long }).stops[0].body).toBe(copy("dp.deals.words", { words: quote }));
  });
});

describe("buildPlanView: the edges", () => {
  it("uses the fallback headlines for an unclassified plan", () => {
    const v = view({ problemText: "help" });
    expect(v.headline).toEqual({ desktop: copy("sp.hero.h.fallback", { n: 6 }), phone: copy("ph.hero.h.fallback", { n: 6 }) });
    expect(v.pilot).toBe(false);
  });

  it("uses the singular scroll line on a one-part plan, never 'the 1 parts' (Review Focus 4, D37)", () => {
    const v = view({ chips: ["convert"], teamBand: "solo" });
    expect(v.stops[0].count).toEqual({ desktop: "Part 1 of 1", phone: "1/1 · Deals" });
    expect(v.scroll).toEqual({ desktop: copy("sp.hero.scroll.one", { d: 1 }), phone: copy("ph.hero.scroll") });
    expect(v.scroll.desktop).not.toMatch(/\b1 parts\b/);
    expect(v.closeDepth).toBe(2);
  });

  it("shows a name as typed, symbols and all", () => {
    expect(view({ chips: ["team"] }, "A&B <Studio> $1").heroText.desktop.startsWith("A&B <Studio> $1, this is")).toBe(true);
  });
});

describe("markOf and heroTitle", () => {
  it("cut each mark from its legend line", () => {
    expect(markOf("runs_on_our_company_today")).toEqual({ glyph: "●", label: "Runs on our own company today" });
    expect(markOf("we_build_it_for_you")).toEqual({ glyph: "◐", label: "We build it for you" });
    expect(markOf("mapped")).toEqual({ glyph: "○", label: "Mapped, not built yet" });
  });

  it("split ph.hx.h into the hero's two lines", () => {
    expect(heroTitle()).toEqual([
      { desktop: "137 Jobs.", phone: "137 Jobs." },
      { desktop: "33 AI Agents.", phone: "33 AI Agents." },
    ]);
  });
});

describe("buildPlanView: the sample plan for a visitor who runs no business (W17-B)", () => {
  const plan = composePlan({ teamBand: "2_5", revenueBand: "band_2", currency: "INR", chips: [], problemText: "" });
  const guest = buildPlanView({ plan, name: "", problemText: "", guest: true });

  it("opens with no name, and says it's a sample, not what they need", () => {
    expect(guest.heroText).toEqual({ desktop: copy("hx.p.guest"), phone: copy("ph.hx.p.guest") });
    expect(guest.heroText.desktop).not.toMatch(/^,|you need/i);
    expect(guest.sub.desktop).toBe(copy("sp.hero.sub.guest", { n: 3, j: plan.jobIds.length }));
    expect(guest.sub.desktop).not.toMatch(/you need/i);
  });

  it("keeps the fallback plan's headline: the start every business gets", () => {
    expect(guest.headline).toEqual({ desktop: copy("sp.hero.h.fallback", { n: 3 }), phone: copy("ph.hero.h.fallback", { n: 3 }) });
  });

  it("leaves a visitor who answered the questions as before", () => {
    const owner = buildPlanView({ plan, name: "Ananya", problemText: "" });
    expect(owner.heroText.desktop).toBe(copy("hx.p", { name: "Ananya" }));
    expect(owner.sub.desktop).toBe(copy("sp.hero.sub", { n: 3, j: plan.jobIds.length }));
  });
});
