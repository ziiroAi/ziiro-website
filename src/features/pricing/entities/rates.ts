/**
 * !!! PLACEHOLDER PRICING: NOT FINAL. CONFIRM EVERY RATE BEFORE LAUNCH. !!!
 *
 * The hourly rates below are placeholders pending final pricing sign-off.
 *
 * Each market's rate is set on its own and is deliberately NOT an FX
 * conversion of another market's rate: ₹999 is not "$40 in rupees". Never
 * derive one from another with an exchange rate. To change a price, edit that
 * market's `hourly` and `display` directly and keep the two in step.
 *
 * Pricing entity: the hourly consultation rate per market, the minimum session
 * length, and where visitors book. The single place the site's pricing lives,
 * independent of any UI or transport concern.
 */

export type MarketCode = "IN" | "US" | "GLOBAL";

export interface Market {
  code: MarketCode;
  label: string;
  currency: "INR" | "USD";
  hourly: number;
  /** The rate as shown, e.g. "₹999". */
  display: string;
  /** Unit shown after the rate, e.g. "/ hour". */
  per: string;
  note?: string;
}

export const MARKETS: Record<MarketCode, Market> = {
  IN: {
    code: "IN",
    label: "India",
    currency: "INR",
    hourly: 999,
    display: "₹999",
    per: "/ hour",
  },
  US: {
    code: "US",
    label: "United States",
    currency: "USD",
    hourly: 40,
    display: "$40",
    per: "/ hour",
  },
  GLOBAL: {
    code: "GLOBAL",
    label: "Rest of world",
    currency: "USD",
    hourly: 40,
    display: "$40",
    per: "/ hour",
  },
};

export const MIN_SESSION_MINUTES = 60;

/**
 * The published rate as both pages print it: rest-of-world first, India
 * second, always in that order.
 *
 * This existed twice, as `HOURLY` in Pricing.tsx and `PUBLISHED_HOURLY` in
 * BookACall.tsx, built from the same expression under two different names. Two
 * pages deriving the same string independently is how they drift, and a
 * pricing page and a booking page quoting different rates is the one drift
 * nobody would catch from the code alone. One export, both pages.
 */
export const PUBLISHED_RATE = `${MARKETS.GLOBAL.display} / ${MARKETS.IN.display}`;

/**
 * The session minimum in the unit a sentence wants to say it in, so no page
 * has to re-derive "60 minutes means 1 hour" for itself. Handles a minimum
 * that is not a whole number of hours, because a future 90-minute minimum
 * would otherwise print "1.5 hour minimum".
 */
export const MINIMUM_ENGAGEMENT =
  MIN_SESSION_MINUTES % 60 === 0
    ? {
        amount: MIN_SESSION_MINUTES / 60,
        unit: MIN_SESSION_MINUTES === 60 ? "hour" : "hours",
      }
    : { amount: MIN_SESSION_MINUTES, unit: "minutes" };

/**
 * The same fact as a finished label, for the bracketed mono lines that used to
 * spell it out as "[ 01 Hour minimum ]" and "[ Paid / one hour minimum ]".
 * Those were literals: change MIN_SESSION_MINUTES and they kept saying "one
 * hour" while the sentence beside them said something else.
 */
export const MINIMUM_LABEL = `${MINIMUM_ENGAGEMENT.amount} ${MINIMUM_ENGAGEMENT.unit} minimum`;

/**
 * ── IF THE COMMERCIAL MODEL CHANGES, START HERE ───────────────────────────
 *
 * The site currently sells a PAID consultation billed by the hour with a
 * MIN_SESSION_MINUTES minimum, followed by a separately scoped and quoted
 * project. The reviewer asked whether the first conversation should instead be
 * FREE, leading to the same scoped paid engagement. That is a commercial
 * decision and it is NOT made here. Nothing in this file assumes an answer.
 *
 * What the decision costs, so it can be made cheaply. The numbers above are
 * already in one place, so no page hard-codes a rate. What is NOT centralised
 * is the MODEL, which lives in prose, and prose is where the work is:
 *
 *   Derived values, already one line each and all reading from this file:
 *     PUBLISHED_RATE, MINIMUM_ENGAGEMENT, MINIMUM_LABEL, MIN_SESSION_MINUTES
 *
 *   Sentences that assert the first hour is PAID, and would each need a human
 *   to rewrite rather than a constant to flip:
 *     src/pages/Pricing.tsx           SEO title and description, hero sentence,
 *                                     the "Consultation" step in howItRuns
 *     src/pages/BookACall.tsx         SEO description, the Hourly Rate row,
 *                                     the investment sentence
 *     src/pages/Docs.tsx              the Consult step, the booking sentence
 *     src/pages/Faq.tsx               SEO description
 *     src/features/faq/entities/questions.ts   the "what does it cost" answer
 *     src/features/home/hero/heroContent.ts    TRUST
 *     src/features/home/sections/DotArtSection.tsx
 *     src/features/home/sections/FinalCta.tsx
 *     src/features/who-we-are/sections/BookConsultation.tsx
 *     src/features/docs/diagrams/LifecycleFlow.tsx
 *     src/pages/Careers.tsx           the "paid consultation" pointer
 *     src/pages/Privacy.tsx           why region is detected at all
 *     index.html                      the Service schema description
 *
 *   Not code at all, and the real blocker either way: INTERIM_BOOKING_URL
 *   below still points at a free 30-minute Calendly event. A move to a free
 *   first session would make that link correct for the first time; staying
 *   paid still requires the paid event a human has to create.
 *
 * The page LAYOUTS need no change under either model. Pricing states one
 * published figure and then scoping, and a free first session is that same
 * shape with the figure replaced by "free"; the stage rows, the scoping copy
 * and the quote step are unaffected because they describe project work, which
 * is paid under both models.
 */

/**
 * !!! INTERIM LINK: IT CONTRADICTS THE PRICING THIS FILE SETS. !!!
 *
 * Where every "book a session" CTA points. Keep it free of query params:
 * embeds append their own.
 *
 * This still points at the old FREE 30-MINUTE event, while the site sells a
 * paid consultation with a MIN_SESSION_MINUTES minimum and shows a regional
 * hourly rate beside the button. A visitor reads "one hour, paid", clicks
 * Book, and lands on a free half-hour page. Only a human can close that gap.
 *
 * TO FIX: create a paid 60-minute event in Calendly (Stripe payments), point
 * this at it, then rename this constant back to BOOKING_URL. The name is
 * deliberately awkward so that nobody ships the contradiction without reading
 * this comment first.
 */
export const INTERIM_BOOKING_URL = "https://calendly.com/ziiro-work/30min";

/**
 * Maps an ISO 3166-1 alpha-2 country code to the market whose rate the visitor
 * sees. Only India and the United States have their own rate; every other
 * country, and an unknown one, gets the rest-of-world rate.
 */
export function marketForCountry(iso2: string | null | undefined): MarketCode {
  switch (iso2?.trim().toUpperCase()) {
    case "IN":
      return "IN";
    case "US":
      return "US";
    default:
      return "GLOBAL";
  }
}
