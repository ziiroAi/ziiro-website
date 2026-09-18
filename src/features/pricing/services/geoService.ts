/**
 * Geo service: external communication for the pricing feature.
 * Finds the visitor's country from their IP. Asks our Vercel edge function
 * (/api/geo) first. When that fails, answers null, or is not JSON, it falls back
 * to public IP-geolocation lookups, in order, each with its own timeout. Unlike
 * the other feature services this never throws: not knowing the country is an
 * expected outcome (blockers, rate limits, slow networks), and the caller falls
 * back to the default market.
 *
 * Production falls back to ipwho.is only, whose free plan allows commercial use.
 * ipapi.co's free plan is "not for production use", so it is compiled in for
 * `vite` dev only, where /api/geo always answers null. The Privacy page
 * discloses the production lookups: keep it in step with this list.
 */

/** Per request: past this, that lookup is abandoned and the next one tried. */
const GEO_TIMEOUT_MS = 2500;

/** Where to ask, in order, and which JSON field holds the ISO 3166-1 alpha-2 code. */
const LOOKUPS = [
  { url: "/api/geo", field: "country" },
  ...(import.meta.env.DEV ? [{ url: "https://ipapi.co/json/", field: "country_code" }] : []),
  { url: "https://ipwho.is/", field: "country_code" },
];

/** One lookup: an uppercase two-letter country code, or null. Never throws. */
async function lookup(url: string, field: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), GEO_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    // Still inside the timeout: a stalled body aborts too. A non-JSON body throws here.
    const data = await res.json();
    const value = data?.[field];
    const country = typeof value === "string" ? value.trim().toUpperCase() : "";
    return /^[A-Z]{2}$/.test(country) ? country : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Resolves to an uppercase ISO 3166-1 alpha-2 code such as "IN", or null. */
export async function detectCountry(): Promise<string | null> {
  for (const { url, field } of LOOKUPS) {
    const country = await lookup(url, field);
    if (country) return country;
  }
  return null;
}
