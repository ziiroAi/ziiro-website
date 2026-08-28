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
export const IDENTITIES = [
  "Analyst",
  "Researcher",
  "Strategist",
  "Marketer",
  "Operator",
  "Planner",
  "Coordinator",
  "Assistant",
  "Engineer",
  "Manager",
] as const;

/** The second, slower rotation under the copy. Deliberately out of phase with
 *  the orb so the two never pulse in lockstep. */
export const CAPABILITIES = [
  "Research agents",
  "AI workflows",
  "Automation",
  "Intelligence systems",
  "Agentic operations",
  "Continuous optimization",
  "Measurable outcomes",
] as const;

export const HEADLINE_SANS = "AI that";
export const HEADLINE_SERIF = "pays for itself.";

export const SUPPORT =
  "Business intelligence first. AI second. We build only the systems the numbers justify.";

export const TRUST = "Free 30 minutes · No pitch · You keep the roadmap";
