/**
 * Audit service: external communication for the self-audit feature —
 * emailing results and checking a domain's mail records. Posts to the Vercel
 * serverless endpoint (/api/send-audit), which scores and emails the team via
 * Resend. Stateless.
 */
import type { AuditForm } from "../entities/audit";

interface AuditSubmission extends AuditForm {
  ratings: Record<string, number>;
}

export async function sendAuditEmail(submission: AuditSubmission): Promise<void> {
  const res = await fetch("/api/send-audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: submission.name,
      email: submission.email,
      industry: submission.industry,
      size: submission.size,
      ratings: submission.ratings,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new Error(data?.error ?? "Audit email failed");
  }
}

/**
 * Whether a domain publishes MX records (can receive email), via
 * Cloudflare DNS-over-HTTPS. Resolves true on network failure so a
 * flaky lookup never blocks a legitimate address.
 */
export async function domainHasMX(domain: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${domain}&type=MX`,
      { headers: { Accept: "application/dns-json" } },
    );
    const data = await res.json();
    return Boolean(data.Answer && data.Answer.length > 0);
  } catch {
    return true; // fall back to format-only validation
  }
}
