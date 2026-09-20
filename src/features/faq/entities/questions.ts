/**
 * THE QUESTION BANK. This file is the single home of every question the site
 * answers, and /faq is the page that renders all of it.
 *
 * WHY IT MOVED. This list used to live in `features/pricing/entities/faqs.ts`,
 * which was the right home when Pricing was the only page asking. It is not the
 * right home now: /faq renders the whole bank, /pricing renders three of them
 * and /docs renders the operational ones, so ownership by one consumer was
 * backwards. Nothing about the copy changed in the move.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE. One question, one answer, in one place.
 * Every page selects a subset BY QUESTION TEXT, so reordering this list cannot
 * silently change what a page shows, and a question can never end up with two
 * different answers on two routes. Adding a fourth copy of any of these to a
 * page is the problem this site spent a lot of effort removing.
 *
 * WHAT IS DELIBERATELY NOT HERE, because the site cannot answer it honestly
 * today. Do not add these until the underlying fact exists:
 *   - Anything quoting a rate. The figures in rates.ts are unsigned-off
 *     placeholders.
 *   - Anything describing a guarantee. No policy has been agreed.
 *   - "How do I book?" or anything pointing at the booking flow. The link is
 *     still an old free 30-minute event, not the paid hour the site sells.
 *   - "Who owns what gets built?" Terms section 05 says software and AI systems
 *     are owned by or licensed to Ziiro AI, and there is no clause anywhere
 *     covering client deliverables. Answering it would contradict the Terms.
 */

export interface Faq {
  q: string;
  a: string;
  /** Which section of /faq this sits under. */
  group: FaqGroup;
}

export type FaqGroup = "before" | "scope" | "working";

export const FAQ_GROUPS: { id: FaqGroup; title: string; blurb: string }[] = [
  {
    id: "before",
    title: "Before you book",
    blurb: "What the first hour is, and what you need to have ready for it.",
  },
  {
    id: "scope",
    title: "Scope, timeline and price",
    blurb: "How an engagement is sized and what each stage commits you to.",
  },
  {
    id: "working",
    title: "How we work",
    blurb: "What happens inside the work, and what we need from your systems.",
  },
];

export const FAQS: Faq[] = [
  // ── Before you book ──────────────────────────────────────────────────
  {
    q: "What actually happens in the hour?",
    a: "You describe the work that eats your week and we work through it with you. You leave with the opportunities ranked in the order we would build them, rough sizing for each one in hours back against effort to build, and one recommended next move. It is a working session, not a pitch.",
    group: "before",
  },
  {
    q: "Do I need to prepare anything first?",
    a: "No. You do not need clean data, a written process or a brief. Mapping how the work actually moves, including the parts nobody ever documented, is the job rather than the prerequisite. Bring the problem in whatever state it is in.",
    group: "before",
  },
  {
    q: "Do you work with teams outside India?",
    a: "Yes. Ziiro is based in India and works with teams worldwide. The engagement runs the same way wherever you are.",
    group: "before",
  },

  // ── Scope, timeline and price ────────────────────────────────────────
  {
    q: "How do you scope a project?",
    a: "It starts with the paid consultation, billed by the hour with a one hour minimum. That hour tells us which stage you need, Diagnose, Build or Optimize, and what the stage has to cover. The price for that stage is set from there and shown before any of it starts.",
    group: "scope",
  },
  {
    q: "Can I start small?",
    a: "Yes. Most teams start at Diagnose and keep the roadmap and spec whether or not we build. Build and Optimize are separate decisions after that.",
    group: "scope",
  },
  // 1-3 weeks, matching Docs. The two pages disagreed once: Docs said Diagnose
  // took 2-3 weeks and Pricing said 1-3. Neither was more authoritative, so
  // both now say 1-3 and Pricing's stage row is derived from the same figure.
  {
    q: "What's the typical timeline?",
    a: "Diagnose runs 1-3 weeks and Build 4-12, depending on how much of the operation the system touches. Optimize runs in cycles on an agreed cadence.",
    group: "scope",
  },
  {
    q: "Do I need Diagnose before Build?",
    a: "Not always. If you can already say what the system has to do, we scope Build directly. Skip Diagnose and the ROI case rests on your numbers rather than ones we took together.",
    group: "scope",
  },
  {
    q: "Do you offer ongoing support?",
    a: "That is what Optimize is: outcome tracking, tuning, and a report on an agreed cadence. It is scoped and priced as its own stage rather than bundled into an open-ended retainer.",
    group: "scope",
  },

  // ── How we work ──────────────────────────────────────────────────────
  {
    q: "What if the diagnosis says don't build?",
    a: "Then that is the recommendation, and you still keep the process maps, the baselines and the ROI math. A stage that ends in evidence against building has done its job.",
    group: "working",
  },
  {
    q: "Which model do you use?",
    a: "Whichever one suits the job. GPT, Claude and Gemini sit in one interchangeable layer of the architecture and none of them is the advantage: the system built around them and the business context feeding it are.",
    group: "working",
  },
  {
    q: "What do you need access to?",
    a: "Only the systems the processes under review actually touch, and only from the point they are needed. What that means in practice is agreed during scoping, before any of it is connected.",
    group: "working",
  },
];

/** Selects by question text, so reordering FAQS cannot change a page's subset,
 *  and a typo fails the build rather than silently dropping a question. */
function pick(questions: string[]): Faq[] {
  return questions.map((q) => {
    const found = FAQS.find((f) => f.q === q);
    if (!found) throw new Error(`FAQ bank: no question named ${q}`);
    return found;
  });
}

/** The three /pricing shows. Pricing answers four things and then stops;
 *  everything more detailed is a link to /faq. */
export const PRICING_PAGE_FAQS: Faq[] = pick([
  "Can I start small?",
  "What's the typical timeline?",
  "Do I need Diagnose before Build?",
]);

/** What /docs shows: the operational questions a reader already inside the
 *  methodology asks. The buying questions are /faq's, not Docs'. */
export const DOCS_FAQS: Faq[] = pick([
  "How do you scope a project?",
  "Do you offer ongoing support?",
  "What if the diagnosis says don't build?",
  "Which model do you use?",
  "What do you need access to?",
]);

export const faqsInGroup = (group: FaqGroup): Faq[] =>
  FAQS.filter((f) => f.group === group);
