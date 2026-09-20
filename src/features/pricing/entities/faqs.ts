/**
 * Pricing FAQ: the questions the Pricing page answers, shared with the Docs
 * page so the two answers cannot drift apart. Copy only; each page owns how it
 * renders them.
 *
 * TWO EXPORTS, ON PURPOSE. `PRICING_FAQS` is the full set and is what /docs
 * renders, because Docs owns the detailed questions. `PRICING_PAGE_FAQS` is the
 * three that /pricing shows, because Pricing answers four things and then
 * stops. Do not collapse them back into one array: cutting this list to three
 * would have taken the detail off Docs as well, and rendering all of it on
 * Pricing is what made that page restate Products.
 */

export interface Faq {
  q: string;
  a: string;
}

export const PRICING_FAQS: Faq[] = [
  { q: "Can I start small?", a: "Yes. Most teams start at Diagnose and keep the roadmap and spec whether or not we build. Build and Optimize are separate decisions after that." },
  // 1-3 weeks, matching Docs. The two pages disagreed: Docs said Diagnose took
  // 2-3 weeks and this said 1-3. Neither was more authoritative than the other,
  // so both now say 1-3 and Pricing's stage row is derived from the same figure.
  { q: "What's the typical timeline?", a: "Diagnose runs 1-3 weeks and Build 4-12, depending on how much of the operation the system touches. Optimize runs in cycles on an agreed cadence." },
  { q: "Do I need Diagnose before Build?", a: "Not always. If you can already say what the system has to do, we scope Build directly. Skip Diagnose and the ROI case rests on your numbers rather than ones we took together." },
  { q: "How do you scope a project?", a: "It starts with the paid consultation, billed by the hour with a one hour minimum. That hour tells us which stage you need, Diagnose, Build or Optimize, and what the stage has to cover. The price for that stage is set from there and shown before any of it starts." },
  { q: "Do you offer ongoing support?", a: "That is what Optimize is: outcome tracking, tuning, and a report on an agreed cadence. It is scoped and priced as its own stage rather than bundled into an open-ended retainer." },
];

/**
 * The three /pricing shows, in this order. Everything else lives on /docs.
 * Picked by question text rather than by index so reordering the list above
 * cannot silently change which three a visitor sees.
 */
const PRICING_PAGE_QUESTIONS = [
  "Can I start small?",
  "What's the typical timeline?",
  "Do I need Diagnose before Build?",
];

export const PRICING_PAGE_FAQS: Faq[] = PRICING_PAGE_QUESTIONS.map((q) => {
  const found = PRICING_FAQS.find((f) => f.q === q);
  if (!found) throw new Error(`PRICING_PAGE_FAQS: no FAQ named ${q}`);
  return found;
});
