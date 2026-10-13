// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { COPY_LINES } from "@/features/funnel/data/light";
import { click, render, textOf, type Rendered } from "@/features/funnel/plan/test-utils";
import { allowedSentences, findClaims, readableText } from "../../../../tests/claims/patterns";
import SystemDirectory from "./SystemDirectory";
import { PIPELINES, jobsIn } from "./pipelines";

/** jsdom has no matchMedia or IntersectionObserver: a wide or narrow screen, and observers that never fire. */
function screenOf(wide: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("min-width") ? wide : false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  } as unknown as typeof IntersectionObserver;
}

const claimsIn = (root: Element) =>
  findClaims(readableText(root.cloneNode(true) as Element), { allowedSentences: allowedSentences(COPY_LINES) });

/** The words the ground truth rules out, and the statuses main's directory used to print. */
const FORBIDDEN = [/\b127\b/, /\b107\b/, /\b30 agents\b/i, /\bActive\b/, /\bIn build\b/i, /run today/i, /all demoable/i];

let screen: Rendered | null = null;
afterEach(() => {
  screen?.unmount();
  screen = null;
});

describe("the prerendered directory (W24-B)", () => {
  const html = renderToStaticMarkup(<SystemDirectory />);
  const doc = new DOMParser().parseFromString(html, "text/html");

  it("states the catalog's totals and lists every department", () => {
    const text = textOf(doc.body);
    expect(text).toContain("137 jobs of work, mapped across 33 agents in 7 departments.");
    for (const p of PIPELINES) expect(text).toContain(p.name);
    expect(doc.querySelector("section#systems h2")?.textContent).toBe("The Ziiro System");
  });

  it("passes the claims check and prints none of the old figures or statuses", () => {
    expect(claimsIn(doc.body)).toEqual([]);
    const text = textOf(doc.body);
    for (const re of FORBIDDEN) expect(text).not.toMatch(re);
  });
});

describe("the directory on a wide screen (W24-B)", () => {
  beforeEach(() => screenOf(true));

  it("draws 7 hubs, 33 agents and a dot for each of the 137 jobs, and opens on the whole-system summary", () => {
    screen = render(<SystemDirectory />);
    const map = screen.container.querySelector("svg")!;
    expect(map.querySelectorAll("[data-map-system]")).toHaveLength(7);
    const summary = textOf(screen.container);
    expect(summary).toContain("The whole system");
    expect(summary).toContain(COPY_LINES["sp.hero.honest"]);
    expect(claimsIn(screen.container)).toEqual([]);
    for (const re of FORBIDDEN) expect(summary).not.toMatch(re);
  });

  it("selects a department from its hub, shows its agents and their jobs, and returns on a second click", () => {
    screen = render(<SystemDirectory />);
    const sales = PIPELINES.find((p) => p.id === "sales")!;
    const hub = () => screen!.container.querySelector(`[data-map-system][aria-label^="${sales.name}."]`);
    expect(hub()?.getAttribute("aria-label")).toBe(`${sales.name}. ${sales.agents.length} agents, ${jobsIn(sales).length} jobs.`);

    click(hub());
    const panel = screen.container.querySelector('[data-directory-view="detail"]')!;
    expect(panel.querySelector("h3")?.textContent).toBe(sales.name);
    const rows = [...panel.querySelectorAll("button[aria-expanded]")];
    expect(rows.map((row) => row.textContent)).toEqual(
      sales.agents.map((a) => `${String(a.number).padStart(2, "0")}${a.name}${String(a.jobs.length).padStart(2, "0")} jobs`),
    );

    const first = sales.agents[0];
    click(rows[0]);
    expect(rows[0].getAttribute("aria-expanded")).toBe("true");
    const jobs = [...rows[0].closest("li")!.querySelectorAll("[data-directory-job]")];
    expect(jobs.map((li) => li.getAttribute("data-directory-job"))).toEqual(first.jobs.map((j) => j.status));
    expect(jobs.map((li) => li.querySelector('[aria-hidden="true"]')?.textContent)).toEqual(
      first.jobs.map((j) => ({ runs_on_our_company_today: "●", we_build_it_for_you: "◐", mapped: "○" })[j.status]),
    );
    expect(claimsIn(screen.container)).toEqual([]);

    click(hub());
    expect(screen.container.querySelector('[data-directory-view="detail"]')).toBeNull();
    expect(textOf(screen.container)).toContain("The whole system");
  });
});

describe("the directory on a phone (W24-B)", () => {
  beforeEach(() => screenOf(false));

  it("has no map, lists the 7 departments, and goes back from one to the list", () => {
    screen = render(<SystemDirectory />);
    expect(screen.container.querySelector("svg [data-map-system]")).toBeNull();
    const rows = () => [...screen!.container.querySelectorAll('[data-directory-view="detail"] li > button')];
    expect(rows()).toHaveLength(7);

    click(rows()[6]);
    const text = textOf(screen.container);
    const backOffice = PIPELINES[6];
    for (const agent of backOffice.agents) expect(text).toContain(agent.name);

    const back = [...screen.container.querySelectorAll("button")].find((b) => b.textContent?.includes("All systems"));
    click(back!);
    expect(rows()).toHaveLength(7);
  });
});
