// (C) W14-F (d, e): the words on and about a disc, from the plan's existing copy IDs (§4.5, §6.2), unchanged:
// sp.disc.call for the pinned callout, sp.disc.aria for the disc button, and the panel's rows.
import { agents, copy, departments } from "../../data";
import type { Agent, AgentId, Department, DiscId } from "../../data/contract";

const LIVE = "runs_on_our_company_today";

export interface PanelRow {
  id: AgentId;
  number: number;
  name: string;
  line: string;
  today: boolean;          // one of the plan's own agents
  jobs: number;
  live: number;            // its jobs that run on our own company today
}

/** The department a disc stands for (§6.7); null for the end discs, G00 and G08. */
export const departmentForDisc = (disc: DiscId): Department | null =>
  departments.find((d) => d.disc === disc) ?? null;

const neededIn = (department: Department, planAgentIds: readonly AgentId[]): number =>
  department.agentIds.filter((id) => planAgentIds.includes(id)).length;

/** sp.disc.call: "{Department} · {k} of {m}". */
export const discCallout = (department: Department, planAgentIds: readonly AgentId[]): string =>
  copy("sp.disc.call", { Department: department.name, k: neededIn(department, planAgentIds), m: department.agentIds.length });

/** The disc button's label: sp.disc.aria, or sp.disc.aria.none when the plan needs nothing there. */
export function discAria(department: Department, planAgentIds: readonly AgentId[]): string {
  const k = neededIn(department, planAgentIds);
  return k === 0
    ? copy("sp.disc.aria.none", { Department: department.name })
    : copy("sp.disc.aria", { Department: department.name, k, m: department.agentIds.length });
}

const byNumber = (a: Agent, b: Agent): number => a.number - b.number;

/** §6.2: the department's agents in number order, the plan's own first. */
export function panelRows(department: Department, planAgentIds: readonly AgentId[]): PanelRow[] {
  const members = agents.filter((a) => a.department === department.id);
  const own = members.filter((a) => planAgentIds.includes(a.id)).sort(byNumber);
  const rest = members.filter((a) => !planAgentIds.includes(a.id)).sort(byNumber);
  return [...own, ...rest].map((a) => ({
    id: a.id,
    number: a.number,
    name: a.name,
    line: a.line,
    today: planAgentIds.includes(a.id),
    jobs: a.jobs.length,
    live: a.jobs.filter((j) => j.status === LIVE).length,
  }));
}
