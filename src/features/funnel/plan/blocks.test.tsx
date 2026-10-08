// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { composePlan, copy } from "../data";
import type { PlanInput } from "../data/contract";
import { Close } from "./Close";
import { NeedBlock } from "./NeedBlock";
import { PartStop } from "./PartStop";
import { buildPlanView } from "./planView";
import { DESKTOP_ONLY, PHONE_ONLY } from "./Swap";
import { click, render, stopNavigation, textOf, type Rendered } from "./test-utils";

const ANANYA_WORDS = "Enquiries come in, but by the time someone calls back they've gone cold.";
const viewOf = (over: Partial<PlanInput>) =>
  buildPlanView({
    plan: composePlan({ teamBand: "6_20", revenueBand: "band_3", currency: "INR", chips: [], problemText: "", ...over }),
    name: "Ananya",
    problemText: over.problemText ?? "",
  });
const ananya = viewOf({ problemText: ANANYA_WORDS });

let screen: Rendered | null = null;
let allowNavigation: () => void = () => undefined;
beforeEach(() => {
  allowNavigation = stopNavigation();
});
afterEach(() => {
  screen?.unmount();
  screen = null;
  allowNavigation();
});

describe("NeedBlock (§6.2 block 2)", () => {
  it("shows her count, the Pilot tag and note, the brain card, the legend and the scroll line", () => {
    screen = render(<NeedBlock view={ananya} />);
    const section = screen.container.querySelector("section");
    const text = textOf(section);
    expect(section?.dataset.depth).toBe("0");
    for (const line of [
      copy("sp.hero.eyebrow"), copy("sp.pilot"), ananya.headline.desktop, ananya.headline.phone, ananya.sub.desktop,
      copy("sp.hero.honest"), copy("ph.hero.honest"), copy("sp.pilot.note"), copy("sp.brain.label"), copy("ph.brain.label"),
      copy("sp.brain.tip"), copy("sp.brain.live"), copy("sp.legend.jobs"), ananya.scroll.desktop,
    ]) {
      expect(text).toContain(line);
    }
    expect(Array.from(section?.querySelectorAll('li > [aria-hidden="true"]') ?? []).map((el) => el.textContent)).toEqual(["●", "◐", "○"]);
  });

  it("leaves the Pilot tag and note off a template A plan (§5.7)", () => {
    screen = render(<NeedBlock view={viewOf({ chips: ["team"] })} />);
    const text = textOf(screen.container);
    expect(text).not.toContain(copy("sp.pilot.note"));
    expect(Array.from(screen.container.querySelectorAll("span")).some((s) => s.textContent === copy("sp.pilot"))).toBe(false);
  });
});

describe("PartStop (§6.2 block 3)", () => {
  it("draws Ananya's first stop: count, heading, desktop tag, her words, agents, jobs and the rest", () => {
    screen = render(<PartStop stop={ananya.stops[0]} />);
    const section = screen.container.querySelector("section");
    expect(section?.dataset.depth).toBe("1");
    expect(textOf(document.getElementById(section?.getAttribute("aria-labelledby") ?? ""))).toBe(copy("dp.deals.heading"));
    expect(textOf(section)).toContain("Part 1 of 4");
    expect(textOf(section)).toContain("1/4 · Deals");
    const tag = Array.from(section?.querySelectorAll("p") ?? []).find((p) => p.textContent === copy("dp.deals.tag"));
    expect(tag?.classList.contains(DESKTOP_ONLY)).toBe(true);
    expect(textOf(section)).toContain(ananya.stops[0].body);
    expect(Array.from(section?.querySelectorAll("li p.font-medium") ?? []).map((p) => p.textContent)).toEqual([
      "Enquiry responder", "Reply sorter", "Call companion",
    ]);
    const details = section?.querySelector("details");
    expect(details?.classList.contains(PHONE_ONLY)).toBe(true);
    expect(details?.querySelector("summary")?.textContent).toBe(ananya.stops[0].agents[0].jobsToggle);
    // 14 jobs (§5.8), each marked once in the desktop list and once in the phone's.
    const jobs = ananya.stops[0].agents.reduce((n, a) => n + a.jobs.length, 0);
    expect(jobs).toBe(14);
    expect(section?.querySelectorAll('[role="img"]')).toHaveLength(2 * jobs);
    expect(textOf(section)).toContain(copy("sp.part.rest"));
    expect(textOf(section)).toContain("Proposal maker");
  });

  it("drops sp.part.rest when the plan has every agent in the department", () => {
    const v = viewOf({ chips: ["convert"], teamBand: "21_50" });
    expect(v.stops[0].rest).toEqual([]);
    screen = render(<PartStop stop={v.stops[0]} />);
    expect(textOf(screen.container)).not.toContain(copy("sp.part.rest"));
  });
});

describe("Close (§6.2 block 4)", () => {
  it("has the close's lines and one link, cta.btn, to Calendly (§6.3)", () => {
    const onBook = vi.fn();
    screen = render(<Close view={ananya} name="Ananya" email="ananya@studio.in" onBook={onBook} />);
    const section = screen.container.querySelector("section");
    expect(section?.dataset.depth).toBe("5");
    for (const line of [ananya.later.desktop, ananya.later.phone, copy("sp.later.sub"), copy("cta.h"), ananya.ctaLead.desktop, ananya.ctaLead.phone, copy("cta.sub")]) {
      expect(textOf(section)).toContain(line);
    }
    const links = section?.querySelectorAll("a") ?? [];
    expect(links).toHaveLength(1);
    expect(textOf(links[0])).toBe(copy("cta.btn"));
    click(links[0]);
    expect(onBook).toHaveBeenCalledWith("close");
  });

  it("shows no price and no free offer (Appendix A)", () => {
    screen = render(<Close view={ananya} name="Ananya" email="ananya@studio.in" onBook={() => undefined} />);
    expect(textOf(screen.container)).not.toMatch(/₹|\$\d|free/i);
  });
});
