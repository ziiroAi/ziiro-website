// @vitest-environment jsdom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { agents, copy, departments } from "../../data";
import type { AgentId } from "../../data/contract";
import { render, type Rendered } from "../../plan/test-utils";
import { DiscPanel } from "./DiscPanel";
import { departmentForDisc, discAria, discCallout, panelRows } from "./discCopy";

const BACK_OFFICE = departments.find((d) => d.id === "back-office")!;
const LIVE = "runs_on_our_company_today";
const agent = (id: AgentId) => agents.find((a) => a.id === id)!;

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

  it("writes the callout as sp.disc.call: {Department} · {k} of {m}", () => {
    const plan = [BACK_OFFICE.agentIds[2]];
    expect(discCallout(BACK_OFFICE, plan)).toBe(
      copy("sp.disc.call", { Department: BACK_OFFICE.name, k: 1, m: BACK_OFFICE.agentIds.length }),
    );
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

  it("closes on Escape", () => {
    const { onClose } = open();
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

  it("renders nothing for an end disc", () => {
    view = render(<DiscPanel disc="G08" planAgentIds={own} onClose={() => undefined} />);
    expect(view.container.innerHTML).toBe("");
  });
});
