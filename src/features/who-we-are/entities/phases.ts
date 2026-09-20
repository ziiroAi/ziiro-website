/**
 * How an engagement runs, phase by phase. Lifted from the retired Process
 * page and condensed to what a reader needs on Who We Are: when each phase
 * happens, what it does, and the artifact it ends in. Seven entries because
 * the journey map (shared/ui/method-path) draws exactly seven stations.
 */

/** A row of a method block: a bare item, or a term with its explanation. */
export type MethodRow = string | { term: string; detail: string };

/** One reusable framework inside a phase. */
export interface MethodBlock {
  /** Mono micro-label above the rows. */
  label: string;
  rows: MethodRow[];
  /** One line of guidance under the rows. */
  note?: string;
}

export interface Phase {
  num: string;
  name: string;
  days: string;
  desc: string;
  output: string;
  /**
   * The reusable part of the phase: the framework, checklist or calculation a
   * reader could run themselves. This is what /docs is for. It is deliberately
   * generic and deliberately not a pitch, because Products, Pricing and
   * Mission each own the selling and Docs was cut specifically to stop
   * repeating them.
   */
  method?: MethodBlock[];
}

export const PHASES: Phase[] = [
  {
    num: "01",
    name: "Understand",
    days: "Days 1-3",
    desc: "Discovery sessions on your revenue model, customer journeys, operations, cost structure and growth blockers.",
    output: "Business model canvas",
    method: [
      {
        label: "Discovery framework",
        rows: [
          "Revenue model",
          "Customer journey",
          "Operations and team",
          "Cost structure",
          "Growth blockers",
        ],
      },
      {
        label: "What to ask in each",
        rows: [
          { term: "Revenue", detail: "How the business makes money, how it prices, which streams exist, and how payment actually arrives." },
          { term: "Customers", detail: "Who buys, why they buy, how they find the business, and what makes them leave." },
          { term: "Operations", detail: "The daily workflow, the team structure, the tools in use, and which steps are still done by hand." },
          { term: "Finance", detail: "Cost structure, margins, cash flow patterns, and what is actually constraining growth." },
        ],
        note: "The point is to be able to describe the business without using the word AI once.",
      },
    ],
  },
  {
    num: "02",
    name: "Map",
    days: "Days 3-5",
    desc: "Every core process documented step by step, with manual work, bottlenecks, repeated tasks and handoffs flagged.",
    output: "Process flowcharts",
    method: [
      {
        label: "Annotate every step",
        rows: ["Manual", "Bottleneck", "Repeated", "Error-prone", "Handoff"],
      },
      {
        label: "Process audit checklist",
        rows: [
          { term: "Find", detail: "Manual steps, bottlenecks, repeated work, and the gaps where one team waits on another." },
          { term: "Score", detail: "How often it happens, how long it takes, what it costs, and how often it goes wrong." },
          { term: "Decide", detail: "Automate it, simplify it, eliminate it, or leave it alone." },
        ],
        note: "Leave alone is a real answer. A step that is rare, cheap and reliable is not worth touching.",
      },
    ],
  },
  {
    num: "03",
    name: "Measure",
    days: "Week 1",
    desc: "Baseline metrics before anything changes: revenue health, operational efficiency and error rates.",
    output: "KPI baselines",
    method: [
      {
        label: "Revenue health",
        rows: [
          "Monthly recurring revenue",
          "Gross and net profit margin",
          "Average order value",
          "Customer lifetime value",
          "Customer acquisition cost",
          "Churn rate",
        ],
        note: "A standard rule of thumb: if lifetime value is under about three times acquisition cost, the problem is structural and automation will not fix it.",
      },
      {
        label: "Operational efficiency",
        rows: [
          "Time per task",
          "People per process",
          "Cost per operation",
          "Error rate",
          "Customer wait time",
          "Throughput",
          "Rework rate",
        ],
      },
      {
        label: "Building the baseline",
        rows: [
          { term: "One row per process", detail: "Time per occurrence, how often it occurs, how many people it takes, what it costs per month, and how often it has to be redone." },
        ],
        note: "Taken before anything changes, because it is the only thing a later claim of improvement can be measured against.",
      },
    ],
  },
  {
    num: "04",
    name: "Identify",
    days: "Week 2",
    desc: "Each problem tested against automation, prediction, summarization, classification, optimization and decision support.",
    output: "AI opportunity list",
    method: [
      {
        label: "Six questions per problem",
        rows: [
          "Can it be automated?",
          "Can it be predicted?",
          "Can it be summarized?",
          "Can it be classified?",
          "Can it be optimized?",
          "Can the decision be assisted?",
        ],
        note: "If a problem answers no to all six, it is not an AI problem. That is a useful result, not a failed one.",
      },
      {
        label: "Matching a problem to a solution",
        rows: [
          { term: "Invoices, receipts, forms", detail: "Document extraction: read the file, pull the fields, validate against rules, push into the system of record." },
          { term: "Repeated customer questions", detail: "Retrieval over your own documents, answering from the knowledge base and escalating when confidence is low." },
          { term: "Lead qualification", detail: "A scoring model trained on which past leads actually closed, so the strongest are routed first." },
          { term: "Email and follow-ups", detail: "An assistant that drafts from context, personalises outreach and pulls out the action items." },
          { term: "Recurring reports", detail: "A scheduled pipeline that pulls the data, computes the measures and sends the result." },
          { term: "Sales calls", detail: "Transcription plus extraction: the key points, the objections raised, and where the conversation turned." },
          { term: "Finding internal information", detail: "Retrieval over procedures and policies, so the team can ask in plain language instead of hunting." },
          { term: "Demand and churn", detail: "Forecasting on historical patterns, so stock, staffing and outreach move before the fact rather than after it." },
        ],
      },
    ],
  },
  {
    num: "05",
    name: "Calculate",
    days: "Week 2",
    desc: "Monthly savings, the investment each one needs, break-even timeline and Year 1 ROI for every opportunity.",
    output: "ROI per opportunity",
    method: [
      {
        label: "How the calculation is structured",
        rows: [
          { term: "Current monthly cost", detail: "People times hours times hourly rate, plus tool costs, plus what the errors cost." },
          { term: "Cost after the change", detail: "The human hours that remain, plus subscription, plus maintenance." },
          { term: "Monthly saving", detail: "Current cost minus the cost after the change." },
          { term: "Implementation cost", detail: "Development, integration, training, and a buffer." },
          { term: "Break-even", detail: "Implementation cost divided by the monthly saving." },
          { term: "First-year return", detail: "Monthly saving times twelve, minus implementation cost." },
        ],
        note: "Every figure comes from the baseline taken in phase 03, not from a benchmark or an industry average. A number you cannot trace back to the client's own operation is not evidence.",
      },
    ],
  },
  {
    num: "06",
    name: "Prioritize",
    days: "Week 3",
    desc: "Opportunities ranked by value against difficulty on a clear 2×2, so the first build is a decision, not a debate.",
    output: "Priority matrix",
    method: [
      {
        label: "The two axes",
        rows: [
          { term: "Return", detail: "The monthly saving from phase 05, vertically." },
          { term: "Effort", detail: "Build time, integration difficulty and data readiness, horizontally." },
        ],
      },
      {
        label: "Reading the quadrants",
        rows: [
          { term: "Do first", detail: "High return, low effort. This is where the first build comes from, every time." },
          { term: "Plan next", detail: "High return, high effort. Worth doing, but it needs the quick wins to land first." },
          { term: "Nice to have", detail: "Low return, low effort. Fill-in work. Never the opening move." },
          { term: "Skip for now", detail: "Low return, high effort. Revisit only if the return changes." },
        ],
        note: "The matrix exists so the first build is settled by where things land rather than by who argues hardest for them.",
      },
    ],
  },
  {
    num: "07",
    name: "Roadmap",
    days: "Week 3",
    desc: "A month-by-month plan with milestones, dependencies and success criteria for each system.",
    output: "Implementation plan",
    method: [
      {
        label: "Sequencing rules",
        rows: [
          { term: "Quick wins first", detail: "Something has to be working early, while the appetite for the project is still there." },
          { term: "Core systems next", detail: "Once the quick wins have proved the data is reachable and the access actually works." },
          { term: "Advanced work last", detail: "Forecasting and decision support depend on both of the above being in place." },
        ],
      },
      {
        label: "Every milestone carries",
        rows: [
          { term: "A dependency", detail: "What has to be working before this can start." },
          { term: "A success criterion", detail: "The baseline number it has to move, agreed before the build rather than after it." },
          { term: "An owner", detail: "Who on your side signs it off." },
        ],
      },
    ],
  },
];

/** The engagement's terms, as the Process page stated them.
 *
 *  The duration is 1-3 weeks, not the 2-3 this said until now. Pricing's
 *  Diagnose span and the timeline FAQ both say 1-3, and this entity renders on
 *  /docs and /who-we-are, so the old figure was the site contradicting itself
 *  on three pages. Keep all four in step: this line, Pricing's `span`, the
 *  timeline answer in faq/entities/questions.ts, and anything that quotes them. */
export const PROCESS_TERMS = [
  "Duration: 1-3 weeks",
  "Scope: Fixed",
  "Obligation: None",
];
