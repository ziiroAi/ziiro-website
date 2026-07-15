/**
 * Shared helpers for the Vercel Edge email endpoints (send-contact, send-audit).
 * Files prefixed with "_" are bundled into functions but never routed themselves.
 *
 * These endpoints replace the former Supabase Edge Functions. They deliver mail
 * through Resend and intentionally do NOT persist to a database — the previous
 * Supabase insert was the single point of failure whenever the free project
 * auto-paused, silently swallowing every submission. Email delivery is the goal.
 */

const allowedOrigins = new Set([
  "https://ziiro.work",
  "https://www.ziiro.work",
  "http://localhost:4173",
  "http://localhost:8080",
  "http://localhost:3000",
]);

const rateLimitWindowMs = 10 * 60 * 1000;
const rateLimitMax = 5;
// Best-effort only: edge isolates are ephemeral, so this caps abuse per warm
// instance rather than globally. Matches the prior Supabase behaviour.
const rateLimitBuckets = new Map<string, number[]>();

const disposableDomains = new Set([
  "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email", "yopmail.com",
  "sharklasers.com", "guerrillamailblock.com", "grr.la", "guerrillamail.info", "spam4.me",
  "trashmail.com", "trashmail.me", "trashmail.net", "dispostable.com", "maildrop.cc",
  "10minutemail.com", "10minutemail.net", "10minutemail.org", "minutemail.com", "temp-mail.org",
  "fakeinbox.com", "mailnull.com", "spamgourmet.com", "spamgourmet.net", "discard.email",
  "mailnesia.com", "spamspot.com", "spamthisplease.com", "byom.de", "getnada.com",
  "anonaddy.com", "tempinbox.com", "tempr.email", "emailondeck.com", "getairmail.com",
  "filzmail.com", "zetmail.com", "mohmal.com", "owlpic.com", "cfl.fr",
  "spamfree24.org", "spamfree24.de", "spamfree24.eu", "spamfree24.info", "spaml.de",
  "spaml.com", "disigntime.com", "no-spam.ws", "antispam24.de", "wegwerfmail.de",
  "wegwerfmail.net", "wegwerfmail.org", "abcmail.email", "armyspy.com",
]);

export const corsHeaders = (req: Request): Record<string, string> => {
  const origin = req.headers.get("origin") ?? "";
  const allowOrigin =
    allowedOrigins.has(origin) || origin.startsWith("http://localhost:")
      ? origin
      : "https://ziiro.work";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
  };
};

export const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!),
  );

export const sanitizeText = (value: unknown, maxLength = 500) =>
  Array.from(String(value ?? ""))
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
    })
    .join("")
    .trim()
    .slice(0, maxLength);

export const sanitizeHeader = (value: unknown, maxLength = 120) =>
  sanitizeText(value, maxLength).replace(/[\r\n]/g, " ");

export const isValidEmail = (email: string) =>
  /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) &&
  email.length <= 254 &&
  !disposableDomains.has(email.split("@")[1]?.toLowerCase());

export const isRateLimited = (key: string) => {
  const now = Date.now();
  const recent = (rateLimitBuckets.get(key) ?? []).filter((time) => now - time < rateLimitWindowMs);
  if (recent.length >= rateLimitMax) {
    rateLimitBuckets.set(key, recent);
    return true;
  }
  recent.push(now);
  rateLimitBuckets.set(key, recent);
  return false;
};

export const jsonResponse = (req: Request, body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });

export const readJson = async (req: Request) => {
  const body = await req.text();
  if (body.length > 10_000) throw new Error("Payload too large");
  return JSON.parse(body || "{}");
};

export const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

/**
 * Sends one email through Resend. Throws on a non-2xx response so the caller
 * returns a 500. `from` defaults to Resend's shared sandbox sender; set a
 * RESEND_FROM env var to a verified-domain address (e.g. "Ziiro <hello@ziiro.work>")
 * for reliable delivery to arbitrary recipients.
 */
export const sendResendEmail = async (opts: {
  apiKey: string;
  from: string;
  to: string[];
  subject: string;
  html: string;
}) => {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: opts.from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Resend request failed:", data);
    throw new Error("Resend request failed");
  }
  return data;
};

export const resendFrom = () => process.env.RESEND_FROM || "Ziiro AI <onboarding@resend.dev>";
export const teamInbox = () => process.env.TEAM_INBOX || "ziiro.work@gmail.com";
