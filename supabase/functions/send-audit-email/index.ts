import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = new Set([
  'https://ziiro.work',
  'https://www.ziiro.work',
  'http://localhost:4173',
  'http://localhost:8080',
]);

const rateLimitWindowMs = 10 * 60 * 1000;
const rateLimitMax = 5;
const rateLimitBuckets = new Map<string, number[]>();
const disposableDomains = new Set([
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email', 'yopmail.com',
  'sharklasers.com', 'guerrillamailblock.com', 'grr.la', 'guerrillamail.info', 'spam4.me',
  'trashmail.com', 'trashmail.me', 'trashmail.net', 'dispostable.com', 'maildrop.cc',
  '10minutemail.com', '10minutemail.net', '10minutemail.org', 'minutemail.com', 'temp-mail.org',
  'fakeinbox.com', 'mailnull.com', 'spamgourmet.com', 'spamgourmet.net', 'discard.email',
  'mailnesia.com', 'spamspot.com', 'spamthisplease.com', 'byom.de', 'getnada.com',
  'anonaddy.com', 'tempinbox.com', 'tempr.email', 'emailondeck.com', 'getairmail.com',
  'filzmail.com', 'zetmail.com', 'mohmal.com', 'owlpic.com', 'cfl.fr',
  'spamfree24.org', 'spamfree24.de', 'spamfree24.eu', 'spamfree24.info', 'spaml.de',
  'spaml.com', 'disigntime.com', 'no-spam.ws', 'antispam24.de', 'wegwerfmail.de',
  'wegwerfmail.net', 'wegwerfmail.org', 'abcmail.email', 'armyspy.com',
]);

const corsHeaders = (req: Request) => {
  const origin = req.headers.get('origin') ?? '';
  const allowOrigin = allowedOrigins.has(origin) || origin.startsWith('http://localhost:')
    ? origin
    : 'https://ziiro.work';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
};

const ratingLabels: Record<string, string> = {
  outreach: 'Self-Optimizing Systems',
  leadgen: 'Research & Qualification',
  pipeline: 'UGC Ads & Management',
  content: 'Role Clarity',
  reporting: 'Control Dashboards',
};

const painAreas = [
  { key: 'outreach', label: ratingLabels.outreach, hrsPerRating: [0, 0.2, 0.6, 1.2, 2.2, 3.5] },
  { key: 'leadgen', label: ratingLabels.leadgen, hrsPerRating: [0, 0.2, 0.5, 1.1, 2, 3] },
  { key: 'pipeline', label: ratingLabels.pipeline, hrsPerRating: [0, 0.1, 0.4, 0.9, 1.5, 2.2] },
  { key: 'content', label: ratingLabels.content, hrsPerRating: [0, 0.2, 0.5, 1, 1.8, 2.5] },
  { key: 'reporting', label: ratingLabels.reporting, hrsPerRating: [0, 0.1, 0.4, 0.8, 1.4, 2] },
];

const allowedSizes = new Set(['1-5', '6-20', '21-50', '51-200', '200+']);
const allowedIndustries = new Set([
  'SaaS / Software',
  'Startup',
  'Solo Founder',
  'Founder-led Agency',
  'Consulting / Professional Services',
  'Creator-led Business',
  'Community / Education',
  'AI-first Service Business',
  'Other',
]);
const hourlyValue = 30;

const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]!));

const sanitizeText = (value: unknown, maxLength = 500) =>
  Array.from(String(value ?? ''))
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
    })
    .join('')
    .trim()
    .slice(0, maxLength);

const sanitizeHeader = (value: unknown, maxLength = 120) =>
  sanitizeText(value, maxLength).replace(/[\r\n]/g, ' ');

const isValidEmail = (email: string) =>
  /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) &&
  email.length <= 254 &&
  !disposableDomains.has(email.split('@')[1]?.toLowerCase());

const isRateLimited = (key: string) => {
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

const jsonResponse = (req: Request, body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });

const readJson = async (req: Request) => {
  const body = await req.text();
  if (body.length > 10_000) throw new Error('Payload too large');
  return JSON.parse(body);
};

const normalizeRatings = (input: Record<string, unknown>) => {
  const ratings: Record<string, number> = {};
  for (const area of painAreas) {
    const value = Number(input?.[area.key]);
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new Error('Invalid ratings');
    }
    ratings[area.key] = value;
  }
  return ratings;
};

const calcResults = (ratings: Record<string, number>, size: string) => {
  const sized = size === '1-5' ? 0.6 : size === '6-20' ? 0.8 : size === '51-200' ? 1.1 : size === '200+' ? 1.2 : 1;
  const areas = painAreas.map((area) => {
    const rating = ratings[area.key] || 0;
    const hrs = +(area.hrsPerRating[rating] * sized).toFixed(1);
    const annual = Math.round(hrs * 52 * hourlyValue);
    return { ...area, rating, hrs, annual };
  });
  const sorted = [...areas].sort((a, b) => b.hrs - a.hrs);
  const totalHrs = +areas.reduce((sum, area) => sum + area.hrs, 0).toFixed(1);
  const totalAnnual = areas.reduce((sum, area) => sum + area.annual, 0);
  const maxHrs = areas.reduce((sum, area) => sum + (area.hrsPerRating[5] * sized), 0);
  const score = maxHrs > 0 ? Math.round((totalHrs / maxHrs) * 100) : 0;
  const urgency = totalHrs >= 12 ? 'Critical' : totalHrs >= 7 ? 'High' : 'Moderate';
  return {
    sorted,
    score,
    urgency,
    savings: `${totalHrs} hrs/week`,
    roi: `$${totalAnnual.toLocaleString()}/yr`,
    topAreas: sorted.slice(0, 2).map((area) => area.label),
  };
};

serve(async (req) => {
  const headers = corsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const payload = await readJson(req);
    const name = sanitizeText(payload.name, 100);
    const email = sanitizeText(payload.email, 254).toLowerCase();
    const industry = sanitizeText(payload.industry, 100);
    const size = sanitizeText(payload.size, 20);
    const ratings = normalizeRatings(payload.ratings ?? {});

    if (!name || !allowedIndustries.has(industry) || !allowedSizes.has(size) || !isValidEmail(email)) {
      return jsonResponse(req, { success: false, error: 'Invalid submission' }, 400);
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (isRateLimited(`${ip}:${email}`)) {
      return jsonResponse(req, { success: false, error: 'Too many submissions' }, 429);
    }

    const { score, urgency, savings, roi, topAreas } = calcResults(ratings, size);

    const { error: dbError } = await supabase.from('audit_submissions').insert({
      name, email, industry,
      company_size: size,
      rating_outreach: ratings.outreach || null,
      rating_leadgen: ratings.leadgen || null,
      rating_pipeline: ratings.pipeline || null,
      rating_content: ratings.content || null,
      rating_reporting: ratings.reporting || null,
      score,
      urgency,
    });
    if (dbError) {
      throw dbError;
    }

    const fromAddress = 'Ziiro AI <onboarding@resend.dev>';

    const ratingsRows = Object.entries(ratings)
      .map(([key, val], i) => `
        <tr style="${i % 2 === 0 ? 'background:#f4f4f4;' : ''}">
          <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">${escapeHtml(ratingLabels[key] ?? key)}</td>
          <td style="padding:10px;border:1px solid #ddd;">${escapeHtml(val)} / 5</td>
        </tr>`)
      .join('');

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
          <tr style="background:#f4f4f4;"><td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Top Pain Areas</td><td style="padding:10px;border:1px solid #ddd;">${escapeHtml(topAreas.join(', '))}</td></tr>
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

    const teamRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromAddress,
        to: ['ziiro.work@gmail.com'],
        subject: `New Audit: ${sanitizeHeader(name)} - Score ${score}/100 (${sanitizeHeader(urgency)})`,
        html: teamHtml,
      }),
    });

    const teamData = await teamRes.json();
    if (!teamRes.ok) {
      console.error('Team audit email failed:', teamData);
      throw new Error('Resend request failed');
    }

    return jsonResponse(req, { success: true });
  } catch (error) {
    console.error('Audit email error:', error);
    return jsonResponse(req, { success: false, error: 'Unable to send audit email' }, 500);
  }
});
