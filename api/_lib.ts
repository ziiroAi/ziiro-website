/**
 * Shared helpers for the Vercel Edge email endpoint (send-contact).
 * Files prefixed with "_" are bundled into functions but never routed themselves.
 *
 * This endpoint replaces the former Supabase Edge Functions. It delivers mail
 * through Resend and intentionally does NOT persist to a database. The previous
 * Supabase insert was the single point of failure whenever the free project
 * auto-paused, silently swallowing every submission. Email delivery is the goal.
 */

const allowedOrigins = new Set([
  "https://ziiroai.com",
  "https://www.ziiroai.com",
  "http://localhost:4173",
  "http://localhost:8081",
  "http://localhost:3000",
]);

const rateLimitWindowMs = 10 * 60 * 1000;
const rateLimitMax = 5;
/**
 * SECOND line of defence, not the first. Read this before relying on it.
 *
 * Edge isolates are ephemeral and regional, so each one starts with an empty
 * Map and the real ceiling is 5 x (isolates you can land on) x (cold starts you
 * can provoke). The old comment admitted this and it was right. Security review
 * F2 called it one of three independent bypasses.
 *
 * The control that actually holds is the Turnstile token check in
 * send-contact.ts, which is per-submission and cannot be reset by cold-starting
 * a new isolate. This map only blunts a burst that has already solved a
 * challenge. For a global limit, turn on Vercel's platform rate limiting, which
 * runs at the edge BEFORE this function and is the only layer that can enforce
 * one; that is a dashboard setting, not code, so it cannot live in this file.
 */
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

/**
 * CORS is NOT a security control here and must not be counted as one: the
 * browser enforces it, curl does not, and every server-to-server POST skips it
 * entirely. It is here so the real browser form can talk to the endpoint.
 *
 * The `startsWith("http://localhost:")` clause that used to sit beside the
 * allow-list is gone. It admitted ANY port on localhost in production, which
 * made the three explicit entries decorative. Security review F3.
 */
export const corsHeaders = (req: Request): Record<string, string> => {
  const origin = req.headers.get("origin") ?? "";
  const allowOrigin = allowedOrigins.has(origin) ? origin : "https://ziiroai.com";
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

/**
 * Every response from the contact endpoint, with caching refused explicitly.
 *
 * `no-store` rather than `no-cache`: no-cache still permits a shared cache to
 * KEEP a copy and revalidate, which is the wrong answer for a POST result that
 * is specific to one submission. There is nothing here any cache should hold,
 * and a CDN that held a 200 would be telling the next visitor their message
 * was sent when it never was.
 */
export const jsonResponse = (req: Request, body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });

/**
 * The published address a visitor is pointed at when we cannot send for them.
 * Already public on the site; it is here so the endpoint can hand it back
 * rather than the form hard-coding a second copy that drifts.
 * NOT the same thing as TEAM_INBOX, which is where submissions are delivered.
 *
 * One address now, not two. It was aniket@ziiro.work and govind@ziiro.work,
 * and the whole site has moved to the single contact@ziiroai.com. The site
 * itself now lives on ziiroai.com too; ziiro.work only redirects here and is
 * kept for outreach mail.
 *
 * STILL AN ARRAY, on purpose. It is serialised straight into the failure
 * response as `fallbackEmails`, so the type is the endpoint's public contract.
 * Collapsing it to a bare string would be an unannounced breaking change to
 * every current and future client for no gain, and a one-element array is the
 * honest shape for "the addresses we publish" when today there happens to be
 * one. Adding a second later is then a data change rather than an API change.
 */
export const PUBLIC_CONTACT_EMAILS = ["contact@ziiroai.com"];

/**
 * ── LOGGING POLICY, read before adding a field ──
 *
 * One JSON object per line, so Vercel's log viewer and anything downstream can
 * filter on `evt` instead of grepping prose. Before this, a failure was
 * completely invisible: Resend could reject every send and nobody would know.
 *
 * WHAT IS LOGGED: the event name, the outcome, HTTP status, upstream status,
 * duration, and the platform request id so a line can be tied back to one
 * request in Vercel's dashboard.
 *
 * WHAT IS NEVER LOGGED, and this is the part to not erode:
 *   - any submitted field. No name, email, company, reason or message. Not even
 *     truncated, not even hashed. The whole value of the log is diagnosing
 *     delivery, and none of that needs to know who wrote in.
 *   - the client IP. It is not part of the submission but it is still personal
 *     data, and nothing here is diagnosable only with it.
 *   - any secret or environment VALUE. A missing variable is logged by NAME
 *     only, which is the one case where the name is the whole diagnosis.
 *   - the provider's raw error body. Resend echoes addresses in some messages,
 *     so only its status and error name cross into the log.
 */
type LogFields = Record<string, string | number | boolean | null | undefined>;

export const logEvent = (
  level: "info" | "error",
  evt: string,
  fields: LogFields = {},
) => {
  const line = JSON.stringify({
    level,
    evt,
    at: new Date().toISOString(),
    ...fields,
  });
  if (level === "error") console.error(line);
  else console.log(line);
};

/** Vercel's per-request id, for tying a log line to a request in the dashboard.
 *  Absent locally, which is fine: the field is simply omitted. */
export const requestId = (req: Request) =>
  req.headers.get("x-vercel-id") ?? undefined;

/**
 * An upstream provider failed, as distinct from us being broken. The handler
 * maps this to 502, because "bad gateway" is literally what happened, where a
 * 500 would claim the bug is ours and tell a monitoring system the wrong thing.
 */
export class UpstreamError extends Error {
  readonly provider: string;
  readonly status: number;
  constructor(provider: string, status: number) {
    super(`${provider} upstream failure`);
    this.name = "UpstreamError";
    this.provider = provider;
    this.status = status;
  }
}

/**
 * True only for a real JSON request.
 *
 * This is the fix for the CSRF shape in security review F3. A JSON body sent as
 * `Content-Type: text/plain` is a CORS-SIMPLE request: the browser sends no
 * preflight, so the allow-list above is never consulted and the POST executes.
 * Any site could therefore make its own visitors mail the team inbox from their
 * IPs, which also defeats IP-based rate limiting. Requiring application/json
 * forces a preflight and is what makes the allow-list load-bearing at all.
 *
 * Parameters after the type are allowed, so "application/json; charset=utf-8"
 * passes, which is what fetch sends when you set a JSON content type.
 */
export const isJsonRequest = (req: Request) =>
  (req.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase() === "application/json";

export const readJson = async (req: Request) => {
  // Cheap pre-check on the declared length before buffering. F4 noted the old
  // order let an attacker make the isolate buffer up to Vercel's 4.5MB cap for
  // a request that was then rejected anyway.
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > 10_000) {
    throw new Error("Payload too large");
  }
  const body = await req.text();
  if (body.length > 10_000) throw new Error("Payload too large");
  return JSON.parse(body || "{}");
};

/**
 * Verifies a Cloudflare Turnstile token server-side.
 *
 * This is the control that replaces the in-process Map as the primary defence:
 * it is per-submission, and a fresh isolate cannot reset it the way it resets a
 * counter. Fails CLOSED. A missing secret, a network error or a malformed
 * response all return false, because the alternative is an endpoint that
 * silently becomes an open relay the moment configuration drifts.
 *
 * Requires TURNSTILE_SECRET_KEY. The matching public site key belongs on the
 * form as VITE_TURNSTILE_SITE_KEY.
 */
export const verifyTurnstile = async (
  token: string,
  ip: string,
): Promise<boolean> => {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !token) return false;
  try {
    const form = new URLSearchParams({ secret, response: token });
    // Cloudflare treats remoteip as advisory; send it only when the platform
    // gave us a real one rather than the "unknown" placeholder.
    if (ip && ip !== "unknown") form.set("remoteip", ip);
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
      },
    );
    const data = (await res.json().catch(() => ({}))) as { success?: boolean };
    return data.success === true;
  } catch (error) {
    console.error("Turnstile verification failed:", error);
    return false;
  }
};

export const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

/**
 * Sends one email through Resend. Throws on a non-2xx response so the caller
 * returns a 500. `from` defaults to Resend's shared sandbox sender; set a
 * RESEND_FROM env var to a verified-domain address (e.g. "Ziiro AI <contact@ziiroai.com>")
 * for reliable delivery to arbitrary recipients.
 */
export const sendResendEmail = async (opts: {
  apiKey: string;
  from: string;
  to: string[];
  subject: string;
  html: string;
  /** Only ever pass an address that has already cleared isValidEmail. An
   *  unvalidated Reply-To is the single change that turns this endpoint into a
   *  usable spoofing primitive, which security review F4 called out by name. */
  replyTo?: string;
}) => {
  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
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
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    });
  } catch (error) {
    // Resend unreachable: DNS, TLS, timeout. Same class of outcome for the
    // visitor as a 500 from Resend, so it becomes the same typed error and the
    // handler does not have to care which it was.
    logEvent("error", "resend.unreachable", {
      name: error instanceof Error ? error.name : "unknown",
    });
    throw new UpstreamError("resend", 0);
  }

  if (!res.ok) {
    // Status and error NAME only. Resend echoes addresses in some message
    // bodies, so the body itself must not reach the log.
    const data = (await res.json().catch(() => ({}))) as { name?: string };
    logEvent("error", "resend.rejected", {
      upstreamStatus: res.status,
      upstreamName: typeof data.name === "string" ? data.name : null,
    });
    throw new UpstreamError("resend", res.status);
  }
  return res.json().catch(() => ({}));
};

export const resendFrom = () => process.env.RESEND_FROM || "Ziiro AI <onboarding@resend.dev>";

/**
 * Where submissions are DELIVERED, which is not the same question as which
 * address the site publishes. Read the next paragraph before changing it.
 *
 * ── THE DELIVERY ADDRESS IS AN ENV VAR, NOT A CODE CHANGE ──
 *
 * The address above went to contact@ziiroai.com with the rest of the site. This
 * default deliberately did NOT, and moving it is a one-line dashboard action
 * rather than a commit: set TEAM_INBOX=contact@ziiroai.com in Vercel, once that
 * mailbox exists and its domain can actually receive mail.
 *
 * Doing it here instead would be the worst available option, because of how
 * this endpoint fails. If mail is addressed to a mailbox that does not exist
 * yet, or to a domain with no MX record, Resend accepts the send and the
 * bounce happens later and elsewhere. The visitor is told their message was
 * sent. The logging policy above forbids recording any submitted field, which
 * is correct and must stay, so there is no copy of what they wrote anywhere.
 * Every enquiry in that window is lost silently and unrecoverably.
 *
 * So this default stays a mailbox that is known to work. Its entire job is to
 * be the thing that catches mail when TEAM_INBOX is unset or misspelled, and a
 * brand new address on a freshly pointed domain is the one value that cannot do
 * that job. Same reasoning as the rate-limit note above: the control that
 * actually decides this lives in the platform, not in this file.
 *
 * Consequence to be aware of while the two differ: the site publishes
 * contact@ziiroai.com and, absent TEAM_INBOX, form submissions land in the
 * Gmail account. Both are monitored inboxes, nothing is dropped, but whoever
 * watches one should know about the other.
 */
export const teamInbox = () => process.env.TEAM_INBOX || "ziiro.work@gmail.com";
