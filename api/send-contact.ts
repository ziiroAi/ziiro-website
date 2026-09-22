/**
 * POST /api/send-contact: the Contact form handler.
 * Vercel Edge Function. Emails the submission to the team inbox via Resend.
 *
 * THIS ENDPOINT WAS DELETED ONCE. A security review rated it High: live,
 * unauthenticated, sending mail through Resend, with no caller anywhere in the
 * app. It is back only because the form is back, and only with the three named
 * defects fixed. Do not loosen any of them:
 *
 *   1. The rate limit is keyed on the client IP ALONE. It used to include the
 *      SUBMITTED EMAIL, which the attacker picks, so a1@, a2@, a3@ were three
 *      separate buckets from one host. The review called it "the bypass that
 *      matters, it takes one line of a loop". Never key on request content.
 *   2. Content-Type must be application/json. Without that check a text/plain
 *      body is a CORS-simple request that skips preflight entirely, so any
 *      site could make its visitors mail this inbox from their own IPs.
 *   3. The in-memory limiter cannot survive cold starts, and the code always
 *      admitted it. Turnstile is the real control now; the map is a second
 *      layer. Turn on Vercel platform rate limiting for a global one.
 *
 * FAILS CLOSED. Missing RESEND_API_KEY or TURNSTILE_SECRET_KEY means 500 and
 * no mail, rather than an endpoint that quietly degrades into an open relay.
 *
 * Required env: RESEND_API_KEY, TURNSTILE_SECRET_KEY.
 * Optional env: RESEND_FROM, TEAM_INBOX.
 */
import {
  PUBLIC_CONTACT_EMAILS,
  UpstreamError,
  clientIp,
  corsHeaders,
  escapeHtml,
  isJsonRequest,
  isRateLimited,
  isValidEmail,
  jsonResponse,
  readJson,
  resendFrom,
  sanitizeHeader,
  sanitizeText,
  logEvent,
  requestId,
  sendResendEmail,
  teamInbox,
  verifyTurnstile,
} from "./_lib";

export const config = { runtime: "edge" };

/**
 * The answer when the message could not be sent, whoever is at fault.
 *
 * The point of this form is not losing an enquiry, so a failure must not be a
 * dead end. The visitor is told plainly and handed the published address,
 * which the endpoint returns rather than the form hard-coding a second copy.
 * Nothing internal crosses into this: no stack, no provider body, no variable
 * name, which the security review verified and this must not undo.
 */
const unsendable = (req: Request, status: 500 | 502) =>
  jsonResponse(
    req,
    {
      success: false,
      error:
        "We could not send that just now. Email us directly and we will pick it up.",
      fallbackEmails: PUBLIC_CONTACT_EMAILS,
    },
    status,
  );

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    // A 405 that does not say what is allowed makes a client guess. The header
    // is required by the spec for exactly this reason.
    const res = jsonResponse(req, { success: false, error: "Method not allowed" }, 405);
    res.headers.set("Allow", "POST, OPTIONS");
    return res;
  }

  // Before the body is read, and before any work is done: a request that did
  // not declare JSON never had a preflight, so it never met the allow-list.
  if (!isJsonRequest(req)) {
    return jsonResponse(req, { success: false, error: "Unsupported media type" }, 415);
  }

  const started = Date.now();
  const rid = requestId(req);

  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    // Checked one at a time rather than in a loop, because a loop does not
    // narrow the type and the key below genuinely must be a string by then.
    // The NAME is the whole diagnosis and it is not a secret; the VALUE never
    // goes near a log.
    if (!RESEND_API_KEY) {
      logEvent("error", "contact.misconfigured", { missing: "RESEND_API_KEY", rid });
      return unsendable(req, 500);
    }
    if (!process.env.TURNSTILE_SECRET_KEY) {
      logEvent("error", "contact.misconfigured", {
        missing: "TURNSTILE_SECRET_KEY",
        rid,
      });
      return unsendable(req, 500);
    }

    const payload = await readJson(req);
    const name = sanitizeText(payload.name, 100);
    const email = sanitizeText(payload.email, 254).toLowerCase();
    const phone = sanitizeText(payload.phone, 40);
    const company = sanitizeText(payload.company, 120);
    const industry = sanitizeText(payload.industry, 80);
    const service = sanitizeText(payload.service, 120);
    const budget = sanitizeText(payload.budget, 80);
    const timeline = sanitizeText(payload.timeline, 80);
    const message = sanitizeText(payload.message, 2_000);
    const reason = sanitizeText(payload.reason, 80);
    const turnstileToken = sanitizeText(payload.turnstileToken, 2_048);

    if (!name || !company || !reason || !message || !isValidEmail(email)) {
      // Which rule failed, never what was submitted.
      logEvent("info", "contact.rejected", { reason: "validation", status: 400, rid });
      return jsonResponse(req, { success: false, error: "Invalid submission" }, 400);
    }

    const ip = clientIp(req);

    // Keyed on the IP and nothing else. The IP half was always sound: on Vercel
    // the first x-forwarded-for hop is set by the platform edge and is not
    // client-spoofable for this purpose. It was the email half that made the
    // limit meaningless.
    if (isRateLimited(ip)) {
      logEvent("info", "contact.rejected", { reason: "rate_limit", status: 429, rid });
      return jsonResponse(req, { success: false, error: "Too many submissions" }, 429);
    }

    // The control that survives a cold start, checked before any mail is sent.
    if (!(await verifyTurnstile(turnstileToken, ip))) {
      logEvent("info", "contact.rejected", { reason: "turnstile", status: 403, rid });
      return jsonResponse(req, { success: false, error: "Verification failed" }, 403);
    }

    // Both sides escaped. Every call site below passes a string literal for
    // `label`, so escaping it changes nothing today; it is here so the day
    // somebody makes labels dynamic is not the day this becomes an XSS.
    // Security review F4 flagged the asymmetry as a latent footgun.
    const row = (label: string, value: string, alt: boolean) => `
      <tr${alt ? ' style="background:#f4f4f4;"' : ""}>
        <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">${escapeHtml(label)}</td>
        <td style="padding:10px;border:1px solid #ddd;">${escapeHtml(value)}</td>
      </tr>`;

    const teamHtml = `
      <h2 style="color:#333;font-family:sans-serif;">New Contact Form Submission</h2>
      <table style="border-collapse:collapse;width:100%;max-width:600px;font-family:sans-serif;">
        ${row("Name", name, true)}
        ${row("Email", email, false)}
        ${row("Phone", phone || "N/A", true)}
        ${row("Company", company, false)}
        ${row("Reason", reason, true)}
        ${row("Industry", industry || "N/A", true)}
        ${row("Service Interest", service || "N/A", false)}
        ${row("Budget", budget || "N/A", true)}
        ${row("Timeline", timeline || "N/A", false)}
        ${row("Message", message, true)}
      </table>
    `;

    await sendResendEmail({
      apiKey: RESEND_API_KEY,
      from: resendFrom(),
      to: [teamInbox()],
      subject: `New Contact: ${sanitizeHeader(name)} from ${sanitizeHeader(company)}`,
      html: teamHtml,
      // Only reachable because isValidEmail(email) already returned true above.
      // Setting an unvalidated Reply-To is what would have made this endpoint a
      // usable spoofing primitive, which the review named directly.
      replyTo: email,
    });

    logEvent("info", "contact.sent", { status: 200, ms: Date.now() - started, rid });
    return jsonResponse(req, { success: true });
  } catch (error) {
    // 502 when the provider failed, 500 when we did. A monitoring system that
    // cannot tell those apart pages the wrong person.
    if (error instanceof UpstreamError) {
      logEvent("error", "contact.upstream_failed", {
        provider: error.provider,
        upstreamStatus: error.status,
        status: 502,
        ms: Date.now() - started,
        rid,
      });
      return unsendable(req, 502);
    }
    // Deliberately the error NAME, not the message. A JSON.parse failure puts a
    // fragment of the request body into its message, and that body is a
    // visitor's submission.
    logEvent("error", "contact.failed", {
      name: error instanceof Error ? error.name : "unknown",
      status: 500,
      ms: Date.now() - started,
      rid,
    });
    return unsendable(req, 500);
  }
}
