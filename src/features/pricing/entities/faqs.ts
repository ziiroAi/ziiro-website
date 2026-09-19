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
  { q: "How do you scope a project?", a: "It starts with the paid consultation, billed by the hour with a one hour minimum. That hour tells us which stage you need, Diagnose, Build or Optimize, and what the stage has to cover. The price for that stage is set from there and shown before any of it starts." },
  { q: "Can I start small?", a: "Yes. Most teams start at Diagnose, which ends with a roadmap and a spec you keep whether or not we build it. Build and Optimize are separate decisions taken after that, one stage at a time." },
  { q: "What's the typical timeline?", a: "Diagnose usually runs 1-3 weeks and Build 4-12, depending on how much of the operation the system touches. Optimize runs in cycles on an agreed cadence rather than toward a finish date." },
  { q: "Do you offer ongoing support?", a: "That is what Optimize is: outcome tracking, tuning, and a report on an agreed cadence. It is scoped and priced as its own stage rather than bundled into an open-ended retainer." },
];
