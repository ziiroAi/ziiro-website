/**
 * Every string the hero says, in one place.
 *
 * All of it is drawn from positioning that already exists on the site — the
 * five HowItWorks steps, the WhatPowersZiiro stack, and the homepage SEO
 * description. Nothing here claims a client, a number, or a result the rest of
 * the site can't back up.
 */

export const EYEBROW = "Business intelligence · Agentic AI";

/**
 * The orb's rotation: the roles an AI can hold in a business.
 *
 * These are roles rather than capabilities on purpose, because the label above
 * them reads "Your AI" — "Your AI / Analyst" is a sentence, "Your AI /
 * Optimisation" is not. The previous set (Business, Intelligence, ROI model,
 * Automation, Outcomes) named pipeline stages and stopped scanning the moment
 * the label changed; those stages are stated properly in the system directory
 * below, which is where they belong.
 */
/* Five, not ten. A rotation is only readable if a visitor can hold the whole
   set in their head, and each of these names a category the system directory
   below actually has: Intelligence, Sales/Deals, Operations, Marketing, Back
   Office. Ten was a list you watched rather than one you read. */
export const IDENTITIES = [
  "Analyst",
  "Strategist",
  "Operator",
  "Marketer",
  "Engineer",
] as const;

/**
 * The headline, in two tones of one sans family.
 *
 * The lead sits in --text-primary and the tail drops to --text-secondary, so
 * the sentence reads as one thought that resolves rather than as two competing
 * lines. The previous treatment set the second line in an italic display serif
 * with a violet glow behind it; that worked on the old near-black field and
 * had nothing to sit on once the page went white, where a glow is a smudge and
 * a serif italic is simply a different voice arriving mid-sentence.
 *
 * The claim also changed. "AI that pays for itself" promised a return; this
 * promises the condition the return shows up as, which is the thing the rest
 * of the page can actually evidence.
 *
 * The tail is "just run better." and that is deliberate. It was briefly set as
 * "just runs better." on the assumption that the original was a typo; the
 * human corrected it back and asked for their wording verbatim, full stop
 * included. Do not re-agree it with "business" — this line is theirs.
 */
export const HEADLINE_LEAD = "Your business";
export const HEADLINE_TAIL = "just run better.";

export const SUPPORT =
  "Business intelligence first. AI second. We build only the systems the numbers justify.";

export const TRUST = "Hourly consultation · No pitch · You keep the roadmap";
