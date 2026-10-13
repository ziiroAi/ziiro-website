/**
 * The Ziiro system directory: one object per department, read from the funnel's
 * catalog (src/features/funnel/data/agents) and from nothing else.
 *
 * The visualisation and the detail panel both read from this array and nothing
 * but this array, so the graph on /products and the plan the funnel draws are
 * the same 7 departments, the same 33 agents and the same 137 jobs. A change to
 * the catalog moves the map, the panel and every count on its own; there is no
 * second list to keep in step.
 *
 * On main this file was hand-written: invented step sequences, integrations and
 * agent rosters, counted into "127 jobs across 30 agents". Those are the figures
 * the capability ground truth rules out, so none of that content was ported.
 * What the catalog does not hold, the directory does not show: there are no
 * workflow steps, no triggers and no integrations here, and so no flow view.
 *
 * Two rules from the original still hold:
 *
 *   1. No invented numbers. Every figure is counted off the catalog.
 *   2. No status the catalog does not give. A department has no "active" flag;
 *      a job carries one of the three marks the plan uses (● runs on our own
 *      company today, ◐ we build it for you, ○ mapped, not built yet).
 */
import { agents, departments } from "@/features/funnel/data/agents";
import { copy, type JobStatus } from "@/features/funnel/data/light";

export interface PipelineJob {
  id: string;
  name: string;
  status: JobStatus;
}

export interface PipelineAgent {
  id: string;
  /** Its number on the spine, 1 to 33, as the plan prints it. */
  number: number;
  name: string;
  /** The catalog's one line on what the agent does. */
  role: string;
  /** The map's outermost nodes: every dot on the graph is one of these. */
  jobs: PipelineJob[];
}

export interface Pipeline {
  id: string;
  name: string;
  /** The rim label on the map. */
  shortName: string;
  /** The department's tag and its reason, the plan's own copy lines. */
  tagline: string;
  purpose: string;
  /** First and last agent number, so the panel can say where on the spine it sits. */
  numbers: readonly [number, number];
  agents: PipelineAgent[];
}

/** The three marks, in the plan's order, with the legend lines the plan prints. */
export const MARKS: readonly { status: JobStatus; glyph: string; label: string }[] = [
  { status: "runs_on_our_company_today", glyph: "●", label: copy("r.legend.live") },
  { status: "we_build_it_for_you", glyph: "◐", label: copy("r.legend.build") },
  { status: "mapped", glyph: "○", label: copy("r.legend.mapped") },
];

/** The legend line for a mark, without its glyph: what a screen reader hears beside a job. */
export const markLabel = (status: JobStatus) => {
  const mark = MARKS.find((m) => m.status === status)!;
  return mark.label.replace(mark.glyph, "").trim();
};

export const glyphFor = (status: JobStatus) => MARKS.find((m) => m.status === status)!.glyph;

export const PIPELINES: Pipeline[] = departments.map((department) => ({
  id: department.id,
  name: department.name,
  shortName: department.name,
  tagline: copy(`dp.${department.copyKey}.tag`),
  purpose: copy(`dp.${department.copyKey}.why`),
  numbers: department.numbers,
  agents: agents
    .filter((agent) => agent.department === department.id)
    .map((agent) => ({
      id: agent.id,
      number: agent.number,
      name: agent.name,
      role: agent.line,
      jobs: agent.jobs.map((job) => ({ id: job.id, name: job.name, status: job.status })),
    })),
}));

/** Small helpers the views share. */
export const findPipeline = (id: string) =>
  PIPELINES.find((p) => p.id === id) ?? PIPELINES[0];

export const jobsIn = (pipeline: Pipeline) =>
  pipeline.agents.flatMap((agent) => agent.jobs);

/** ● ◐ ○ over a set of jobs, in MARKS order. */
export const markCounts = (jobs: readonly PipelineJob[]) =>
  MARKS.map((mark) => ({ ...mark, value: jobs.filter((job) => job.status === mark.status).length }));

/**
 * Everything the section header states, counted off the catalog rather than
 * typed into a string, so it cannot drift and cannot overstate.
 */
export const DIRECTORY_STATS = {
  departments: PIPELINES.length,
  agents: PIPELINES.reduce((n, p) => n + p.agents.length, 0),
  jobs: PIPELINES.reduce((n, p) => n + jobsIn(p).length, 0),
};
