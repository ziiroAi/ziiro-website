/**
 * Pricing FAQ: the questions the Pricing page answers, shared with the Docs
 * page so the two answers cannot drift apart. Copy only; each page owns how it
 * renders them.
 */

export interface Faq {
  q: string;
  a: string;
}

export const PRICING_FAQS: Faq[] = [
  { q: "How do you scope a project?", a: "We start with an hourly consultation to understand your business, then propose a focused scope based on where agents create the most leverage. No generic packages." },
  { q: "Can I start small?", a: "Absolutely. Most clients start with a Strategy Sprint to identify the highest-leverage system, then move to a Full Build once they see the roadmap." },
  { q: "What's the typical timeline?", a: "Strategy Sprints take 1-3 weeks. Full Builds range from 4-12 weeks depending on complexity. We work in focused sprints, not endless retainers." },
  { q: "Do you offer ongoing support?", a: "Yes. After the build, we offer measurement and optimization cycles to ensure your systems keep improving over time." },
];
