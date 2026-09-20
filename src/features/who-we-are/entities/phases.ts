/**
 * How an engagement runs, phase by phase. Lifted from the retired Process
 * page and condensed to what a reader needs on Who We Are: when each phase
 * happens, what it does, and the artifact it ends in. Seven entries because
 * the journey map (shared/ui/method-path) draws exactly seven stations.
 */

export interface Phase {
  num: string;
  name: string;
  days: string;
  desc: string;
  output: string;
}

export const PHASES: Phase[] = [
  {
    num: "01",
    name: "Understand",
    days: "Days 1-3",
    desc: "Discovery sessions on your revenue model, customer journeys, operations, cost structure and growth blockers.",
    output: "Business model canvas",
  },
  {
    num: "02",
    name: "Map",
    days: "Days 3-5",
    desc: "Every core process documented step by step, with manual work, bottlenecks, repeated tasks and handoffs flagged.",
    output: "Process flowcharts",
  },
  {
    num: "03",
    name: "Measure",
    days: "Week 1",
    desc: "Baseline metrics before anything changes: revenue health, operational efficiency and error rates.",
    output: "KPI baselines",
  },
  {
    num: "04",
    name: "Identify",
    days: "Week 2",
    desc: "Each problem tested against automation, prediction, summarization, classification, optimization and decision support.",
    output: "AI opportunity list",
  },
  {
    num: "05",
    name: "Calculate",
    days: "Week 2",
    desc: "Monthly savings, the investment each one needs, break-even timeline and Year 1 ROI for every opportunity.",
    output: "ROI per opportunity",
  },
  {
    num: "06",
    name: "Prioritize",
    days: "Week 3",
    desc: "Opportunities ranked by value against difficulty on a clear 2×2, so the first build is a decision, not a debate.",
    output: "Priority matrix",
  },
  {
    num: "07",
    name: "Roadmap",
    days: "Week 3",
    desc: "A month-by-month plan with milestones, dependencies and success criteria for each system.",
    output: "Implementation plan",
  },
];

/** The engagement's terms, as the Process page stated them.
 *
 *  The duration is 1-3 weeks, not the 2-3 this said until now. Pricing's
 *  Diagnose span and the timeline FAQ both say 1-3, and this entity renders on
 *  /docs and /who-we-are, so the old figure was the site contradicting itself
 *  on three pages. Keep all four in step: this line, Pricing's `span`, the
 *  timeline answer in pricing/entities/faqs.ts, and anything that quotes them. */
export const PROCESS_TERMS = [
  "Duration: 1-3 weeks",
  "Scope: Fixed",
  "Obligation: None",
];
