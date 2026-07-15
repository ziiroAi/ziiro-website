/**
 * POST /api/send-audit — free Agentic Systems Audit form handler.
 * Vercel Edge Function. Scores the submission and emails the results to the
 * team inbox via Resend. Requires the RESEND_API_KEY environment variable.
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

const ratingLabels: Record<string, string> = {
  outreach: "Self-Optimizing Systems",
  leadgen: "Research & Qualification",
  pipeline: "UGC Ads & Management",
  content: "Role Clarity",
  reporting: "Control Dashboards",
};

const painAreas = [
  { key: "outreach", label: ratingLabels.outreach, hrsPerRating: [0, 0.2, 0.6, 1.2, 2.2, 3.5] },
  { key: "leadgen", label: ratingLabels.leadgen, hrsPerRating: [0, 0.2, 0.5, 1.1, 2, 3] },
  { key: "pipeline", label: ratingLabels.pipeline, hrsPerRating: [0, 0.1, 0.4, 0.9, 1.5, 2.2] },
  { key: "content", label: ratingLabels.content, hrsPerRating: [0, 0.2, 0.5, 1, 1.8, 2.5] },
  { key: "reporting", label: ratingLabels.reporting, hrsPerRating: [0, 0.1, 0.4, 0.8, 1.4, 2] },
];

const allowedSizes = new Set(["1-5", "6-20", "21-50", "51-200", "200+"]);
const allowedIndustries = new Set([
  "SaaS / Software",
  "Startup",
  "Solo Founder",
  "Founder-led Agency",
  "Consulting / Professional Services",
  "Creator-led Business",
  "Community / Education",
  "AI-first Service Business",
  "Other",
]);
const hourlyValue = 30;

const normalizeRatings = (input: Record<string, unknown>) => {
  const ratings: Record<string, number> = {};
  for (const area of painAreas) {
    const value = Number(input?.[area.key]);
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new Error("Invalid ratings");
    }
    ratings[area.key] = value;
  }
  return ratings;
};

const calcResults = (ratings: Record<string, number>, size: string) => {
  const sized =
    size === "1-5" ? 0.6 : size === "6-20" ? 0.8 : size === "51-200" ? 1.1 : size === "200+" ? 1.2 : 1;
  const areas = painAreas.map((area) => {
    const rating = ratings[area.key] || 0;
    const hrs = +(area.hrsPerRating[rating] * sized).toFixed(1);
    const annual = Math.round(hrs * 52 * hourlyValue);
    return { ...area, rating, hrs, annual };
  });
  const sorted = [...areas].sort((a, b) => b.hrs - a.hrs);
  const totalHrs = +areas.reduce((sum, area) => sum + area.hrs, 0).toFixed(1);
  const totalAnnual = areas.reduce((sum, area) => sum + area.annual, 0);
  const maxHrs = areas.reduce((sum, area) => sum + area.hrsPerRating[5] * sized, 0);
  const score = maxHrs > 0 ? Math.round((totalHrs / maxHrs) * 100) : 0;
  const urgency = totalHrs >= 12 ? "Critical" : totalHrs >= 7 ? "High" : "Moderate";
  return {
    sorted,
    score,
    urgency,
    savings: `${totalHrs} hrs/week`,
    roi: `$${totalAnnual.toLocaleString()}/yr`,
    topAreas: sorted.slice(0, 2).map((area) => area.label),
  };
};

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
    const industry = sanitizeText(payload.industry, 100);
    const size = sanitizeText(payload.size, 20);
    const ratings = normalizeRatings(payload.ratings ?? {});

    if (!name || !allowedIndustries.has(industry) || !allowedSizes.has(size) || !isValidEmail(email)) {
      return jsonResponse(req, { success: false, error: "Invalid submission" }, 400);
    }

    if (isRateLimited(`${clientIp(req)}:${email}`)) {
      return jsonResponse(req, { success: false, error: "Too many submissions" }, 429);
    }

    const { score, urgency, savings, roi, topAreas } = calcResults(ratings, size);

    const ratingsRows = Object.entries(ratings)
      .map(
        ([key, val], i) => `
        <tr style="${i % 2 === 0 ? "background:#f4f4f4;" : ""}">
          <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">${escapeHtml(ratingLabels[key] ?? key)}</td>
          <td style="padding:10px;border:1px solid #ddd;">${escapeHtml(val)} / 5</td>
        </tr>`,
      )
      .join("");

    const teamHtml = `
      <div style="font-family:sans-serif;max-width:640px;margin:0 auto;color:#333;">
        <h2 style="color:#111;border-bottom:2px solid #eee;padding-bottom:12px;">
          New Agentic Systems Audit Submission
        </h2>

        <h3 style="color:#555;margin-top:24px;">Submitter Details</h3>
        <table style="border-collapse:collapse;width:100%;margin-bottom:20px;">
          <tr style="background:#f4f4f4;"><td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Name</td><td style="padding:10px;border:1px solid #ddd;">${escapeHtml(name)}</td></tr>
          <tr><td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Email</td><td style="padding:10px;border:1px solid #ddd;">${escapeHtml(email)}</td></tr>
          <tr style="background:#f4f4f4;"><td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Industry</td><td style="padding:10px;border:1px solid #ddd;">${escapeHtml(industry)}</td></tr>
          <tr><td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Team Size</td><td style="padding:10px;border:1px solid #ddd;">${escapeHtml(size)} employees</td></tr>
        </table>

        <h3 style="color:#555;margin-top:24px;">Audit Results</h3>
        <table style="border-collapse:collapse;width:100%;margin-bottom:20px;">
          <tr style="background:#f4f4f4;"><td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Agentic Leverage Score</td><td style="padding:10px;border:1px solid #ddd;font-size:1.2em;font-weight:bold;">${escapeHtml(score)} / 100</td></tr>
          <tr><td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Priority Level</td><td style="padding:10px;border:1px solid #ddd;">${escapeHtml(urgency)}</td></tr>
          <tr style="background:#f4f4f4;"><td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Est. Weekly Time Reclaimed</td><td style="padding:10px;border:1px solid #ddd;">${escapeHtml(savings)}</td></tr>
          <tr><td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Estimated Annual Value</td><td style="padding:10px;border:1px solid #ddd;">${escapeHtml(roi)}</td></tr>
          <tr style="background:#f4f4f4;"><td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Top Pain Areas</td><td style="padding:10px;border:1px solid #ddd;">${escapeHtml(topAreas.join(", "))}</td></tr>
        </table>

        <h3 style="color:#555;margin-top:24px;">Individual Pain Ratings (1–5)</h3>
        <table style="border-collapse:collapse;width:100%;margin-bottom:20px;">
          ${ratingsRows}
        </table>

        <p style="color:#888;font-size:0.85em;border-top:1px solid #eee;padding-top:12px;">
          This lead has completed the Agentic Systems Audit on ziiro.work and been shown the Calendly booking widget.
        </p>
      </div>
    `;

    await sendResendEmail({
      apiKey: RESEND_API_KEY,
      from: resendFrom(),
      to: [teamInbox()],
      subject: `New Audit: ${sanitizeHeader(name)} - Score ${score}/100 (${sanitizeHeader(urgency)})`,
      html: teamHtml,
    });

    return jsonResponse(req, { success: true });
  } catch (error) {
    console.error("Audit email error:", error);
    return jsonResponse(req, { success: false, error: "Unable to send audit email" }, 500);
  }
}
