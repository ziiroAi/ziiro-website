/**
 * (C) Test only. The lines lane A's screens show (copy.md, with spec §4.5's changes and the two S8 variants in
 * lane C's copy) and fakes to spread inside vi.mock of the light entry, and of the full entry where composePlan
 * runs, so the flow's tests don't wait on lane C. copy-ids.test.ts (Task 17) checks the real copy has every ID.
 */
import type { Currency, PlanDescriptor, PlanInput } from "@/features/funnel/data/light";

export const LINES: Readonly<Record<string, string>> = {
  "g.about": "ziiro AI is an AI consultancy based in India, working with teams worldwide.",
  "g.back": "Back",
  "g.progress": "Step {n} of {total}",
  "g.footer": "Your answers are saved to shape your plan. · Privacy",
  "g.error": "Something went wrong on our end. Try that again?",
  "g.noscript": "This page needs JavaScript to build your plan. Rather talk? Book a call.",
  "nav.btn": "Book a call",
  "s9.err.sent": "Your plan is on its way to {email}. This page couldn't show it just now, but the email has all of it.",
  "s9.err.unsent": "This page couldn't show your plan just now. Reload to try again, or book a call.",
  "g.reload": "Reload the page",
  "s0.sub.early": "You're up early.",
  "s0.sub.day": "Glad you're here.",
  "s0.sub.late": "Late one? I'll keep it quick.",
  "s0.promise": "A few taps and I'll put together a plan for your business. Takes about a minute.",
  "s1.q": "What do you do?",
  "s1.o1": "I run a business",
  "s1.o2": "I run an agency",
  "s1.o3": "I freelance",
  "s1.o4": "I'm starting something",
  "s1.o5": "Student, or just curious",
  "s1b.q": "What brought you here?",
  "s1b.o1": "Ideas for my own work",
  "s1b.o2": "Thinking about starting a business",
  "s1b.o3": "Learning how businesses use AI",
  "s1b.o4": "Saw a reel or a post",
  "s1b.o5": "Something else",
  "s1b.done": "Got it, thanks. Everything's open, have a look around.",
  "s1b.btn": "Show me the site",
  "s2.q": "What kind of business?",
  "s2.hint": "Pick the closest one.",
  "s2.o": "Interior design / architecture · Clinic / healthcare · Real estate · Education / coaching / study abroad · Insurance / loans · Law / consultancy · Marketing or creative agency · Retail / boutique / D2C · Gym / salon / fitness · Manufacturing · Restaurant / food · Other",
  "s2.other": "Type it in a few words, like \"printing press\" or \"travel agency\"",
  "s3.q": "How long have you been at it?",
  "s3.why": "This tells me what's probably already in place.",
  "s3.o": "Less than a year · 1–3 years · 3–5 years · 5–10 years · 10+ years",
  "s4.q": "How big is the team?",
  "s4.why": "Count yourself. The plan should fit the people you actually have.",
  "s4.o": "Just me · 2–5 · 6–20 · 21–50 · 50+",
  "s5.q": "Roughly, what does it make in a year?",
  "s5.why": "A band is fine. I only use it to size your plan.",
  "s5.o.IN": "Under ₹25L · ₹25L–1Cr · ₹1–5Cr · ₹5–25Cr · ₹25Cr+",
  "s5.o.other": "Under $250k · $250k–1M · $1–5M · $5–25M · $25M+",
  "s5.skip": "Rather not say",
  "s6.bridge": "Now let's talk about why you're here.",
  "s6.q": "Between you and me, what's the one thing in your business that's hurting right now?",
  "s6.hint": "Say it however it comes out. I'm listening.",
  "s6.text": "Honestly, I'm struggling with ___ because ___.",
  "s6.chips.lead": "Or tap up to three:",
  "s6.chips": "Not enough leads · Leads don't convert · Follow-ups slip · Ads burn money · No time for content · I don't know my numbers · Payments get stuck · Team chaos · Customer support",
  "s6.chips.max": "Three's plenty. Untap one to swap.",
  "s6.btn": "That's it",
  "s6.empty": "Give me something to work with: a few words, a chip, anything.",
  "s7.q": "Where should I send your plan?",
  "s7.sub": "It opens right here in a second, and a copy goes to your inbox.",
  "s7.name": "Your name",
  "s7.name.ph": "First name is fine",
  "s7.email": "Email",
  "s7.email.ph": "The one you actually check",
  "s7.phone": "Phone (optional)",
  "s7.phone.why": "Only if you'd like a call. I won't WhatsApp you unless you ask.",
  "s7.consent": "I agree that ziiro can save my answers and email me about this plan. If I add a phone number, ziiro can call me about it too, but won't message me on WhatsApp unless I ask. I can ask for my data to be deleted at any time.",
  "s7.links": "Privacy · For business owners 18+",
  "s7.btn": "Show me my plan",
  "s7.err.name": "What should I call you?",
  "s7.err.email": "That email doesn't look right. Mind checking it?",
  "s7.err.phone": "That number doesn't look right. You can leave it blank.",
  "s7.err.consent": "Tick the box so I'm allowed to save this.",
  "s7.err.bot": "The spam check didn't go through. Mind trying once more?",
  "s8.l1": "Reading what you wrote…",
  "s8.l1.chips": "Looking at what you picked…",
  "s8.l2": "Matching it against a map of 137 business jobs…",
  "s8.l3": "Sizing it for a team of {team}…",
  "s8.l3.one": "Sizing it for a team of one…",
  // The plan hero labels its spine canvas with these alt lines.
  "hx.alt.light": "A tall spine of glossy black vertebrae, every disc between them glowing orange.",
  "hx.alt.dark": "A tall spine of dark chrome vertebrae, every disc glowing a cool blue-white.",
};

/** Throws like the real copy(): on an unknown ID, and on a placeholder left unfilled. */
export function fakeCopy(id: string, vars: Readonly<Record<string, string | number>> = {}): string {
  const line = LINES[id];
  if (line === undefined) throw new Error(`unknown copy id: ${id}`);
  return line.replace(/\{([^}]+)\}/g, (_match, key: string) => {
    if (!(key in vars)) throw new Error(`${id}: {${key}} is not filled`);
    return String(vars[key]);
  });
}

/** A fixed plan for the flow's tests. The values are illustrative; lane C's composePlan decides real plans. */
export const FAKE_PLAN: PlanDescriptor = {
  bucketPrimary: "sales", bucketSecondary: "lead_gen", bucketScores: { sales: 6, lead_gen: 2 },
  matchedPhrases: ["gone cold"], template: "B", orderVariant: "B-convert", lane: null, tier: "M",
  agentIds: ["deals-inbound", "deals-reply-handling", "sales-sequencing-send", "deals-call-cycle", "intelligence-people", "deals-pipeline-ops"],
  jobIds: [], stops: [], marks: { runs: 0, build: 0, mapped: 0 }, litDiscs: [], pilot: true, fallback: false,
  currency: "INR", classifierVersion: "kw-1", agentsVersion: "2026-10-04",
};

export const fakeComposePlan = (input: PlanInput): PlanDescriptor => ({ ...FAKE_PLAN, currency: input.currency });

export const fakeCurrencyFor = (country: string | null, timeZone: string | null): Currency =>
  country === "IN" || (country === null && (timeZone === "Asia/Kolkata" || timeZone === "Asia/Calcutta")) ? "INR" : "USD";

/** Spread over the real module inside vi.mock("@/features/funnel/data/light"), and "@/features/funnel/data" in Task 13. */
export const FAKE_DATA = { copy: fakeCopy, currencyFor: fakeCurrencyFor, composePlan: fakeComposePlan };
