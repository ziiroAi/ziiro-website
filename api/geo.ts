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

export const config = { runtime: "edge" };

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "private, no-store",
};

export default function handler(req: Request): Response {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...headers, Allow: "GET" },
    });
  }

  const raw = req.headers.get("x-vercel-ip-country")?.trim().toUpperCase() ?? "";
  const country = /^[A-Z]{2}$/.test(raw) ? raw : null;

  return new Response(JSON.stringify({ country }), { headers });
}
