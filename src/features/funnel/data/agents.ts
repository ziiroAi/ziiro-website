// The 33 agents and the 7 departments (§5.1, §6.7), read from the generated rows.
import { AGENT_ROWS, AGENTS_VERSION, DEPARTMENT_NAMES } from "./agents.generated.js";
import { DEPARTMENT_DISC, DEPARTMENTS } from "./contract.js";
import type { Agent, AgentId, Department, DepartmentId, JobId, JobStatus, MarkCounts, PlanStop } from "./contract.js";

export { AGENTS_VERSION };

export const agents: readonly Agent[] = AGENT_ROWS;

const BY_ID: ReadonlyMap<string, Agent> = new Map(agents.map((a) => [a.id, a]));

export const agentById = (id: string): Agent | undefined => BY_ID.get(id);

function departmentFor(id: DepartmentId): Department {
  const members = agents.filter((a) => a.department === id);
  return {
    id,
    name: DEPARTMENT_NAMES[id],
    copyKey: id.replace("-", ""),
    disc: DEPARTMENT_DISC[id],
    numbers: [members[0].number, members[members.length - 1].number],
    agentIds: members.map((a) => a.id),
  };
}

export const departments: readonly Department[] = DEPARTMENTS.map(departmentFor);
function agentOrThrow(id: string): Agent {
  const agent = BY_ID.get(id);
  if (!agent) throw new Error(`Unknown agent: ${id}`);
  return agent;
}

/** §9 job_ids: the agents' jobs, agent by agent, each agent's jobs in agents-33.json order. */
export const jobIdsFor = (agentIds: readonly AgentId[]): JobId[] =>
  agentIds.flatMap((id) => agentOrThrow(id).jobs.map((j) => j.id));

const MARK_KEY: Readonly<Record<JobStatus, keyof MarkCounts>> = {
  runs_on_our_company_today: "runs",
  we_build_it_for_you: "build",
  mapped: "mapped",
};

/** ● ◐ ○ over the agents' jobs (§5.6). */
export const marksFor = (agentIds: readonly AgentId[]): MarkCounts =>
  agentIds
    .flatMap((id) => agentOrThrow(id).jobs)
    .reduce<MarkCounts>((m, job) => ({ ...m, [MARK_KEY[job.status]]: m[MARK_KEY[job.status]] + 1 }), { runs: 0, build: 0, mapped: 0 });

/** §5.5: one stop per department, in order of its first agent in the list, the agents in list order inside it. */
export function stopsFor(agentIds: readonly AgentId[]): PlanStop[] {
  const order = [...new Set(agentIds.map((id) => agentOrThrow(id).department))];
  return order.map((department) => {
    const inStop = agentIds.filter((id) => agentOrThrow(id).department === department);
    return {
      department,
      disc: DEPARTMENT_DISC[department],
      agentIds: inStop,
      jobIds: jobIdsFor(inStop),
      marks: marksFor(inStop),
      departmentAgents: agents.filter((a) => a.department === department).length,
    };
  });
}
