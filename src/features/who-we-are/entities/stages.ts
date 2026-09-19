/**
 * The three stages an engagement can run, described for Who We Are.
 *
 * This file was `capabilities.ts` and held a verbatim copy of the five
 * separately-branded services the products page used to sell (Agentic Systems,
 * Self-Optimizing Systems, Business Intelligence, AI Strategy Sprint, Role
 * Analyzer). Its own header told the next person to "keep the two in step",
 * which is exactly why the retired names were still rendering here after
 * /products collapsed to three stages. The instruction is now the opposite:
 *
 *   Do NOT mirror the products page. The offer taxonomy is three stages and
 *   only three, and the capability rows inside each stage belong to
 *   src/pages/Products.tsx alone. What this page adds is what a stage is FOR,
 *   in one line, so a reader can tell which one they are actually buying.
 *
 * Sub and desc are written from that angle deliberately: the products page
 * frames the same three by the symptom that sends you there, and repeating its
 * framing here is the page-duplication problem this whole job exists to fix.
 */

export interface Stage {
  name: string;
  sub: string;
  desc: string;
}

export const STAGES: Stage[] = [
  {
    name: "Diagnose",
    sub: "Before anything is built",
    desc: "Mapping and measurement that end in a ranked list of what to automate and what each one is worth. It stands on its own, and nothing obliges you to build what it recommends.",
  },
  {
    name: "Build",
    sub: "Into the operation, not a sandbox",
    desc: "The first system off that list, running inside the tools your team already opens, scoped from the diagnosis so nobody is inventing the requirements a second time.",
  },
  {
    name: "Optimize",
    sub: "Once it is live",
    desc: "The system checked against the baseline taken before it existed, and tuned on what that shows. The only stage that repeats.",
  },
];
