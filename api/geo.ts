/**
 * GET /api/geo: the visitor's country, for geo-aware pricing.
 * Vercel Edge Function. Returns { country } from the ISO 3166-1 alpha-2 code
 * Vercel sets in the x-vercel-ip-country request header, or { country: null }
 * when it is missing (local dev, or an IP Vercel cannot place). The answer is
 * per visitor, so it is never cached.
 *
 * Trusting the header is fine: a spoofed country only changes which public
 * rate is shown, and the page's region picker allows that anyway.
 */

import { logEvent, requestId } from "./_lib";

export const config = { runtime: "edge" };

/**
 * `private` keeps it out of every shared cache, CDN included, and `no-store`
 * keeps it out of the browser's too. Both are needed: this answer is derived
 * from one visitor's IP, so a CDN that cached it would hand one country to
 * everyone behind that edge node. Vercel's CDN honours this and will not store
 * the response.
 */
const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "private, no-store",
  // The country varies by caller, not by any request header, so there is no
  // Vary key that would make this cacheable. Stated so nobody adds one later
  // and assumes that made it safe to cache.
  Vary: "*",
};

export default function handler(req: Request): Response {
  if (req.method !== "GET") {
    // Same {success:false, error} shape the contact endpoint uses. It used to
    // answer a bare {error}, so the two functions disagreed about what an error
    // looks like and any shared client handling had to special-case one.
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...headers, Allow: "GET" } },
    );
  }

  const raw = req.headers.get("x-vercel-ip-country")?.trim().toUpperCase() ?? "";
  const country = /^[A-Z]{2}$/.test(raw) ? raw : null;

  /**
   * RESILIENCE. There is no upstream to fail here: the country arrives on a
   * request header the platform sets, so the only failure mode is that it is
   * absent or malformed, and the answer is a 200 with `country: null`. Pricing
   * is never blocked by a country lookup, because the client falls back on its
   * own (see geoService, which returns null on anything unexpected and lets the
   * caller default the market).
   *
   * Absence is NOT logged. It is the normal case in local development and on
   * any IP Vercel cannot place, so logging it would bury the real signal. A
   * header that is present but not a two-letter code is genuinely unexpected,
   * and that is the one thing worth a line. The value is logged because a
   * country code is not personal data; the IP it came from is never touched.
   */
  if (raw && !country) {
    logEvent("error", "geo.malformed_header", {
      length: raw.length,
      rid: requestId(req),
    });
  }

  return new Response(JSON.stringify({ country }), { headers });
}
