// @vitest-environment jsdom
import { act, createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { agents, composePlan, copy, departments } from "../../data";
import type { AgentId } from "../../data/contract";
import { render, type Rendered } from "../../plan/test-utils";
import { DiscPanel } from "./DiscPanel";
import { departmentForDisc, discAria, discCallout, panelRows } from "./discCopy";

const BACK_OFFICE = departments.find((d) => d.id === "back-office")!;
const LIVE = "runs_on_our_company_today";
const agent = (id: AgentId) => agents.find((a) => a.id === id)!;
/** Ananya (§5.8): B-convert, tier M, 6 agents. */
const ANANYA = composePlan({
  teamBand: "6_20", revenueBand: "band_3", currency: "INR", chips: [],
  problemText: "Enquiries come in, but by the time someone calls back they've gone cold.",
});
const escape = (prevented = false) => {
  const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
  if (prevented) event.preventDefault();
  act(() => {
    document.dispatchEvent(event);
  });
};

let view: Rendered | null = null;
afterEach(() => {
  view?.unmount();
  view = null;
});

describe("discCopy: the disc's words, from the plan's copy IDs", () => {
  it("finds each department disc's department, and none for the end discs", () => {
    expect(departmentForDisc("G01")?.id).toBe("back-office");
    expect(departmentForDisc("G07")?.id).toBe("intelligence");
    expect(departmentForDisc("G00")).toBeNull();
    expect(departmentForDisc("G08")).toBeNull();
  });

  it("writes Ananya's Deals callout as §6.7 prints it: 3 of 5, then her three names in plan order (review M1, T3)", () => {
    const deals = departments.find((d) => d.id === "deals")!;
    const callout = discCallout(deals, ANANYA.agentIds);
    expect(callout.head).toBe("Deals · 3 of 5");
    expect(callout.lines.map((line) => line.replace(/^\d+\. /, ""))).toEqual(["Enquiry responder", "Reply sorter", "Call companion"]);
    callout.lines.forEach((line) => expect(line).toMatch(/^\d+\. [A-Z]/));
  });

  it("gives Ananya's other lit discs one name each (§6.7)", () => {
    const names = (id: string) =>
      discCallout(departments.find((d) => d.id === id)!, ANANYA.agentIds).lines.map((l) => l.replace(/^\d+\. /, ""));
    expect(names("sales")).toEqual(["Campaign runner"]);
    expect(names("marketing")).toEqual(["Marketing analyst"]);
    expect(names("back-office")).toEqual(["Numbers agent"]);
  });

  it("labels the disc button with sp.disc.aria, or sp.disc.aria.none when the plan needs nothing there", () => {
    expect(discAria(BACK_OFFICE, [BACK_OFFICE.agentIds[0]])).toBe(
      copy("sp.disc.aria", { Department: BACK_OFFICE.name, k: 1, m: BACK_OFFICE.agentIds.length }),
    );
    expect(discAria(BACK_OFFICE, [])).toBe(copy("sp.disc.aria.none", { Department: BACK_OFFICE.name }));
  });

  it("lists the department's agents in number order, the plan's own first", () => {
    const own = [BACK_OFFICE.agentIds[3], BACK_OFFICE.agentIds[1]];
    const rows = panelRows(BACK_OFFICE, own);
    const numbers = (ids: readonly AgentId[]) => ids.map((id) => agent(id).number);
    expect(rows.map((r) => r.id)).toHaveLength(BACK_OFFICE.agentIds.length);
    expect(rows.slice(0, 2).map((r) => r.id)).toEqual([...own].sort((a, b) => agent(a).number - agent(b).number));
    expect(numbers(rows.slice(2).map((r) => r.id))).toEqual([...numbers(rows.slice(2).map((r) => r.id))].sort((a, b) => a - b));
    expect(rows.map((r) => r.today)).toEqual([true, true, false, false, false]);
  });

  it("counts each agent's jobs, and the ones that run on our own company", () => {
    for (const row of panelRows(BACK_OFFICE, [])) {
      const a = agent(row.id);
      expect(row.jobs).toBe(a.jobs.length);
      expect(row.live).toBe(a.jobs.filter((j) => j.status === LIVE).length);
    }
  });
});

describe("DiscPanel: §6.2 'Opening a disc'", () => {
  const own = [BACK_OFFICE.agentIds[2]];

  function open(props: Partial<Parameters<typeof DiscPanel>[0]> = {}) {
    const onClose = vi.fn();
    view = render(<DiscPanel disc="G01" planAgentIds={own} onClose={onClose} {...props} />);
    return { onClose, panel: view.container.querySelector<HTMLElement>("[role=dialog]")! };
  }

  it("is a dialog named by its heading, sp.vert.dept", () => {
    const { panel } = open();
    const heading = panel.querySelector("h3")!;
    expect(heading.textContent).toBe(copy("sp.vert.dept", { department: BACK_OFFICE.name }));
    expect(panel.getAttribute("aria-labelledby")).toBe(heading.id);
    expect(panel.getAttribute("aria-modal")).toBe("false");
  });

  it("shows each agent's title, line, today or later, and jobs, with the live line only when a job runs", () => {
    const { panel } = open();
    const items = [...panel.querySelectorAll("li")];
    const rows = panelRows(BACK_OFFICE, own);
    expect(items).toHaveLength(rows.length);
    items.forEach((item, i) => {
      const a = agent(rows[i].id);
      const text = item.textContent ?? "";
      expect(text).toContain(copy("sp.vert.title", { v: a.number, "agent name": a.name }));
      expect(text).toContain(copy("sp.vert.line", { "agent line": a.line }));
      expect(text).toContain(copy(rows[i].today ? "sp.vert.today" : "sp.vert.later"));
      expect(text).toContain(copy("sp.vert.jobs", { j: rows[i].jobs }));
      const liveLine = rows[i].live > 0 ? copy("sp.vert.live", { k: rows[i].live, j: rows[i].jobs }) : null;
      if (liveLine) expect(text).toContain(liveLine);
      else expect(item.querySelector("[data-live]")).toBeNull();
    });
  });

  it("closes on Escape while focus is in the panel", () => {
    const { onClose } = open({ focusOnOpen: true });
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores other keys", () => {
    const { onClose } = open();
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("takes focus when opened by a tap or Enter, and leaves it on the disc when opened by hover or focus", () => {
    const { panel } = open({ focusOnOpen: true });
    expect(document.activeElement).toBe(panel);
    view?.unmount();
    view = null;
    const before = document.activeElement;
    open({ focusOnOpen: false });
    expect(document.activeElement).toBe(before);
  });

  it("lists Ananya's Back Office panel with her Numbers agent first (§6.2, review T3)", () => {
    view = render(<DiscPanel disc="G01" planAgentIds={ANANYA.agentIds} onClose={() => undefined} />);
    const first = view.container.querySelector("li")!;
    expect(first.textContent).toContain("Numbers agent");
    expect(first.textContent).toContain("You need this one today");
    expect(view.container.querySelectorAll('li[data-today="true"]')).toHaveLength(1);
  });

  it("puts focus back on the disc after Escape, once the parent removes the panel (review M5)", () => {
    const disc = document.createElement("button");
    document.body.appendChild(disc);
    disc.focus();
    const { onClose } = open({ focusOnOpen: true });
    expect(document.activeElement).not.toBe(disc);
    escape();
    expect(onClose).toHaveBeenCalledTimes(1);
    view?.unmount();
    view = null;
    expect(document.activeElement).toBe(disc);
    disc.remove();
  });

  it("returns focus to returnFocusTo when the caller names the disc", () => {
    const disc = document.createElement("button");
    document.body.appendChild(disc);
    const ref = createRef<HTMLButtonElement>();
    (ref as { current: HTMLButtonElement | null }).current = disc;
    open({ focusOnOpen: true, returnFocusTo: ref });
    view?.unmount();
    view = null;
    expect(document.activeElement).toBe(disc);
    disc.remove();
  });

  it("moves focus to the new content when the disc changes while the panel stays open", () => {
    const elsewhere = document.createElement("button");
    document.body.appendChild(elsewhere);
    open({ focusOnOpen: true });
    elsewhere.focus();
    view!.rerender(<DiscPanel disc="G04" planAgentIds={own} onClose={() => undefined} focusOnOpen />);
    expect((document.activeElement as HTMLElement).dataset.disc).toBe("G04");
    elsewhere.remove();
  });

  it("leaves an Escape that another layer already handled alone (review L2)", () => {
    const { onClose } = open();
    escape(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("leaves Escape to the film lightbox when focus is there, even though it never calls preventDefault (L2 re-check)", () => {
    // FilmLightbox.tsx:74-82 listens on document, added after the panel's, and never prevents the event.
    const { onClose } = open({ focusOnOpen: true });
    const lightboxClose = document.createElement("button");
    document.body.appendChild(lightboxClose);
    lightboxClose.focus();
    const lightbox = vi.fn();
    const onLightboxKey = (e: KeyboardEvent) => { if (e.key === "Escape") lightbox(); };
    document.addEventListener("keydown", onLightboxKey);
    escape();
    document.removeEventListener("keydown", onLightboxKey);
    lightboxClose.remove();
    expect(lightbox).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes on Escape while focus is on its disc (L2 re-check)", () => {
    const disc = document.createElement("button");
    document.body.appendChild(disc);
    const ref = createRef<HTMLButtonElement>();
    (ref as { current: HTMLButtonElement | null }).current = disc;
    const { onClose } = open({ returnFocusTo: ref });
    disc.focus();
    escape();
    expect(onClose).toHaveBeenCalledTimes(1);
    disc.remove();
  });

  it("renders nothing for an end disc", () => {
    view = render(<DiscPanel disc="G08" planAgentIds={own} onClose={() => undefined} />);
    expect(view.container.innerHTML).toBe("");
  });
});

describe("discCopy and DiscPanel for the guest's sample plan, every disc lit (W18-A)", () => {
  const SAMPLE = composePlan({ teamBand: "2_5", revenueBand: "band_2", currency: "INR", chips: [], problemText: "" });
  const MARKETING = departments.find((d) => d.id === "marketing")!;

  it("heads every callout with the department and its size in a full spine, never 'k of m' or names it 'needs'", () => {
    expect(discCallout(MARKETING, SAMPLE.agentIds, true)).toEqual({
      head: copy("sp.disc.call.guest", { Department: "Marketing", m: MARKETING.agentIds.length }), lines: [],
    });
    expect(discCallout(BACK_OFFICE, SAMPLE.agentIds, true).head).not.toMatch(/ of /);
  });

  it("names each disc button with the department's size, never 'you need'", () => {
    const label = discAria(MARKETING, SAMPLE.agentIds, true);
    expect(label).toBe(copy("sp.disc.aria.guest", { Department: "Marketing", m: MARKETING.agentIds.length }));
    expect(label).not.toMatch(/you need|nothing here/i);
  });

  it("marks the sample's own agents as in the sample, and says nothing about 'today' or 'later' for the rest", () => {
    view = render(<DiscPanel disc="G01" planAgentIds={SAMPLE.agentIds} onClose={vi.fn()} guest />);
    const rows = [...view.container.querySelectorAll("li[data-today]")];
    const text = view.container.textContent ?? "";
    expect(rows.filter((r) => r.getAttribute("data-today") === "true").every((r) => r.textContent!.includes(copy("sp.vert.sample")))).toBe(true);
    expect(text).not.toContain(copy("sp.vert.today"));
    expect(text).not.toContain(copy("sp.vert.later"));
  });
});
