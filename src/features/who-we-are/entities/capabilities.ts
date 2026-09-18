/**
 * What Ziiro helps with, briefly. The names, one-liners and descriptions are
 * the products page's own copy (src/pages/Products.tsx), repeated here so Who
 * We Are can explain the capabilities without sending the reader away. Keep the
 * two in step.
 */

export interface Capability {
  name: string;
  sub: string;
  desc: string;
}

export const CAPABILITIES: Capability[] = [
  {
    name: "Agentic Systems",
    sub: "Custom AI operators",
    desc: "We build agents that handle real business workflows: research, routing, follow-ups, reporting, and the repetitive decisions that shouldn't live in a founder's head.",
  },
  {
    name: "Self-Optimizing Systems",
    sub: "Feedback loops that learn",
    desc: "Marketing, outreach, website, and workflow loops that track their own outcomes and improve automatically, instead of guessing forever.",
  },
  {
    name: "Business Intelligence",
    sub: "Data that drives decisions",
    desc: "KPI baselines, analytics dashboards, ROI calculations, and priority matrices that show exactly where to invest next.",
  },
  {
    name: "AI Strategy Sprint",
    sub: "Know what to build",
    desc: "We map your team, stack, and constraints into a focused roadmap. No random tools, just the highest-leverage system to ship first.",
  },
  {
    name: "Role Analyzer",
    sub: "People in the right seats",
    desc: "A people-fit diagnostic for founder-led teams: understand what each person should own and how to redesign roles for throughput.",
  },
];
