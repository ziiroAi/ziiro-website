// The 33 agents and the 7 departments (§5.1, §6.7), read from the generated rows.
import { AGENT_ROWS, AGENTS_VERSION, DEPARTMENT_NAMES } from "./agents.generated";
import { DEPARTMENT_DISC, DEPARTMENTS } from "./contract";
import type { Agent, Department, DepartmentId } from "./contract";

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
