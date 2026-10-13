import { describe, expect, it } from "vitest";
import { agents, departments } from "@/features/funnel/data/agents";
import { DIRECTORY_STATS, MARKS, PIPELINES, jobsIn, markCounts, markLabel } from "./pipelines";
import { buildLayout } from "./layout";

const allJobs = PIPELINES.flatMap(jobsIn);

describe("the directory agrees with the funnel catalog (W24-B)", () => {
  it("has the catalog's 7 departments, in its order and with its names", () => {
    expect(PIPELINES.map((p) => [p.id, p.name])).toEqual(departments.map((d) => [d.id, d.name]));
    expect(PIPELINES.map((p) => p.id)).toEqual([
      "intelligence", "marketing", "sales", "deals", "customer", "operations", "back-office",
    ]);
  });

  it("puts each of the 33 agents in its own department, numbered as the plan numbers it", () => {
    expect(DIRECTORY_STATS).toEqual({ departments: 7, agents: 33, jobs: 137 });
    const listed = PIPELINES.flatMap((p) => p.agents.map((a) => ({ ...a, department: p.id })));
    expect(listed.map((a) => [a.id, a.number, a.name, a.department, a.role])).toEqual(
      agents.map((a) => [a.id, a.number, a.name, a.department, a.line]),
    );
    for (const p of PIPELINES) {
      const department = departments.find((d) => d.id === p.id)!;
      expect(p.agents.map((a) => a.id)).toEqual(department.agentIds);
      expect(p.numbers).toEqual(department.numbers);
    }
  });

  it("carries every one of the 137 jobs with the catalog's own status", () => {
    expect(allJobs.map((j) => [j.id, j.name, j.status])).toEqual(
      agents.flatMap((a) => a.jobs.map((j) => [j.id, j.name, j.status])),
    );
    expect(new Set(allJobs.map((j) => j.id)).size).toBe(137);
  });

  it("counts the three marks the way the ground truth does: 6 run on our company, 9 we build, 122 mapped", () => {
    expect(markCounts(allJobs).map((m) => [m.glyph, m.value])).toEqual([["●", 6], ["◐", 9], ["○", 122]]);
    expect(MARKS.map((m) => m.label)).toEqual([
      "● Runs on our own company today", "◐ We build it for you", "○ Mapped, not built yet",
    ]);
    expect(markLabel("mapped")).toBe("Mapped, not built yet");
  });

  it("draws one dot per job on the map, and nothing else past the agents", () => {
    const layout = buildLayout(PIPELINES);
    expect(layout.flatMap((s) => s.agents)).toHaveLength(33);
    const dots = layout.flatMap((s) => s.nodes);
    expect(dots).toHaveLength(137);
    expect(new Set(dots.map((n) => n.kind))).toEqual(new Set(["job"]));
    expect(dots.map((n) => n.label).sort()).toEqual(allJobs.map((j) => j.name).sort());
  });
});
