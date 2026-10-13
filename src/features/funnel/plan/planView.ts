// The plan page's words (§6.2 to §6.4): every line that depends on the plan, worked out once, with no DOM.
import { agentById, cleanProblemText, copy, departments, quoteWords, wordsDepartmentFor } from "../data";
import type { Agent, Department, DepartmentId, Job, JobStatus, PlanDescriptor, PlanStop } from "../data/contract";

/** §6.3: their words are cut at 120 characters on the plan. */
export const WORDS_MAX = 120;

/** The line from 600 px wide, and the line under it (§6.4). Often the same. */
export interface Lines {
  desktop: string;
  phone: string;
}

export interface AgentView {
  id: string;
  name: string;
  line: string;
  jobs: readonly Job[];
  /** ph.vert.jobs, "{j} jobs · tap to open": a phone's job list starts closed (§6.4). */
  jobsToggle: string;
}

export interface StopView {
  /** This stop's plan_depth: 1 for the first stop (Appendix C). */
  depth: number;
  department: DepartmentId;
  /** sp.part.count, or ph.part on a phone. */
  count: Lines;
  heading: string;
  /** dp.*.tag, shown from 600 px only (§6.2). */
  tag: string;
  /** dp.*.words with their words, or dp.*.why (§6.3). */
  body: string;
  quotesWords: boolean;
  agents: readonly AgentView[];
  /** The department's other agents, by name, for sp.part.rest. */
  rest: readonly string[];
  /** The agents' heading: sp.part.agents, or sp.part.agents.guest on the sample plan (W18-A). */
  agentsHead: string;
}

export interface PlanViewModel {
  heroText: Lines;
  headline: Lines;
  sub: Lines;
  scroll: Lines;
  pilot: boolean;
  stops: readonly StopView[];
  later: Lines;
  ctaLead: Lines;
  /** plan_depth of the close: the number of stops plus one. */
  closeDepth: number;
}

export interface PlanViewInput {
  plan: PlanDescriptor;
  name: string;
  problemText: string;
  /** W17-B: the sample plan for a visitor from S1b. No name, and the sub says "this sample", not "you need". */
  guest?: boolean;
}

function departmentOf(id: DepartmentId): Department {
  const department = departments.find((d) => d.id === id);
  if (!department) throw new Error(`Unknown department: ${id}`);
  return department;
}

function agentOf(id: string): Agent {
  const agent = agentById(id);
  if (!agent) throw new Error(`Unknown agent: ${id}`);
  return agent;
}

function stopView(stop: PlanStop, index: number, total: number, quote: string | null, guest: boolean): StopView {
  const department = departmentOf(stop.department);
  const key = `dp.${department.copyKey}`;
  return {
    depth: index + 1,
    department: stop.department,
    count: {
      desktop: copy("sp.part.count", { i: index + 1, d: total }),
      phone: copy("ph.part", { i: index + 1, d: total, department: department.name }),
    },
    heading: copy(`${key}.heading`),
    tag: copy(`${key}.tag`),
    body: quote === null ? copy(`${key}.why`) : copy(`${key}.words`, { words: quote }),
    quotesWords: quote !== null,
    agents: stop.agentIds.map(agentOf).map((a) => ({
      id: a.id,
      name: a.name,
      line: a.line,
      jobs: a.jobs,
      jobsToggle: copy("ph.vert.jobs", { j: a.jobs.length }),
    })),
    rest: department.agentIds.filter((id) => !stop.agentIds.includes(id)).map((id) => agentOf(id).name),
    agentsHead: copy(guest ? "sp.part.agents.guest" : "sp.part.agents"),
  };
}

export function buildPlanView({ plan, name, problemText, guest = false }: PlanViewInput): PlanViewModel {
  const n = plan.agentIds.length;
  const parts = plan.stops.length;
  const words = cleanProblemText(problemText);
  // §6.3 and D36: their words are quoted once, at the stop of the department they point at. Words that point at no
  // department go to the first stop. Words that point at a department the plan lacks aren't quoted (Review Focus 3).
  const quoteDepartment = words === "" ? null : (wordsDepartmentFor(words) ?? plan.stops[0]?.department ?? null);
  const quoteAt = (stop: PlanStop): string | null =>
    stop.department === quoteDepartment ? quoteWords(words, WORDS_MAX) : null;
  const fallback = plan.fallback ? ".fallback" : "";
  return {
    heroText: guest
      ? { desktop: copy("hx.p.guest"), phone: copy("ph.hx.p.guest") }
      : { desktop: copy("hx.p", { name }), phone: copy("ph.hx.p", { name }) },
    headline: { desktop: copy(`sp.hero.h${fallback}`, { n }), phone: copy(`ph.hero.h${fallback}`, { n }) },
    sub: { desktop: copy(guest ? "sp.hero.sub.guest" : "sp.hero.sub", { n, j: plan.jobIds.length }), phone: copy("ph.hero.sub") },
    // D37: a one-part plan gets the singular line, so it never reads "the 1 parts".
    scroll: {
      desktop: guest
        ? copy("sp.hero.scroll.guest", { d: parts })
        : copy(parts === 1 ? "sp.hero.scroll.one" : "sp.hero.scroll", { d: parts }),
      phone: copy("ph.hero.scroll"),
    },
    pilot: plan.pilot,
    stops: plan.stops.map((stop, i) => stopView(stop, i, parts, quoteAt(stop), guest)),
    // W18-A: the guest runs no business, so these say what a business starts with, never what "you need".
    later: guest
      ? { desktop: copy("sp.later.guest"), phone: copy("ph.later.guest", { n }) }
      : { desktop: copy("sp.later"), phone: copy("ph.later", { n }) },
    ctaLead: guest
      ? { desktop: copy("sp.cta.lead.guest"), phone: copy("ph.cta.lead.guest") }
      : { desktop: copy("sp.cta.lead", { n }), phone: copy("ph.cta.lead", { n }) },
    closeDepth: parts + 1,
  };
}

const MARK_LINE: Readonly<Record<JobStatus, string>> = {
  runs_on_our_company_today: "r.legend.live",
  we_build_it_for_you: "r.legend.build",
  mapped: "r.legend.mapped",
};

/** A job's mark (● ◐ ○) and its words, both cut from the legend line, "● Runs on our own company today". */
export function markOf(status: JobStatus): { glyph: string; label: string } {
  const line = copy(MARK_LINE[status]);
  const space = line.indexOf(" ");
  return { glyph: line.slice(0, space), label: line.slice(space + 1) };
}

/** The hero's two title lines. On a phone, ph.hx.h holds both, split at " / ". */
export function heroTitle(): readonly [Lines, Lines] {
  const [phoneFirst = "", phoneSecond = ""] = copy("ph.hx.h").split(" / ");
  return [
    { desktop: copy("hx.h1"), phone: phoneFirst },
    { desktop: copy("hx.h2"), phone: phoneSecond },
  ];
}
