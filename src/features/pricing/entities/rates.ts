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
