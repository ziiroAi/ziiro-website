/**
 * POST /api/send-contact — Contact / "Book a Call" form handler.
 * Vercel Edge Function. Emails the submission to the team inbox via Resend.
 * Requires the RESEND_API_KEY environment variable.
 */
import {
  clientIp,
  corsHeaders,
  escapeHtml,
  isRateLimited,
  isValidEmail,
  jsonResponse,
  readJson,
  resendFrom,
  sanitizeHeader,
  sanitizeText,
  sendResendEmail,
  teamInbox,
} from "./_lib";

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return jsonResponse(req, { success: false, error: "Method not allowed" }, 405);
  }

  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

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

    if (!name || !company || !message || !isValidEmail(email)) {
      return jsonResponse(req, { success: false, error: "Invalid submission" }, 400);
    }

    if (isRateLimited(`${clientIp(req)}:${email}`)) {
      return jsonResponse(req, { success: false, error: "Too many submissions" }, 429);
    }

    const row = (label: string, value: string, alt: boolean) => `
      <tr${alt ? ' style="background:#f4f4f4;"' : ""}>
        <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">${label}</td>
        <td style="padding:10px;border:1px solid #ddd;">${escapeHtml(value)}</td>
      </tr>`;

    const teamHtml = `
      <h2 style="color:#333;font-family:sans-serif;">New Contact Form Submission</h2>
      <table style="border-collapse:collapse;width:100%;max-width:600px;font-family:sans-serif;">
        ${row("Name", name, true)}
        ${row("Email", email, false)}
        ${row("Phone", phone || "N/A", true)}
        ${row("Company", company, false)}
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
    });

    return jsonResponse(req, { success: true });
  } catch (error) {
    console.error("Contact email error:", error);
    return jsonResponse(req, { success: false, error: "Unable to send email" }, 500);
  }
}
